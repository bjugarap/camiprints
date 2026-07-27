# Handoff: CamiPrints — coloring page library + photo converter

## Overview
CamiPrints is a free coloring-page site with two audiences at once: an adult who browses, filters and searches, and a **child who cannot yet read**. Everything on the critical path (find a picture → get it on paper) must work by pictures and one tap. There are no ads and nothing animates unless the user touches it.

Two deliverables are covered here:
1. The **public library** — home, category listing, page detail, print preview, categories, search, info pages, optional accounts.
2. The **photo converter** — a six-step flow that turns an uploaded photo into a printable line-art page.

## About the Design Files
The files in this bundle are **design references created in HTML**. They are prototypes that show intended layout, colour, type and behaviour — they are *not* production code to copy. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, Rails views, whatever is already there) using its established component patterns, routing and styling approach. If there is no codebase yet, choose the framework that best fits the project and implement the designs there.

Do not lift the inline styles verbatim. Read them as a specification of the intended values, then express them through the codebase's own tokens/components.

## Fidelity
Mixed, deliberately:

- **`CamiPrints Hi-Fi.dc.html`** is **high fidelity** for: the visual system, home, the photo converter (steps 4/5/6), Calm Mode, mobile home, the category listing, page detail, mobile detail, print preview, and the detail error states. Recreate these closely — exact colours, type sizes, control heights and radii are given below.
- **`CamiPrints Wireframes.dc.html`** is **low fidelity** for everything else: categories index, search, /create, how-it-works, the five information pages, account pages, and the five admin screens. Use them for structure, hierarchy and states only, and dress them with the visual system in this README.

Where the two disagree, the hi-fi file wins.

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| `paper` | #FAF6EF | Page background |
| `card` | #FFFFFF | Cards, header, footer, fields |
| `ink` | #191713 | Primary text, secondary button border |
| `ink-60` | #57514A | Body copy, secondary text |
| `ink-40` | #8A8177 | Metadata, labels, placeholders-adjacent text |
| `ink-25` | #A39A8D | Placeholder text, © line |
| `line` | #E3DCD0 | Hairline borders, dividers (1px) |
| `line-strong` | #C9C0B1 | Field borders, unselected toggles (1.5px) |
| `accent` | #0E6C5F | Every primary action, links, active state |
| `accent-hover` | #0A574C | Primary button hover/active |
| `accent-tint` | #E4F0EC | Promo band, filter chips, selected tile fill |
| `accent-tint-line` | #CFE3DC | Border on tinted surfaces |
| `accent-ink` | #3F6B62 | Body copy on accent-tint |
| `focus` | #E8A32B | Focus ring only — never decoration |
| `error` | #B3401E | Error border, error heading, error text |
| `disabled` | #CFCAC1 | Disabled button fill (white label) |

Category tints (behind the thumbnail on category tiles only):
animals #EFF3E8 · dinosaurs #E7EFF1 · ocean #E6EEF6 · space #EDEAF4 · fantasy #F5EAF0 · vehicles #F4EFE3 · nature #E9F2EA · holidays #F7ECE6

Rules: teal means "this is an action". The two sanctioned exceptions are the **selected category tile** and **active filter chips** — in both cases colour is doubled with a check mark or an ✕ affordance so it never carries meaning alone. Amber is focus only. There is no second brand colour and no gradient anywhere.

### Typography
Two families, both Google Fonts:
- **Baloo 2** (600/700/800) — display and section headings only.
- **Source Sans 3** (400/500/600/700) — everything else.

| Role | Font | Size / line-height | Weight |
|---|---|---|---|
| Hero | Baloo 2 | 46 / 1.08 | 700 |
| Page title | Baloo 2 | 38–40 / 1.1 | 700 |
| Section heading | Baloo 2 | 30 / 1.1 | 700 |
| Sub-section / card group | Baloo 2 | 26 / 1.15 | 700 |
| Error heading | Baloo 2 | 18–24 / 1.2 | 700 |
| Brand wordmark | Baloo 2 | 21 / 1 | 700 |
| Card title | Source Sans 3 | 17–19 | 600 |
| Body | Source Sans 3 | 17 / 1.55 (16–18 in context) | 400 |
| Nav / button label | Source Sans 3 | 16 (18 on hero + Print) | 600 |
| Metadata | Source Sans 3 | 13.5–14 | 500 |
| Eyebrow label | Source Sans 3 | 11, uppercase, .09em | 600 |

