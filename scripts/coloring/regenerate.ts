/*
 * npm run coloring:regenerate -- --id=<entry id>
 *
 * Regenerates a rejected (or failed) page while KEEPING its history: the
 * current attempt's metadata is archived into `history`, the superseded
 * image moves to content/coloring-pages/attempts/ (non-public), and the
 * entry returns to `planned` with attempt+1. Then run coloring:generate
 * with the same --id to produce the new attempt. Approved/published pages
 * require --force.
 */
import { existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import {
  ATTEMPTS_DIR,
  beginRegeneration,
  readGenerationManifest,
  replaceEntry,
  writeGenerationManifest,
} from "../../content/coloring-pages/manifest";
import { loadEnvLocal, parseArgs } from "./lib";

async function main() {
  loadEnvLocal();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const id = values.get("id");
  if (!id) {
    console.error("usage: npm run coloring:regenerate -- --id=<entry id>");
    process.exit(1);
  }
  const manifest = readGenerationManifest();
  const entry = manifest.find((candidate) => candidate.id === id);
  if (!entry) {
    console.error(`no manifest entry: ${id}`);
    process.exit(1);
  }
  const allowed =
    entry.status === "rejected" ||
    entry.status === "failed" ||
    entry.status === "generated" ||
    flags.has("force");
  if (!allowed) {
    console.error(
      `${id} is ${entry.status} — approved/published pages need --force`,
    );
    process.exit(1);
  }

  let archivePath: string | null = null;
  if (entry.outputPath) {
    const current = path.join("public", entry.outputPath.replace(/^\//, ""));
    if (existsSync(current)) {
      await mkdir(ATTEMPTS_DIR, { recursive: true });
      archivePath = path.join(
        ATTEMPTS_DIR,
        `${entry.id}-attempt-${entry.attempt}.png`,
      );
      await rename(current, archivePath);
    }
    // Derived web assets are superseded, not history-worthy.
    for (const derived of [entry.previewPath, entry.thumbnailPath]) {
      if (!derived) continue;
      const file = path.join("public", derived.replace(/^\//, ""));
      if (existsSync(file)) await rm(file);
    }
  }

  const reset = beginRegeneration(entry, archivePath);
  await writeGenerationManifest(replaceEntry(manifest, reset));
  console.log(
    `${id}: attempt ${entry.attempt} archived${archivePath ? ` → ${archivePath}` : ""}; now planned (attempt ${reset.attempt}).`,
  );
  console.log(`next: npm run coloring:generate -- --id=${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
