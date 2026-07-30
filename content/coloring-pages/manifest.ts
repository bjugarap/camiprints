import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { COMPLEXITIES } from "./prompt";

/**
 * The generation manifest — content/coloring-pages/generation-manifest.json
 * — is the source of truth for the pipeline. One entry per planned page;
 * every status change is written back immediately. Regeneration never
 * discards history: the previous attempt is pushed into `history`.
 */
export const PAGE_STATUSES = [
  "planned",
  "generating",
  "generated",
  "failed",
  "approved",
  "rejected",
  "published",
] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

const attemptSchema = z.object({
  attempt: z.number().int(),
  seed: z.number().int().nullable(),
  providerRequestId: z.string().nullable(),
  generatedAt: z.string().nullable(),
  /** Non-public archive path of the replaced image, if it was kept. */
  imagePath: z.string().nullable(),
  rejectionReason: z.string().nullable(),
});

const validationSchema = z.object({
  ok: z.boolean(),
  flags: z.array(z.string()),
  width: z.number().nullable(),
  height: z.number().nullable(),
  fileBytes: z.number().nullable(),
  checkedAt: z.string(),
});

export const manifestEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  categorySlug: z.string(),
  complexity: z.enum(COMPLEXITIES),
  subjectPrompt: z.string(),
  status: z.enum(PAGE_STATUSES),
  provider: z.literal("flux"),
  model: z.string().nullable(),
  providerRequestId: z.string().nullable(),
  seed: z.number().int().nullable(),
  promptVersion: z.string(),
  outputPath: z.string().nullable(),
  previewPath: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  reviewStatus: z.enum(["pending", "approved", "rejected"]),
  rejectionReason: z.string().nullable(),
  generatedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  attempt: z.number().int(),
  history: z.array(attemptSchema),
  validation: validationSchema.nullable(),
  lastError: z.string().nullable(),
});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type AttemptRecord = z.infer<typeof attemptSchema>;
export type ValidationRecord = z.infer<typeof validationSchema>;

export const CONTENT_DIR = path.join("content", "coloring-pages");
export const MANIFEST_PATH = path.join(CONTENT_DIR, "generation-manifest.json");
/** Non-public archive of superseded attempts (served only by the dev-only
 * review API — never from public/). */
export const ATTEMPTS_DIR = path.join(CONTENT_DIR, "attempts");
export const OUTPUT_ROOT = path.join("public", "coloring-pages");

export function readGenerationManifest(
  manifestPath = MANIFEST_PATH,
): ManifestEntry[] {
  try {
    const raw = readFileSync(manifestPath, "utf8");
    return z.array(manifestEntrySchema).parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function writeGenerationManifest(
  entries: ManifestEntry[],
  manifestPath = MANIFEST_PATH,
): Promise<void> {
  return writeFile(
    manifestPath,
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );
}

/** Replace one entry by id — pure. */
export function replaceEntry(
  entries: ManifestEntry[],
  entry: ManifestEntry,
): ManifestEntry[] {
  return entries.map((existing) => (existing.id === entry.id ? entry : existing));
}

/**
 * Archive the current attempt into history and reset the entry for a fresh
 * generation — pure; the caller moves the image file to `archivePath`.
 */
export function beginRegeneration(
  entry: ManifestEntry,
  archivePath: string | null,
): ManifestEntry {
  return {
    ...entry,
    status: "planned",
    reviewStatus: "pending",
    providerRequestId: null,
    seed: null,
    generatedAt: null,
    outputPath: null,
    previewPath: null,
    thumbnailPath: null,
    validation: null,
    lastError: null,
    rejectionReason: null,
    attempt: entry.attempt + 1,
    history: [
      ...entry.history,
      {
        attempt: entry.attempt,
        seed: entry.seed,
        providerRequestId: entry.providerRequestId,
        generatedAt: entry.generatedAt,
        imagePath: archivePath,
        rejectionReason: entry.rejectionReason,
      },
    ],
  };
}

export interface SelectionOptions {
  samples?: boolean;
  category?: string;
  id?: string;
  remaining?: boolean;
  force?: boolean;
  samplesPerCategory?: number;
}

/**
 * Which entries a generate run may touch — pure and unit-tested. Approved
 * and published entries are never selected unless --force names one by id.
 * "Generatable" means planned or failed (failed runs are safe to retry).
 */
export function selectEntries(
  entries: ManifestEntry[],
  options: SelectionOptions,
): ManifestEntry[] {
  const generatable = (entry: ManifestEntry) =>
    entry.status === "planned" || entry.status === "failed";

  if (options.id) {
    const entry = entries.find((candidate) => candidate.id === options.id);
    if (!entry) return [];
    if (generatable(entry)) return [entry];
    return options.force ? [entry] : [];
  }
  if (options.samples) {
    const perCategory = options.samplesPerCategory ?? 3;
    const seen = new Map<string, number>();
    return entries.filter((entry) => {
      const position = seen.get(entry.categorySlug) ?? 0;
      if (position >= perCategory) return false;
      seen.set(entry.categorySlug, position + 1);
      // Position counts ALL entries so the sample set is stable — but only
      // still-generatable ones are returned (already-generated samples are
      // not redone).
      return generatable(entry);
    });
  }
  if (options.category) {
    return entries.filter(
      (entry) => entry.categorySlug === options.category && generatable(entry),
    );
  }
  if (options.remaining) {
    return entries.filter(generatable);
  }
  return [];
}

/** Enforce the per-run generation budget — pure. */
export function applyBudget<T>(
  selected: T[],
  maxPerRun: number,
): { run: T[]; deferred: number } {
  if (selected.length <= maxPerRun) return { run: selected, deferred: 0 };
  return {
    run: selected.slice(0, maxPerRun),
    deferred: selected.length - maxPerRun,
  };
}
