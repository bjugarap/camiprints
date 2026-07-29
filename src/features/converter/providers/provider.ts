import type {
  ConversionEngine,
  ConversionJob,
  ConversionProgress,
  ConversionProviderId,
  ConversionSettings,
  CropState,
} from "@/types/converter";

/**
 * The provider seam. The wizard talks only to this interface; which
 * implementation answers is configuration, never a UI concern.
 *
 * Since Sprint 4 the user-facing choice is the *engine*:
 *  - "ai"    → ServerAiProvider, a thin client for /api/conversions. The
 *              actual vendor (Flux today; OpenAI/Imagen later) is chosen
 *              server-side by AI_PROVIDER — the browser cannot tell.
 *  - "local" → LocalProvider ("Quick Outline"): on-device, instant,
 *              private, lower quality.
 *
 * The interface is shaped for the hardest case — an asynchronous,
 * job-submitting, polling service:
 *  - `convert()` returns a terminal job (immediate providers) or a
 *    queued/processing job to poll via `getJob` (async providers).
 *  - Progress is reported through `onProgress` with real stage counts.
 *  - `signal` aborts: the job must end "cancelled", never half-done.
 *  - The output image travels as a Blob via `fetchOutput`.
 */
export interface ConversionRequest {
  photo: Blob;
  crop: CropState;
  settings: ConversionSettings;
  /** 1-based try counter for this photo — cost/diagnostics only. */
  attempt?: number;
}

export interface ConversionCallbacks {
  onProgress?: (progress: ConversionProgress) => void;
  signal?: AbortSignal;
}

export interface PhotoConversionProvider {
  readonly id: ConversionProviderId;
  readonly displayName: string;
  /** "immediate": convert() resolves with a terminal job. "async": poll. */
  readonly mode: "immediate" | "async";
  /** Client poll cadence for async providers. */
  readonly pollIntervalMs?: number;
  convert(
    request: ConversionRequest,
    callbacks?: ConversionCallbacks,
  ): Promise<ConversionJob>;
  getJob(jobId: string): Promise<ConversionJob | null>;
  fetchOutput(jobId: string): Promise<Blob | null>;
  cancel(jobId: string): Promise<void>;
  /**
   * Optional capability: a fast low-resolution approximation for the
   * Adjust step's live preview. Providers that can't preview cheaply
   * return null and the UI shows the cropped photo instead — the wizard
   * never knows why.
   */
  preview?(request: ConversionRequest): Promise<Blob | null>;
}

/* --------------------------------------------------------------- config */

export interface EngineConfig {
  aiEnabled: boolean;
  localEnabled: boolean;
  defaultEngine: ConversionEngine;
}

/**
 * Client-visible engine flags. (The sprint's AI_ENABLED / LOCAL_ENABLED /
 * LOCAL_DEFAULT names carry the NEXT_PUBLIC_ prefix because the browser
 * bundle needs them; the server-only variables keep their bare names.)
 */
export function getEngineConfig(): EngineConfig {
  const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";
  const localEnabled = process.env.NEXT_PUBLIC_LOCAL_ENABLED !== "false";
  const localDefault = process.env.NEXT_PUBLIC_LOCAL_DEFAULT === "true";
  const defaultEngine: ConversionEngine =
    !aiEnabled || (localDefault && localEnabled) ? "local" : "ai";
  return { aiEnabled, localEnabled, defaultEngine };
}

/* ------------------------------------------------------------- registry */

const instances = new Map<ConversionEngine, PhotoConversionProvider>();

export async function getConversionProvider(
  engine: ConversionEngine,
): Promise<PhotoConversionProvider> {
  let instance = instances.get(engine);
  if (!instance) {
    instance =
      engine === "local"
        ? new (await import("./local/local-provider")).LocalProvider()
        : new (await import("./server-ai-provider")).ServerAiProvider();
    instances.set(engine, instance);
  }
  return instance;
}
