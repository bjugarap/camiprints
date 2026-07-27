# ADR 002 — Database and data access

**Status**: Accepted · 2026-07-26

## Context

The catalog must be browsable, filterable and seedable today — before any
Supabase project exists — and must later serve real data with RLS.

## Decision

Supabase Postgres with Prisma migrations, fronted by a repository interface
(`CatalogRepository`) with two implementations: an in-memory
`StaticCatalogRepository` over the seed module (default) and a Prisma one
selected by `DATA_SOURCE=database`. `prisma/seed.ts` seeds from the same
seed module.

## Why

- The whole site runs and is reviewable with zero infrastructure; flipping
  to the database is config, not a rewrite.
- One seed module means the static and database sources can never disagree.
- Prisma gives migration history and typed queries; Supabase adds RLS,
  Auth and Storage without running our own Postgres.

## Consequences

Repository interfaces must stay the only path to data from the UI; direct
Prisma imports in components are a review error.
