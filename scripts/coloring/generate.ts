/*
 * npm run coloring:generate — generate planned coloring pages via Flux.
 *
 *   -- --samples             first 3 entries of every category (Stage 1)
 *   -- --category=dinosaurs  one category's planned/failed entries
 *   -- --id=<entry id>       one entry
 *   -- --remaining           every planned/failed entry
 *   -- --force               with --id only: regenerate even if approved
 *
 * DRY RUN IS THE DEFAULT. Real generation requires, in .env.local or the
 * environment: COLORING_GENERATION_ENABLED=true and
 * COLORING_GENERATION_DRY_RUN=false. Each run is capped by
 * COLORING_GENERATION_MAX_PER_RUN (default 36). Failures retry up to
 * COLORING_GENERATION_MAX_RETRIES times, then the entry is marked failed
 * (safe to rerun). Approved/published work is never touched (except
 * --force --id).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  applyBudget,
  OUTPUT_ROOT,
  readGenerationManifest,
  replaceEntry,
  selectEntries,
  writeGenerationManifest,
  type ManifestEntry,
} from "../../content/coloring-pages/manifest";
import { buildColoringPrompt } from "../../content/coloring-pages/prompt";
import { generateColoringImage } from "../../content/coloring-pages/flux-client";
import { validateGeneratedPage } from "../../content/coloring-pages/validate-page";
import { generationControls, loadEnvLocal, parseArgs } from "./lib";

const CONCURRENCY = 3;
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

async function saveAssets(
  entry: ManifestEntry,
  bytes: Uint8Array,
): Promise<{ outputPath: string; previewPath: string; thumbnailPath: string }> {
  const dir = path.join(OUTPUT_ROOT, entry.categorySlug);
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, entry.slug);
  // Print source: the provider PNG, untouched.
  await writeFile(`${base}.png`, bytes);
  const source = sharp(Buffer.from(bytes));
  // Preview: full page at web size; thumbnail: card size.
  await source
    .clone()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(`${base}.webp`);
  await source
    .clone()
    .resize({ width: 440, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(`${base}-thumb.webp`);
  const publicPath = (suffix: string) =>
    `/coloring-pages/${entry.categorySlug}/${entry.slug}${suffix}`;
  return {
    outputPath: publicPath(".png"),
    previewPath: publicPath(".webp"),
    thumbnailPath: publicPath("-thumb.webp"),
  };
}

async function main() {
  loadEnvLocal();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const controls = generationControls();

  let manifest = readGenerationManifest();
  if (manifest.length === 0) {
    console.error("manifest is empty — run `npm run coloring:plan` first");
    process.exit(1);
  }

  const selected = selectEntries(manifest, {
    samples: flags.has("samples"),
    remaining: flags.has("remaining"),
    force: flags.has("force"),
    category: values.get("category"),
    id: values.get("id"),
  });
  if (selected.length === 0) {
    console.log("nothing selected — check flags/status (approved work is skipped)");
    return;
  }
  const { run, deferred } = applyBudget(selected, controls.maxPerRun);
  const estimate = (run.length * controls.costPerImageUsd).toFixed(2);

  console.log(
    `selected ${selected.length} (running ${run.length}, deferred ${deferred} by budget) — estimated cost $${estimate}`,
  );

  if (controls.dryRun) {
    for (const entry of run) {
      console.log(`  [dry-run] ${entry.id} (${entry.complexity})`);
    }
    console.log(
      "DRY RUN — no images generated, no statuses changed. Set COLORING_GENERATION_DRY_RUN=false to spend.",
    );
    return;
  }
  if (!controls.enabled) {
    console.error(
      "COLORING_GENERATION_ENABLED is not 'true' — generation kill switch is off.",
    );
    process.exit(1);
  }

  const model = process.env.BFL_MODEL ?? "flux-2-klein-9b";
  let generated = 0;
  let failed = 0;
  let writeChain: Promise<void> = Promise.resolve();
  const persist = (entry: ManifestEntry) => {
    manifest = replaceEntry(manifest, entry);
    const snapshot = manifest;
    writeChain = writeChain.then(() => writeGenerationManifest(snapshot));
    return writeChain;
  };

  let index = 0;
  const worker = async () => {
    while (index < run.length) {
      const target = run[index++];
      const prompt = buildColoringPrompt(target.subjectPrompt, target.complexity);
      let entry: ManifestEntry = { ...target, status: "generating", model };
      await persist(entry);

      let attemptError = "";
      let done = false;
      for (let retry = 0; retry <= controls.maxRetries && !done; retry++) {
        const seed = randomSeed();
        try {
          const result = await generateColoringImage(prompt, seed);
          const assets = await saveAssets(entry, result.bytes);
          const validation = await validateGeneratedPage(result.bytes);
          entry = {
            ...entry,
            ...assets,
            status: "generated",
            seed,
            providerRequestId: result.requestId,
            generatedAt: new Date().toISOString(),
            reviewStatus: "pending",
            lastError: null,
            validation: {
              ok: validation.ok,
              flags: validation.flags,
              width: validation.width,
              height: validation.height,
              fileBytes: validation.fileBytes,
              checkedAt: new Date().toISOString(),
            },
          };
          done = true;
        } catch (error) {
          attemptError = String(error instanceof Error ? error.message : error);
          console.warn(`  retryable failure ${entry.id}: ${attemptError}`);
        }
      }
      if (!done) {
        entry = { ...entry, status: "failed", lastError: attemptError };
        failed += 1;
      } else {
        generated += 1;
      }
      await persist(entry);
      // Cost log per generated image — provider metadata only, no bytes.
      console.log(
        JSON.stringify({
          event: "coloring-generation",
          id: entry.id,
          status: entry.status,
          model,
          requestId: entry.providerRequestId,
          seed: entry.seed,
          flags: entry.validation?.flags ?? [],
          estimatedCostUsd: done ? controls.costPerImageUsd : 0,
        }),
      );
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, run.length) }, worker),
  );
  await writeChain;

  console.log(
    `done: ${generated} generated, ${failed} failed, estimated spend $${(generated * controls.costPerImageUsd).toFixed(2)}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
