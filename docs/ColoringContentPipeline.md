# Coloring-page content pipeline

The repeatable, reviewable system that generates the production
coloring-page library (ADR 014). Everything is driven by one
source-controlled manifest; nothing reaches the public catalog without a
human approval.

```
content/coloring-pages/
  concepts.ts                240 page concepts (12 categories × 20)
  categories.ts              the 12 launch categories (slug ↔ title)
  prompt.ts                  versioned master prompt builder
                             (coloring-page-v1) + complexity modifiers
  banned-terms.ts            copyright guard — scanned in tests and plan
  manifest.ts                schema + statuses + selection/budget logic
  validate-page.ts           technical validation (sharp)
  flux-client.ts             text-to-image client (BFL_* env, script-only)
  publish-transform.ts       approved entry → public record (no prompt)
  generation-manifest.json   THE source of truth
  published.json             what the site catalog merges in
  attempts/                  archived superseded attempts (non-public)
  generation-report.md       latest coloring:report output
public/coloring-pages/<category>/<slug>.png|.webp|-thumb.webp
```

## Lifecycle

`planned → generating → generated → (approved | rejected) → published`,
plus `failed` (retryable). Review happens at `/admin/coloring-review`
(never available in production — same gating as the extension-handoff
simulator); rejection requires a reason; regeneration archives the old
attempt into `history` and `content/coloring-pages/attempts/`.

## Commands

| Command | Does |
| --- | --- |
| `npm run coloring:plan` | build/refresh the 240-entry manifest, scan for banned terms and near-duplicate concepts |
| `npm run coloring:generate -- --samples` | Stage 1: first 3 pages per category (36) |
| `npm run coloring:generate -- --category=dinosaurs` | one category's planned/failed entries |
| `npm run coloring:generate -- --id=<id>` | one page (`--force` to override approved) |
| `npm run coloring:generate -- --remaining` | everything still planned/failed |
| `npm run coloring:regenerate -- --id=<id>` | archive the current attempt, reset to planned |
| `npm run coloring:validate` | re-run technical validation across all assets |
| `npm run coloring:report` | status/cost summary → generation-report.md |
| `npm run coloring:publish` | approved → published.json + status published |

## Budget and safety

Dry-run is the default. A run that spends money requires BOTH
`COLORING_GENERATION_ENABLED=true` and `COLORING_GENERATION_DRY_RUN=false`
(kill switch + explicit opt-out), and is capped by
`COLORING_GENERATION_MAX_PER_RUN` (default 36). Failures retry
`COLORING_GENERATION_MAX_RETRIES` times (default 1) then park as
`failed`. Approved/published pages are never regenerated without
`--force --id`. The BFL key stays in `.env.local` / server env; the
client, extension, and published records never see it or the prompt.

## Validation

Every output is checked with sharp: decodes, portrait, print resolution
(≥1000px long edge), ≤12MB, predominantly white, has line content, not
blank/mostly black, no transparency, no grayscale wash, near-empty outer
margins. Hard failures mark the attempt; everything else is a FLAG that
routes the page to manual review — flagged pages are never auto-approved.
Educational pages with intentional letters/numbers are always reviewed by
a human for spelling (no OCR yet; the flags + review screen cover it at
this volume).

## Publishing

`coloring:publish` writes public records (title, slug, category, asset
paths, complexity mapping, alt text, SEO description, tags, provider,
model, prompt version, date — never the prompt). `seed-data.ts` merges
`published.json` into the catalog: launch categories appear the first
time one of their pages publishes, with card art from the existing
category-artwork manifest.

## Subcategories

A launch category with `parentSlug` (lion, tiger, elephant, sea-turtle
under animals) publishes as a child category: `Category.parentSlug` is
set, `listCategories()` returns only top-level categories (so the
homepage grid is unchanged), and the parent's listing page renders a
"Pick an animal" tile grid via `listSubcategories()`. A child's pages
live at `/coloring-pages/<child-slug>` — a normal listing with a
breadcrumb through the parent. A parent's page count includes its
children.

## Removed categories

**Educational** was removed from the plan (2026-07-30): flux-2-klein-9b
cannot reliably draw numeral/letter sequences (three failed attempts on
"count to five"). Its manifest entries and assets were deleted; the
concepts remain in git history if a stronger model makes them viable.
