/*
 * One-off generator for the Style step's sample images: the SAME subject
 * drawn in every converter style, so the differences read visually.
 * Text-to-image against the configured BFL model with a fixed seed;
 * output lands in public/styles/<style>.webp (square, 440px, ~40 KB).
 *
 * Run (needs BFL_API_KEY in .env.local):
 *   npx tsx --conditions=react-server scripts/generate-style-swatches.ts
 *
 * Cost: one image per style (~$0.02 each) — only when styles change.
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { CONVERTER_STYLES } from "../src/types/converter";
import { STYLE_WORDING } from "../src/server/conversions/prompt-builder";

// Minimal .env.local loader — this script runs outside Next.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const API_KEY = process.env.BFL_API_KEY;
if (!API_KEY) throw new Error("BFL_API_KEY missing from .env.local");
const BASE = (process.env.BFL_API_BASE_URL ?? "https://api.us.bfl.ai").replace(/\/$/, "");
const MODEL = process.env.BFL_MODEL ?? "flux-2-klein-9b";

const SUBJECT =
  "A children's coloring-book page of a friendly golden retriever puppy " +
  "sitting in a garden with a ball and a few flowers. Clean black line art " +
  "on a pure white background, fully enclosed coloring regions, no shading, " +
  "no gray, no text.";

/**
 * Two styles need the sample subject itself adjusted or their card can't
 * show what they mean: the garden fights "subject only", and a full-body
 * scene hides "portrait". The converter's real prompts are untouched.
 */
const SUBJECT_OVERRIDES: Partial<Record<(typeof CONVERTER_STYLES)[number], string>> = {
  portrait:
    "A children's coloring-book page: a close-up portrait of a friendly " +
    "golden retriever puppy's face and shoulders. Clean black line art on " +
    "a pure white background, fully enclosed coloring regions, no shading, " +
    "no gray, no text.",
  "subject-only":
    "A children's coloring-book page of a friendly golden retriever puppy " +
    "sitting with a ball, alone on a completely empty white page — no " +
    "background at all. Clean black line art, fully enclosed coloring " +
    "regions, no shading, no gray, no text.",
};

async function generate(style: (typeof CONVERTER_STYLES)[number]) {
  const prompt = `${SUBJECT_OVERRIDES[style] ?? SUBJECT} ${STYLE_WORDING[style]}`;
  const create = await fetch(`${BASE}/v1/${MODEL}`, {
    method: "POST",
    headers: { "x-key": API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "1:1",
      seed: 42, // same seed everywhere — style is the only variable
      output_format: "png",
    }),
  });
  if (!create.ok) {
    throw new Error(`${style}: create ${create.status} ${await create.text()}`);
  }
  const { polling_url } = (await create.json()) as { polling_url: string };

  for (let i = 0; i < 90; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(polling_url, { headers: { "x-key": API_KEY! } });
    const body = (await poll.json()) as {
      status?: string;
      result?: { sample?: string };
    };
    if (body.status === "Ready" && body.result?.sample) {
      const image = await fetch(body.result.sample);
      const png = Buffer.from(await image.arrayBuffer());
      const webp = await sharp(png)
        .resize(440, 440, { fit: "cover" })
        .webp({ quality: 82 })
        .toBuffer();
      await writeFile(path.join("public", "styles", `${style}.webp`), webp);
      console.log(`${style}: ${webp.length} bytes`);
      return;
    }
    if (body.status && body.status !== "Pending") {
      throw new Error(`${style}: ${body.status}`);
    }
  }
  throw new Error(`${style}: timed out`);
}

async function main() {
  await mkdir(path.join("public", "styles"), { recursive: true });
  // Optionally regenerate a subset: tsx ... -- portrait subject-only
  const requested = process.argv.slice(2);
  const styles =
    requested.length > 0
      ? CONVERTER_STYLES.filter((style) => requested.includes(style))
      : CONVERTER_STYLES;
  for (const style of styles) {
    await generate(style); // sequential — gentle on rate limits
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
