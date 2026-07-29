import { NextRequest, NextResponse } from "next/server";

import {
  CONVERSIONS_API_VERSION,
  conversionSettingsSchema,
  type ConversionCreateResponse,
  type ConversionErrorResponse,
} from "@/shared/contracts/conversions";
import {
  ConversionRejection,
  createConversion,
} from "@/server/conversions/conversion-service";
import { CONVERTER_ERROR_COPY, type ConverterErrorCode } from "@/types/converter";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/conversions — the browser submits the ORIGINAL cropped photo
 * (never the local edge map) plus the neutral settings. The server builds
 * the prompt, opens the vendor job and returns a queued job with an
 * encrypted poll token. The vendor API key never leaves this process.
 */
function errorResponse(code: ConverterErrorCode, status: number): NextResponse {
  const body: ConversionErrorResponse = {
    error: code,
    message: CONVERTER_ERROR_COPY[code].heading,
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("corrupt-image", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return errorResponse("corrupt-image", 400);
  }
  const settings = conversionSettingsSchema.safeParse(
    (() => {
      try {
        return JSON.parse(String(form.get("settings") ?? ""));
      } catch {
        return null;
      }
    })(),
  );
  if (!settings.success) {
    return errorResponse("processing-failed", 400);
  }
  const orientation =
    form.get("orientation") === "landscape" ? "landscape" : "portrait";
  const attempt = Math.max(1, Number(form.get("attempt")) || 1);

  try {
    const { job, pollToken } = await createConversion({
      imageBytes: new Uint8Array(await image.arrayBuffer()),
      claimedMimeType: image.type,
      settings: settings.data,
      orientation,
      attempt,
      clientKey:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local",
    });
    const body: ConversionCreateResponse = {
      version: CONVERSIONS_API_VERSION,
      job,
      pollToken,
    };
    return NextResponse.json(body, { status: 202 });
  } catch (error) {
    if (error instanceof ConversionRejection) {
      return errorResponse(error.code, error.status);
    }
    console.error(
      JSON.stringify({ event: "conversion-create-unhandled", message: String(error) }),
    );
    return errorResponse("processing-failed", 500);
  }
}
