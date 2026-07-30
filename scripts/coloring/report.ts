/*
 * npm run coloring:report — generation and review summary, printed and
 * written to content/coloring-pages/generation-report.md.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { LAUNCH_CATEGORIES } from "../../content/coloring-pages/categories";
import {
  CONTENT_DIR,
  readGenerationManifest,
  PAGE_STATUSES,
} from "../../content/coloring-pages/manifest";
import { generationControls, loadEnvLocal } from "./lib";

async function main() {
  loadEnvLocal();
  const manifest = readGenerationManifest();
  const controls = generationControls();
  const lines: string[] = [];
  const say = (line = "") => lines.push(line);

  say(`# Coloring-page generation report`);
  say();
  say(`Generated ${new Date().toISOString()} · ${manifest.length} manifest entries`);
  say();

  say(`## Status totals`);
  say();
  for (const status of PAGE_STATUSES) {
    const count = manifest.filter((entry) => entry.status === status).length;
    if (count > 0) say(`- ${status}: ${count}`);
  }
  say();

  say(`## By category`);
  say();
  say(`| Category | planned | generated | failed | approved | rejected | published | flagged |`);
  say(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const category of LAUNCH_CATEGORIES) {
    const inCategory = manifest.filter((e) => e.categorySlug === category.slug);
    const count = (status: string) =>
      inCategory.filter((e) => e.status === status).length;
    const flagged = inCategory.filter(
      (e) => e.validation && (e.validation.flags.length > 0 || !e.validation.ok),
    ).length;
    say(
      `| ${category.title} | ${count("planned")} | ${count("generated")} | ${count("failed")} | ${count("approved")} | ${count("rejected")} | ${count("published")} | ${flagged} |`,
    );
  }
  say();

  const flagged = manifest.filter(
    (e) => e.validation && (e.validation.flags.length > 0 || !e.validation.ok),
  );
  if (flagged.length > 0) {
    say(`## Flagged for review`);
    say();
    for (const entry of flagged) {
      say(`- ${entry.id}: ${entry.validation!.flags.join(", ")}`);
    }
    say();
  }

  const generatedCount = manifest.filter((e) =>
    ["generated", "approved", "rejected", "published"].includes(e.status),
  ).length;
  const attempts = manifest.reduce((sum, e) => sum + e.history.length, 0);
  say(`## Cost`);
  say();
  say(
    `- images generated (incl. ${attempts} archived attempts): ${generatedCount + attempts}`,
  );
  say(
    `- estimated spend at $${controls.costPerImageUsd.toFixed(3)}/image: $${((generatedCount + attempts) * controls.costPerImageUsd).toFixed(2)}`,
  );
  say();
  say(`Review queue: /admin/coloring-review (non-production only).`);

  const report = lines.join("\n") + "\n";
  console.log(report);
  await writeFile(path.join(CONTENT_DIR, "generation-report.md"), report, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
