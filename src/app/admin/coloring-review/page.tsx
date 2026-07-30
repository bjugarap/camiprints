import { notFound } from "next/navigation";

import { LAUNCH_CATEGORIES } from "../../../../content/coloring-pages/categories";
import { readGenerationManifest } from "../../../../content/coloring-pages/manifest";

import { ReviewQueue } from "./review-queue";

/**
 * The coloring-page review queue — local content tooling, same gating as
 * the extension-handoff simulator: never available in production. The
 * reviewer approves or rejects generated pages; only approved pages can
 * ever be published (`npm run coloring:publish`).
 */
export const dynamic = "force-dynamic";

export default function ColoringReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const manifest = readGenerationManifest();
  const reviewable = manifest.filter((entry) =>
    ["generated", "approved", "rejected", "failed"].includes(entry.status),
  );
  const categoryTitles = Object.fromEntries(
    LAUNCH_CATEGORIES.map((category) => [category.slug, category.title]),
  );

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8">
      <p className="text-eyebrow text-accent">Content tooling · not public</p>
      <h1 className="text-section mt-1 text-ink">Coloring-page review</h1>
      <p className="mt-2 max-w-[64ch] text-base text-ink-60">
        {reviewable.length} of {manifest.length} manifest entries have output
        to review. Approve pages that meet the bar; reject with a reason and
        regenerate (<code>npm run coloring:regenerate -- --id=&lt;id&gt;</code>
        ). Publishing is a separate explicit step.
      </p>
      <ReviewQueue entries={reviewable} categoryTitles={categoryTitles} />
    </main>
  );
}
