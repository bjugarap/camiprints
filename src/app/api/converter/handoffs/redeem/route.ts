import { NextRequest, NextResponse } from "next/server";

import {
  HANDOFF_HEADER_FILENAME,
  HANDOFF_HEADER_SOURCE,
  handoffRedeemRequestSchema,
  type HandoffError,
} from "@/shared/contracts/extension-handoff";
import {
  checkRateLimit,
  getHandoffService,
} from "@/server/handoff/handoff-service";

export const runtime = "nodejs";

/**
 * POST /api/converter/handoffs/redeem — the website exchanges the token
 * for the image bytes. Single-use: the record is deleted in the same
 * operation, so a second redemption (replay) gets the same generic 404 as
 * an expired or never-issued token. Only the website calls this endpoint —
 * no CORS is offered.
 */
const NOT_FOUND: HandoffError = {
  error: "handoff-not-found",
  message: "This image link has expired.",
};

export async function POST(request: NextRequest) {
  const clientKey = `handoff-redeem:${
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  }`;
  if (!checkRateLimit(clientKey, { limit: 20 })) {
    const body: HandoffError = {
      error: "rate-limited",
      message: "Too many tries at once. Wait a moment.",
    };
    return NextResponse.json(body, { status: 429 });
  }

  let parsed;
  try {
    parsed = handoffRedeemRequestSchema.safeParse(await request.json());
  } catch {
    parsed = { success: false as const, error: null };
  }
  if (!parsed.success) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  const record = await getHandoffService().redeem(parsed.data.token);
  if (!record) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": record.mimeType,
    "Cache-Control": "no-store",
    [HANDOFF_HEADER_SOURCE]: "chrome-extension",
  });
  if (record.originalFilename) {
    headers.set(HANDOFF_HEADER_FILENAME, record.originalFilename);
  }
  return new NextResponse(Buffer.from(record.bytes), { status: 200, headers });
}
