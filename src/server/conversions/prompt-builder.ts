import type { ConversionSettings } from "@/types/converter";

/**
 * The one place prompts are built. Every AI vendor adapter receives its
 * prompt from here; no component, route or adapter composes prompt text
 * anywhere else. The user's word-valued settings (style, detail slider,
 * line thickness, background, invert) turn into wording deltas on one
 * base prompt.
 */
const BASE_PROMPT = [
  "Transform the supplied image into a premium printable children's",
  "coloring-book page.",
  "Preserve the subject, pose, facial expression, clothing, hairstyle,",
  "and important objects exactly as shown.",
  // Framing is the user's decision, made in the crop step — the model
  // redraws that frame, it does not re-compose it. Without this, vendors
  // happily zoom into the subject and cut off whatever the user zoomed
  // out to include.
  "Redraw the ENTIRE supplied frame, edge to edge, with identical framing,",
  "composition, and scale: everything visible in the input appears in the",
  "output, in the same place.",
  "Do not crop, zoom in, pan, re-center, or re-frame, and do not cut off",
  "heads, limbs, or objects that touch the edges of the frame.",
  "If the supplied image already has blank margins around the picture,",
  "keep them exactly as they are — do not fill, extend, or outpaint them.",
  "Create clean black line art with smooth, confident outlines and fully",
  "enclosed coloring regions.",
  "Remove all grayscale, shadows, gradients, noise, textures, clutter,",
  "watermarks, logos, and text.",
  "Do not add subjects, remove subjects, change the pose, change the",
  "expression, or crop away body parts.",
  "No sketch lines, no hatching, no gray shading — only solid black",
  "outlines on white.",
].join(" ");

/**
 * The paper. A printer renders any off-white as real grey ink across the
 * whole sheet, so "white" has to be demanded as an exact value rather than
 * implied. flattenToPrintablePaper() backstops this after generation.
 */
const PURE_WHITE_PAPER = [
  "Draw on a pure white background: every pixel that is not part of a",
  "black outline must be pure white (#FFFFFF, RGB 255,255,255), so the",
  "printer leaves it blank.",
  "No grey, off-white, cream, beige, or tinted fill, no background wash,",
  "no paper texture, no vignette, no border or frame, no drop shadow, and",
  "no light grey fills inside the shapes.",
].join(" ");

const INVERTED_PAPER = [
  "Render inverted: white line art on a solid black background.",
  "The background must be uniform pure black (#000000) with no grey areas",
  "or gradients, and the lines pure white.",
].join(" ");

export const STYLE_WORDING: Record<ConversionSettings["style"], string> = {
  bold:
    "Style: bold and simple, like a coloring book for young children — " +
    "very thick outlines and big, generous open regions.",
  classic:
    "Style: a classic storybook coloring page with balanced, friendly detail.",
  detailed:
    "Style: a finely detailed coloring page for patient hands, with " +
    "more intricate regions to color.",
  cartoon:
    "Style: a cute cartoon interpretation — rounded, friendly, slightly " +
    "exaggerated proportions like a family animated film, with clean " +
    "medium-weight outlines.",
  portrait:
    "Style: a portrait-first coloring page — the face is the focus, drawn " +
    "with clean, flattering, well-proportioned features and simple " +
    "surroundings.",
  "subject-only":
    "Style: the main subject only, on a completely empty pure-white page " +
    "— remove the background and scenery entirely, but keep the subject " +
    "at its original size and position within the frame.",
};

const DETAIL_WORDING: Record<ConversionSettings["detail"], string> = {
  simpler:
    "Simplify aggressively: keep only the most important outlines and " +
    "merge small details into larger shapes.",
  "just-right": "Keep a moderate, balanced amount of detail.",
  "more-lines":
    "Keep more of the original detail: include secondary outlines and " +
    "interior lines where they help coloring.",
};

const LINE_WEIGHT_WORDING: Record<
  ConversionSettings["advanced"]["lineWeight"],
  string
> = {
  fine: "Use fine, precise outlines.",
  regular: "Use medium-weight outlines.",
  thick: "Use thick, chunky outlines that are easy for small hands to color inside.",
};

export function buildConversionPrompt(settings: ConversionSettings): string {
  const parts = [
    BASE_PROMPT,
    settings.advanced.invert ? INVERTED_PAPER : PURE_WHITE_PAPER,
    STYLE_WORDING[settings.style],
    DETAIL_WORDING[settings.detail],
    LINE_WEIGHT_WORDING[settings.advanced.lineWeight],
  ];
  if (settings.advanced.removeBackground || settings.style === "subject-only") {
    parts.push(
      "Remove the background entirely: the subject alone on plain white, " +
        "no scenery — the subject keeps its original position and scale.",
    );
  } else {
    parts.push(
      "Keep a simplified version of the background as outlined shapes " +
        "that are easy to color, covering the whole frame right to the " +
        "edges.",
    );
  }
  return parts.join(" ");
}
