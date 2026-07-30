/**
 * The global avoid-list for every category illustration.
 *
 * FLUX models take a single prompt — the BFL API has no negative_prompt
 * parameter — so the avoid-list is appended to the prompt as an explicit
 * "Do not include" clause. It reads as instructions to the illustrator,
 * which is exactly how FLUX treats it.
 */
export const NEGATIVE_PROMPT_TERMS = [
  "copyrighted characters",
  "movie characters",
  "television characters",
  "video game characters",
  "logos",
  "watermarks",
  "text",
  "signatures",
  "ugly hands",
  "extra limbs",
  "duplicate people",
  "cropped faces",
  "poor anatomy",
  "low quality",
  "blurry",
  "dark horror",
  "violence",
  "weapons",
  "blood",
  "gore",
  "busy compositions",
  "oversaturated colors",
  "noise",
  "compression artifacts",
] as const;

export const NEGATIVE_PROMPT = `Do not include: ${NEGATIVE_PROMPT_TERMS.join(
  ", ",
)}.`;
