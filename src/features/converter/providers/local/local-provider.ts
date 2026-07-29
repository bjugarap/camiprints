import type {
  ConversionJob,
  ConversionProgress,
  ConverterErrorCode,
} from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

import type {
  ConversionCallbacks,
  ConversionRequest,
  PhotoConversionProvider,
} from "../provider";
import {
  adjustContrast,
  boxBlur,
  dilate,
  maskDensity,
  meanLuminance,
  MIN_MASK_DENSITY,
  removeSmallComponents,
  renderMask,
  resolveParams,
  smoothLines,
  sobelMagnitude,
  thresholdMask,
  toGrayscale,
  TOO_DARK_MEAN,
} from "./pipeline";
import { encodePng, rasterizeCrop } from "./rasterize";

/**
 * The MVP provider: converts entirely in the browser with Canvas + typed
 * arrays. The photo never leaves the device — the strongest possible
 * version of "your photo stays private". It presents the same job-based,
 * cancellable, progress-reporting interface as a remote provider; it just
 * finishes its job inside one `convert()` call.
 */
const STAGES: ReadonlyArray<{ stage: string; message: string }> = [
  { stage: "prepare", message: "Preparing your photo…" },
  { stage: "outlines", message: "Finding the main outlines…" },
  { stage: "background", message: "Simplifying the background…" },
  { stage: "cleanup", message: "Cleaning up stray marks…" },
  { stage: "smooth", message: "Smoothing the lines…" },
  { stage: "finish", message: "Generating your coloring page…" },
];

class LocalConversionError extends Error {
  constructor(readonly code: ConverterErrorCode) {
    super(CONVERTER_ERROR_COPY[code].heading);
    this.name = "LocalConversionError";
  }
}

/** Yield to the event loop so progress paints and Cancel stays responsive. */
function breathe(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export class LocalProvider implements PhotoConversionProvider {
  readonly id = "local" as const;
  readonly displayName = "On this device";
  readonly mode = "immediate" as const;

  private readonly jobs = new Map<string, ConversionJob>();
  private readonly outputs = new Map<string, Blob>();

  async convert(
    request: ConversionRequest,
    callbacks: ConversionCallbacks = {},
  ): Promise<ConversionJob> {
    const { signal, onProgress } = callbacks;
    const startedAt = Date.now();
    const job: ConversionJob = {
      id: crypto.randomUUID(),
      provider: this.id,
      status: "processing",
      createdAt: new Date(startedAt).toISOString(),
      completedAt: null,
      processingDurationMs: null,
      settings: request.settings,
      crop: request.crop,
      output: null,
      error: null,
    };
    this.jobs.set(job.id, job);

    let stageIndex = 0;
    const step = async (): Promise<void> => {
      onProgress?.(this.progressFor(stageIndex));
      stageIndex += 1;
      await breathe();
      if (signal?.aborted) throw new LocalConversionError("cancelled");
    };

    try {
      const params = resolveParams(request.settings);

      await step(); // prepare
      const raster = await rasterizeCrop(request.photo, request.crop);
      const gray = toGrayscale(raster);
      if (meanLuminance(gray) < TOO_DARK_MEAN) {
        throw new LocalConversionError("photo-too-dark");
      }
      adjustContrast(gray, params.contrastFactor);

      await step(); // outlines
      const blurred = boxBlur(gray, raster.width, raster.height, params.blurRadius);
      const magnitude = sobelMagnitude(blurred, raster.width, raster.height);

      await step(); // background simplification (threshold)
      let mask = thresholdMask(magnitude, params.threshold);

      await step(); // cleanup
      mask = removeSmallComponents(
        mask,
        raster.width,
        raster.height,
        params.minComponentSize,
      );
      if (maskDensity(mask) < MIN_MASK_DENSITY) {
        throw new LocalConversionError("not-enough-detail");
      }

      await step(); // smoothing + line weight
      mask = smoothLines(mask, raster.width, raster.height);
      for (let i = 0; i < params.lineWeightPasses; i++) {
        mask = dilate(mask, raster.width, raster.height);
      }

      await step(); // finish
      const result = renderMask(mask, raster.width, raster.height, params.invert);
      const png = await encodePng(result);
      if (signal?.aborted) throw new LocalConversionError("cancelled");

      const completed: ConversionJob = {
        ...job,
        status: "completed",
        completedAt: new Date().toISOString(),
        processingDurationMs: Date.now() - startedAt,
        output: {
          width: result.width,
          height: result.height,
          mimeType: "image/png",
          byteSize: png.size,
        },
      };
      this.jobs.set(job.id, completed);
      this.outputs.set(job.id, png);
      onProgress?.({
        stage: "done",
        message: "Done",
        completedStages: STAGES.length,
        totalStages: STAGES.length,
      });
      return completed;
    } catch (error) {
      const code: ConverterErrorCode =
        error instanceof LocalConversionError ? error.code : "processing-failed";
      const failed: ConversionJob = {
        ...job,
        status: code === "cancelled" ? "cancelled" : "failed",
        completedAt: new Date().toISOString(),
        processingDurationMs: Date.now() - startedAt,
        error:
          code === "cancelled"
            ? null
            : { code, message: CONVERTER_ERROR_COPY[code].heading },
      };
      this.jobs.set(job.id, failed);
      return failed;
    }
  }

  async getJob(jobId: string): Promise<ConversionJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async fetchOutput(jobId: string): Promise<Blob | null> {
    return this.outputs.get(jobId) ?? null;
  }

  async cancel(): Promise<void> {
    // Immediate provider: cancellation arrives through the AbortSignal
    // passed to convert(); there is no queue entry to withdraw.
  }

  /** Fast low-res pass for the Adjust step's live preview. */
  async preview(request: ConversionRequest): Promise<Blob | null> {
    try {
      const params = resolveParams(request.settings);
      const raster = await rasterizeCrop(request.photo, request.crop, 420);
      const gray = toGrayscale(raster);
      adjustContrast(gray, params.contrastFactor);
      const blurred = boxBlur(
        gray,
        raster.width,
        raster.height,
        Math.max(1, Math.round(params.blurRadius * 0.5)),
      );
      const magnitude = sobelMagnitude(blurred, raster.width, raster.height);
      let mask = thresholdMask(magnitude, params.threshold);
      mask = removeSmallComponents(
        mask,
        raster.width,
        raster.height,
        // The preview is ~1/3 working resolution; scale the speck size too.
        Math.max(2, Math.round(params.minComponentSize / 9)),
      );
      mask = smoothLines(mask, raster.width, raster.height);
      const result = renderMask(mask, raster.width, raster.height, params.invert);
      return await encodePng(result);
    } catch {
      return null; // Preview is best-effort; conversion is the real path.
    }
  }

  private progressFor(index: number): ConversionProgress {
    const stage = STAGES[Math.min(index, STAGES.length - 1)];
    return {
      stage: stage.stage,
      message: stage.message,
      completedStages: index,
      totalStages: STAGES.length,
    };
  }
}
