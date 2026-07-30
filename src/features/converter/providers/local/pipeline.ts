import type { ConversionSettings } from "@/types/converter";

/**
 * The local line-art pipeline as pure functions over raw RGBA buffers.
 * Nothing here touches the DOM — `Raster` is structurally compatible with
 * ImageData but constructible in any environment, so every stage is
 * unit-testable in Node. The DOM-facing rasterize/encode steps live in
 * rasterize.ts.
 *
 * Stage order (per the sprint pipeline): contrast → edge detection →
 * threshold (+ background simplification) → contour cleanup → line
 * smoothing / thickness → render. Crop and rotation happen upstream during
 * rasterization; PNG/PDF export downstream.
 */
export interface Raster {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Numeric knobs derived from the word-based user settings. */
export interface PipelineParams {
  contrastFactor: number;
  blurRadius: number;
  /** Edge-magnitude threshold, 0-255 space. Higher = fewer lines. */
  threshold: number;
  /** Connected components smaller than this many pixels are erased. */
  minComponentSize: number;
  /** Extra dilation passes for line weight (0 = fine). */
  lineWeightPasses: number;
  invert: boolean;
}

export function resolveParams(settings: ConversionSettings): PipelineParams {
  // The blur attenuates edges: a maximum-contrast (0→255) step smeared
  // over a radius-r box has Sobel response ≈ 510 / (2r + 1). Thresholds
  // are therefore chosen per style *below* that ceiling — and clamped to
  // it — or a style could never detect anything at all.
  // Classical edges cannot mimic AI styles; each style maps to the
  // nearest parameter bundle. "subject-only" implies background removal.
  const style = {
    bold: { blurRadius: 3, threshold: 45, minComponent: 90 },
    classic: { blurRadius: 2, threshold: 50, minComponent: 48 },
    detailed: { blurRadius: 1, threshold: 58, minComponent: 20 },
    cartoon: { blurRadius: 3, threshold: 42, minComponent: 70 },
    portrait: { blurRadius: 2, threshold: 48, minComponent: 40 },
    "subject-only": { blurRadius: 2, threshold: 50, minComponent: 48 },
  }[settings.style];
  const maxResponse = 510 / (2 * style.blurRadius + 1);

  const detailShift = {
    simpler: { threshold: +12, minComponent: 2.0 },
    "just-right": { threshold: 0, minComponent: 1.0 },
    "more-lines": { threshold: -8, minComponent: 0.55 },
  }[settings.detail];

  const contrastFactor = {
    softer: 0.85,
    normal: 1.15,
    stronger: 1.6,
  }[settings.advanced.contrast];

  const lineWeightPasses = { fine: 0, regular: 1, thick: 2 }[
    settings.advanced.lineWeight
  ];

  // Background simplification = demand stronger edges and larger shapes,
  // so soft texture and gradients drop out before cleanup.
  const removeBackground =
    settings.advanced.removeBackground || settings.style === "subject-only";
  const backgroundBoost = removeBackground ? 1.45 : 1;

  return {
    contrastFactor,
    blurRadius: style.blurRadius,
    threshold: Math.min(
      maxResponse * 0.85,
      Math.max(12, (style.threshold + detailShift.threshold) * backgroundBoost),
    ),
    minComponentSize: Math.round(
      style.minComponent * detailShift.minComponent * (removeBackground ? 2 : 1),
    ),
    lineWeightPasses,
    invert: settings.advanced.invert,
  };
}

/* ---------------------------------------------------------------- stages */

/** RGBA → luminance (Rec. 601), Float32 0-255. */
export function toGrayscale(raster: Raster): Float32Array {
  const { data, width, height } = raster;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }
  return gray;
}

export function meanLuminance(gray: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return gray.length === 0 ? 0 : sum / gray.length;
}

/** Linear contrast about mid-grey, clamped to 0-255. In place. */
export function adjustContrast(gray: Float32Array, factor: number): void {
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.min(255, Math.max(0, (gray[i] - 128) * factor + 128));
  }
}

/** Separable box blur; radius 0 is a no-op. */
export function boxBlur(
  gray: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius <= 0) return gray;
  const tmp = new Float32Array(gray.length);
  const out = new Float32Array(gray.length);
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        sum += gray[row + Math.min(width - 1, Math.max(0, x + k))];
      }
      tmp[row + x] = sum / span;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        sum += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x];
      }
      out[y * width + x] = sum / span;
    }
  }
  return out;
}

