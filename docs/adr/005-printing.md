# ADR 005 — Printing

**Status**: Accepted · 2026-07-26

## Context

Extremely fast printing is a differentiator, and the handoff is explicit:
Print opens the system dialog directly against a print stylesheet — no
interstitial page, ever. Print preview is a route, not a modal. The printed
sheet carries only the artwork inside a 0.5in safe margin — no branding.

## Decision

- One print stylesheet (`src/styles/print.css`): `@page { margin: 0.5in }`,
  header/footer/nav/`[data-no-print]` hidden, `[data-print-sheet]` centred.
- `/coloring-pages/[category]/[slug]/print` is a real route (own layout
  group, back/Esc work, focus lands on its Print button) that calls
  `window.print()`.
- Card Print buttons print in place through a hidden print-root rendering
  just the artwork — one tap from any card.
- PDFs are generated server-side (pdf-lib) embedding the print PNG, so the
  file matches the printed sheet.

## Why

CSS print against real markup keeps line weight vector-crisp and needs no
screenshotting; a route (not a modal) preserves browser Back for a child
and makes preview shareable/bookmarkable.

## Consequences

Every new visible control must either sit inside existing hidden chrome or
carry `data-no-print`; the Phase 3 print-to-PDF e2e test enforces it.
