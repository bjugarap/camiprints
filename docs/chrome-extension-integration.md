# Chrome extension integration

The extension's "Make Coloring Page" action opens the normal photo
converter with an image the user selected in the browser. The website owns
the entire conversion workflow; the extension only initiates it (ADR 009).
There is no extension-specific converter, provider, state model or export
path anywhere in this repository.

## The handoff flow (contract v1)

Contract source of truth: `src/shared/contracts/extension-handoff.ts`
(Zod schemas, limits, error codes, header names). The extension should
vendor a copy of that file verbatim.

1. **User gesture** — the user picks "Make Coloring Page" on a specific
   image. The extension only then reads the image bytes (never on hover,
   never speculatively).
2. **Create** — `POST https://<site>/api/converter/handoffs` as
   `multipart/form-data`:
   - `version`: `v1`
   - `image`: the image Blob (JPEG/PNG/WEBP, ≤ 10 MB)

   Success → `201 { version: "v1", token, expiresAt }`.
   Failures → `{ error, message }` with codes from the contract
   (`unsupported-version`, `missing-image`, `unsupported-type`,
   `file-too-large`, `invalid-image`, `rate-limited`, `server-error`).
3. **Open** — the extension opens a tab at
   `/create/photo?handoff=<token>`. The token is opaque (43-char
   base64url), carries no image data, URL, filename or user information.
4. **Redeem** — the page strips the token from the URL/history
   (`router.replace`) and POSTs `/api/converter/handoffs/redeem`
   `{ version: "v1", token }`. Success → the image bytes
   (content-type = stored MIME, `X-Handoff-Filename` /
   `X-Handoff-Source` headers). The token dies in the same operation.
   Missing, expired and already-used tokens all return the same generic
   404 (`handoff-not-found`).
5. **Converter** — the image passes the exact same client-side validation
   as a local upload (nothing the extension claimed is trusted), shows an
   "Image added from Chrome" indicator, and requires the same rights
   confirmation ("I own this image or have permission to use it") before
   Crop. From there the six-step flow is identical to a normal upload.

What is deliberately **not** supported: `?imageUrl=` remote fetch (SSRF /
tracking / hotlinking / copyright risk), base64 in query strings, and any
permanent secret in the extension (extension code is user-inspectable;
abuse control is user-gesture + origin allowlist + rate limiting + short
single-use tokens).

## CORS

The handoff **create** endpoint offers CORS only to origins listed in
`CAMIPRINTS_EXTENSION_ORIGINS` (comma-separated
`chrome-extension://<extension-id>`). The **redeem** endpoint is
same-origin only — it is called by the website, never the extension.

## Error handling on the website

Invalid/expired/replayed tokens land the wizard in a calm recovery state:
"This image link has expired. Return to the extension and choose Make
Coloring Page again." — with the normal upload path still available. No
other converter state is discarded.

## Local development

`/dev/extension-handoff` (404 in production) simulates the extension: pick
a local image → it POSTs the real create endpoint → shows the deep link →
buttons probe redemption twice to demonstrate single-use/replay behaviour.
There is no mock implementation; the simulator exercises the production
code path.

## Required extension changes (summary)

- Add a "Make Coloring Page" item to the existing image action UI.
- On selection, obtain the image **bytes** (from the DOM image the user
  picked), then call the create endpoint and open the deep link as above.
- Vendor the v1 contract file; validate the create response against
  `handoffCreateResponseSchema` before opening the tab.
- Surface contract error codes with short friendly messages; on
  `unsupported-version`, prompt the user to update the extension.
- Add the CamiPrints origin to `host_permissions` and nothing else — no
  API keys, no service credentials, no analytics containing image data.

## Testing

- Unit (vitest): token generation/expiry/single-use/replay, MIME and
  decode validation, contract schemas, sweep — `src/server/handoff/`.
- E2E (Playwright): create → deep link → redeem → Crop; replay → 404;
  expired/invalid token recovery; oversized/wrong-version rejection —
  `tests/e2e/converter.spec.ts`.
