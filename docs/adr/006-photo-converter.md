# ADR 006 — Photo converter pipeline

**Status**: Accepted · 2026-07-26

## Context

The initial converter must be fully functional with **no external AI APIs**:
upload → crop/rotate → style → adjust → preview → print, with PNG/PDF
export, on the LocalProvider (ADR 003).

## Decision

Server-side pipeline in a Node runtime route: **Sharp** for decode,
EXIF-aware rotation, crop, resize, grayscale, normalize and contrast;
**OpenCV.js (WASM)** for Gaussian blur, edge detection (Canny/adaptive
threshold), contour cleanup, background simplification and morphological
line smoothing. Output: print-resolution PNG + low-res preview. The five
styles are parameter presets over this one pipeline; the detail slider and
expert controls override preset values.

## Why

- Sharp is the fastest mainstream image codec layer for Node and handles
  the dangerous parts (EXIF, colourspace) correctly.
- OpenCV gives real contour operations — needed for "fewer, bigger shapes"
  to genuinely mean fewer contours, not just a blur.
- Server-side keeps the pipeline identical across devices and lets future
  AI providers slot in behind the same API.

## Consequences

The conversion endpoint is Node-only (not Edge) and must enforce upload
limits (10 MB; JPG/JPEG/PNG/WEBP) with the handoff's named error messages.
