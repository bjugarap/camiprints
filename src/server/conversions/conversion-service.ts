import "server-only";

import { randomUUID } from "node:crypto";

import {
  CONVERSION_UPLOAD_LIMITS,
  type WireJob,
} from "@/shared/contracts/conversions";
import { checkRateLimit } from "@/server/handoff/handoff-service";
import type { ConversionSettings, ConverterErrorCode } from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

import { buildConversionPrompt } from "./prompt-builder";
import {
  openConversionToken,
  sealConversionToken,
  type PollTokenPayload,
} from "./conversion-token";
import { validateColoringPageOutput } from "./validate-output";
import {
  getVendorAdapter,
  VendorRequestError,
} from "./vendor-adapter";

/**
 * Orchestrates the AI conversion endpoints. Stateless by construction:
 * everything a later request needs travels in the client's encrypted
 * token, so any serverless instance can serve any step. Costs and
 * durations are logged as structured JSON lines (no image data, ever).
 */
export class ConversionRejection extends Error {
  constructor(
    readonly code: ConverterErrorCode,
    readonly status: number,
  ) {
    super(CONVERTER_ERROR_COPY[code].heading);
    this.name = "ConversionRejection";
  }
}

function timeoutMs(): number {
  const parsed = Number(process.env.JOB_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90_000;
}

function anonDailyLimit(): number {
  const parsed = Number(process.env.AI_LIMIT_ANON_PER_DAY);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function estimatedCostUsd(): number {
  const parsed = Number(process.env.BFL_ESTIMATED_COST_USD);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.02;
}

function logConversion(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: "conversion", ...entry }));
}

function job(
  payload: PollTokenPayload,
  status: WireJob["status"],
  extras: Partial<WireJob> = {},
): WireJob {
  const terminal = status === "completed" || status === "failed" || status === "cancelled";
  return {
    id: payload.jobId,
    provider: payload.vendor,
    model: payload.model,
    status,
    createdAt: new Date(payload.createdAt).toISOString(),
    completedAt: terminal ? new Date().toISOString() : null,
    processingDurationMs: terminal ? Date.now() - payload.createdAt : null,
    output: null,
    error: null,
    ...extras,
  };
}

function failed(
  payload: PollTokenPayload,
  code: ConverterErrorCode,
  logReason: string,
): { job: WireJob } {
  logConversion({
    provider: payload.vendor,
    model: payload.model,
    requestId: payload.requestId,
    status: "failed",
    reason: logReason,
    durationMs: Date.now() - payload.createdAt,
    estimatedCostUsd: estimatedCostUsd(),
    retryCount: payload.attempt - 1,
  });
  return {
    job: job(payload, "failed", {
      error: { code, message: CONVERTER_ERROR_COPY[code].heading },
    }),
  };
}

/* ------------------------------------------------------------------ create */

export interface CreateConversionInput {
  imageBytes: Uint8Array;
  claimedMimeType: string;
  settings: ConversionSettings;
  orientation: "portrait" | "landscape";
  attempt: number;
  /** Rate-limit key — the caller's IP for anonymous users. */
  clientKey: string;
}

