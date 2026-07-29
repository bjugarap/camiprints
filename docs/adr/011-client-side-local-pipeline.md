# ADR 011 — LocalProvider runs client-side (supersedes ADR 006)

**Status**: Accepted · 2026-07-28 · Supersedes ADR 006's pipeline location

## Context

ADR 006 planned the local pipeline server-side (Sharp + OpenCV.js in a
Node route). Implementing Sprint 3 forced the question: where should the
no-AI conversion actually run, given the privacy promise ("your photo is
deleted after you leave"), the 1M-monthly-users cost posture, and the
provider seam that must also host remote AI vendors?

## Decision

The LocalProvider converts **in the browser**: Canvas rasterizes the crop
(letter-aspect working canvas, 1400px long edge); pure typed-array stages
(contrast → box blur → Sobel → threshold → connected-component cleanup →
morphological smoothing/line weight) produce the mask; Canvas encodes the
PNG. No OpenCV.js WASM, no server round-trip. Sharp remains server-side
only where a server genuinely receives bytes: validating extension
handoff uploads.

The pipeline stages are pure functions over a DOM-free `Raster` type, so
they unit-test in Node; only rasterize/encode touch Canvas.

## Why

- **Privacy becomes structural**: for the default path the photo cannot
  leak, be logged or be retained server-side, because it is never sent.
  This is the strongest possible version of the product promise.
- **Zero marginal server cost** for the flagship feature at any user
  count; conversion capacity scales with the users' own devices.
- **Latency**: no 10 MB upload before work starts; the Adjust step gets a
  sub-second live preview loop, which a server round-trip per slider move
  could not offer.
- **~5 KB of TypeScript beats ~8 MB of OpenCV WASM** for the operations
  actually needed (blur, Sobel, threshold, components, morphology); the
  seam allows an OpenCV.js or server implementation later without UI
  changes if quality demands it.
- ADR 006's main argument for server-side — "identical results across
  devices" — is preserved in practice: the pipeline is deterministic
  integer/float math at a fixed working resolution.

## Consequences

- Very old/low-memory devices run the conversion themselves; the working
  resolution cap (1400px) keeps this a sub-second job on mid-range phones.
- Print/export resolution is capped at the working resolution (~165 DPI
  on US Letter) — acceptable for line art; revisit if print quality
  complaints appear (raise the cap or add a final high-res render pass).
- Remote providers (OpenAI/Flux/Imagen) will upload the cropped photo via
  their server routes; the privacy copy must then be provider-aware —
  tracked as technical debt until the first real integration.
- ADR 006's error-message and upload-limit requirements carry over
  unchanged; only the execution location changed.
