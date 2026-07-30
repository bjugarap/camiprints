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
  "Create clean black line art on a pure white background with smooth,",
  "confident outlines and fully enclosed coloring regions.",
  "Remove all grayscale, shadows, gradients, noise, textures, clutter,",
  "watermarks, logos, and text.",
  "Do not add subjects, remove subjects, change the pose, change the",
  "expression, or crop away body parts.",
  "No sketch lines, no hatching, no gray shading — only solid black",
  "outlines on white.",
  "Center the subject with generous white margins on all sides.",
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
    "Style: the main subject only, on a completely empty white page — " +
    "remove the background and scenery entirely.",
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
    STYLE_WORDING[settings.style],
    DETAIL_WORDING[settings.detail],
    LINE_WEIGHT_WORDING[settings.advanced.lineWeight],
  ];
  if (settings.advanced.removeBackground || settings.style === "subject-only") {
    parts.push(
      "Remove the background entirely: the subject alone on plain white, " +
        "no scenery.",
    );
  } else {
    parts.push(
      "Keep a simplified version of the background as outlined shapes " +
        "that are easy to color.",
    );
  }
  if (settings.advanced.invert) {
    parts.push(
      "Render inverted: white line art on a solid black background.",
    );
  }
  return parts.join(" ");
}
