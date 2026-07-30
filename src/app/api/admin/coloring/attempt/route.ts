import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { ATTEMPTS_DIR } from "../../../../../../content/coloring-pages/manifest";

/**
 * Serves archived (superseded) generation attempts for the compare view.
 * The archive lives OUTSIDE public/ so rejected artwork is never shipped;
 * the filename is reconstructed from a strictly validated id + attempt —
 * no caller-supplied paths. Disabled in production.
 */
export const runtime = "nodejs";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request): Promise<NextResponse | Response> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const attempt = Number(url.searchParams.get("attempt"));
  if (!ID_PATTERN.test(id) || !Number.isInteger(attempt) || attempt < 1) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  try {
    const bytes = await readFile(
      path.join(process.cwd(), ATTEMPTS_DIR, `${id}-attempt-${attempt}.png`),
    );
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
}