Body copy uses `text-wrap: pretty` and is capped around 44–52ch. No text below 13.5px anywhere in the UI.

### Spacing, radius, elevation
- Spacing scale: **4 · 8 · 12 · 16 · 24 · 32 · 48**. Section rhythm on desktop is 34px between blocks, 40px page gutter (36px on the narrower detail layout).
- Radius: cards **14**, inner thumbnails **10**, promo band **18**, fields **10**, phone frame **20**, buttons and chips **999**.
- Elevation: cards `0 1px 2px rgba(25,23,19,.05)`; the detail artwork frame `0 1px 3px rgba(25,23,19,.06)`; the mobile sticky print bar `0 -2px 8px rgba(25,23,19,.06)`; the print-preview paper `0 2px 10px rgba(25,23,19,.14)`.
- Borders: 1px `line` for surfaces, 1.5px for interactive borders, 2px for the selected category tile.

### Control sizes (hard minimums)
| Control | Height |
|---|---|
| Hero / promo primary button | 56 |
| Detail "Print this page" | 64 |
| Standard button, filter pill, field, icon button | 48 |
| Card "Print" in a related/5-up row | 44 |
| Difficulty chip, secondary tile action | 44 |
| Filter chip (removable, not a primary target) | 36 |
| Toggle track | 36 × 64 (22 × 38 inside the header pill) |

Nothing interactive is under 44px in either axis. Focus ring is always `outline: 3px solid #E8A32B; outline-offset: 2px`, identical on white, paper and teal.

## Components

### Header (all public routes)
White, 1px bottom border, 14px × 40px padding, flex row, 28px gaps. Brand block: 34px teal 11px-radius square with a white 800-weight "C", then the wordmark. Four nav links at 16/600; the active one is teal with a 2.5px teal underline offset 2px. Right side: a 44px pill search field on `paper` with `line` border and a ⌕ glyph, then the **Calm Mode** pill — a bordered 44px pill containing the label and a 22×38 toggle.

### Button set
- **Primary**: accent fill, white label, fully round, no border. Hover `accent-hover`.
- **Secondary**: white fill, 1.5px `ink` border, ink label.
- **Quiet**: no fill or border, accent label, underline with 3px offset.
- **Icon**: square-round, white fill, 1.5px `line` border (favourite ♡, chevrons).
- **Disabled**: `disabled` fill, white label, no border.
Labels are always verbs: "Print this page", "Download PDF", "Make my page", "Start over".

### Card (coloring page)
White, 14px radius, 1px `line`, 12px padding, card shadow. Thumbnail: 10px radius, 1px #EDE6D9, filled with the artwork; in these mocks it is a 45° 8–9px cross-hatch of #F6F1E8/#FBF8F2 standing in for line art. Then title (17–19/600), metadata (14/500 `ink-40`), then actions. On home and related rows: one full-width **Print** primary. On the listing grid: **View** (secondary) + **Print** (primary) side by side with an 8px gap. Print is the only filled button that ever appears on a card — that consistency is the whole point of the pattern.

### Category tile
White card, 12px padding, tinted thumbnail block (150px tall on home, 64px in the listing strip), title 19/600, count 14/500. Selected state: 2px accent border, `accent-tint` background, white thumbnail, accent title with a trailing ✓.

### Fields
48px tall, 10px radius, white, 1.5px `line-strong` border, 16px label-size text, 14–16px horizontal padding. Focused: 1.5px accent border **plus** the amber ring. Error: 1.5px `error` border with a 13.5/500 error message below in `error`. Labels sit above at 14/600 `ink`.

