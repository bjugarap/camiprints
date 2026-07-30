/**
 * The versioned master prompt builder for generated coloring pages — the
 * ONE place this prompt text exists. The version string is stored on every
 * generated page; changing the prompt requires bumping the version so
 * historical metadata stays truthful.
 */
export const COLORING_PROMPT_VERSION = "coloring-page-v1";

export const COMPLEXITIES = ["toddler", "kids", "detailed"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

const BASE_PROMPT = [
  "Create an original, professional children's coloring-book page based on the subject description below.",
  "Use pure black line art on a pure white background.",
  "Use bold, smooth, continuous outer outlines and clean medium-weight interior lines.",
  "Create large, enclosed areas that are easy and enjoyable to color.",
  "Use a clean, polished, hand-drawn coloring-book appearance.",
  "Keep the composition visually balanced with generous white margins.",
  "Ensure the primary subject is complete and centered.",
  "Use recognizable shapes and expressive, friendly features.",
  "Simplify small details while preserving the identity of the subject.",
  "The page must print clearly on both US Letter and A4 paper.",
].join(" ");

const AVOID_CLAUSE =
  "Do not include: color, grayscale, shadows, gradients, crosshatching, " +
  "sketch marks, photographic texture, solid black regions, tiny cluttered " +
  "details, text, captions, letters unless educationally required, logos, " +
  "signatures, watermarks, borders, cropped limbs, cropped heads, malformed " +
  "anatomy, duplicate body parts, or recognizable copyrighted characters. " +
  "The output must look like professionally published coloring-book line " +
  "art, not a converted photograph and not a rough pencil sketch.";

export const COMPLEXITY_WORDING: Record<Complexity, string> = {
  toddler:
    "This page is for toddlers aged about 2 to 4: draw one large primary " +
    "subject with very thick outlines, minimal internal detail, large " +
    "enclosed spaces, a very simple background or no background, and no " +
    "tiny decorative elements.",
  kids:
    "This page is for children aged about 5 to 9: draw a clear primary " +
    "subject with medium-thick outlines, moderate internal detail, a " +
    "simple contextual background, and large and medium coloring spaces.",
  detailed:
    "This page is for older children and adults: use thinner clean lines, " +
    "a richer background and more decorative detail, while still avoiding " +
    "visual noise and preserving enclosed coloring areas.",
};

export function buildColoringPrompt(
  subjectPrompt: string,
  complexity: Complexity,
): string {
  return `${BASE_PROMPT} Subject: ${subjectPrompt} ${COMPLEXITY_WORDING[complexity]} ${AVOID_CLAUSE}`;
}
