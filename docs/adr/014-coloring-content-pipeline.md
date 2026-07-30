# ADR 014 — Manifest-driven coloring-page content pipeline

Date: 2026-07-30 · Status: accepted

## Context

The launch library needs 240 original AI-generated coloring pages across
12 categories, with staged human review before anything is published —
and the same machinery must keep working for thousands of pages after
launch. The sprint brief assumed a Supabase repository layer and an
existing admin area; neither exists yet. The actual seams are the static
seed-data catalog repository (ADR 002 keeps the database optional), the
BFL/Flux env conventions from ADR 012, and the dev-only tooling pattern
from the extension-handoff simulator.

## Decision

1. **One source-controlled manifest**
   (`content/coloring-pages/generation-manifest.json`) is the source of
   truth for every page's lifecycle: `planned → generating → generated →
   approved/rejected → published`, plus retryable `failed`. Every field
   needed to reproduce or audit a page (subject prompt, prompt version,
   seed, model, provider request id, validation result, attempt history)
   lives on the entry.
2. **Concepts are code** (`concepts.ts`): 20 distinct concepts per
   category with an enforced complexity distribution, scanned against a
   banned-terms list so no protected name can enter a prompt. Tests fail
   the build otherwise.
3. **Generation is a budgeted offline script**, not a web endpoint:
   dry-run by default, kill switch + explicit dry-run opt-out to spend,
   per-run cap, bounded retries, cost logging per image. The key stays in
   script/server env, mirroring the FluxVendorAdapter conventions
   (text-to-image is a case the converter adapter never handles, so the
   pipeline has its own thin client with the same allowlists).
4. **Review is human and local**: `/admin/coloring-review` (disabled in
   production) reads the manifest from disk, shows result + metadata +
   validation flags, and writes approve/reject with a reason. Superseded
   attempts are archived OUTSIDE `public/` and served only by the
   dev-only compare API.
5. **Publishing is a separate explicit step** producing `published.json`
   with public-safe fields only (alt text and SEO copy are written from
   the title/category — the generation prompt is never exposed). The
   catalog merges published pages and their launch categories at build
   time, reusing the category-artwork manifest for card art.

## Consequences

- Everything is reviewable in git: prompts, seeds, review decisions and
  publishes are diffs, and a page can be regenerated bit-for-bit
  reasoned about later.
- The manifest-on-disk review tool is single-editor and local by design —
  when a real database/auth arrives (Supabase per .env.example), the
  manifest read/write functions are the only seam to swap.
- Prompt changes require a version bump (`coloring-page-v2`); historical
  entries keep the version they were generated with.
- Rejected art never ships: it lives outside public/, and only
  `approved` entries can pass the publish transform (enforced, tested).