### Slider (the converter's one visible control)
Card with 16px padding. Row: label 17/600 left, current value 15/500 accent right. Track 10px tall, `line` background, accent fill to the thumb, 999 radius. Thumb 30px white circle, 2.5px accent border, `0 1px 3px rgba(25,23,19,.2)`. End labels 13.5/500 `ink-40`: "Simpler" / "More lines". Values are words, never numbers: Simpler → Just right → More lines.

### Stepper (converter only)
Lives in the white converter header, right-aligned, 14/600. Each step is a 26px circle + label. Complete: accent fill, white ✓. Current: `ink` fill, white numeral, label in `ink`. Upcoming: 1.5px `line-strong` border, ink numeral, label `ink-40`. Connectors are 22×1.5px, `line` except the one entering the current step, which is accent.

## Screens

### Home — `/`
**Purpose**: get a child to a picture in one tap; give an adult the two doors (browse / create).
Layout, top to bottom, 1280 reference width, 40px gutters:
1. Header.
2. **Hero**, 40px top padding: left column — 46/1.08 Baloo 2 title "Free coloring pages, made simple." (max 16ch), 18/1.55 subhead, then two 56px buttons ("Browse coloring pages" primary, "Turn a photo into a page" secondary). Right — a 400×250 16px-radius artwork slot.
3. **Pick a picture** — heading 30 Baloo + 16px `ink-40` hint "Tap any picture to see those pages", then 2 rows × 4 category tiles with 18px gaps, then a centred 48px secondary "See all 24 categories".
4. **Easy pages for younger children** — heading + hint "Big shapes, thick lines", 5-up card grid, 170px thumbnails, one Print each.
5. **New this week** — same 5-up grid.
6. **Promo band** — `accent-tint`, 18px radius, 26/28px padding: three 92px white squares (photo → line art → printed sheet) separated by teal arrows, then heading 26 Baloo + `accent-ink` copy stating the photo is never published, then a 56px primary "Start".
7. **Reassurance row** — 5 columns above the footer, each a 15.5/600 claim + 14/1.45 `ink-40` line (no ads, predictable navigation, reduced motion, keyboard support, Calm Mode).
8. **Footer** — white, 1px top border, 8 links at 14.5/500 plus a right-aligned © line.

Responsive: tablet 768 → 3-up categories and 3-up cards, search shrinks but stays. Mobile 390 → hero title 27/1.1, both CTAs full width at 56px stacked, categories 2-up, one large card per row for the easy row; header collapses to brand + 44px search and menu buttons.

### Category listing — `/coloring-pages`, `/coloring-pages/[category]`
1. Header, breadcrumb (14.5/500 `ink-40`), page title 38 Baloo.
2. **Picture strip** — 9 equal flex items with 12px gaps: 8 categories (64px tinted thumbnail + 15/600 label) and a dashed "All categories" tile. This replaces a category dropdown so a non-reader can re-navigate here too. All nine fit at 1280 with no horizontal scrolling.
3. **Filter bar** — a 48px search field that flexes (min 260px, placeholder "Search within dinosaurs"), then filter pills: active ones are accent-filled white-label, inactive are white with a `line` border; the sort pill is pushed right with `margin-left:auto`.
4. **Result summary** — "**24 pages** match" at 16.5, removable `accent-tint` chips at 36px, and a quiet "Clear filters".
5. **Grid** — 4-up, 18px gaps, 190px thumbnails, View + Print.
6. **Pagination** — centred, 48px prev/next secondary buttons and 48px round page numbers; current page accent-filled.

Tablet 768: the picture strip stays; the four dropdowns collapse into one "Filters (3)" button opening the same drawer as mobile; grid drops to 2 columns.
Other states (from the lofi file): loading skeletons, no results (offer "Clear filters" + the picture strip), single result, and end of list.

