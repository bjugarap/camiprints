import "server-only";

import { randomBytes } from "node:crypto";

import {
  HANDOFF_LIMITS,
  isAcceptedMimeType,
  type HandoffErrorCode,
} from "@/shared/contracts/extension-handoff";

import { InMemoryTemporaryPhotoStore } from "./in-memory-photo-store";
import type {
  StoredHandoffPhoto,
  TemporaryPhotoStore,
} from "./temporary-photo-store";

/**
 * Server logic behind the two handoff endpoints, kept framework-free so it
 * is unit-testable without HTTP. Validation never trusts caller-supplied
 * metadata: the claimed MIME type is checked, then the bytes are actually
 * decoded (sharp) and the decoded format/dimensions re-checked.
 */
export class HandoffRejection extends Error {
  constructor(
    readonly code: HandoffErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "HandoffRejection";
  }
}

/** 32 random bytes → 43-char base64url opaque token. */
export function generateHandoffToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Strip any path components and control characters; cap the length. */
export function sanitizeFilename(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[^\w.\- ]/g, "").trim().slice(0, 80);
  return clean || undefined;
}

const SHARP_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface DecodedImageInfo {
  format: string | undefined;
  width: number | undefined;
  height: number | undefined;
}

/** Real decode via sharp; failures surface as invalid-image. */
async function decodeWithSharp(bytes: Uint8Array): Promise<DecodedImageInfo> {
  const { default: sharp } = await import("sharp");
  const metadata = await sharp(Buffer.from(bytes), {
    // Our own bomb guard rejects first with a contract error code.
    limitInputPixels: HANDOFF_LIMITS.maxPixels * 2,
  }).metadata();
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
  };
}

export interface HandoffServiceOptions {
  store?: TemporaryPhotoStore;
  decode?: (bytes: Uint8Array) => Promise<DecodedImageInfo>;
  now?: () => number;
}

export class HandoffService {
  private readonly store: TemporaryPhotoStore;
  private readonly decode: (bytes: Uint8Array) => Promise<DecodedImageInfo>;
  private readonly now: () => number;

  constructor(options: HandoffServiceOptions = {}) {
    this.store = options.store ?? new InMemoryTemporaryPhotoStore();
    this.decode = options.decode ?? decodeWithSharp;
    this.now = options.now ?? Date.now;
  }

  /** Validate the upload and store it; returns the single-use token. */
  async create(input: {
    bytes: Uint8Array;
    claimedMimeType: string;
    filename?: string;
  }): Promise<{ token: string; expiresAt: string }> {
    if (input.bytes.byteLength === 0) {
      throw new HandoffRejection("missing-image", 400);
    }
    if (input.bytes.byteLength > HANDOFF_LIMITS.maxBytes) {
      throw new HandoffRejection("file-too-large", 413);
    }
    if (!isAcceptedMimeType(input.claimedMimeType)) {
      throw new HandoffRejection("unsupported-type", 415);
    }

    let decoded: DecodedImageInfo;
    try {
      decoded = await this.decode(input.bytes);
    } catch {
      throw new HandoffRejection("invalid-image", 422);
    }
    const mimeType = decoded.format ? SHARP_TO_MIME[decoded.format] : undefined;
    const { width, height } = decoded;
    if (!mimeType || !width || !height) {
      // Decoded fine but to a format outside the allowlist (or the claimed
      // type lied about a disallowed format) — same rejection either way.
      throw new HandoffRejection("unsupported-type", 415);
    }
    if (
      width < HANDOFF_LIMITS.minDimension ||
      height < HANDOFF_LIMITS.minDimension ||
      width > HANDOFF_LIMITS.maxDimension ||
      height > HANDOFF_LIMITS.maxDimension ||
      width * height > HANDOFF_LIMITS.maxPixels
    ) {
      throw new HandoffRejection("invalid-image", 422);
    }

    // Opportunistic sweep keeps the store from accumulating abandoned
    // handoffs between requests.
    await this.store.sweep(this.now());

    const token = generateHandoffToken();
    const createdAt = this.now();
    const expiresAt = createdAt + HANDOFF_LIMITS.tokenTtlSeconds * 1000;
    const record: StoredHandoffPhoto = {
      bytes: input.bytes,
      mimeType,
      originalFilename: sanitizeFilename(input.filename),
      createdAt,
      expiresAt,
    };
    await this.store.put(token, record);
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  }

  /** Single-use redemption; null for unknown/expired/used alike. */
  async redeem(token: string): Promise<StoredHandoffPhoto | null> {
    return this.store.redeem(token, this.now());
  }
}

/* ---------------------------------------------------------- rate limiting */

/**
 * Fixed-window in-memory rate limiter. Enough to blunt abuse on a single
 * instance; production should back this with shared infrastructure (e.g.
 * Upstash) — noted in docs/security.md.
 */
const RATE_LIMIT_KEY = Symbol.for("camiprints.handoff-rate");

interface RateWindow {
  windowStart: number;
  count: number;
}

function rateRegistry(): Map<string, RateWindow> {
  const holder = globalThis as {
    [RATE_LIMIT_KEY]?: Map<string, RateWindow>;
  };
  holder[RATE_LIMIT_KEY] ??= new Map();
  return holder[RATE_LIMIT_KEY];
}

export function checkRateLimit(
  key: string,
  { limit = 10, windowMs = 60_000, now = Date.now() } = {},
): boolean {
  const registry = rateRegistry();
  const entry = registry.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    registry.set(key, { windowStart: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/* ----------------------------------------------------------- singletons */

const SERVICE_KEY = Symbol.for("camiprints.handoff-service");

export function getHandoffService(): HandoffService {
  const holder = globalThis as { [SERVICE_KEY]?: HandoffService };
  holder[SERVICE_KEY] ??= new HandoffService();
  return holder[SERVICE_KEY];
}
