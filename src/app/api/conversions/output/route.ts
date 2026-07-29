import { NextRequest, NextResponse } from "next/server";

import { fetchConversionOutput } from "@/server/conversions/conversion-service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/conversions/output?token=… — streams the finished page. The
 * token is the encrypted output reference minted by a successful poll;
 * the vendor's signed URL never reaches the browser.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const output = await fetchConversionOutput(token);
  if (!output) {
    return NextResponse.json(
      { error: "processing-failed", message: "This page is no longer available." },
      { status: 404 },
    );
  }
  return new NextResponse(Buffer.from(output.bytes), {
    headers: {
      "Content-Type": output.mimeType,
      "Cache-Control": "no-store",
    },
  });
}
