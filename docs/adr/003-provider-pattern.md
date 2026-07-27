# ADR 003 — Provider pattern for photo conversion

**Status**: Accepted · 2026-07-26

## Context

Photo-to-coloring-page is the flagship feature. Today it must run a local
pipeline (no external AI calls); later, GPT Image, Flux Pro or Google Imagen
may replace or augment it — without touching the UI.

## Decision

All conversion goes through a single `ColoringProvider` interface selected
by `COLORING_PROVIDER` (default `local`). `LocalProvider` implements the
Sharp + OpenCV.js pipeline; the AI providers exist as stubs that prove the
seam.

## Why

- The six-step UI, its state machine and its failure contract are provider
  independent — a provider swap cannot regress the UX constraints (stay on
  step 5, settings preserved).
- Settings (style, detail, expert adjustments) are a neutral vocabulary
  each provider maps internally, so URLs and saved creations stay stable.

## Consequences

Provider-specific capabilities must be expressed through settings, not new
UI paths. A provider that cannot honour the privacy contract (photo never
published, deleted after session) cannot ship.
