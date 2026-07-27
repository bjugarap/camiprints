# ADR 004 — Storage

**Status**: Accepted · 2026-07-26

## Context

Two very different kinds of media: public catalog artwork (PNG/PDF/thumbs)
and private user uploads with a deletion guarantee. Future migration to
Cloudflare R2 must stay cheap.

## Decision

Supabase Storage with two buckets: `coloring-pages` (public read) and
`conversion-uploads` (private, rows carry `expiresAt`, scheduled cleanup).
All URLs live in the database as data; the app reads them through the
repository layer and `next/image`.

## Why

- Private-by-bucket (not private-by-convention) makes the "never published"
  guarantee structural.
- Because components consume URL fields, moving media to R2 later means
  changing the upload helper and rewriting stored URLs — no component
  changes (the `Artwork` component already treats `src` as data).

## Consequences

No component may construct storage paths; anything that writes media goes
through the server storage helper so the R2 migration stays a single seam.
