import type { CropState } from "@/types/converter";

import type { Raster } from "./pipeline";

/**
 * The DOM half of the local pipeline: decode the photo, apply the crop
 * (orientation, quarter-turn rotation, zoom, pan) and produce the working
 * raster; later, encode the finished raster back to a PNG blob.
 *
 * The working resolution is capped: plenty for a US Letter print, small
 * enough that the pure pipeline runs in well under a second on a phone.
 */
export const WORKING_LONG_EDGE = 1400;
/** US Letter aspect (printable area is handled by @page margins). */
const LETTER_ASPECT = 8.5 / 11;

export function cropCanvasSize(
  crop: CropState,
  longEdge = WORKING_LONG_EDGE,
): { width: number; height: number } {
  return crop.orientation === "portrait"
    ? { width: Math.round(longEdge * LETTER_ASPECT), height: longEdge }
    : { width: longEdge, height: Math.round(longEdge * LETTER_ASPECT) };
}

function makeCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draw the photo behind the letter-aspect crop frame exactly as the crop
 * editor shows it: rotate by quarter turns, cover-fit, then apply zoom and
 * normalized pan.
 */
export async function rasterizeCrop(
  photo: Blob,
  crop: CropState,
  longEdge = WORKING_LONG_EDGE,
): Promise<Raster> {
  const bitmap = await createImageBitmap(photo);
  try {
    const { width, height } = cropCanvasSize(crop, longEdge);
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("2d context unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const rotated = crop.rotation % 180 !== 0;
    const photoW = rotated ? bitmap.height : bitmap.width;
    const photoH = rotated ? bitmap.width : bitmap.height;
    const cover = Math.max(width / photoW, height / photoH);
    const scale = cover * Math.max(1, crop.zoom);

    // Pan range: how far the scaled photo overhangs the frame per axis.
    const overX = (photoW * scale - width) / 2;
    const overY = (photoH * scale - height) / 2;

    ctx.save();
    ctx.translate(
      width / 2 - crop.offsetX * overX,
      height / 2 - crop.offsetY * overY,
    );
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    ctx.restore();

    const image = ctx.getImageData(0, 0, width, height);
    return { data: image.data, width: image.width, height: image.height };
  } finally {
    bitmap.close();
  }
}

/** Encode a raster to a PNG or JPEG blob. */
export async function encodeRasterBlob(
  raster: Raster,
  type: "image/png" | "image/jpeg",
  quality = 0.9,
): Promise<Blob> {
  const canvas = makeCanvas(raster.width, raster.height);
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("2d context unavailable");
  ctx.putImageData(
    new ImageData(
      new Uint8ClampedArray(raster.data),
      raster.width,
      raster.height,
    ),
    0,
    0,
  );
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
        type,
        quality,
      );
    });
  }
  return canvas.convertToBlob({ type, quality });
}

/** Encode a raster to a PNG blob. */
export function encodePng(raster: Raster): Promise<Blob> {
  return encodeRasterBlob(raster, "image/png");
}
