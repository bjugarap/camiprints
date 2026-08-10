import "server-only";

/**
 * Paper cleanup — the last thing that happens to an AI page before the
 * browser sees it.
 *
 * Vendors routinely return line art whose "white" is 245-ish and whose
 * "black" is 20-ish, sometimes with a faint colour cast. On screen that
 * reads as white; on paper the printer lays down real grey ink across the
 * whole sheet. The prompt asks for #FFFFFF (see PURE_WHITE_PAPER in
 * prompt-builder.ts), but a prompt is a request, not a guarantee — so a
 * fixed levels stretch snaps the paper to pure white and the ink to pure
 * black while leaving the values in between alone, which is what keeps the
 * anti-aliased outlines smooth instead of jagged.
 *
 * The transform is symmetric, so inverted pages (white lines on black)
 * clean up under exactly the same numbers.
 */
const BLACK_POINT = 12;
const WHITE_POINT = 232;

export async function flattenToPrintablePaper(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  try {
    const { default: sharp } = await import("sharp");
    const slope = 255 / (WHITE_POINT - BLACK_POINT);
    const cleaned = await sharp(Buffer.from(bytes), {
      limitInputPixels: 80_000_000,
    })
      // Any colour cast is grey ink too; back to sRGB so every consumer
      // (next/image, pdf-lib) sees an ordinary RGB PNG.
      .grayscale()
      .toColourspace("srgb")
      .linear(slope, -BLACK_POINT * slope)
      .png()
      .toBuffer();
    return new Uint8Array(cleaned);
  } catch {
    // Cosmetics must never cost the user their page.
    return bytes;
  }
}
