/*
 * npm run coloring:validate — re-run technical validation across every
 * generated asset and write the results into the manifest. Flags mark
 * pages for manual review; nothing is auto-published or auto-rejected.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  readGenerationManifest,
  writeGenerationManifest,
  type ManifestEntry,
} from "../../content/coloring-pages/manifest";
import { validateGeneratedPage } from "../../content/coloring-pages/validate-page";

async function main() {
  const manifest = readGenerationManifest();
  const updated: ManifestEntry[] = [];
  let checked = 0;
  let flagged = 0;
  let broken = 0;

  for (const entry of manifest) {
    if (!entry.outputPath || entry.status === "planned") {
      updated.push(entry);
      continue;
    }
    const file = path.join("public", entry.outputPath.replace(/^\//, ""));
    let result;
    try {
      result = await validateGeneratedPage(await readFile(file));
    } catch {
      result = { ok: false, flags: ["missing-file"], width: null, height: null, fileBytes: null };
    }
    checked += 1;
    if (!result.ok) broken += 1;
    else if (result.flags.length > 0) flagged += 1;
    updated.push({
      ...entry,
      validation: { ...result, checkedAt: new Date().toISOString() },
    });
    const state = result.ok
      ? result.flags.length > 0
        ? `FLAGGED: ${result.flags.join(", ")}`
        : "ok"
      : `FAILED: ${result.flags.join(", ")}`;
    console.log(`${entry.id}: ${state} (${result.width}×${result.height})`);
  }

  await writeGenerationManifest(updated);
  console.log(
    `\nvalidated ${checked}: ${checked - flagged - broken} clean, ${flagged} flagged for review, ${broken} hard failures`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
