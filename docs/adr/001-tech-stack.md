# ADR 001 — Tech stack

**Status**: Accepted · 2026-07-26

## Context

The repo was empty; the product brief fixes the stack: Next.js 15, React 19,
TypeScript, App Router, Tailwind + shadcn/ui, Supabase + Prisma, Vitest +
Playwright + axe, Vercel, Node 22.

## Decision

Adopt the brief's stack as specified. Two version notes:

- `create-next-app@latest` now scaffolds Next 16; we pinned **next@^15.5**
  to match the brief (React 19 is supported by both).
- **Prisma 6** rather than 7: Prisma 7 removed schema-file connection URLs
  and requires driver adapters; 6 is the stable line that matches Supabase's
  documented integration (see ADR 002).

## Why

- App Router file-system routes map 1:1 onto the handoff's sitemap,
  including the print route and the admin shell as separate layout groups.
- Server Components keep the library pages static and CDN-served — the
  cheapest way to be fast for millions of users.
- Tailwind v4's `@theme` turns the handoff's tokens into first-class
  utilities with a single source of truth.

## Consequences

Upgrading to Next 16 / Prisma 7 later is deliberate work (own ADR), not an
accidental `npm install`.
