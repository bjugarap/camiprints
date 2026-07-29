# Architecture

Feature-based layout under `src/`:

```
app/            Routes only — thin, mostly Server Components
features/       One folder per product feature; each owns its components,
                hooks, types, logic and tests
  calm-mode/    data-calm attribute on <html>, pre-paint script, hook
  library/      browsing (Phase 2)
  page-detail/  detail view (Phase 3)
  print/        print routes, PDF/PNG generation (Phase 3)
  converter/    six-step wizard: pure state machine (machine/), input
                adapters (intake/), provider seam + LocalProvider
                (providers/), refresh-proof session (session/),
                PNG/PDF/print exports (export/), step components (ui/)
components/ui/  shadcn/ui primitives restyled with the design tokens
shared/         Cross-feature primitives: Header, Footer, Button, Field,
                Toggle, Artwork (placeholder-aware image slot)
  contracts/    Versioned wire contracts shared with external clients
                (extension-handoff.ts — Zod schemas, limits, error codes)
server/         Server-only code
  repositories/ Data access behind interfaces
  handoff/      Extension handoff: TemporaryPhotoStore seam, in-memory
                impl, token/validation/rate-limit service (ADR 009)
lib/            Zod schemas, URL-state helpers, cn()
styles/         print.css (tokens live in app/globals.css @theme)
types/          Domain types shared by both repository implementations
```

## Design tokens

All colour, type, spacing, radius, shadow and control-height values from the
design handoff are declared once in `src/app/globals.css` under `@theme`,
which makes them Tailwind utilities (`bg-paper`, `text-ink-60`,
`rounded-card`, `shadow-paper`…). The shadcn/ui variable contract
(`--primary`, `--ring`, …) is mapped onto the same palette so any shadcn
component picks up the CamiPrints look without per-component overrides. The
site is light-only by design; Calm Mode — not a dark theme — is the alternate
presentation.

Two custom variants express Calm Mode in CSS: `calm:` and `not-calm:` (keyed
off `data-calm` on `<html>`), so calm layouts need no client-side branching
and cannot hydration-mismatch.

## Repository seam

Catalog reads go through `CatalogRepository`
(`src/server/repositories/catalog-repository.ts`). Implementations:

- `StaticCatalogRepository` — in-memory over `src/server/data/seed-data.ts`;
  the default, runs with zero infrastructure.
- Prisma/Supabase implementation — same interface, selected with
  `DATA_SOURCE=database` (arrives with the accounts phase).

`prisma/seed.ts` seeds Postgres from the same seed module, so the two sources
can never drift.

## Provider seam

Photo conversion goes through `PhotoConversionProvider`
(`src/features/converter/providers/`), selected by
`NEXT_PUBLIC_COLORING_PROVIDER` (default `local`). The interface is
job-based and async-shaped; the on-device LocalProvider and the OpenAI /
Flux / Imagen stubs answer it identically. See `ProviderPattern.md`,
ADR 003/010/011.

## Extension intake

The Chrome extension hands an image to the site through a short-lived,
single-use, opaque-token handoff (`POST /api/converter/handoffs` →
`/create/photo?handoff=<token>` → redeem). Raw image URLs and query-string
image data are never accepted. See `chrome-extension-integration.md` and
ADR 009.

## Scale posture

Library pages are static (SSG + revalidation once the DB is live) and served
from the CDN. Photo conversion runs **on the user's device** (ADR 011), so
the flagship feature adds zero marginal server cost; the only always-dynamic
surfaces are the tiny handoff endpoints. Favorites and Calm Mode are
device-local until an account exists. This keeps the millions-of-users path
a CDN problem, not a server problem.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_COLORING_PROVIDER` | `local` | Which conversion provider answers |
| `CAMIPRINTS_EXTENSION_ORIGINS` | (empty) | CORS allowlist for the handoff endpoint: comma-separated `chrome-extension://<id>` |
