import { NextRequest, NextResponse } from "next/server";

import {
  HANDOFF_LIMITS,
  HANDOFF_VERSION,
  type HandoffCreateResponse,
  type HandoffError,
  type HandoffErrorCode,
} from "@/shared/contracts/extension-handoff";
import {
  checkRateLimit,
  getHandoffService,
  HandoffRejection,
} from "@/server/handoff/handoff-service";

export const runtime = "nodejs";

/**
 * POST /api/converter/handoffs — the extension (or the dev simulator)
 * uploads the selected image as multipart/form-data after a direct user
 * gesture. Returns a short-lived, single-use opaque token. Error bodies are
 * deliberately generic; nothing about the image is logged.
 */

/** Public messages: calm, generic, and never confirming internals. */
const PUBLIC_MESSAGES: Record<HandoffErrorCode, string> = {
  "unsupported-version": "This extension version is out of date.",
  "missing-image": "No image was received.",
  "unsupported-type": "Use a JPG, PNG or WEBP image.",
  "file-too-large": "That image is too large.",
  "invalid-image": "That image couldn’t be used.",
  "rate-limited": "Too many tries at once. Wait a moment.",
  "handoff-not-found": "This image link has expired.",
  "server-error": "Something went wrong. Try again.",
};

function corsHeaders(request: NextRequest): Record<string, string> {
  // Chrome extensions send Origin: chrome-extension://<id>. Only origins
  // in the allowlist get CORS approval; same-origin needs none.
  const origin = request.headers.get("origin");
  const allowed = (process.env.CAMIPRINTS_EXTENSION_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return {};
}

function errorResponse(
  request: NextRequest,
  code: HandoffErrorCode,
  status: number,
): NextResponse {
  const body: HandoffError = { error: code, message: PUBLIC_MESSAGES[code] };
  return NextResponse.json(body, { status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const clientKey = `handoff-create:${
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  }`;
  if (!checkRateLimit(clientKey)) {
    return errorResponse(request, "rate-limited", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(request, "missing-image", 400);
  }

  if (form.get("version") !== HANDOFF_VERSION) {
    return errorResponse(request, "unsupported-version", 400);
  }
  const image = form.get("image");
  if (!(image instanceof File)) {
    return errorResponse(request, "missing-image", 400);
  }
  // Reject on the declared size BEFORE buffering the body — reading an
  // oversized upload just to refuse it wastes memory and can fail under
  // load. The service re-checks the real byte length.
  if (image.size > HANDOFF_LIMITS.maxBytes) {
    return errorResponse(request, "file-too-large", 413);
  }

  try {
    const { token, expiresAt } = await getHandoffService().create({
      bytes: new Uint8Array(await image.arrayBuffer()),
      claimedMimeType: image.type,
      filename: image.name,
    });
    const body: HandoffCreateResponse = {
      version: HANDOFF_VERSION,
      token,
      expiresAt,
    };
    return NextResponse.json(body, {
      status: 201,
      headers: corsHeaders(request),
    });
  } catch (error) {
    if (error instanceof HandoffRejection) {
      return errorResponse(request, error.code, error.status);
    }
    return errorResponse(request, "server-error", 500);
  }
}
