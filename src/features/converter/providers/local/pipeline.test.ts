import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, type ConversionSettings } from "@/types/converter";

import {
  adjustContrast,
  boxBlur,
  dilate,
  maskDensity,
  meanLuminance,
  removeSmallComponents,
  renderMask,
  resolveParams,
  smoothLines,
  sobelMagnitude,
  thresholdMask,
  toGrayscale,
  type Raster,
} from "./pipeline";

/** Solid-colour raster with an optional darker centered square. */
function makeRaster(
  width: number,
  height: number,
  background: number,
  square?: { size: number; value: number },
): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    data[o] = data[o + 1] = data[o + 2] = background;
    data[o + 3] = 255;
  }
  if (square) {
    const x0 = Math.floor((width - square.size) / 2);
    const y0 = Math.floor((height - square.size) / 2);
    for (let y = y0; y < y0 + square.size; y++) {
      for (let x = x0; x < x0 + square.size; x++) {
        const o = (y * width + x) * 4;
        data[o] = data[o + 1] = data[o + 2] = square.value;
      }
    }
  }
  return { data, width, height };
}

describe("pipeline stages", () => {
  it("grayscale + mean luminance report a dark photo as dark", () => {
    const dark = toGrayscale(makeRaster(20, 20, 10));
    const light = toGrayscale(makeRaster(20, 20, 240));
    expect(meanLuminance(dark)).toBeLessThan(28);
    expect(meanLuminance(light)).toBeGreaterThan(200);
  });

  it("contrast stretches values away from mid-grey and clamps", () => {
    const gray = new Float32Array([0, 100, 128, 156, 255]);
    adjustContrast(gray, 2);
    expect(gray[0]).toBe(0);
    expect(gray[1]).toBe(72); // (100-128)*2+128
    expect(gray[2]).toBe(128);
    expect(gray[3]).toBe(184);
    expect(gray[4]).toBe(255);
  });

  it("box blur preserves a flat field", () => {
    const flat = new Float32Array(64).fill(77);
    const blurred = boxBlur(flat, 8, 8, 2);
    for (const v of blurred) expect(v).toBeCloseTo(77, 5);
  });

  it("finds the outline of a square, not its interior", () => {
    const raster = makeRaster(40, 40, 255, { size: 16, value: 0 });
    const gray = toGrayscale(raster);
    const mag = sobelMagnitude(gray, 40, 40);
    const mask = thresholdMask(mag, 64);

    // Edge pixels present…
    expect(maskDensity(mask)).toBeGreaterThan(0);
    // …but the square's centre and the far background stay empty.
    expect(mask[20 * 40 + 20]).toBe(0);
    expect(mask[2 * 40 + 2]).toBe(0);
  });

  it("contour cleanup removes specks but keeps real shapes", () => {
    const width = 30;
    const height = 30;
    const mask = new Uint8Array(width * height);
    mask[5 * width + 5] = 1; // 1px speck
    for (let x = 10; x < 26; x++) mask[15 * width + x] = 1; // 16px line

    removeSmallComponents(mask, width, height, 8);
    expect(mask[5 * width + 5]).toBe(0);
    expect(mask[15 * width + 12]).toBe(1);
  });

  it("smoothing closes a one-pixel gap in a line", () => {
    const width = 20;
    const height = 9;
    const mask = new Uint8Array(width * height);
    for (let x = 2; x < 18; x++) {
      if (x !== 10) mask[4 * width + x] = 1;
    }
    const smoothed = smoothLines(mask, width, height);
    expect(smoothed[4 * width + 10]).toBe(1);
  });

  it("dilate thickens a line", () => {
    const width = 15;
    const height = 15;
    const mask = new Uint8Array(width * height);
    for (let x = 2; x < 13; x++) mask[7 * width + x] = 1;
    const before = maskDensity(mask);
    const after = maskDensity(dilate(mask, width, height));
    expect(after).toBeGreaterThan(before);
  });

  it("renders black-on-white, and inverted white-on-black", () => {
    const mask = new Uint8Array([1, 0]);
    const normal = renderMask(mask, 2, 1, false);
    expect([normal.data[0], normal.data[4]]).toEqual([0, 255]);
    const inverted = renderMask(mask, 2, 1, true);
    expect([inverted.data[0], inverted.data[4]]).toEqual([255, 0]);
  });
});

describe("settings → parameters", () => {
  it("word sliders move the numeric knobs the right direction", () => {
    const simpler = resolveParams({ ...DEFAULT_SETTINGS, detail: "simpler" });
    const moreLines = resolveParams({
      ...DEFAULT_SETTINGS,
      detail: "more-lines",
    });
    expect(simpler.threshold).toBeGreaterThan(moreLines.threshold);
    expect(simpler.minComponentSize).toBeGreaterThan(
      moreLines.minComponentSize,
    );
  });

  it("background removal demands stronger edges and larger shapes", () => {
    const withBg = resolveParams(DEFAULT_SETTINGS);
    const noBg: ConversionSettings = {
      ...DEFAULT_SETTINGS,
      advanced: { ...DEFAULT_SETTINGS.advanced, removeBackground: true },
    };
    const without = resolveParams(noBg);
    expect(without.threshold).toBeGreaterThan(withBg.threshold);
    expect(without.minComponentSize).toBeGreaterThan(withBg.minComponentSize);
  });

  it("bold style is blurrier and more selective than detailed", () => {
    const bold = resolveParams({ ...DEFAULT_SETTINGS, style: "bold" });
    const detailed = resolveParams({ ...DEFAULT_SETTINGS, style: "detailed" });
    expect(bold.blurRadius).toBeGreaterThan(detailed.blurRadius);
    // Selectivity is threshold relative to the blur-attenuated ceiling —
    // raw thresholds are not comparable across blur radii.
    const selectivity = (p: { threshold: number; blurRadius: number }) =>
      p.threshold * (2 * p.blurRadius + 1);
    expect(selectivity(bold)).toBeGreaterThan(selectivity(detailed));
    expect(bold.minComponentSize).toBeGreaterThan(detailed.minComponentSize);
  });

  it("no style/detail combination can exceed its detectable ceiling", () => {
    for (const style of ["bold", "classic", "detailed"] as const) {
      const params = resolveParams({
        ...DEFAULT_SETTINGS,
        style,
        detail: "simpler",
        advanced: { ...DEFAULT_SETTINGS.advanced, removeBackground: true },
      });
      const ceiling = 510 / (2 * params.blurRadius + 1);
      expect(params.threshold).toBeLessThan(ceiling);
    }
  });
});
