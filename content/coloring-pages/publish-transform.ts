import { z } from "zod";

import type { ManifestEntry } from "./manifest";
import type { Complexity } from "./prompt";

/**
 * The public shape of a published page — what the site consumes from
 * content/coloring-pages/published.json. Deliberately EXCLUDES the internal
 * generation prompt: alt text and SEO description are written from the
 * title and category, never by exposing the prompt.
 */
export const publishedPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  categorySlug: z.string(),
  complexity: z.enum(["toddler", "kids", "detailed"]),
  printPath: z.string(),
  previewPath: z.string(),
  thumbnailPath: z.string(),
  altText: z.string(),
  seoDescription: z.string(),
  tags: z.array(z.string()),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  publishedAt: z.string(),
});
export type PublishedPage = z.infer<typeof publishedPageSchema>;

/** Complexity → the site's catalog filter values. */
export const COMPLEXITY_CATALOG_MAPPING: Record<
  Complexity,
  { difficulty: "easy" | "medium" | "detailed"; ageRange: "3-5" | "6-8" | "9-plus"; detailLevel: "large-spaces" | "balanced" | "fine-detail" }
> = {
  toddler: { difficulty: "easy", ageRange: "3-5", detailLevel: "large-spaces" },
  kids: { difficulty: "medium", ageRange: "6-8", detailLevel: "balanced" },
  detailed: { difficulty: "detailed", ageRange: "9-plus", detailLevel: "fine-detail" },
};

/**
 * Human-readable alt text and SEO copy, built from the title and category —
 * separate from (and never containing) the generation prompt.
 */
export function buildAltText(entry: ManifestEntry, categoryTitle: string): string {
  return `${entry.title} — a free printable ${categoryTitle.toLowerCase()} coloring page with black line art on a white background.`;
}

export function buildSeoDescription(
  entry: ManifestEntry,
  categoryTitle: string,
): string {
  const audience =
    entry.complexity === "toddler"
      ? "toddlers and preschoolers"
      : entry.complexity === "detailed"
        ? "older kids and adults"
        : "kids";
  return `Print the free "${entry.title}" coloring page from our ${categoryTitle} collection — original line art for ${audience}, sized for US Letter and A4.`;
}

/** Approved entries only; anything else is refused (tested). */
export function toPublishedPage(
  entry: ManifestEntry,
  categoryTitle: string,
  publishedAt: string,
): PublishedPage {
  if (entry.status !== "approved" || entry.reviewStatus !== "approved") {
    throw new Error(`${entry.id}: only approved pages can be published`);
  }
  if (!entry.outputPath || !entry.previewPath || !entry.thumbnailPath) {
    throw new Error(`${entry.id}: missing generated assets`);
  }
  return {
    slug: entry.slug,
    title: entry.title,
    categorySlug: entry.categorySlug,
    complexity: entry.complexity,
    printPath: entry.outputPath,
    previewPath: entry.previewPath,
    thumbnailPath: entry.thumbnailPath,
    altText: buildAltText(entry, categoryTitle),
    seoDescription: buildSeoDescription(entry, categoryTitle),
    tags: [entry.categorySlug, entry.complexity, "printable", "original"],
    provider: entry.provider,
    model: entry.model ?? "unknown",
    promptVersion: entry.promptVersion,
    publishedAt,
  };
}
