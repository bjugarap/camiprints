# Category artwork system

The visual identity of the category cards: full-colour cover
illustrations (NOT coloring pages) in one house style — premium
children's picture-book, soft painterly, bright pastel, large central
subject, readable at 180px. Original artwork only; the style explicitly
forbids imitating Disney, Pixar, anime, clip art or any franchise.

Everything lives in `art-generator/` and is config-driven:

```
art-generator/
  master-style.ts      the ONE place the house style prompt exists
                       + shared generation settings (3:4, output size)
  negative-prompt.ts   the global avoid-list (appended to the prompt —
                       the BFL API has no negative_prompt parameter)
  categories.json      one entry per category: { title, slug, prompt }
  category-prompts.ts  config loading/validation + prompt assembly:
                       master style + subject + avoid-list
  palette.ts           dominant colors / accent / pastel background
                       extracted from the finished image (deterministic)
  metadata.ts          the manifest schema + read/write
  generate-category-images.ts   the CLI
  category-art.json    the manifest — one entry per generated image
```

## Adding a category

Add one entry to `categories.json` and run the generator:

```
npx tsx art-generator/generate-category-images.ts
```

With no arguments it generates only categories that don't yet have
approved art (manifest entry + image on disk). Output lands in
`public/categories/<slug>.webp` (480×640 webp, ~20–40 KB) and the
manifest is updated immediately with everything needed to reproduce the
image: full prompt, negative prompt, **seed**, model, palette, date.

- `npx tsx art-generator/generate-category-images.ts dinosaurs ocean`
  regenerates named slugs with their **recorded seed** (reproducible —
  e.g. after a prompt tweak).
- `--reroll dinosaurs` draws a fresh random seed for a new take; if you
  keep it, the new seed is recorded automatically.

Approved artwork is stable brand asset: the no-argument run never
touches it.

## How the site consumes it

`src/server/data/seed-data.ts` fills `Category.thumbnailUrl` from the
manifest by slug — categories with art show it everywhere a
`CategoryTile` renders (home picker, listing strip, /categories);
categories without art keep the marked tint placeholder. No UI code
knows the manifest exists. The palette fields (accent + pastel
background per category) are recorded for future per-category theming.

`categories.json` also carries upcoming categories that aren't in the
site catalog yet (video-games, kawaii, superheroes, …) — their art is
generated and ready; the tiles appear whenever the catalog adds those
slugs.

## Art direction rules (summary)

Master prompt clauses that matter most, in the generator verbatim:
same illustrator feel across every image, simple clean backgrounds,
large central subject, minimal tiny details, readable as a thumbnail,
family friendly, no realism/anime/Disney/Pixar/clip-art/vector, 3:4
portrait with safe margins for rounded cards. The avoid-list bans
copyrighted characters, logos, text, watermarks, scary or violent
content, and busy compositions.

Cost: one image per category (fractions of a cent to a few cents each
on flux-2-klein) — only when a category is added or art is deliberately
redone.