/** Sobel gradient magnitude. */
export function sobelMagnitude(
  gray: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const mag = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const a = gray[i - width - 1];
      const b = gray[i - width];
      const c = gray[i - width + 1];
      const d = gray[i - 1];
      const f = gray[i + 1];
      const g = gray[i + width - 1];
      const h = gray[i + width];
      const j = gray[i + width + 1];
      const gx = c + 2 * f + j - (a + 2 * d + g);
      const gy = g + 2 * h + j - (a + 2 * b + c);
      mag[i] = Math.hypot(gx, gy) / 4;
    }
  }
  return mag;
}

/** Binary line mask: 1 where the edge magnitude clears the threshold. */
export function thresholdMask(
  mag: Float32Array,
  threshold: number,
): Uint8Array {
  const mask = new Uint8Array(mag.length);
  for (let i = 0; i < mag.length; i++) {
    if (mag[i] >= threshold) mask[i] = 1;
  }
  return mask;
}

/**
 * Contour cleanup: erase 4-connected components smaller than `minSize`
 * pixels (specks, sensor noise, background texture). Iterative flood fill —
 * no recursion, safe on large images.
 */
export function removeSmallComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  minSize: number,
): Uint8Array {
  if (minSize <= 1) return mask;
  const visited = new Uint8Array(mask.length);
  const stack: number[] = [];
  const component: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    stack.length = 0;
    component.length = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const i = stack.pop()!;
      component.push(i);
      const x = i % width;
      if (x > 0 && mask[i - 1] && !visited[i - 1]) {
        visited[i - 1] = 1;
        stack.push(i - 1);
      }
      if (x < width - 1 && mask[i + 1] && !visited[i + 1]) {
        visited[i + 1] = 1;
        stack.push(i + 1);
      }
      if (i >= width && mask[i - width] && !visited[i - width]) {
        visited[i - width] = 1;
        stack.push(i - width);
      }
      if (i < mask.length - width && mask[i + width] && !visited[i + width]) {
        visited[i + width] = 1;
        stack.push(i + width);
      }
    }
    if (component.length < minSize) {
      for (const i of component) mask[i] = 0;
    }
  }
  return mask;
}

/**
 * 3×3 box structuring element (8-connected): unlike a cross element, a
 * box close can bridge one-pixel gaps in one-pixel lines, which is
 * exactly the defect Sobel + threshold leaves behind.
 */
function morph(
  mask: Uint8Array,
  width: number,
  height: number,
  mode: "dilate" | "erode",
): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      let acc = mode === "dilate" ? 0 : 1;
      for (let yy = y0; yy <= y1 && acc === (mode === "dilate" ? 0 : 1); yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const v = mask[yy * width + xx];
          if (mode === "dilate") {
            if (v) {
              acc = 1;
              break;
            }
          } else if (!v) {
            acc = 0;
            break;
          }
        }
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

export const dilate = (m: Uint8Array, w: number, h: number) =>
  morph(m, w, h, "dilate");
export const erode = (m: Uint8Array, w: number, h: number) =>
  morph(m, w, h, "erode");

/** Line smoothing: morphological close bridges pixel-scale gaps. */
export function smoothLines(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  return erode(dilate(mask, width, height), width, height);
}

/** Fraction of pixels that are line — sanity signal for "nothing traced". */
export function maskDensity(mask: Uint8Array): number {
  let on = 0;
  for (let i = 0; i < mask.length; i++) on += mask[i];
  return mask.length === 0 ? 0 : on / mask.length;
}

/** Mask → RGBA: black lines on white (or inverted). */
export function renderMask(
  mask: Uint8Array,
  width: number,
  height: number,
  invert: boolean,
): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  const line = invert ? 255 : 0;
  const paper = invert ? 0 : 255;
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] ? line : paper;
    const o = i * 4;
    data[o] = v;
    data[o + 1] = v;
    data[o + 2] = v;
    data[o + 3] = 255;
  }
  return { data, width, height };
}

/* --------------------------------------------------------------- quality */

/** Below this mean luminance the photo is declared too dark to trace. */
export const TOO_DARK_MEAN = 28;
/** Below this line density the result is declared empty. */
export const MIN_MASK_DENSITY = 0.0004;
