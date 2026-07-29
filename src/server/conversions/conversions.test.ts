import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, type ConversionSettings } from "@/types/converter";

import { buildConversionPrompt } from "./prompt-builder";
import {
  openConversionToken,
  sealConversionToken,
  type PollTokenPayload,
} from "./conversion-token";
import { validateColoringPageOutput } from "./validate-output";
import { FluxVendorAdapter } from "./flux-adapter";
import { MockVendorAdapter } from "./mock-adapter";

/* ------------------------------------------------------- prompt builder */

describe("prompt builder", () => {
  it("always contains the base contract: preserve, line art, no additions", () => {
    const prompt = buildConversionPrompt(DEFAULT_SETTINGS);
    for (const fragment of [
      "coloring-book page",
      "Preserve the subject, pose, facial expression",
      "black line art",
      "white background",
      "enclosed coloring regions",
      "watermarks, logos, and text",
      "Do not add subjects",
      "generous white margins",
    ]) {
      expect(prompt).toContain(fragment);
    }
  });

  it("detail slider changes the wording", () => {
    const simpler = buildConversionPrompt({
      ...DEFAULT_SETTINGS,
      detail: "simpler",
    });
    const more = buildConversionPrompt({
      ...DEFAULT_SETTINGS,
      detail: "more-lines",
    });
    expect(simpler).toContain("Simplify aggressively");
    expect(more).toContain("Keep more of the original detail");
    expect(simpler).not.toContain("Keep more of the original detail");
  });

  it("line thickness and background settings change the wording", () => {
    const settings: ConversionSettings = {
      ...DEFAULT_SETTINGS,
      advanced: {
        ...DEFAULT_SETTINGS.advanced,
        lineWeight: "thick",
        removeBackground: true,
      },
    };
    const prompt = buildConversionPrompt(settings);
    expect(prompt).toContain("thick, chunky outlines");
    expect(prompt).toContain("Remove the background entirely");
    expect(prompt).not.toContain("simplified version of the background");
  });

  it("invert flips the rendering instruction", () => {
    const prompt = buildConversionPrompt({
      ...DEFAULT_SETTINGS,
      advanced: { ...DEFAULT_SETTINGS.advanced, invert: true },
    });
    expect(prompt).toContain("white line art on a solid black background");
  });
});

/* ------------------------------------------------------------- tokens */

const pollPayload: PollTokenPayload = {
  kind: "poll",
  jobId: "job-1",
  vendor: "flux",
  model: "flux-2-klein-9b",
  requestId: "req-1",
  pollUrl: "https://api.us.bfl.ai/v1/get_result?id=req-1",
  createdAt: 1_000_000,
  attempt: 2,
  invert: false,
};

describe("conversion tokens", () => {
  it("round-trips a payload", () => {
    const token = sealConversionToken(pollPayload);
    expect(openConversionToken(token)).toEqual(pollPayload);
  });

  it("rejects tampered, truncated and garbage tokens", () => {
    const token = sealConversionToken(pollPayload);
    const flipped =
      token.slice(0, 10) + (token[10] === "A" ? "B" : "A") + token.slice(11);
    expect(openConversionToken(flipped)).toBeNull();
    expect(openConversionToken(token.slice(0, 20))).toBeNull();
    expect(openConversionToken("not-a-token")).toBeNull();
    expect(openConversionToken("")).toBeNull();
  });

  it("tokens are unique per seal (fresh IV)", () => {
    expect(sealConversionToken(pollPayload)).not.toBe(
      sealConversionToken(pollPayload),
    );
  });
});

/* --------------------------------------------------- output validation */

async function svgPng(svgBody: string, w = 600, h = 800): Promise<Uint8Array> {
  const { default: sharp } = await import("sharp");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svgBody}</svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

describe("output validation", () => {
  it("accepts a proper coloring page: black lines on white", async () => {
    const page = await svgPng(
      `<rect width="600" height="800" fill="white"/>
       <circle cx="300" cy="400" r="200" fill="none" stroke="black" stroke-width="16"/>`,
    );
    expect((await validateColoringPageOutput(page)).ok).toBe(true);
  });

  it("rejects a blank white page", async () => {
    const blank = await svgPng(`<rect width="600" height="800" fill="white"/>`);
    const verdict = await validateColoringPageOutput(blank);
    expect(verdict).toMatchObject({ ok: false, reason: "blank" });
  });

  it("rejects a mostly-black page", async () => {
    const black = await svgPng(`<rect width="600" height="800" fill="black"/>`);
    const verdict = await validateColoringPageOutput(black);
    expect(verdict.ok).toBe(false);
    expect(["too-dark", "not-line-art"]).toContain(verdict.reason);
  });

  it("rejects a mid-grey photo-like page (no white paper)", async () => {
    const grey = await svgPng(`<rect width="600" height="800" fill="#808080"/>`);
    const verdict = await validateColoringPageOutput(grey);
    expect(verdict).toMatchObject({ ok: false, reason: "blank" });
  });

  it("rejects undecodable bytes and tiny images", async () => {
    expect(
      (await validateColoringPageOutput(new Uint8Array([1, 2, 3]))).ok,
    ).toBe(false);
    const tiny = await svgPng(`<rect width="10" height="10" fill="white"/>`, 10, 10);
    expect(
      (await validateColoringPageOutput(tiny)).reason,
    ).toBe("too-small");
  });

  it("accepts an inverted page when inversion is expected — and only then", async () => {
    const inverted = await svgPng(
      `<rect width="600" height="800" fill="black"/>
       <circle cx="300" cy="400" r="200" fill="none" stroke="white" stroke-width="16"/>`,
    );
    expect(
      (await validateColoringPageOutput(inverted, { invertExpected: true })).ok,
    ).toBe(true);
    expect((await validateColoringPageOutput(inverted)).ok).toBe(false);
  });
});

