# ADR 012 — AI-first conversion via a server-mediated vendor

**Status**: Accepted · 2026-07-29 · Amends ADR 011 (Quick Outline demoted
to secondary), builds on ADR 003/010

## Context

Real-world testing showed the on-device classical pipeline (ADR 011)
cannot produce the professional-quality pages CamiPrints needs: Sobel
edge detection traces outlines but does not understand photos. Sprint 4
makes AI image editing the primary engine — without redesigning the UI,
wizard, or provider architecture.

## Decision

1. **Engine, not provider, is the user-facing choice.** The wizard offers
   two engines: **AI Coloring Page** (default, best quality) and **Quick
   Outline** (the ADR-011 pipeline: fast, private, on-device, lower
   quality). Both answer the unchanged `PhotoConversionProvider`
   interface; the machine gains one field (`engine`) and one event
   (`ENGINE_SELECTED`).
2. **The vendor lives server-side.** The browser's AI provider is a thin
   shim over `/api/conversions`; the actual vendor is chosen by the
   server env `AI_PROVIDER` (Black Forest Labs Flux today; `mock` for
   dev/e2e; OpenAI/Imagen adapters later). The client-side vendor stubs
   from Sprint 3 were removed — vendor adapters are server modules
   (`src/server/conversions/*-adapter.ts`) because vendor keys must be,
   so the seam moved to where the secret is.
3. **Stateless job continuity.** Poll/output continuity travels in an
   AES-256-GCM-encrypted token held by the client, not in server state —
   any serverless instance can serve any step of any job. This is the
   lesson of the handoff store's multi-instance debt, applied from day
   one.
4. **One prompt builder.** All prompt text lives in
   `src/server/conversions/prompt-builder.ts`; user settings map to
   wording deltas on one base prompt. No component or adapter composes
   prompts.
5. **Quality gate before "completed".** The server downloads the vendor
   result and validates it (decodes, sane dimensions, not blank, not
   mostly black, predominantly white paper, real line content) before the
   browser ever sees success; failures surface as the standard calm retry
   shell with Quick Outline as a fallback remedy.
6. **The AI never receives the local edge map** — always the original
   cropped photo, rendered by the same canvas math the crop editor shows.

## Why

- The provider seam was explicitly built for this swap (ADR 003); doing
  it without touching the wizard proves the architecture.
- Server mediation is non-negotiable: the vendor key must never reach the
  browser or extension, and per-user cost control (daily limits, cost
  logging) must live where it cannot be bypassed.
- Keeping Quick Outline preserves a free, instant, zero-cost, private
  fallback — and a lifeline when the daily AI budget or the vendor fails.
- Encrypted-token statelessness makes the conversion path horizontally
  scalable with zero shared infrastructure — at 1M users the only scaling
  concern is the vendor bill, controlled by rate limits.

## Consequences

- Privacy copy is now engine-aware: the AI path sends the cropped photo
  to CamiPrints' server and the vendor (see docs/privacy-and-retention.md);
  Quick Outline keeps the photo on-device.
- The in-memory daily rate limiter is per-instance (soft under
  serverless); a shared limiter is pre-launch debt, same as the handoff
  store.
- Vendor result URLs expire (~10 min); the output token inherits that
  bound. "Make another" re-runs rather than re-downloading old results.
- BFL model/endpoint names are env (`BFL_MODEL`, `BFL_API_BASE_URL`) so a
  model upgrade is configuration.
