import "server-only";

/**
 * Server-side seam between the conversion routes and an AI vendor's API.
 * One adapter per vendor; selection is `AI_PROVIDER` (flux today, openai /
 * imagen later, mock for dev and e2e). Adapters are stateless — the
 * poll reference travels inside the client's encrypted token, so any
 * serverless instance can serve any step of any job.
 */
export interface VendorCreateInput {
  imageBytes: Uint8Array;
  mimeType: string;
  prompt: string;
  /** e.g. "17:22" (US Letter portrait) or "22:17". */
  aspectRatio: string;
}

export type VendorPollResult =
  | { state: "pending" }
  | { state: "ready"; resultUrl: string; requestId: string }
  | { state: "moderated" }
  | { state: "failed"; detail?: string };

export interface AiVendorAdapter {
  readonly id: string;
  readonly model: string;
  create(input: VendorCreateInput): Promise<{ requestId: string; pollUrl: string }>;
  poll(pollUrl: string): Promise<VendorPollResult>;
  download(resultUrl: string): Promise<Uint8Array>;
}

/** Vendor rejected the request in a way retrying won't fix. */
export class VendorRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "VendorRequestError";
  }
}

export async function getVendorAdapter(): Promise<AiVendorAdapter> {
  const vendor = process.env.AI_PROVIDER ?? "flux";
  switch (vendor) {
    case "mock":
      return new (await import("./mock-adapter")).MockVendorAdapter();
    case "flux":
      return new (await import("./flux-adapter")).FluxVendorAdapter();
    default:
      throw new VendorRequestError(`Unknown AI_PROVIDER "${vendor}"`);
  }
}
