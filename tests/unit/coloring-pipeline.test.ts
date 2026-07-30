import { describe, expect, it } from "vitest";

import { findBannedTerms } from "../../content/coloring-pages/banned-terms";
import {
  LAUNCH_CATEGORIES,
  LAUNCH_CATEGORY_SLUGS,
} from "../../content/coloring-pages/categories";
import { CONCEPTS } from "../../content/coloring-pages/concepts";
import {
  applyBudget,
  beginRegeneration,
  manifestEntrySchema,
  replaceEntry,
  selectEntries,
  type ManifestEntry,
} from "../../content/coloring-pages/manifest";
import {
  buildAltText,
  toPublishedPage,
  COMPLEXITY_CATALOG_MAPPING,
} from "../../content/coloring-pages/publish-transform";
import {
  buildColoringPrompt,
  COLORING_PROMPT_VERSION,
  COMPLEXITY_WORDING,
} from "../../content/coloring-pages/prompt";
import { buildPlannedEntries, promptSimilarity, slugify } from "../../scripts/coloring/plan";
import { generationControls } from "../../scripts/coloring/lib";
import { seedPages } from "../../src/server/data/seed-data";

describe("content plan", () => {
  const entries = buildPlannedEntries();

  it("plans exactly 20 concepts per category, 240 total", () => {
    expect(entries).toHaveLength(240);
    for (const slug of LAUNCH_CATEGORY_SLUGS) {
      expect(entries.filter((e) => e.categorySlug === slug)).toHaveLength(20);
    }
    expect(LAUNCH_CATEGORIES).toHaveLength(12);
  });

  it("ids and per-category slugs are unique; slugs are kebab-case", () => {
    const ids = new Set(entries.map((e) => e.id));
    expect(ids.size).toBe(240);
    for (const slug of LAUNCH_CATEGORY_SLUGS) {
      const slugs = entries
        .filter((e) => e.categorySlug === slug)
        .map((e) => e.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
    for (const entry of entries) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("honours the complexity distribution rules", () => {
    const distribution = (slug: string) => {
      const inCategory = entries.filter((e) => e.categorySlug === slug);
      return {
        toddler: inCategory.filter((e) => e.complexity === "toddler").length,
        kids: inCategory.filter((e) => e.complexity === "kids").length,
        detailed: inCategory.filter((e) => e.complexity === "detailed").length,
      };
    };
    expect(distribution("adults")).toEqual({ toddler: 0, kids: 4, detailed: 16 });
    expect(distribution("toddlers")).toEqual({ toddler: 16, kids: 4, detailed: 0 });
    for (const slug of LAUNCH_CATEGORY_SLUGS) {
      if (slug === "adults" || slug === "toddlers") continue;
      expect(distribution(slug)).toEqual({ toddler: 6, kids: 10, detailed: 4 });
    }
  });

  it("contains no banned copyrighted terms in any title or prompt", () => {
    for (const entry of entries) {
      const found = findBannedTerms(`${entry.title} ${entry.subjectPrompt}`);
      expect(found, `${entry.id}: ${found.join(", ")}`).toEqual([]);
    }
  });

  it("does not collide with existing hand-written catalog slugs", () => {
    const existing = new Set(
      seedPages.map((page) => `${page.categorySlug}/${page.slug}`),
    );
    for (const entry of entries) {
      expect(existing.has(`${entry.categorySlug}/${entry.slug}`)).toBe(false);
    }
  });

  it("no two concepts in a category are near-duplicates", () => {
    for (const slug of LAUNCH_CATEGORY_SLUGS) {
      const inCategory = entries.filter((e) => e.categorySlug === slug);
      for (let i = 0; i < inCategory.length; i++) {
        for (let j = i + 1; j < inCategory.length; j++) {
          const score = promptSimilarity(
            inCategory[i].subjectPrompt,
            inCategory[j].subjectPrompt,
          );
          expect(
            score,
            `${inCategory[i].id} ~ ${inCategory[j].id}`,
          ).toBeLessThanOrEqual(0.6);
        }
      }
    }
  });

  it("sample spread: the first 3 of each category cover its complexity mix", () => {
    for (const slug of LAUNCH_CATEGORY_SLUGS) {
      const firstThree = CONCEPTS[slug].slice(0, 3).map((c) => c.complexity);
      if (slug === "adults") {
        expect(firstThree).toEqual(["kids", "detailed", "detailed"]);
      } else if (slug === "toddlers") {
        expect(firstThree).toEqual(["toddler", "toddler", "kids"]);
      } else {
        expect(firstThree).toEqual(["toddler", "kids", "detailed"]);
      }
    }
  });

  it("every entry validates against the manifest schema", () => {
    for (const entry of entries) {
      expect(() => manifestEntrySchema.parse(entry)).not.toThrow();
    }
  });

  it("slugify handles ampersands and punctuation", () => {
    expect(slugify("Fairy Tales & Magic")).toBe("fairy-tales-and-magic");
    expect(slugify("The Magic Key")).toBe("the-magic-key");
  });
});

describe("master prompt builder", () => {
  it("is versioned and composes base + subject + complexity + avoid-list", () => {
    expect(COLORING_PROMPT_VERSION).toBe("coloring-page-v1");
    const prompt = buildColoringPrompt("A happy turtle.", "toddler");
    expect(prompt).toContain("pure black line art on a pure white background");
    expect(prompt).toContain("Subject: A happy turtle.");
    expect(prompt).toContain(COMPLEXITY_WORDING.toddler);
    expect(prompt).toContain("recognizable copyrighted characters");
    expect(prompt).toContain("US Letter and A4");
    expect(prompt.indexOf("Subject:")).toBeLessThan(
      prompt.indexOf(COMPLEXITY_WORDING.toddler),
    );
  });

  it("each complexity level produces distinct wording", () => {
    const prompts = (["toddler", "kids", "detailed"] as const).map((level) =>
      buildColoringPrompt("A castle.", level),
    );
    expect(new Set(prompts).size).toBe(3);
    expect(prompts[0]).toContain("very thick outlines");
    expect(prompts[1]).toContain("medium-thick outlines");
    expect(prompts[2]).toContain("thinner clean lines");
  });
});

describe("banned-terms scanner", () => {
  it("catches protected names case-insensitively at word boundaries", () => {
    expect(findBannedTerms("A poster of Mickey the mouse")).toContain("mickey");
    expect(findBannedTerms("SPIDER-MAN saves the day")).toContain("spider-man");
    expect(findBannedTerms("playing pokemon cards")).toContain("pokemon");
  });

  it("does not false-positive on ordinary words", () => {
    expect(findBannedTerms("A market stall selling jam")).toEqual([]);
    expect(findBannedTerms("A legomorph? no — a rabbit in a meadow")).toEqual([]);
    expect(findBannedTerms("Sonic waves ripple across the pond")).toEqual([]);
  });
});

/** A minimal generated entry for state-machine style tests. */
function entryFixture(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: "dinosaurs-happy-t-rex-01",
    title: "Happy T-Rex",
    slug: "happy-t-rex",
    categorySlug: "dinosaurs",
    complexity: "toddler",
    subjectPrompt: "One big happy T-Rex.",
    status: "planned",
    provider: "flux",
    model: null,
    providerRequestId: null,
    seed: null,
    promptVersion: COLORING_PROMPT_VERSION,
    outputPath: null,
    previewPath: null,
    thumbnailPath: null,
    reviewStatus: "pending",
    rejectionReason: null,
    generatedAt: null,
    publishedAt: null,
    attempt: 1,
    history: [],
    validation: null,
    lastError: null,
    ...overrides,
  };
}

describe("selection and budget", () => {
  const manifest: ManifestEntry[] = [];
  for (const category of ["dinosaurs", "kawaii"]) {
    for (let i = 1; i <= 5; i++) {
      manifest.push(
        entryFixture({
          id: `${category}-concept-${i}`,
          slug: `concept-${i}`,
          categorySlug: category,
        }),
      );
    }
  }

  it("--samples takes the first 3 per category", () => {
    const selected = selectEntries(manifest, { samples: true });
    expect(selected).toHaveLength(6);
    expect(selected.map((e) => e.id)).toContain("dinosaurs-concept-1");
    expect(selected.map((e) => e.id)).not.toContain("dinosaurs-concept-4");
  });

  it("--samples does not redo already-generated sample slots", () => {
    const withGenerated = replaceEntry(
      manifest,
      entryFixture({
        id: "dinosaurs-concept-1",
        slug: "concept-1",
        status: "generated",
      }),
    );
    const selected = selectEntries(withGenerated, { samples: true });
    // Slot 1 is done; slots 2 and 3 remain — slot 4 is NOT pulled forward.
    expect(selected.filter((e) => e.categorySlug === "dinosaurs")).toHaveLength(2);
  });

  it("--category filters and skips non-generatable statuses", () => {
    const withStates = replaceEntry(
      replaceEntry(
        manifest,
        entryFixture({ id: "dinosaurs-concept-2", slug: "concept-2", status: "approved" }),
      ),
      entryFixture({ id: "dinosaurs-concept-3", slug: "concept-3", status: "failed" }),
    );
    const selected = selectEntries(withStates, { category: "dinosaurs" });
    expect(selected.map((e) => e.id)).toEqual([
      "dinosaurs-concept-1",
      "dinosaurs-concept-3", // failed is retryable
      "dinosaurs-concept-4",
      "dinosaurs-concept-5",
    ]);
  });

  it("--id refuses approved work without --force, allows it with", () => {
    const withApproved = replaceEntry(
      manifest,
      entryFixture({ id: "kawaii-concept-1", slug: "concept-1", categorySlug: "kawaii", status: "approved" }),
    );
    expect(selectEntries(withApproved, { id: "kawaii-concept-1" })).toHaveLength(0);
    expect(
      selectEntries(withApproved, { id: "kawaii-concept-1", force: true }),
    ).toHaveLength(1);
  });

  it("--remaining selects every planned/failed entry; budget caps the run", () => {
    const selected = selectEntries(manifest, { remaining: true });
    expect(selected).toHaveLength(10);
    const { run, deferred } = applyBudget(selected, 4);
    expect(run).toHaveLength(4);
    expect(deferred).toBe(6);
  });
});

describe("generation controls", () => {
  it("defaults to dry-run with the kill switch off", () => {
    const controls = generationControls({} as NodeJS.ProcessEnv);
    expect(controls.dryRun).toBe(true);
    expect(controls.enabled).toBe(false);
    expect(controls.maxPerRun).toBe(36);
    expect(controls.maxRetries).toBe(1);
  });

  it("requires an explicit false to leave dry-run", () => {
    expect(
      generationControls({ COLORING_GENERATION_DRY_RUN: "0" } as unknown as NodeJS.ProcessEnv).dryRun,
    ).toBe(true);
    expect(
      generationControls({ COLORING_GENERATION_DRY_RUN: "false" } as unknown as NodeJS.ProcessEnv).dryRun,
    ).toBe(false);
  });
});

describe("regeneration history", () => {
  it("archives the current attempt and resets for a fresh run", () => {
    const generated = entryFixture({
      status: "rejected",
      reviewStatus: "rejected",
      rejectionReason: "gray shading",
      seed: 123,
      providerRequestId: "req-1",
      generatedAt: "2026-07-30T00:00:00.000Z",
      outputPath: "/coloring-pages/dinosaurs/happy-t-rex.png",
    });
    const reset = beginRegeneration(generated, "content/coloring-pages/attempts/x.png");
    expect(reset.status).toBe("planned");
    expect(reset.attempt).toBe(2);
    expect(reset.seed).toBeNull();
    expect(reset.rejectionReason).toBeNull();
    expect(reset.history).toHaveLength(1);
    expect(reset.history[0]).toMatchObject({
      attempt: 1,
      seed: 123,
      providerRequestId: "req-1",
      rejectionReason: "gray shading",
      imagePath: "content/coloring-pages/attempts/x.png",
    });
  });
});

describe("publishing", () => {
  const approved = entryFixture({
    status: "approved",
    reviewStatus: "approved",
    model: "flux-2-klein-9b",
    outputPath: "/coloring-pages/dinosaurs/happy-t-rex.png",
    previewPath: "/coloring-pages/dinosaurs/happy-t-rex.webp",
    thumbnailPath: "/coloring-pages/dinosaurs/happy-t-rex-thumb.webp",
  });

  it("publishes approved pages with alt text and no internal prompt", () => {
    const record = toPublishedPage(approved, "Dinosaurs", "2026-07-30T00:00:00.000Z");
    expect(record.slug).toBe("happy-t-rex");
    expect(record.altText).toContain("Happy T-Rex");
    expect(record.altText).toContain("coloring page");
    expect(record.altText).not.toContain(approved.subjectPrompt);
    expect(JSON.stringify(record)).not.toContain("subjectPrompt");
    expect(JSON.stringify(record)).not.toContain("pure black line art");
    expect(record.model).toBe("flux-2-klein-9b");
    expect(record.promptVersion).toBe(COLORING_PROMPT_VERSION);
  });

  it("refuses to publish anything that is not approved", () => {
    for (const status of ["planned", "generated", "rejected", "failed"] as const) {
      expect(() =>
        toPublishedPage(
          entryFixture({ ...approved, status, reviewStatus: "pending" }),
          "Dinosaurs",
          "2026-07-30T00:00:00.000Z",
        ),
      ).toThrow();
    }
  });

  it("maps complexity onto the catalog's filter values", () => {
    expect(COMPLEXITY_CATALOG_MAPPING.toddler.difficulty).toBe("easy");
    expect(COMPLEXITY_CATALOG_MAPPING.kids.ageRange).toBe("6-8");
    expect(COMPLEXITY_CATALOG_MAPPING.detailed.detailLevel).toBe("fine-detail");
  });

  it("alt text reads for humans, not for the model", () => {
    expect(buildAltText(approved, "Dinosaurs")).toBe(
      "Happy T-Rex — a free printable dinosaurs coloring page with black line art on a white background.",
    );
  });
});
