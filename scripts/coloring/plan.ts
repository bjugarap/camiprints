/*
 * npm run coloring:plan — build or validate the 240-entry generation
 * manifest from the concept plan. No images are generated. Existing
 * entries are preserved (the manifest is the source of truth once
 * generation starts); missing entries are appended; still-planned entries
 * pick up concept edits. Also reports weak/duplicate concept warnings.
 */
import { LAUNCH_CATEGORIES } from "../../content/coloring-pages/categories";
import { CONCEPTS } from "../../content/coloring-pages/concepts";
import { findBannedTerms } from "../../content/coloring-pages/banned-terms";
import {
  readGenerationManifest,
  writeGenerationManifest,
  type ManifestEntry,
} from "../../content/coloring-pages/manifest";
import { COLORING_PROMPT_VERSION } from "../../content/coloring-pages/prompt";

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build the full planned manifest from the concept plan — pure. */
export function buildPlannedEntries(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  for (const category of LAUNCH_CATEGORIES) {
    const concepts = CONCEPTS[category.slug];
    if (!concepts) throw new Error(`no concepts for ${category.slug}`);
    concepts.forEach((concept, index) => {
      const slug = slugify(concept.title);
      entries.push({
        id: `${category.slug}-${slug}-${String(index + 1).padStart(2, "0")}`,
        title: concept.title,
        slug,
        categorySlug: category.slug,
        complexity: concept.complexity,
        subjectPrompt: concept.subject,
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
      });
    });
  }
  return entries;
}

/** Similar-concept heuristic: token overlap between two subject prompts. */
export function promptSimilarity(a: string, b: string): number {
  const tokens = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3),
    );
  const setA = tokens(a);
  const setB = tokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / Math.min(setA.size, setB.size);
}

async function main() {
  const planned = buildPlannedEntries();
  const existing = readGenerationManifest();
  const existingById = new Map(existing.map((entry) => [entry.id, entry]));

  const merged = planned.map((entry) => {
    const current = existingById.get(entry.id);
    if (!current) return entry;
    // Concept edits flow into entries that have no successful output yet.
    if (current.status === "planned" || current.status === "failed") {
      return { ...current, title: entry.title, subjectPrompt: entry.subjectPrompt, complexity: entry.complexity };
    }
    return current;
  });
  const plannedIds = new Set(planned.map((entry) => entry.id));
  const orphans = existing.filter((entry) => !plannedIds.has(entry.id));

  // --- Reports ---------------------------------------------------------
  const problems: string[] = [];
  for (const entry of merged) {
    const banned = findBannedTerms(`${entry.title} ${entry.subjectPrompt}`);
    if (banned.length > 0) {
      problems.push(`${entry.id}: banned terms: ${banned.join(", ")}`);
    }
  }
  const similar: string[] = [];
  for (const category of LAUNCH_CATEGORIES) {
    const inCategory = merged.filter((e) => e.categorySlug === category.slug);
    for (let i = 0; i < inCategory.length; i++) {
      for (let j = i + 1; j < inCategory.length; j++) {
        const score = promptSimilarity(
          inCategory[i].subjectPrompt,
          inCategory[j].subjectPrompt,
        );
        if (score > 0.6) {
          similar.push(
            `${inCategory[i].id} ~ ${inCategory[j].id} (overlap ${(score * 100).toFixed(0)}%)`,
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error("BANNED TERMS FOUND:\n" + problems.join("\n"));
    process.exit(1);
  }

  // Entries whose concept was removed are kept (they may carry generated
  // or approved work) but reported so the drift is visible.
  const finalEntries = [...merged, ...orphans];
  await writeGenerationManifest(finalEntries);
  const byCategory = new Map<string, number>();
  for (const entry of finalEntries) {
    byCategory.set(entry.categorySlug, (byCategory.get(entry.categorySlug) ?? 0) + 1);
  }
  console.log(`manifest written: ${finalEntries.length} entries`);
  for (const [slug, count] of byCategory) console.log(`  ${slug}: ${count}`);
  if (orphans.length > 0) {
    console.warn(
      `kept ${orphans.length} entries no longer in the concept plan: ${orphans.map((o) => o.id).join(", ")}`,
    );
  }
  if (similar.length > 0) {
    console.warn(`possibly-similar concepts (review):\n  ${similar.join("\n  ")}`);
  } else {
    console.log("no overly similar concepts detected");
  }
}

// Only run as a script — the pure helpers are imported by tests.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/coloring/plan.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
