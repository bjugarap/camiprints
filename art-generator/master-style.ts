/**
 * The CamiPrints master art direction — the ONE place the house style
 * exists. Every category illustration begins with this prompt so that
 * hundreds of images, generated months apart, still look painted by the
 * same illustrator for the same premium children's publishing company.
 *
 * These are cover illustrations for category cards, NOT coloring pages:
 * full colour, painterly, joyful. Original artwork only — the style
 * deliberately forbids imitating any studio or franchise.
 */
export const MASTER_STYLE_PROMPT = [
  "A premium children's picture-book illustration.",
  "Bright cheerful pastel color palette.",
  "Soft painterly digital artwork.",
  "Warm natural lighting.",
  "Highly expressive characters.",
  "Rounded shapes.",
  "Friendly faces.",
  "Gentle gradients.",
  "Whimsical atmosphere.",
  "Premium storybook quality.",
  "Beautiful composition.",
  "Simple clean backgrounds.",
  "No clutter.",
  "Large central subject.",
  "Minimal tiny details.",
  "Readable as a website thumbnail.",
  "Family friendly.",
  "Modern.",
  "Soft shadows.",
  "Vibrant but not oversaturated.",
  "Artwork should feel hand illustrated rather than AI generated.",
  "No realism.",
  "No anime.",
  "No Pixar imitation.",
  "No Disney imitation.",
  "No clip art.",
  "No vector art.",
  "Portrait composition.",
  "3:4 aspect ratio.",
  // "Safe margins for rounded cards" made FLUX.2 pro paint a literal
  // rounded-corner frame; say what we mean instead.
  "Full-bleed artwork that reaches every edge of the image.",
  "No border, no frame, no rounded corners, no card edge.",
  "Keep the main subject comfortably away from the edges.",
  "Warm white balance.",
  "Consistent lighting.",
  "Consistent artistic style.",
].join(" ");

/**
 * Generation settings shared by every category — consistency across the
 * whole set matters more than per-image tuning.
 */
export const ART_SETTINGS = {
  /** Portrait cards; matches the "3:4 aspect ratio" style clause. */
  aspectRatio: "3:4",
  /** Vendor-side format; we re-encode to webp for the site. */
  outputFormat: "png",
  /** Stored size — 2× the largest card rendering, small on disk. */
  outputWidth: 480,
  outputHeight: 640,
  webpQuality: 82,
} as const;
