import { z } from "zod";

import { MASTER_STYLE_PROMPT } from "./master-style";
import { NEGATIVE_PROMPT } from "./negative-prompt";
import categoriesJson from "./categories.json";

/**
 * The category configuration and the ONE place a full generation prompt is
 * assembled: master style + category subject + avoid-list. Adding a new
 * category to the site's artwork set is one entry in categories.json.
 */
const categoryConfigSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  prompt: z.string().min(10),
});

export type CategoryConfig = z.infer<typeof categoryConfigSchema>;

export function loadCategoryConfigs(): CategoryConfig[] {
  const configs = z.array(categoryConfigSchema).parse(categoriesJson);
  const seen = new Set<string>();
  for (const config of configs) {
    if (seen.has(config.slug)) {
      throw new Error(`duplicate category slug: ${config.slug}`);
    }
    seen.add(config.slug);
  }
  return configs;
}

/** Master style + category subject + avoid-list, in that order. */
export function buildCategoryPrompt(config: CategoryConfig): string {
  return `${MASTER_STYLE_PROMPT} ${config.prompt} ${NEGATIVE_PROMPT}`;
}
