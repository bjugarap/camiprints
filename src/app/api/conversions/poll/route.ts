import { NextRequest, NextResponse } from "next/server";

import {
  CONVERSIONS_API_VERSION,
  type ConversionErrorResponse,
  type ConversionPollResponse,
} from "@/shared/contracts/conversions";
import {
  ConversionRejection,
  pollConversion,
} from "@/server/conversions/conversion-service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/conversions/poll?token=… — one vendor poll per call. When the
 * vendor is ready the server downloads and quality-validates the result
 * before ever reporting "completed"; the response then carries the
 * single-purpose output token.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  try {
    const { job, outputToken } = await pollConversion(token);
    const body: ConversionPollResponse = {
      version: CONVERSIONS_API_VERSION,
      job,
      ...(outputToken ? { outputToken } : {}),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const body: ConversionErrorResponse = {
      error: "processing-failed",
      message: "Something went wrong while tracing",
    };
    return NextResponse.json(body, {
      status: error instanceof ConversionRejection ? error.status : 500,
    });
  }
}
