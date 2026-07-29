import type {
  ConversionJob,
  ConversionProgress,
  ConversionProviderId,
  ConversionSettings,
  CropState,
} from "@/types/converter";
import { CONVERSION_PROVIDER_IDS } from "@/types/converter";

/**
 * The provider seam. The wizard talks only to this interface; which
 * implementation answers is configuration (`NEXT_PUBLIC_COLORING_PROVIDER`),
 * never a UI concern. The interface is shaped for the *hardest* provider —
 * an asynchronous, job-submitting, polling service — and the LocalProvider
 * simply happens to complete its job within a single `convert()` call.
 *
 * Contract:
 *  - `convert()` creates a ConversionJob and returns when the job reaches a
 *    terminal state (immediate providers) or is safely submitted (async
 *    providers, which return a queued/processing job to poll via `getJob`).
 *  - Progress is reported through `onProgress` with real stage counts.
 *  - `signal` aborts: the job must end "cancelled", never half-done.
 *  - The output image travels as a Blob via `fetchOutput`, kept out of the
 *    serializable job record.
 */
export interface ConversionRequest {
  photo: Blob;
  crop: CropState;
  settings: ConversionSettings;
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

/** Thrown by stub providers until their integration lands. */
export class ProviderNotConfiguredError extends Error {
  constructor(providerId: ConversionProviderId) {
    super(`Conversion provider "${providerId}" is not configured`);
    this.name = "ProviderNotConfiguredError";
  }
}

/* -------------------------------------------------------------- registry */

type ProviderFactory = () => Promise<PhotoConversionProvider>;

/**
 * Lazy factories so heavy implementations only load when selected — the
 * local pipeline never ships to a deployment that uses a remote provider,
 * and vice versa.
 */
const FACTORIES: Record<ConversionProviderId, ProviderFactory> = {
  local: async () =>
    new (await import("./local/local-provider")).LocalProvider(),
  openai: async () => new (await import("./openai-provider")).OpenAIProvider(),
  flux: async () => new (await import("./flux-provider")).FluxProvider(),
  imagen: async () =>
    new (await import("./imagen-provider")).ImagenProvider(),
};

export function getConfiguredProviderId(): ConversionProviderId {
  const configured = process.env.NEXT_PUBLIC_COLORING_PROVIDER;
  if (
    configured &&
    (CONVERSION_PROVIDER_IDS as readonly string[]).includes(configured)
  ) {
    return configured as ConversionProviderId;
  }
  return "local";
}

let instance: PhotoConversionProvider | null = null;

export async function getConversionProvider(): Promise<PhotoConversionProvider> {
  if (!instance || instance.id !== getConfiguredProviderId()) {
    instance = await FACTORIES[getConfiguredProviderId()]();
  }
  return instance;
}
