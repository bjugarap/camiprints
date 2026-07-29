import "server-only";

import { randomUUID } from "node:crypto";

import type {
  AiVendorAdapter,
  VendorCreateInput,
  VendorPollResult,
} from "./vendor-adapter";

/**
 * Deterministic stand-in vendor for development and e2e (AI_PROVIDER=mock):
 * exercises the entire production path — create, poll-until-ready,
 * download, validation — without cost, network, or a key. Stateless like
 * the real adapters: readiness is encoded in the poll reference itself,
 * so it also works across serverless instances.
 *
 * This is testing infrastructure for the pipeline, not a second converter
 * implementation — it returns one fixed line-art page.
 */
const READY_AFTER_MS = 1200;

export class MockVendorAdapter implements AiVendorAdapter {
  readonly id = "flux";
  readonly model = "mock";

  async create(input: VendorCreateInput): Promise<{
    requestId: string;
    pollUrl: string;
  }> {
    const landscape = input.aspectRatio === "22:17";
    return {
      requestId: `mock-${randomUUID()}`,
      pollUrl: `mock:${Date.now()}:${landscape ? "l" : "p"}`,
    };
  }

  async poll(pollUrl: string): Promise<VendorPollResult> {
    const [, createdAt, orientation] = pollUrl.split(":");
    if (Date.now() - Number(createdAt) < READY_AFTER_MS) {
      return { state: "pending" };
    }
    return {
      state: "ready",
      resultUrl: `mock:result:${orientation}`,
      requestId: "mock",
    };
  }

  async download(resultUrl: string): Promise<Uint8Array> {
    const { default: sharp } = await import("sharp");
    const landscape = resultUrl.endsWith(":l");
    const width = landscape ? 1408 : 1088;
    const height = landscape ? 1088 : 1408;
    // A valid "coloring page": white sheet, bold black enclosed shapes —
    // passes the same output validation as a real vendor result.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <circle cx="${width / 2}" cy="${height * 0.32}" r="${width * 0.18}"
        fill="none" stroke="black" stroke-width="14"/>
      <rect x="${width * 0.28}" y="${height * 0.5}" width="${width * 0.44}"
        height="${height * 0.3}" rx="30" fill="none" stroke="black" stroke-width="14"/>
      <path d="M ${width * 0.34} ${height * 0.6} q ${width * 0.16} ${height * 0.12} ${width * 0.32} 0"
        fill="none" stroke="black" stroke-width="10"/>
    </svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Uint8Array(png);
  }
}
