# ADR 013 — Config-driven category artwork system

Date: 2026-07-29 · Status: accepted

## Context

Category cards carried tint placeholders. The brand needs premium,
cohesive cover illustrations — and will need them for hundreds of
categories over the site's lifetime, regenerated and extended by
whoever is maintaining the site that year. A folder of one-off images
with no record of how they were made does not survive that.

## Decision

A reusable generation pipeline in `art-generator/`, not a batch of
images:

1. **One master style prompt** (`master-style.ts`) is the entire house
   art direction — premium picture-book, painterly pastel, large
   central subject, original artwork only (no Disney/Pixar/anime/clip
   art). Every generation starts with it, so every image looks painted
   by the same illustrator.
2. **One global avoid-list** (`negative-prompt.ts`). FLUX has no
   negative_prompt parameter, so it is appended to the prompt as an
   explicit "Do not include" clause.
3. **Categories are config** (`categories.json`: title, slug, subject
   prompt). The generator composes master + subject + avoid-list;
   adding a category is one JSON entry plus one command.
4. **Everything is recorded** (`category-art.json`): full prompt, seed,
   model, image path, palette (dominant colors, accent, pastel
   background), date. Approved art regenerates byte-similar from its
   recorded seed; `--reroll` is an explicit new take.
5. **The site consumes only the manifest**: `seed-data.ts` fills
   `Category.thumbnailUrl` by slug. UI components are unchanged — the
   `Artwork` placeholder contract from day one absorbed the real assets
   with zero layout shift.
6. Approved art is stable: the no-argument CLI run generates only
   missing categories and never touches existing images.

Generation reuses the same BFL API access as the photo converter
(`BFL_API_KEY` in `.env.local`, model from `BFL_MODEL`) but runs as an
offline script — category art is a build-time asset, never a runtime
dependency.

## Consequences

- Art direction changes are one edit to `master-style.ts` followed by a
  full regeneration — consistency is structural, not disciplinary.
- The manifest doubles as a provenance record (which prompt/seed/model
  produced each shipped image) — useful for both reproducibility and
  originality review.
- Palette extraction is deterministic local math (sharp), so recorded
  accent/background colors never drift from the shipped pixels.
- `categories.json` may contain categories the catalog doesn't ship
  yet; their art is generated ahead and simply unused until the slug
  exists in the catalog.
