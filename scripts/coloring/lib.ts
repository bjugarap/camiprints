import { readFileSync } from "node:fs";

/**
 * Shared plumbing for the coloring-page pipeline scripts: .env.local
 * loading (scripts run outside Next) and the generation-budget controls.
 * DRY RUN IS THE DEFAULT — real spend requires both
 * COLORING_GENERATION_ENABLED=true and COLORING_GENERATION_DRY_RUN=false.
 */
export function loadEnvLocal(): void {
  let raw = "";
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

export interface GenerationControls {
  enabled: boolean;
  dryRun: boolean;
  maxPerRun: number;
  maxRetries: number;
  costPerImageUsd: number;
}

export function generationControls(
  env: NodeJS.ProcessEnv = process.env,
): GenerationControls {
  return {
    enabled: env.COLORING_GENERATION_ENABLED === "true",
    // Anything except an explicit "false" stays a dry run.
    dryRun: env.COLORING_GENERATION_DRY_RUN !== "false",
    maxPerRun: Number(env.COLORING_GENERATION_MAX_PER_RUN ?? 36) || 36,
    maxRetries: Number(env.COLORING_GENERATION_MAX_RETRIES ?? 1) || 1,
    costPerImageUsd: Number(env.COLORING_COST_PER_IMAGE_USD ?? 0.02) || 0.02,
  };
}

export function parseArgs(argv: string[]): {
  flags: Set<string>;
  values: Map<string, string>;
} {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match) continue;
    if (match[2] !== undefined) values.set(match[1], match[2]);
    else flags.add(match[1]);
  }
  return { flags, values };
}
