/*
 * npm run coloring:publish — move APPROVED pages into the public catalog.
 *
 * Writes content/coloring-pages/published.json (the site merges it into
 * the catalog at build time) and marks entries `published` in the
 * manifest. Only approved pages qualify; the internal generation prompt is
 * never included in the published record. Idempotent — republishing
 * refreshes records without duplicating.
 */
import {
  LAUNCH_CATEGORIES,
} from "../../content/coloring-pages/categories";
import {
  readGenerationManifest,
  writeGenerationManifest,
} from "../../content/coloring-pages/manifest";
import {
  publishedPageSchema,
  toPublishedPage,
  type PublishedPage,
} from "../../content/coloring-pages/publish-transform";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const PUBLISHED_PATH = path.join("content", "coloring-pages", "published.json");

async function main() {
  const manifest = readGenerationManifest();
  const titles = new Map(LAUNCH_CATEGORIES.map((c) => [c.slug, c.title]));

  let existing: PublishedPage[] = [];
  try {
    existing = z
      .array(publishedPageSchema)
      .parse(JSON.parse(readFileSync(PUBLISHED_PATH, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const byKey = new Map(existing.map((p) => [`${p.categorySlug}/${p.slug}`, p]));

  const now = new Date().toISOString();
  let published = 0;
  const updated = manifest.map((entry) => {
    if (entry.status !== "approved") return entry;
    const record = toPublishedPage(
      entry,
      titles.get(entry.categorySlug) ?? entry.categorySlug,
      now,
    );
    byKey.set(`${record.categorySlug}/${record.slug}`, record);
    published += 1;
    return { ...entry, status: "published" as const, publishedAt: now };
  });

  if (published === 0) {
    console.log("no approved pages to publish");
    return;
  }
  await writeFile(
    PUBLISHED_PATH,
    `${JSON.stringify([...byKey.values()], null, 2)}\n`,
    "utf8",
  );
  await writeGenerationManifest(updated);
  console.log(`published ${published} pages → ${PUBLISHED_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
