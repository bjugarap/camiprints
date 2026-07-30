import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

/**
 * The artwork manifest — `art-generator/category-art.json`. One entry per
 * generated illustration: everything needed to reproduce it (prompt, seed,
 * model), plus what the site consumes (image path, palette). The site
 * imports this file directly; the generator is the only writer.
 */
export const categoryArtSchema = z.object({
  title: z.string(),
  slug: z.string(),
  /** Site-absolute path under public/, e.g. "/categories/dinosaurs.webp". */
  image: z.string(),
  prompt: z.string(),
  negativePrompt: z.string(),
  seed: z.number().int(),
  model: z.string(),
  dominantColors: z.array(z.string()),
  accentColor: z.string(),
  backgroundColor: z.string(),
  generatedAt: z.string(),
});

export type CategoryArt = z.infer<typeof categoryArtSchema>;

export const MANIFEST_PATH = path.join("art-generator", "category-art.json");

export function readManifest(): CategoryArt[] {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    return z.array(categoryArtSchema).parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Insert or replace by slug — pure and synchronous, so concurrent workers
 * can update the shared list without interleaving; writing is separate. */
export function upsertEntry(
  entries: CategoryArt[],
  entry: CategoryArt,
): CategoryArt[] {
  const index = entries.findIndex((existing) => existing.slug === entry.slug);
  return index === -1
    ? [...entries, entry]
    : entries.map((existing, i) => (i === index ? entry : existing));
}

export function writeManifest(entries: CategoryArt[]): Promise<void> {
  return writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );
}