/* ------------------------------------------------------- flux adapter */

function fluxEnv() {
  vi.stubEnv("BFL_API_KEY", "bfl_test_key");
  vi.stubEnv("BFL_MODEL", "flux-2-klein-9b");
  vi.stubEnv("BFL_API_BASE_URL", "https://api.us.bfl.ai");
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("flux adapter", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    fluxEnv();
  });

  const input = {
    imageBytes: new Uint8Array([1, 2, 3]),
    mimeType: "image/jpeg",
    prompt: "prompt",
    aspectRatio: "17:22",
  };

  it("creates against {base}/v1/{model} with the x-key header", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.us.bfl.ai/v1/flux-2-klein-9b");
      expect((init?.headers as Record<string, string>)["x-key"]).toBe(
        "bfl_test_key",
      );
      const body = JSON.parse(String(init?.body));
      expect(body.prompt).toBe("prompt");
      expect(body.aspect_ratio).toBe("17:22");
      expect(typeof body.input_image).toBe("string");
      return jsonResponse(200, {
        id: "req-9",
        polling_url: "https://api.us.bfl.ai/v1/get_result?id=req-9",
      });
    });
    const adapter = new FluxVendorAdapter(fetchMock as unknown as typeof fetch);
    const created = await adapter.create(input);
    expect(created.requestId).toBe("req-9");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("refuses a polling URL outside bfl.ai", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { id: "x", polling_url: "https://evil.example.com/poll" }),
    );
    const adapter = new FluxVendorAdapter(fetchMock as unknown as typeof fetch);
    await expect(adapter.create(input)).rejects.toThrow("unexpected host");
  });

  it("maps vendor poll statuses onto the seam states", async () => {
    const statuses: Array<[unknown, string]> = [
      [{ status: "Pending" }, "pending"],
      [
        { status: "Ready", id: "r", result: { sample: "https://bfl.ai/s" } },
        "ready",
      ],
      [{ status: "Content Moderated" }, "moderated"],
      [{ status: "Request Moderated" }, "moderated"],
      [{ status: "Error" }, "failed"],
      [{ status: "Task not found" }, "failed"],
    ];
    for (const [body, expected] of statuses) {
      const adapter = new FluxVendorAdapter(
        vi.fn(async () => jsonResponse(200, body)) as unknown as typeof fetch,
      );
      expect((await adapter.poll("https://api.us.bfl.ai/poll")).state).toBe(
        expected,
      );
    }
  });

  it("refuses to download from unexpected hosts", async () => {
    const adapter = new FluxVendorAdapter(
      vi.fn(async () => new Response(new Uint8Array([1]))) as unknown as typeof fetch,
    );
    await expect(adapter.download("https://evil.example.com/img")).rejects.toThrow(
      "unexpected host",
    );
  });

  it("throws when the API key is missing", () => {
    vi.stubEnv("BFL_API_KEY", "");
    expect(() => new FluxVendorAdapter()).toThrow("BFL_API_KEY");
  });
});

/* -------------------------------------------------------- mock adapter */

describe("mock adapter", () => {
  it("goes pending → ready and produces output that passes validation", async () => {
    vi.useFakeTimers();
    try {
      const adapter = new MockVendorAdapter();
      const { pollUrl } = await adapter.create({
        imageBytes: new Uint8Array([1]),
        mimeType: "image/png",
        prompt: "p",
        aspectRatio: "17:22",
      });
      expect((await adapter.poll(pollUrl)).state).toBe("pending");
      vi.advanceTimersByTime(2000);
      const ready = await adapter.poll(pollUrl);
      expect(ready.state).toBe("ready");
      if (ready.state !== "ready") return;
      vi.useRealTimers();
      const bytes = await adapter.download(ready.resultUrl);
      expect((await validateColoringPageOutput(bytes)).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
