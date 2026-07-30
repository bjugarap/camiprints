/*
 * Category artwork generator — text-to-image against the configured BFL
 * model, one premium cover illustration per category.
 *
 * Run (needs BFL_API_KEY in .env.local):
 *   npx tsx art-generator/generate-category-images.ts            # missing only
 *   npx tsx art-generator/generate-category-images.ts dinosaurs  # named slugs
 *   npx tsx art-generator/generate-category-images.ts --reroll dinosaurs
 *
 * Behaviour:
 * - Categories that already have a manifest entry AND an image on disk are
 *   treated as approved and skipped — approved art is stable brand asset.
 * - Naming slugs regenerates them with their RECORDED seed (reproducible).
 * - --reroll draws a fresh random seed for the named slugs (a new take).
 * - Every generation upserts art-generator/category-art.json immediately:
 *   prompt, seed, model, palette, image path, date. Nothing to remember.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  buildCategoryPrompt,
  loadCategoryConfigs,
  type CategoryConfig,
} from "./category-prompts";
import { ART_SETTINGS } from "./master-style";
import { NEGATIVE_PROMPT } from "./negative-prompt";
import {
  readManifest,
  upsertEntry,
  writeManifest,
  type CategoryArt,
} from "./metadata";
import { extractPalette } from "./palette";

// Minimal .env.local loader — this script runs outside Next.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const API_KEY = process.env.BFL_API_KEY;
if (!API_KEY) throw new Error("BFL_API_KEY missing from .env.local");
const BASE = (process.env.BFL_API_BASE_URL ?? "https://api.us.bfl.ai").replace(/\/$/, "");
const MODEL = process.env.BFL_MODEL ?? "flux-2-klein-9b";

const OUT_DIR = path.join("public", "categories");
/** Parallel generations — friendly to BFL's active-task limits. */
const CONCURRENCY = 3;

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

async function generateOne(
  config: CategoryConfig,
  seed: number,
): Promise<Buffer> {
  const prompt = buildCategoryPrompt(config);
  const create = await fetch(`${BASE}/v1/${MODEL}`, {
    method: "POST",
    headers: { "x-key": API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      aspect_ratio: ART_SETTINGS.aspectRatio,
      seed,
      output_format: ART_SETTINGS.outputFormat,
    }),
  });
  if (!create.ok) {
    throw new Error(
      `${config.slug}: create ${create.status} ${await create.text()}`,
    );
  }
  const { polling_url } = (await create.json()) as { polling_url: string };

  for (let i = 0; i < 120; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(polling_url, { headers: { "x-key": API_KEY! } });
    const body = (await poll.json()) as {
      status?: string;
      result?: { sample?: string };
    };
    if (body.status === "Ready" && body.result?.sample) {
      const image = await fetch(body.result.sample);
      if (!image.ok) throw new Error(`${config.slug}: download ${image.status}`);
      return Buffer.from(await image.arrayBuffer());
    }
    if (body.status && body.status !== "Pending") {
      throw new Error(`${config.slug}: ${body.status}`);
    }
  }
  throw new Error(`${config.slug}: timed out`);
}

async function processCategory(
  config: CategoryConfig,
  seed: number,
): Promise<CategoryArt> {
  const png = await generateOne(config, seed);
  const webp = await sharp(png)
    .resize(ART_SETTINGS.outputWidth, ART_SETTINGS.outputHeight, {
      fit: "cover",
    })
    .webp({ quality: ART_SETTINGS.webpQuality })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, `${config.slug}.webp`), webp);
  const palette = await extractPalette(webp);
  return {
    title: config.title,
    slug: config.slug,
    image: `/categories/${config.slug}.webp`,
    prompt: buildCategoryPrompt(config),
    negativePrompt: NEGATIVE_PROMPT,
    seed,
    model: MODEL,
    ...palette,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const reroll = args.includes("--reroll");
  const requested = args.filter((arg) => !arg.startsWith("--"));

  const configs = loadCategoryConfigs();
  const unknown = requested.filter(
    (slug) => !configs.some((config) => config.slug === slug),
  );
  if (unknown.length > 0) {
    throw new Error(`not in categories.json: ${unknown.join(", ")}`);
  }

  let manifest = readManifest();
  const bySlug = new Map(manifest.map((entry) => [entry.slug, entry]));

  const queue = configs.filter((config) => {
    if (requested.length > 0) return requested.includes(config.slug);
    const approved =
      bySlug.has(config.slug) &&
      existsSync(path.join(OUT_DIR, `${config.slug}.webp`));
    return !approved;
  });
  if (queue.length === 0) {
    console.log("nothing to generate — name slugs to regenerate approved art");
    return;
  }
  console.log(`generating ${queue.length} categories with ${MODEL}…`);

  const failures: string[] = [];
  let index = 0;
  // Manifest writes are serialized through a chain; the in-memory update is
  // synchronous, so parallel workers never clobber each other's entries.
  let writeChain: Promise<void> = Promise.resolve();
  const worker = async () => {
    while (index < queue.length) {
      const config = queue[index++];
      const recorded = bySlug.get(config.slug)?.seed;
      const seed = reroll || recorded === undefined ? randomSeed() : recorded;
      try {
        const entry = await processCategory(config, seed);
        manifest = upsertEntry(manifest, entry);
        const snapshot = manifest;
        writeChain = writeChain.then(() => writeManifest(snapshot));
        await writeChain;
        console.log(
          `✓ ${config.slug} (seed ${seed}, accent ${entry.accentColor})`,
        );
      } catch (error) {
        failures.push(config.slug);
        console.error(`✗ ${String(error)}`);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
  );

  if (failures.length > 0) {
    console.error(`\nfailed: ${failures.join(", ")} — rerun to retry`);
    process.exit(1);
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
