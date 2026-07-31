import sharp from "sharp";

/**
 * Technical validation for generated coloring pages. Extends the converter's
 * quality gate (src/server/conversions/validate-output.ts) with print
 * requirements: portrait orientation, print resolution, file size,
 * transparency, grayscale wash and safe margins. Hard failures are things a
 * human can't fix by approving; everything else is a FLAG for manual review
 * — suspicious pages are never auto-published.
 */
export interface PageValidation {
  ok: boolean;
  flags: string[];
  width: number | null;
  height: number | null;
  fileBytes: number | null;
}

/** Below this, the page is unusable even as a draft. */
const HARD_MIN_DIMENSION = 256;
/** Long edge below this prints soft on US Letter — flagged, not fatal. */
const PRINT_MIN_LONG_EDGE = 1000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MIN_DARK_FRACTION = 0.004;
const MAX_DARK_FRACTION = 0.35;
const MIN_LIGHT_FRACTION = 0.5;
/**
 * Dense fine linework antialiases into mid-gray when downsampled, so the
 * gray budget is calibrated against real flux-2-pro detailed pages (which
 * sit near 0.2 at a 512px sample); an actual gray WASH (filled tonal
 * regions) reads well above 0.3.
 */
const MAX_GRAY_FRACTION = 0.3;
/** Ink allowed in the outer 2.5% margin band before flagging clipping. */
const MAX_MARGIN_DARK_FRACTION = 0.04;

export async function validateGeneratedPage(
  bytes: Uint8Array,
): Promise<PageValidation> {
  const fileBytes = bytes.byteLength;
  const flags: string[] = [];

  let width: number;
  let height: number;
  let sample: Buffer;
  let sampleW: number;
  let sampleH: number;
  try {
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 80_000_000 });
    const metadata = await image.metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
    if (width < HARD_MIN_DIMENSION || height < HARD_MIN_DIMENSION) {
      return { ok: false, flags: ["too-small"], width, height, fileBytes };
    }
    if (metadata.hasAlpha) {
      const stats = await image.clone().stats();
      const alpha = stats.channels[stats.channels.length - 1];
      if (alpha && alpha.min < 250) flags.push("unexpected-transparency");
    }
    const raw = await image
      .clone()
      .flatten({ background: "#ffffff" })
      .resize(512, 512, { fit: "inside" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    sample = raw.data;
    sampleW = raw.info.width;
    sampleH = raw.info.height;
  } catch {
    return { ok: false, flags: ["undecodable"], width: null, height: null, fileBytes };
  }

  if (height <= width) flags.push("not-portrait");
  if (Math.max(width, height) < PRINT_MIN_LONG_EDGE) {
    flags.push("below-print-resolution");
  }
  if (fileBytes > MAX_FILE_BYTES) flags.push("file-too-large");

  let dark = 0;
  let light = 0;
  let gray = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] < 80) dark += 1;
    else if (sample[i] > 200) light += 1;
    else gray += 1;
  }
  const total = sample.length;
  const darkFraction = dark / total;
  if (darkFraction < MIN_DARK_FRACTION) {
    return { ok: false, flags: [...flags, "blank"], width, height, fileBytes };
  }
  if (darkFraction > MAX_DARK_FRACTION) {
    return { ok: false, flags: [...flags, "mostly-black"], width, height, fileBytes };
  }
  if (light / total < MIN_LIGHT_FRACTION) flags.push("background-not-white");
  if (gray / total > MAX_GRAY_FRACTION) flags.push("grayscale-wash");

  // Safe print margins: the outer band should be nearly ink-free.
  const marginX = Math.max(1, Math.round(sampleW * 0.025));
  const marginY = Math.max(1, Math.round(sampleH * 0.025));
  let marginDark = 0;
  let marginTotal = 0;
  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const inBand =
        x < marginX || x >= sampleW - marginX || y < marginY || y >= sampleH - marginY;
      if (!inBand) continue;
      marginTotal += 1;
      if (sample[y * sampleW + x] < 80) marginDark += 1;
    }
  }
  if (marginTotal > 0 && marginDark / marginTotal > MAX_MARGIN_DARK_FRACTION) {
    flags.push("edge-clipping");
  }

  return { ok: true, flags, width, height, fileBytes };
}
