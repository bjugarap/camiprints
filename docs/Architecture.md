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
  converter/    six-step flow + state machine (Phase 4)
components/ui/  shadcn/ui primitives restyled with the design tokens
shared/         Cross-feature primitives: Header, Footer, Button, Field,
                Toggle, Artwork (placeholder-aware image slot)
server/         Server-only code
  repositories/ Data access behind interfaces
  providers/    ColoringProvider implementations (Phase 4)
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

## Scale posture

Library pages are static (SSG + revalidation once the DB is live) and served
from the CDN; the only always-dynamic surface is the converter API. Favorites
and Calm Mode are device-local until an account exists. This keeps the
millions-of-users path a CDN problem, not a server problem.
