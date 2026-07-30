import sharp from "sharp";

/**
 * Palette extraction: turn a finished illustration into the small set of
 * colors the site can build UI from (card tint, hover accents, future
 * per-category theming). Pure math over pixels — deterministic for a given
 * image, no vendor round-trip.
 */
export interface Palette {
  /** Most-used colors, strongest first, as #RRGGBB. */
  dominantColors: string[];
  /** The most saturated well-represented color — the category's accent. */
  accentColor: string;
  /** A pastel tint of the accent, suitable behind text or as a card wash. */
  backgroundColor: string;
}

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

function saturationAndLightness(
  r: number,
  g: number,
  b: number,
): { saturation: number; lightness: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { saturation, lightness };
}

export async function extractPalette(image: Buffer): Promise<Palette> {
  // Small sample is plenty for dominant colors and 300× faster.
  const { data, info } = await sharp(image)
    .resize(48, 64, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Quantize to 4 bits per channel and average the real pixels in each
  // bucket so the representative color is faithful, not a bucket corner.
  const buckets = new Map<
    number,
    { count: number; r: number; g: number; b: number }
  >();
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .map(({ count, r, g, b }) => ({
      count,
      r: r / count,
      g: g / count,
      b: b / count,
    }))
    .sort((a, b) => b.count - a.count);

  const dominantColors = ranked
    .slice(0, 4)
    .map(({ r, g, b }) => toHex(r, g, b));

  // Accent: among the well-represented colors, the most saturated one that
  // is neither near-white nor near-black. Weight by sqrt(count) so a vivid
  // subject beats an acre of pale sky without tiny specks winning.
  let accent = ranked[0];
  let bestScore = -1;
  for (const color of ranked.slice(0, 12)) {
    const { saturation, lightness } = saturationAndLightness(
      color.r,
      color.g,
      color.b,
    );
    if (lightness < 0.18 || lightness > 0.88) continue;
    const score = saturation * Math.sqrt(color.count);
    if (score > bestScore) {
      bestScore = score;
      accent = color;
    }
  }
  const accentColor = toHex(accent.r, accent.g, accent.b);

  // Background: the accent mixed 82% toward white — a calm pastel wash in
  // the same family (e.g. green #63C45A → mint #DDF8D6).
  const mix = 0.82;
  const backgroundColor = toHex(
    accent.r + (255 - accent.r) * mix,
    accent.g + (255 - accent.g) * mix,
    accent.b + (255 - accent.b) * mix,
  );

  return { dominantColors, accentColor, backgroundColor };
}