### Page detail — `/coloring-pages/[category]/[slug]`
Two columns, 34px gap, 36px gutters.
**Left, 420px fixed**: white 14px-radius frame, 20px padding, containing the artwork on a white sheet with a 1.5px dashed #D8D0C2 trim edge (490px tall for portrait). Below, centred: 44px "Zoom in" and "Full screen preview" secondary buttons.
**Right, fluid**: title 40 Baloo; 18/1.55 description (max 44ch); **64px primary "Print this page"** — the only filled button above the fold; a row of "Download PNG", "Download PDF" (52px secondary, flex 1) and a 52px ♡ icon button; then a metadata card — white, 14px radius, a two-column grid (`auto 1fr`, 11px/24px gaps, 16px text) with `ink-40` terms: Category, Difficulty, Age range, Detail level, Orientation, Paper. It is a definition list, not chips, so a screen reader reads it as pairs.
Below: "More dinosaur pages" — 5-up related cards, 130px thumbnails, 44px Print.

Landscape artwork: identical layout, only the paper frame rotates (the action column never moves); the preview and the PDF both rotate.
Mobile 390: single column, artwork first, then title/description/metadata, and a **sticky bottom bar** — white, 1px top border, upward shadow — with the 56px Print and a row of PNG / PDF / ♡. This bar is the only sticky element on the site.

