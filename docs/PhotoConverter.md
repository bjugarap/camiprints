# Photo converter

Six steps at `/create/photo`: **1 Photo · 2 Crop · 3 Style · 4 Adjust ·
5 Preview · 6 Print**. The shell (title, stepper, Back/Continue) is fixed;
only the middle region changes. Full state inventory is in the design
handoff (hi-fi 5d, wireframes 3a–3f).

## Flow state

One client-side object drives the flow:

```ts
{
  step, file, crop, style, detail,
  advanced: { lineWeight, contrast, removeBackground, invert },
  jobId, status, // idle → uploading → queued → processing → ready | failed
  error, resultUrl,
}
```

Rules the implementation must keep (product constraints):

- Every failure sets `error` and leaves `step` at **5** with everything else
  untouched. There is no failure that restarts the flow.
- Cancel during generation aborts the request and returns to step 4 with
  settings intact.
- Back is always available and lossless.
- Upload progress is real byte progress — never an invented percentage.
- Print on step 6 opens the system dialog directly. No interstitial.

## Local pipeline (LocalProvider)

Sharp: decode, EXIF-rotate, crop, resize, grayscale, normalize, contrast →
OpenCV.js (WASM): Gaussian blur, Canny/adaptive threshold, contour cleanup
(minimum-area scaled by the detail setting), morphological line smoothing,
optional background simplification → PNG at print resolution plus a low-res
preview. Style presets are parameter bundles over the same pipeline.

## Privacy

Photos upload to a **private** bucket keyed by session, with `expiresAt`;
expired uploads are deleted by scheduled cleanup. Results are anonymous and
expire too unless the user opts in to save to their account. Admin access to
any user photo is audit-logged (`AdminAuditLog`).
