import { NextResponse } from "next/server";
import { z } from "zod";

import {
  readGenerationManifest,
  replaceEntry,
  writeGenerationManifest,
} from "../../../../../../content/coloring-pages/manifest";

/**
 * Review actions for the coloring-page generation queue. Local tooling
 * only: the manifest lives on the developer's disk, so this route (like
 * the review screen) is disabled in production builds entirely.
 */
export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(200).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const { id, action, reason } = parsed.data;

  const manifest = readGenerationManifest();
  const entry = manifest.find((candidate) => candidate.id === id);
  if (!entry) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  // Review applies to generated work (and allows changing one's mind);
  // published pages are immutable here.
  if (!["generated", "approved", "rejected"].includes(entry.status)) {
    return NextResponse.json({ error: "not-reviewable" }, { status: 409 });
  }
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "reason-required" }, { status: 400 });
  }

  const updated =
    action === "approve"
      ? {
          ...entry,
          status: "approved" as const,
          reviewStatus: "approved" as const,
          rejectionReason: null,
        }
      : {
          ...entry,
          status: "rejected" as const,
          reviewStatus: "rejected" as const,
          rejectionReason: reason ?? null,
        };
  await writeGenerationManifest(replaceEntry(manifest, updated));
  return NextResponse.json({ ok: true, id, status: updated.status });
}
