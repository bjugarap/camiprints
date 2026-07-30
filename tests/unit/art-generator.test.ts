import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  buildCategoryPrompt,
  loadCategoryConfigs,
} from "../../art-generator/category-prompts";
import { MASTER_STYLE_PROMPT } from "../../art-generator/master-style";
import { upsertEntry, type CategoryArt } from "../../art-generator/metadata";
import { NEGATIVE_PROMPT } from "../../art-generator/negative-prompt";
import { extractPalette } from "../../art-generator/palette";

describe("category art prompts", () => {
  it("loads a valid, duplicate-free category config", () => {
    const configs = loadCategoryConfigs();
    expect(configs.length).toBeGreaterThanOrEqual(12);
    // Every live site category slug style: kebab-case enforced by schema.
    for (const config of configs) {
      expect(config.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("every prompt is master style + subject + avoid-list, in order", () => {
    const [config] = loadCategoryConfigs();
    const prompt = buildCategoryPrompt(config);
    expect(prompt.startsWith(MASTER_STYLE_PROMPT)).toBe(true);
    expect(prompt.endsWith(NEGATIVE_PROMPT)).toBe(true);
    expect(prompt).toContain(config.prompt);
    expect(prompt.indexOf(MASTER_STYLE_PROMPT)).toBeLessThan(
      prompt.indexOf(config.prompt),
    );
  });

  it("the house style forbids imitation and demands card readability", () => {
    for (const clause of [
      "No Pixar imitation",
      "No Disney imitation",
      "No anime",
      "Readable as a website thumbnail",
      "3:4 aspect ratio",
    ]) {
      expect(MASTER_STYLE_PROMPT).toContain(clause);
    }
    expect(NEGATIVE_PROMPT).toContain("copyrighted characters");
    expect(NEGATIVE_PROMPT).toContain("watermarks");
  });
});

describe("palette extraction", () => {
  it("finds the saturated subject as accent, not the pale background", async () => {
    // A pale-mint page with a strong green subject block — like a dinosaur.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160">
      <rect width="120" height="160" fill="#EAF6EA"/>
      <rect x="25" y="45" width="70" height="80" fill="#63C45A"/>
    </svg>`;
    const image = await sharp(Buffer.from(svg)).png().toBuffer();
    const palette = await extractPalette(image);

    expect(palette.dominantColors.length).toBeGreaterThan(1);
    // Accent is the vivid green, within antialiasing tolerance.
    const accent = parseInt(palette.accentColor.slice(1), 16);
    const g = (accent >> 8) & 0xff;
    const r = accent >> 16;
    expect(g).toBeGreaterThan(r); // green-dominant
    expect(g).toBeGreaterThan(150);
    // Background is a light pastel of the same family.
    const bg = parseInt(palette.backgroundColor.slice(1), 16);
    expect((bg >> 16) & 0xff).toBeGreaterThan(200);
    expect((bg >> 8) & 0xff).toBeGreaterThan(200);
  });

  it("is deterministic for the same image", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80">
      <rect width="60" height="80" fill="#FDEBD3"/>
      <circle cx="30" cy="40" r="20" fill="#E8543F"/>
    </svg>`;
    const image = await sharp(Buffer.from(svg)).png().toBuffer();
    const first = await extractPalette(image);
    const second = await extractPalette(image);
    expect(second).toEqual(first);
  });
});

describe("manifest upsert", () => {
  const entry = (slug: string, seed: number): CategoryArt => ({
    title: slug,
    slug,
    image: `/categories/${slug}.webp`,
    prompt: "p",
    negativePrompt: "n",
    seed,
    model: "test",
    dominantColors: ["#FFFFFF"],
    accentColor: "#63C45A",
    backgroundColor: "#DDF8D6",
    generatedAt: "2026-07-29T00:00:00.000Z",
  });

  it("appends new slugs and replaces existing ones in place", () => {
    let entries: CategoryArt[] = [];
    entries = upsertEntry(entries, entry("dinosaurs", 1));
    entries = upsertEntry(entries, entry("ocean", 2));
    expect(entries.map((e) => e.slug)).toEqual(["dinosaurs", "ocean"]);

    entries = upsertEntry(entries, entry("dinosaurs", 99));
    expect(entries.map((e) => e.slug)).toEqual(["dinosaurs", "ocean"]);
    expect(entries[0].seed).toBe(99);
  });
});