### Print preview — a route, not a modal
Grey-warm backdrop (#EAE4DA). Top bar: quiet "← Back to page" left, 48px primary "Print" right, which **receives focus on entry**. Centre: the sheet as real paper — white, 18px inner padding, `0 2px 10px rgba(25,23,19,.14)`, artwork centred inside a 0.5in dashed safe margin, no branding. Caption: nav, footer and all controls are hidden in printed output. Browser back works and Esc exits.

### Photo converter — `/create/photo`
Persistent shell: white header with the title "Turn a photo into a coloring page" 19 Baloo left, the 6-step stepper right; `paper` body inside a 14px-radius bordered panel. Steps: 1 Photo · 2 Crop · 3 Style · 4 Adjust · 5 Preview · 6 Print.

**Step 4 · Adjust** (hi-fi): two columns, 26px gap. Left flexes — a white card holding the 330px live line-art preview. Right is 392px fixed: heading "Make it look right" 26 Baloo, 16/1.5 subhead "Move the slider until the lines look good. You can skip this.", the detail **slider card**, then a **"More adjustments"** disclosure row (white card, label 16/600 + 13.5 `ink-40` "Line thickness, contrast, background removal", 40px round chevron) which holds the four expert controls collapsed by default, then a 56px primary "Make my page" (flex 1) beside a 56px secondary "Back", then a 14/1.45 `ink-40` privacy line. Exactly one control is visible until the user asks for more — this was a deliberate decision to keep novices unblocked.

**Step 5 · Working**: eyebrow "Step 5 · working", 26 Baloo "Making your page…", a 10px accent progress bar, 15.5px "About 10 seconds left. You can wait here.", a low-res preview fading in, and a 48px secondary "Cancel".

**Step 5 · Failure** (all failure modes): the user **stays on step 5 and all settings are preserved** — never a restart. A white card with a 1.5px `error` border: 21 Baloo error heading naming the actual problem (e.g. "That photo came out too dark to trace"), 15.5/1.5 reassurance "Your settings are still here. Try one of these:", then a stack of remedies — a 52px primary that fixes the likely cause ("Try again with more contrast"), a 52px secondary ("Pick a different photo"), and a 48px quiet ("Back to adjustments"). The same shell carries the upload, file-size, format, timeout and server errors; only the heading and the first remedy change.

**Step 6 · Done**: "Your page is ready" 26 Baloo, the finished page preview (A4 portrait, 8mm margin), a 56px primary "Print it", then "Download PDF" and "Make another" as 48px secondaries. Print goes straight to the system dialog — no interstitial, nothing between the child and paper.

Mobile: same six steps, single column, controls below the preview, buttons full width at 56px.

### Calm Mode
A toggle in the header, persisted per device. On: the hero, the search field, page counts, the promo band and the reassurance row are all removed; the category grid shows **four tiles at a time** in 2-up with a single 52px "Show more pictures" secondary below; the header toggle itself switches to the `accent-tint` treatment reading "Calm Mode on". Required on home, listing and detail.

### Remaining routes (lofi — dress with the system above)
`/categories` and `/categories/[slug]`; `/search` with empty / results / no-results states; `/create` (the chooser) and `/how-it-works`; five information pages on one shared template (about, accessibility, parent guidance, privacy, terms/copyright, contact); optional account pages (login, signup, dashboard, favourites, my creations); and five admin screens (dashboard, page management, new page, categories, conversion jobs). See `CamiPrints Wireframes.dc.html` options 4a–4f.

## Interactions & Behaviour
- **Print** on any card or detail page opens the system print dialog directly against a print stylesheet that hides nav, footer and controls and centres the artwork inside a 0.5in safe margin. No interstitial page, ever.
- **Navigation** is the same four links on every public route; the active one is underlined in teal. No mega-menus, no hover-opened menus.
- **Motion**: transitions are limited to 120–160ms colour/opacity changes on hover and focus. Nothing moves on load, nothing auto-advances, no carousels. Honour `prefers-reduced-motion: reduce` by dropping even those.
- **Focus**: every interactive element takes the amber ring; focus order follows DOM order; the print-preview route moves focus to its Print button; the mobile filter drawer traps focus and returns it to the button that opened it.
- **Filters** update the result count and the chip row; each chip's ✕ removes one filter; "Clear filters" removes all and is announced politely.
- **Toasts** (e.g. failed download) are polite live regions, stay until dismissed, and never auto-hide.
- **Converter**: each step validates before advancing; Back is always available and lossless; every failure keeps the user on step 5 with settings intact; Cancel during generation returns to step 4 with settings intact.
- **Responsive breakpoints**: ≥1280 as designed, 768–1279 (3-up home, 2-up listing, filters collapse to a drawer), <768 (single column, 2-up tiles, sticky print bar on detail).

## State Management
Library: current category, filter set (difficulty, age range, detail level, orientation), sort, page, search query — all belong in the URL so results are shareable and Back behaves. Calm Mode and favourites persist per device (favourites also server-side when an account exists).
Converter: a single flow object — `{ step, file, crop, style, detail, advanced: { lineWeight, contrast, removeBackground, invert }, jobId, status, error, resultUrl }`. `status` moves idle → uploading → queued → processing → ready | failed. A failure sets `error` and leaves `step` at 5 with everything else untouched. Uploaded photos are private, never added to the library, and deleted after the session; **any admin action that reveals a user photo is logged.**

## Assets
No production artwork exists yet. Every image in the mocks is a placeholder: category thumbnails are flat tinted blocks, coloring pages are a 45° cross-hatch of #F6F1E8/#FBF8F2, and the hero is a 400×250 slot for a photograph of a printed sheet on a table. The developer needs from the client: 8+ category thumbnails, the launch set of coloring pages as print-ready PDF plus a web preview, and one hero photograph. Fonts are Google Fonts (Baloo 2, Source Sans 3). No icon library is required — the mocks use a ⌕, ☰, ♡, ✓, ✕ and chevrons, any consistent icon set will do.

## Screenshots
`screenshots/` contains a PNG per screen, numbered in reading order:

Hi-fi — 01 foundations · 02 controls · 03 home · 04 converter (steps 4/5/6) · 05 Calm Mode + mobile home · 06 listing · 07 detail · 08 mobile detail, print preview, error states.
Lofi — 09 sitemap · 10 user flows · 11 categories · 12 search · 13 /create and /how-it-works · 14 information pages · 15 account pages · 16 admin.

Screenshots are for orientation only; the HTML files are the source of truth for measurements.

## Files
- `CamiPrints Hi-Fi.dc.html` — the high-fidelity source. Options 5a/5b foundations and controls, 5c home, 5d converter, 5e Calm Mode + mobile, 6a listing, 6b detail, 6c mobile detail + print preview + error states.
- `CamiPrints Wireframes.dc.html` — the low-fidelity source: sitemap (1a), user flows (1b), the home/listing/converter explorations, and turn 4 covering every remaining route including admin.
- `support.js` — runtime needed only to open the two HTML files locally. Not part of the design.

Open either file in a browser; both are single self-contained pages laid out as a zoomable canvas of labelled screens.
