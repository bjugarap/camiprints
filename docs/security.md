# Security — photo converter & extension handoff

## Threat posture

The converter accepts untrusted images from three sources (file picker,
drag-and-drop, Chrome extension) and exposes two anonymous endpoints. The
design goals: no way to make CamiPrints fetch arbitrary URLs, no way to
enumerate or replay handoffs, no decompression bombs, no leaked photo
data, no permanent secrets in the extension.

## Handoff endpoints

`POST /api/converter/handoffs` (create) · `POST
/api/converter/handoffs/redeem` (redeem) — `src/app/api/converter/...`,
logic in `src/server/handoff/handoff-service.ts`.

| Control | Implementation |
| --- | --- |
| Token generation | 32 bytes from `crypto.randomBytes`, base64url (43 chars, ~256 bits) |
| Expiration | 10 minutes (`HANDOFF_LIMITS.tokenTtlSeconds`); opportunistic sweep on requests |
| Single use / replay | `redeem()` is a destructive read; expired records are burned even by failed attempts; probing cannot distinguish missing/expired/used (same generic 404) |
| MIME validation | Claimed type checked against the allowlist (JPEG/PNG/WEBP)… |
| Decode validation | …then the bytes are actually decoded with sharp server-side; the decoded format is re-checked against the allowlist (a lying `Content-Type` doesn't help) |
| Size limits | 10 MB bytes; 100–8000 px per axis; 40 MP pixel budget (decompression-bomb guard, enforced before sharp's own limit) |
| Filenames | Sanitized: path components and control characters stripped, length capped; used only as a display hint |
| Storage | Private `TemporaryPhotoStore`; no public object URLs exist |
| Rate limiting | Fixed-window per IP (create 10/min, redeem 20/min) |
| Error messages | Generic; never confirm token existence or internals |
| Logging | No image bytes or contents logged |
| CORS | Create: only origins in `CAMIPRINTS_EXTENSION_ORIGINS`; redeem: same-origin only |
| Versioning | Contract `v1` required; unknown versions rejected gracefully |

## Deliberately rejected designs

- **`?imageUrl=` remote fetch** — would make CamiPrints an SSRF proxy and
  a hotlinking/tracking vector; never accepted.
- **Base64 image data in query strings** — URLs land in history, logs and
  referrers; never accepted.
- **API secret in the extension** — extension code is user-inspectable;
  abuse control uses user-gesture requirements, origin allowlisting,
  short-lived single-use tokens and rate limiting instead.

## Client-side validation

Every intake path (including extension redemption) re-validates in the
browser: MIME allowlist, byte budget, real decode via
`createImageBitmap`, dimension and pixel budgets
(`src/features/converter/intake/photo-input.ts`). Server headers from the
redeem response are treated as hints, not truth.

## Known gaps before multi-instance production

These are single-instance implementations behind clean seams — they must
be swapped, not rewritten, before horizontal scaling:

1. `InMemoryTemporaryPhotoStore` → Supabase private bucket or Cloudflare
   R2 implementation of `TemporaryPhotoStore` (create and redeem may land
   on different instances).
2. In-memory rate limiter → shared store (e.g. Upstash) behind
   `checkRateLimit`'s signature.
3. Consider a scheduled sweep (cron) in addition to the opportunistic one.
