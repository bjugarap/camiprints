/**
 * Text-to-image client for the batch generator. Mirrors the server
 * FluxVendorAdapter's conventions exactly (same env vars, same x-key auth,
 * same host allowlists, same status mapping) for the text-to-image case the
 * converter never uses. Runs ONLY in scripts — the API key never reaches
 * client code, and no image bytes are ever logged.
 *
 * Requests portrait print resolution via explicit width/height first
 * (multiples of 32 at the 17:22 US Letter aspect); if the model rejects
 * explicit dimensions, falls back to aspect_ratio.
 */
export interface FluxGenerationResult {
  bytes: Uint8Array;
  requestId: string;
}

const PORTRAIT = { width: 1088, height: 1408, aspectRatio: "17:22" } as const;

function env(name: string): string | undefined {
  return process.env[name];
}

export function fluxConfig() {
  const apiKey = env("BFL_API_KEY");
  if (!apiKey) throw new Error("BFL_API_KEY is not configured");
  return {
    apiKey,
    // The coloring pipeline can run a stronger model than the photo
    // converter: COLORING_BFL_MODEL wins, then the shared BFL_MODEL.
    model: env("COLORING_BFL_MODEL") ?? env("BFL_MODEL") ?? "flux-2-klein-9b",
    baseUrl: (env("BFL_API_BASE_URL") ?? "https://api.us.bfl.ai").replace(/\/$/, ""),
  };
}

const bflHost = (url: string): boolean => {
  const host = new URL(url).hostname;
  return (
    host === "bfl.ai" ||
    host.endsWith(".bfl.ai") ||
    host.endsWith(".cloudfront.net") ||
    host.endsWith(".amazonaws.com")
  );
};

export async function generateColoringImage(
  prompt: string,
  seed: number,
  options: { timeoutMs?: number } = {},
): Promise<FluxGenerationResult> {
  const { apiKey, model, baseUrl } = fluxConfig();
  const timeoutMs = options.timeoutMs ?? 120_000;

  const create = async (body: Record<string, unknown>) =>
    fetch(`${baseUrl}/v1/${model}`, {
      method: "POST",
      headers: { "x-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const base = { prompt, seed, output_format: "png" };
  let response = await create({
    ...base,
    width: PORTRAIT.width,
    height: PORTRAIT.height,
  });
  if (!response.ok && response.status >= 400 && response.status < 500) {
    // Model may not accept explicit dimensions — retry with aspect ratio.
    response = await create({ ...base, aspect_ratio: PORTRAIT.aspectRatio });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`create ${response.status}: ${detail.slice(0, 300)}`);
  }
  const created = (await response.json()) as {
    id?: string;
    polling_url?: string;
  };
  if (!created.id || !created.polling_url || !bflHost(created.polling_url)) {
    throw new Error("create returned no valid polling URL");
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(created.polling_url, {
      headers: { "x-key": apiKey },
    });
    if (!poll.ok) continue;
    const body = (await poll.json()) as {
      status?: string;
      result?: { sample?: string };
    };
    if (body.status === "Ready" && body.result?.sample) {
      if (!bflHost(body.result.sample)) {
        throw new Error("result URL has unexpected host");
      }
      const download = await fetch(body.result.sample);
      if (!download.ok) throw new Error(`download ${download.status}`);
      return {
        bytes: new Uint8Array(await download.arrayBuffer()),
        requestId: created.id,
      };
    }
    if (body.status === "Content Moderated" || body.status === "Request Moderated") {
      throw new Error("moderated");
    }
    if (body.status && body.status !== "Pending") {
      throw new Error(body.status);
    }
  }
  throw new Error("timeout");
}
