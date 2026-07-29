import "server-only";

import {
  VendorRequestError,
  type AiVendorAdapter,
  type VendorCreateInput,
  type VendorPollResult,
} from "./vendor-adapter";

/**
 * Black Forest Labs adapter (https://docs.bfl.ai). BFL's async workflow
 * maps 1:1 onto the vendor seam:
 *
 *   POST {base}/v1/{model}  { prompt, input_image, … }  → { id, polling_url }
 *   GET  polling_url                                    → { status, result }
 *   GET  result.sample (signed URL, ~10 min)            → image bytes
 *
 * Auth is the `x-key` header on api.bfl.ai requests. The key exists only
 * here, server-side; nothing about the image is logged.
 *
 * Model and base URL come from env (BFL_MODEL, BFL_API_BASE_URL) so a
 * model upgrade is configuration, not code.
 */
type FetchLike = typeof fetch;

export class FluxVendorAdapter implements AiVendorAdapter {
  readonly id = "flux";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.model = process.env.BFL_MODEL ?? "flux-2-klein-9b";
    this.baseUrl = (
      process.env.BFL_API_BASE_URL ?? "https://api.us.bfl.ai"
    ).replace(/\/$/, "");
    this.apiKey = process.env.BFL_API_KEY ?? "";
    this.fetchImpl = fetchImpl;
    if (!this.apiKey) {
      throw new VendorRequestError("BFL_API_KEY is not configured");
    }
  }

  async create(input: VendorCreateInput): Promise<{
    requestId: string;
    pollUrl: string;
  }> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/${this.model}`, {
      method: "POST",
      headers: {
        "x-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt,
        input_image: Buffer.from(input.imageBytes).toString("base64"),
        aspect_ratio: input.aspectRatio,
        output_format: "png",
      }),
    });

    if (!response.ok) {
      // Body detail goes to the server log only; the client gets a
      // generic code. 401/402/403 mean configuration/credits, not retry.
      const detail = await response.text().catch(() => "");
      console.error(
        JSON.stringify({
          event: "bfl-create-error",
          status: response.status,
          model: this.model,
          detail: detail.slice(0, 500),
        }),
      );
      throw new VendorRequestError(
        `BFL create failed (${response.status})`,
        response.status,
      );
    }

    const body = (await response.json()) as {
      id?: string;
      polling_url?: string;
    };
    if (!body.id || !body.polling_url) {
      throw new VendorRequestError("BFL create returned no polling URL");
    }
    // The polling URL will be sealed into a client-held token and fetched
    // later — accept only BFL hosts, ever.
    const host = new URL(body.polling_url).hostname;
    if (host !== "bfl.ai" && !host.endsWith(".bfl.ai")) {
      throw new VendorRequestError("BFL polling URL has unexpected host");
    }
    return { requestId: body.id, pollUrl: body.polling_url };
  }

  async poll(pollUrl: string): Promise<VendorPollResult> {
    const response = await this.fetchImpl(pollUrl, {
      headers: { "x-key": this.apiKey },
    });
    if (!response.ok) {
      return { state: "failed", detail: `poll ${response.status}` };
    }
    const body = (await response.json()) as {
      id?: string;
      status?: string;
      result?: { sample?: string };
    };
    switch (body.status) {
      case "Pending":
        return { state: "pending" };
      case "Ready": {
        const sample = body.result?.sample;
        if (!sample) return { state: "failed", detail: "ready-without-sample" };
        return { state: "ready", resultUrl: sample, requestId: body.id ?? "" };
      }
      case "Content Moderated":
      case "Request Moderated":
        return { state: "moderated" };
      default:
        return { state: "failed", detail: body.status ?? "unknown-status" };
    }
  }

  async download(resultUrl: string): Promise<Uint8Array> {
    // Result URLs are pre-signed; created by us moments ago and only ever
    // read back from our own authenticated token. Enforce the host anyway.
    const host = new URL(resultUrl).hostname;
    if (
      host !== "bfl.ai" &&
      !host.endsWith(".bfl.ai") &&
      !host.endsWith(".cloudfront.net") &&
      !host.endsWith(".amazonaws.com")
    ) {
      throw new VendorRequestError("BFL result URL has unexpected host");
    }
    const response = await this.fetchImpl(resultUrl);
    if (!response.ok) {
      throw new VendorRequestError(`BFL download failed (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}
