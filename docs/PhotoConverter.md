# Photo converter

Five steps at `/create/photo`: **1 Photo · 2 Crop · 3 Style · 4 Preview ·
5 Print**, one route, one guided wizard. `/create` is the hub: one live
tool, inert "coming later" cards.

Two engines answer the same wizard (ADR 012):

- **AI Coloring Page** (default, best quality) — the server sends the
  original cropped photo to the configured vendor (Flux) with a centrally
  built prompt; the result is quality-validated before the browser sees it.
- **Quick Outline** (fast · private · lower quality) — the on-device
  ADR-011 pipeline. Also the fallback remedy when AI fails or the daily
  AI budget is spent.

**The style is the one creative control, and each page is exactly one
generation.** The Adjust step was removed deliberately: its sliders
multiplied AI traffic without adding proportional value. Six styles (bold
/ classic / detailed / cartoon / portrait / subject-only) cover that
ground instead, and every style card carries a real Flux-generated sample
— the same puppy drawn each way — so the choice reads visually
(`public/styles/<style>.webp`; regenerate with
`npx tsx --conditions=react-server scripts/generate-style-swatches.ts`).
Generation fires from the Style step; step 4 is the finished page on
paper ("Use this page" / "Try another style"); step 5 prints. The engine
switch and engine-aware privacy line live on step 3. The legacy detail /
line-weight / contrast / background settings remain in `ConversionSettings`
with defaults (the prompt builder and Quick Outline still consume them)
but have no UI.

## Code map

```
src/features/converter/
  machine/    converter-machine.ts — pure reducer state machine (ADR 010)
  intake/     PhotoInputAdapter — file-upload, drag-and-drop,
              chrome-extension; one shared validator (ADR 009)
  providers/  PhotoConversionProvider seam + LocalProvider (Quick
              Outline) + ServerAiProvider (ADR 003, 011, 012)
  session/    sessionStorage state + IndexedDB blobs — refresh-proof
  export/     PNG download, pdf-lib US Letter PDF
  ui/         wizard orchestrator + one component per step
src/server/conversions/
  prompt-builder.ts     the ONE place prompt text exists
  vendor-adapter.ts     AiVendorAdapter seam (flux / mock / future)
  flux-adapter.ts       Black Forest Labs API (docs.bfl.ai)
  conversion-service.ts create/poll/output orchestration, rate limits,
                        cost logging
  conversion-token.ts   AES-GCM stateless job continuity
  validate-output.ts    sharp quality gate before "completed"
src/app/api/conversions/  POST create · GET poll · GET output
```

## State machine

Explicit statuses: `idle → uploaded → cropping → style-selected →
adjusting → processing → completed → printing`, plus `error`. Every UI
action and provider callback is a typed event through
`converterReducer(state, event)`; illegal transitions are no-ops. The
product constraints are encoded as transitions and unit-tested:

- **Every failure lands in `error` at step 5 with settings untouched.**
  There is no failure that restarts the flow.
- Cancel aborts the job and returns to step 4 with settings intact.
- Back is always available and lossless; the stepper revisits completed
  steps only.
- Progress is real stage progress reported by the provider — never an
  invented percentage.
- Print on step 6 calls `window.print()` directly against the print
  stylesheet (nav, footer and controls hidden; artwork centred in the
  0.5in safe margin). No interstitial.

## Session persistence

State (serializable) → sessionStorage; photo/result blobs → IndexedDB.
A refresh restores the wizard at the same step; a mid-flight or failed job
is restored to step 4 (the work is gone, the settings are not). Start
Over / Make another wipes both stores. All best-effort: blocked storage
degrades to an in-memory session, never an error.

## Local pipeline (LocalProvider)

Runs **in the browser** — the photo never leaves the device (ADR 011).
Canvas rasterizes the crop (letter aspect, 1400px long edge working
resolution); pure typed-array stages then run with progress reported
between them:

contrast → box blur → Sobel edges → threshold (+ background
simplification) → connected-component contour cleanup → morphological
line smoothing + line weight → render → PNG.

Style presets and the word sliders resolve to numeric parameters in
`resolveParams()`; thresholds are clamped below the blur-attenuated edge
ceiling so no combination can be blind. Real failure modes are detected
(`photo-too-dark` via mean luminance, `not-enough-detail` via mask
density) and map to the hi-fi failure shell with a remedy that fixes the
likely cause ("Try again with more contrast").

The Adjust step's live preview is an optional provider capability
(`preview()`, 420px pass); providers without it fall back to showing the
cropped photo.

## Privacy

Normal uploads are processed on-device and stored only in the browser's
own sessionStorage/IndexedDB. Extension handoffs transit a private,
single-use, expiring server store (see `docs/privacy-and-retention.md`).
Nothing is published, nothing joins the library, no photo bytes are
logged.
