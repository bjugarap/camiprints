# ADR 009 — Extension handoff: opaque single-use tokens

**Status**: Accepted · 2026-07-28

## Context

The CamiPrints Chrome extension adds "Make Coloring Page" to images the
user selects while browsing. The selected image must reach the website's
converter. Candidate designs: pass the image URL as a query parameter and
have the site fetch it; pass base64 image data in the URL; or upload the
bytes and pass an opaque reference.

## Decision

The extension uploads the image bytes (`multipart/form-data`, after a
direct user gesture) to `POST /api/converter/handoffs`. The server
validates (MIME allowlist → real decode → dimension/pixel budgets), stores
the bytes in a private `TemporaryPhotoStore`, and returns a
cryptographically random, **short-lived (10 min), single-use** token. The
extension opens `/create/photo?handoff=<token>`; the site strips the token
from the URL/history, redeems it once (destructive read), and feeds the
bytes through the same intake validation as a local upload. A versioned
Zod contract (`src/shared/contracts/extension-handoff.ts`, `v1`) is shared
with the extension.

An intake adapter (`PhotoInputAdapter`) — not the conversion provider —
owns this: sources (file, drag-drop, extension, future saved-creation or
share-target) normalize to one `ResolvedPhotoInput` before the wizard or
any provider sees the image.

## Why

- **No raw image URLs**: a site-side fetch of a caller-supplied URL is an
  SSRF primitive, a tracking/hotlinking vector, and a copyright hazard.
  Rejected outright.
- **No base64 in query strings**: URLs persist in history, server logs
  and referrer headers — the opposite of "your photo stays private".
- **Short-lived + single-use** because the token grants access to a user
  photo: a leaked link (history sync, screen share) dies in minutes and
  dies instantly on first use; replay and probing return the same generic
  404.
- **Website owns conversion; extension only initiates** so there is
  exactly one converter — same state machine, jobs, providers, validation,
  rights confirmation and exports. The extension can never drift or bypass
  safeguards.
- **Intake adapter separate from conversion provider** because "where a
  photo comes from" and "what converts it" vary independently; coupling
  them would multiply implementations (sources × providers).

## Consequences

- The extension needs no permanent secret; abuse control is user gesture +
  origin allowlist (`CAMIPRINTS_EXTENSION_ORIGINS`) + rate limits + token
  design.
- The in-memory store is dev/single-instance only; production needs a
  shared `TemporaryPhotoStore` implementation (see `docs/security.md`).
- A dev simulator (`/dev/extension-handoff`, 404 in production) exercises
  the production endpoints so the flow is testable without the extension.
