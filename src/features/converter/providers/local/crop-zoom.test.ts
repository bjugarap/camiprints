import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/types/converter";

import { clampCropZoom, MAX_CROP_ZOOM, minZoomFor } from "./rasterize";

/** US Letter landscape frame at the crop editor's reference width. */
const FRAME_W = 560;
const FRAME_H = (560 * 8.5) / 11;

describe("crop zoom floor (contain-fit)", () => {
  it("a 1200×674 photo on a wide page can zoom out until fully visible", () => {
    // The reported bug: wider-than-page photos were permanently cropped.
    const minZoom = minZoomFor(1200, 674, FRAME_W, FRAME_H);
    expect(minZoom).toBeLessThan(1);
    expect(minZoom).toBeGreaterThan(0.5);

    // At the floor, the photo's long edge exactly fits the frame width —
    // contain-fit, nothing cut off.
    const cover = Math.max(FRAME_W / 1200, FRAME_H / 674);
    const scaledWidth = 1200 * cover * minZoom;
    expect(scaledWidth).toBeCloseTo(FRAME_W, 6);
  });

  it("a photo matching the page aspect has a floor of exactly 1", () => {
    expect(minZoomFor(1100, 850, FRAME_W, FRAME_H)).toBeCloseTo(1, 6);
  });

  it("works for photos narrower than the page too", () => {
    // A tall portrait photo on a wide page: floor fits its height... its
    // width — the long mismatch axis — must fit inside the frame.
    const minZoom = minZoomFor(674, 1200, FRAME_W, FRAME_H);
    const cover = Math.max(FRAME_W / 674, FRAME_H / 1200);
    expect(1200 * cover * minZoom).toBeCloseTo(FRAME_H, 6);
  });

  it("clamp respects the floor and the ceiling", () => {
    const minZoom = minZoomFor(1200, 674, FRAME_W, FRAME_H);
    expect(clampCropZoom(0.1, 1200, 674, FRAME_W, FRAME_H)).toBeCloseTo(
      minZoom,
      6,
    );
    expect(clampCropZoom(99, 1200, 674, FRAME_W, FRAME_H)).toBe(MAX_CROP_ZOOM);
    expect(clampCropZoom(1.5, 1200, 674, FRAME_W, FRAME_H)).toBe(1.5);
  });

  it("the default crop opens on the whole photo, whatever its shape", () => {
    // DEFAULT_CROP can't name the floor (it depends on the photo), so it
    // sits below every floor and clamps up to exactly contain-fit.
    for (const [w, h] of [
      [1200, 674], // wider than the page
      [674, 1200], // taller than the page
      [1100, 850], // same shape as the page
      [1000, 1000], // square
    ]) {
      const floor = minZoomFor(w, h, FRAME_W, FRAME_H);
      expect(clampCropZoom(DEFAULT_CROP.zoom, w, h, FRAME_W, FRAME_H)).toBeCloseTo(
        floor,
        6,
      );
    }
  });

  it("is resolution-independent — editor and rasterizer always agree", () => {
    // Same aspect ratios at different pixel sizes → identical floor.
    const editor = minZoomFor(1200, 674, 560, (560 * 8.5) / 11);
    const raster = minZoomFor(1200, 674, 1400, (1400 * 8.5) / 11);
    expect(editor).toBeCloseTo(raster, 10);
  });
});
