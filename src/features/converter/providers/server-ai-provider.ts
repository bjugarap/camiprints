import {
  conversionCreateResponseSchema,
  conversionErrorResponseSchema,
  conversionPollResponseSchema,
  type WireJob,
} from "@/shared/contracts/conversions";
import type {
  ConversionJob,
  ConversionSettings,
  ConverterErrorCode,
  CropState,
} from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

import type {
  ConversionCallbacks,
  ConversionRequest,
  PhotoConversionProvider,
} from "./provider";
import { encodeRasterBlob, rasterizeCrop } from "./local/rasterize";

/**
 * The AI engine's client: a thin, vendor-agnostic shim over
 * /api/conversions. The browser crops the ORIGINAL photo on-canvas
 * (reusing the exact math the crop editor shows — never the local edge
 * map), uploads it once, then polls with an opaque encrypted token. Which
 * vendor answers is a server decision (AI_PROVIDER); no vendor URL, key
 * or identifier exists in the browser bundle.
 */
const UPLOAD_LONG_EDGE = 1400;

interface TrackedJob {
  pollToken: string;
  outputToken: string | null;
  settings: ConversionSettings;
  crop: CropState;
  last: ConversionJob;
}

function defaultPollInterval(): number {
  const parsed = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed >= 250 ? parsed : 1000;
}

export class ServerAiProvider implements PhotoConversionProvider {
  readonly id = "flux" as const; // display id; actual vendor is server-side
  readonly displayName = "AI Coloring Page";
  readonly mode = "async" as const;
  readonly pollIntervalMs = defaultPollInterval();

  private readonly jobs = new Map<string, TrackedJob>();

  private toJob(
    wire: WireJob,
    settings: ConversionSettings,
    crop: CropState,
  ): ConversionJob {
    return {
      id: wire.id,
      provider: this.id,
      status: wire.status,
      createdAt: wire.createdAt,
      completedAt: wire.completedAt,
      processingDurationMs: wire.processingDurationMs,
      settings,
      crop,
      output: wire.output,
      error: wire.error,
    };
  }

  private failedJob(
    request: ConversionRequest,
    code: ConverterErrorCode,
  ): ConversionJob {
    return {
      id: `failed-${Date.now()}`,
      provider: this.id,
      status: "failed",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      processingDurationMs: null,
      settings: request.settings,
      crop: request.crop,
      output: null,
      error: { code, message: CONVERTER_ERROR_COPY[code].heading },
    };
  }

  async convert(
    request: ConversionRequest,
    callbacks: ConversionCallbacks = {},
  ): Promise<ConversionJob> {
    const { onProgress, signal } = callbacks;
    onProgress?.({
      stage: "prepare",
      message: "Preparing your photo…",
      completedStages: 0,
      totalStages: 3,
    });

    // The original cropped photo — JPEG keeps the upload small.
    const raster = await rasterizeCrop(request.photo, request.crop, UPLOAD_LONG_EDGE);
    const cropped = await encodeRasterBlob(raster, "image/jpeg", 0.9);

    onProgress?.({
      stage: "upload",
      message: "Sending your photo…",
      completedStages: 1,
      totalStages: 3,
    });

    const form = new FormData();
    form.set("image", cropped, "photo.jpg");
    form.set("settings", JSON.stringify(request.settings));
    form.set("orientation", request.crop.orientation);
    form.set("attempt", String(request.attempt ?? 1));

    let response: Response;
    try {
      response = await fetch("/api/conversions", {
        method: "POST",
        body: form,
        signal,
      });
    } catch {
      return signal?.aborted
        ? { ...this.failedJob(request, "cancelled"), status: "cancelled", error: null }
        : this.failedJob(request, "network");
    }

    if (!response.ok) {
      const parsed = conversionErrorResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      return this.failedJob(
        request,
        parsed.success ? parsed.data.error : "processing-failed",
      );
    }

    const created = conversionCreateResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!created.success) {
      return this.failedJob(request, "processing-failed");
    }

    const job = this.toJob(created.data.job, request.settings, request.crop);
    this.jobs.set(job.id, {
      pollToken: created.data.pollToken,
      outputToken: null,
      settings: request.settings,
      crop: request.crop,
      last: job,
    });
    onProgress?.({
      stage: "generate",
      message: "The AI is drawing your page…",
      completedStages: 2,
      totalStages: 3,
    });
    return job;
  }

  async getJob(jobId: string): Promise<ConversionJob | null> {
    const tracked = this.jobs.get(jobId);
    if (!tracked) return null;

    let response: Response;
    try {
      response = await fetch(
        `/api/conversions/poll?token=${encodeURIComponent(tracked.pollToken)}`,
        { cache: "no-store" },
      );
    } catch {
      return tracked.last; // transient network blip — keep polling
    }
    if (!response.ok) {
      const failed: ConversionJob = {
        ...tracked.last,
        status: "failed",
        completedAt: new Date().toISOString(),
        error: {
          code: "processing-failed",
          message: CONVERTER_ERROR_COPY["processing-failed"].heading,
        },
      };
      tracked.last = failed;
      return failed;
    }

    const polled = conversionPollResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!polled.success) return tracked.last;

    const job = this.toJob(polled.data.job, tracked.settings, tracked.crop);
    tracked.last = job;
    if (polled.data.outputToken) {
      tracked.outputToken = polled.data.outputToken;
    }
    return job;
  }

  async fetchOutput(jobId: string): Promise<Blob | null> {
    const tracked = this.jobs.get(jobId);
    if (!tracked?.outputToken) return null;
    try {
      const response = await fetch(
        `/api/conversions/output?token=${encodeURIComponent(tracked.outputToken)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return null;
      return await response.blob();
    } catch {
      return null;
    }
  }

  async cancel(): Promise<void> {
    // The vendor job simply expires server-side; stopping the poll (via
    // the AbortSignal in the wizard) is all a cancel needs client-side.
  }
}
