import { z } from "zod";

/**
 * The versioned contract between the CamiPrints website and the Chrome
 * extension. Both sides import (or copy verbatim) this file — it is the
 * single source of truth for limits, schemas and error codes.
 *
 * Flow (v1):
 *   1. POST /api/converter/handoffs   — multipart/form-data
 *        fields: version=v1, image=<Blob>
 *        → 201 HandoffCreateResponse { token, expiresAt, version }
 *   2. Open /create/photo?handoff=<token>
 *   3. The website POSTs /api/converter/handoffs/redeem { version, token }
 *        → 200 image bytes (content-type = stored MIME) with
 *          X-Handoff-Filename / X-Handoff-Source headers
 *        → 404 HandoffError for missing/expired/used tokens (one generic
 *          message — callers cannot probe which case occurred)
 *
 * Tokens are opaque, cryptographically random, short-lived and single-use.
 * They never encode image data, URLs, filenames or user information.
 */
export const HANDOFF_VERSION = "v1";

export const HANDOFF_LIMITS = {
  /** Matches the standard upload rules — the extension gets no exceptions. */
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxBytes: 10 * 1024 * 1024, // 10 MB
  minDimension: 100,
  maxDimension: 8000,
  /** Decompression-bomb guard: decoded pixel budget. */
  maxPixels: 40_000_000,
  /** Handoff lifetime; single-use regardless of remaining time. */
  tokenTtlSeconds: 10 * 60,
} as const;

export const HANDOFF_ERROR_CODES = [
  "unsupported-version",
  "missing-image",
  "unsupported-type",
  "file-too-large",
  "invalid-image",
  "rate-limited",
  "handoff-not-found",
  "server-error",
] as const;
export type HandoffErrorCode = (typeof HANDOFF_ERROR_CODES)[number];

/** Opaque 43-char base64url token from 32 random bytes. */
export const handoffTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "malformed token");

export const handoffCreateResponseSchema = z.object({
  version: z.literal(HANDOFF_VERSION),
  token: handoffTokenSchema,
  /** ISO timestamp after which the token is dead even if unused. */
  expiresAt: z.string(),
});
export type HandoffCreateResponse = z.infer<typeof handoffCreateResponseSchema>;

export const handoffRedeemRequestSchema = z.object({
  version: z.literal(HANDOFF_VERSION),
  token: handoffTokenSchema,
});
export type HandoffRedeemRequest = z.infer<typeof handoffRedeemRequestSchema>;

export const handoffErrorSchema = z.object({
  error: z.enum(HANDOFF_ERROR_CODES),
  /** Always generic — never reveals whether a token existed. */
  message: z.string(),
});
export type HandoffError = z.infer<typeof handoffErrorSchema>;

/** Response headers carrying redemption metadata beside the image bytes. */
export const HANDOFF_HEADER_FILENAME = "X-Handoff-Filename";
export const HANDOFF_HEADER_SOURCE = "X-Handoff-Source";

export function isAcceptedMimeType(
  mimeType: string,
): mimeType is (typeof HANDOFF_LIMITS.acceptedMimeTypes)[number] {
  return (HANDOFF_LIMITS.acceptedMimeTypes as readonly string[]).includes(
    mimeType,
  );
}