export async function createConversion(
  input: CreateConversionInput,
): Promise<{ job: WireJob; pollToken: string }> {
  // Daily budget first: anonymous keys get AI_LIMIT_ANON_PER_DAY per
  // 24h window. (Authenticated tiers plug in here once accounts exist.)
  if (
    !checkRateLimit(`ai-convert:${input.clientKey}`, {
      limit: anonDailyLimit(),
      windowMs: 24 * 60 * 60 * 1000,
    })
  ) {
    throw new ConversionRejection("ai-daily-limit", 429);
  }

  if (input.imageBytes.byteLength === 0) {
    throw new ConversionRejection("corrupt-image", 400);
  }
  if (input.imageBytes.byteLength > CONVERSION_UPLOAD_LIMITS.maxBytes) {
    throw new ConversionRejection("file-too-large", 413);
  }
  if (
    !(CONVERSION_UPLOAD_LIMITS.acceptedMimeTypes as readonly string[]).includes(
      input.claimedMimeType,
    )
  ) {
    throw new ConversionRejection("unsupported-type", 415);
  }
  // The bytes must really decode — never forward junk to a paid vendor.
  try {
    const { default: sharp } = await import("sharp");
    await sharp(Buffer.from(input.imageBytes), {
      limitInputPixels: 80_000_000,
    }).metadata();
  } catch {
    throw new ConversionRejection("corrupt-image", 422);
  }

  const adapter = await getVendorAdapter();
  const prompt = buildConversionPrompt(input.settings);
  const aspectRatio = input.orientation === "portrait" ? "17:22" : "22:17";

  let created: { requestId: string; pollUrl: string };
  try {
    created = await adapter.create({
      imageBytes: input.imageBytes,
      mimeType: input.claimedMimeType,
      prompt,
      aspectRatio,
    });
  } catch (error) {
    const status = error instanceof VendorRequestError ? error.status : undefined;
    logConversion({
      provider: adapter.id,
      model: adapter.model,
      status: "create-failed",
      vendorStatus: status,
      retryCount: input.attempt - 1,
    });
    // 401/402/403 are configuration/credit problems, not user problems.
    throw new ConversionRejection(
      status === 401 || status === 402 || status === 403
        ? "provider-not-configured"
        : "processing-failed",
      502,
    );
  }

  const payload: PollTokenPayload = {
    kind: "poll",
    jobId: randomUUID(),
    vendor: adapter.id,
    model: adapter.model,
    requestId: created.requestId,
    pollUrl: created.pollUrl,
    createdAt: Date.now(),
    attempt: input.attempt,
    invert: input.settings.advanced.invert,
  };
  return {
    job: job(payload, "queued"),
    pollToken: sealConversionToken(payload),
  };
}

/* -------------------------------------------------------------------- poll */

export async function pollConversion(
  token: string,
): Promise<{ job: WireJob; outputToken?: string }> {
  const payload = openConversionToken(token);
  if (!payload || payload.kind !== "poll") {
    throw new ConversionRejection("processing-failed", 404);
  }
  if (Date.now() - payload.createdAt > timeoutMs()) {
    return failed(payload, "ai-timeout", "timeout");
  }

  const adapter = await getVendorAdapter();
  let polled;
  try {
    polled = await adapter.poll(payload.pollUrl);
  } catch {
    return { job: job(payload, "processing") }; // transient — keep polling
  }

  switch (polled.state) {
    case "pending":
      return { job: job(payload, "processing") };
    case "moderated":
      return failed(payload, "ai-moderated", "moderated");
    case "failed":
      return failed(payload, "processing-failed", polled.detail ?? "vendor-error");
    case "ready": {
      // Validate before the browser ever sees it: download and check that
      // the result actually reads as a coloring page.
      let bytes: Uint8Array;
      try {
        bytes = await adapter.download(polled.resultUrl);
      } catch {
        return failed(payload, "processing-failed", "download-failed");
      }
      const verdict = await validateColoringPageOutput(bytes, {
        invertExpected: payload.invert,
      });
      if (!verdict.ok) {
        return failed(payload, "ai-bad-output", `validation:${verdict.reason}`);
      }
      logConversion({
        provider: payload.vendor,
        model: payload.model,
        requestId: payload.requestId,
        status: "completed",
        durationMs: Date.now() - payload.createdAt,
        estimatedCostUsd: estimatedCostUsd(),
        retryCount: payload.attempt - 1,
      });
      return {
        job: job(payload, "completed", {
          output: {
            width: verdict.width ?? 0,
            height: verdict.height ?? 0,
            mimeType: "image/png",
            byteSize: bytes.byteLength,
          },
        }),
        outputToken: sealConversionToken({
          kind: "output",
          jobId: payload.jobId,
          resultUrl: polled.resultUrl,
          createdAt: payload.createdAt,
          width: verdict.width ?? 0,
          height: verdict.height ?? 0,
        }),
      };
    }
  }
}

/* ------------------------------------------------------------------ output */

export async function fetchConversionOutput(
  token: string,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const payload = openConversionToken(token);
  if (!payload || payload.kind !== "output") return null;
  // Output tokens live only as long as the vendor's signed result URL —
  // bounded regardless by the job timeout window plus a grace period.
  if (Date.now() - payload.createdAt > timeoutMs() + 15 * 60 * 1000) {
    return null;
  }
  const adapter = await getVendorAdapter();
  try {
    const bytes = await adapter.download(payload.resultUrl);
    return { bytes, mimeType: "image/png" };
  } catch {
    return null;
  }
}
