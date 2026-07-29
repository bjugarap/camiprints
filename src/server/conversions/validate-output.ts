import "server-only";

/**
 * Quality gate for AI output: before the browser ever sees a result, the
 * server verifies it actually looks like a coloring page. Anything that
 * fails maps to the calm "ai-bad-output" retry UI — never a broken image.
 */
export interface OutputValidation {
  ok: boolean;
  reason?:
    | "undecodable"
    | "too-small"
    | "blank"
    | "too-dark"
    | "not-line-art";
  width?: number;
  height?: number;
}

const MIN_DIMENSION = 256;
/** Fraction of near-black pixels (line content). */
const MIN_DARK_FRACTION = 0.002;
const MAX_DARK_FRACTION = 0.55;
/** Fraction of near-white pixels (paper). */
const MIN_LIGHT_FRACTION = 0.35;

export async function validateColoringPageOutput(
  bytes: Uint8Array,
  options: { invertExpected?: boolean } = {},
): Promise<OutputValidation> {
  const { default: sharp } = await import("sharp");

  let width: number;
  let height: number;
  let sample: Buffer;
  try {
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 80_000_000 });
    const metadata = await image.metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return { ok: false, reason: "too-small", width, height };
    }
    sample = await image
      .resize(256, 256, { fit: "inside" })
      .grayscale()
      .raw()
      .toBuffer();
  } catch {
    return { ok: false, reason: "undecodable" };
  }

  let dark = 0;
  let light = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] < 80) dark += 1;
    else if (sample[i] > 200) light += 1;
  }
  let darkFraction = dark / sample.length;
  let lightFraction = light / sample.length;
  // Inverted pages (white lines on black) swap the roles of ink and paper.
  if (options.invertExpected) {
    [darkFraction, lightFraction] = [lightFraction, darkFraction];
  }

  if (darkFraction < MIN_DARK_FRACTION) {
    return { ok: false, reason: "blank", width, height };
  }
  if (darkFraction > MAX_DARK_FRACTION) {
    return { ok: false, reason: "too-dark", width, height };
  }
  if (lightFraction < MIN_LIGHT_FRACTION) {
    return { ok: false, reason: "not-line-art", width, height };
  }
  return { ok: true, width, height };
}
