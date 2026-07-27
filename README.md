# CamiPrints

A free, family-friendly coloring-page site: browse and print original coloring
pages, or turn a photo into a printable line-art page. Built for two audiences
at once — adults who browse, filter and search, and **children who cannot yet
read**: everything on the critical path (find a picture → get it on paper)
works by pictures and one tap. No ads, nothing animates unless touched.

The visual and UX source of truth is the Claude Design handoff in
[`design_handoff_camiprints/`](design_handoff_camiprints/README.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui ·
Supabase (Postgres / Auth / Storage) · Prisma · Zod + React Hook Form ·
Sharp + OpenCV.js local conversion pipeline · Vitest · Playwright · axe-core ·
Vercel · Node 22.

## Getting started

```bash
npm install
cp .env.example .env.local   # defaults run with no infrastructure
npm run dev
```

The default `DATA_SOURCE=static` serves the seeded catalog from memory — no
database needed. Point `DATA_SOURCE=database` at Supabase (see
[docs/Database.md](docs/Database.md)) when credentials exist.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end + axe accessibility tests |
| `npm run db:generate` / `db:migrate` / `db:seed` | Prisma client / migrations / seed |

## Documentation

- [Architecture](docs/Architecture.md) — feature-based layout, repository seam
- [Database](docs/Database.md) — schema, RLS, seeding
- [Provider pattern](docs/ProviderPattern.md) — pluggable conversion backends
- [Photo converter](docs/PhotoConverter.md) — the six-step flow and pipeline
- [Printing](docs/adr/005-printing.md) — print routes and the print stylesheet
- [Accessibility](docs/Accessibility.md) — WCAG 2.2 AA commitments
- [Testing](docs/Testing.md) — unit, e2e, a11y, product-constraint audits
- [Deployment](docs/Deployment.md) — Vercel + Supabase
- [ADRs](docs/adr/) — why each significant decision was made

## Product constraints (non-negotiable)

- Print is the only filled button on any card, and the only filled button
  above the fold on the detail page.
- Teal `#0E6C5F` means "action"; amber `#E8A32B` is the focus ring only.
- Every interactive element is at least 44×44px.
- Converter failures keep the user on step 5 with settings preserved — never
  a restart.
- Uploaded photos are private, never published, deleted after the session;
  any admin action that reveals one is logged.
