import { z } from "zod";

import {
  CONVERTER_ERROR_CODES,
  DETAIL_WORDS,
  CONTRAST_LEVELS,
  CONVERTER_STYLES,
  LINE_WEIGHTS,
} from "@/types/converter";

/**
 * Wire contract for the AI conversion API (/api/conversions). The browser
 * talks only to these endpoints; the server talks to the vendor. Job
 * continuity across serverless instances is carried by an opaque
 * encrypted token (see src/server/conversions/conversion-token.ts) — no
 * server-side session state exists.
 *
 *   POST /api/conversions            multipart: image, settings, attempt
 *     → 202 ConversionCreateResponse { job, pollToken }
 *   GET  /api/conversions/poll?token=…
 *     → 200 ConversionPollResponse   { job, outputToken? }
 *   GET  /api/conversions/output?token=…
 *     → 200 image bytes (image/png)
 */
export const CONVERSIONS_API_VERSION = "v1";

export const conversionSettingsSchema = z.object({
  style: z.enum(CONVERTER_STYLES),
  detail: z.enum(DETAIL_WORDS),
  advanced: z.object({
    lineWeight: z.enum(LINE_WEIGHTS),
    contrast: z.enum(CONTRAST_LEVELS),
    removeBackground: z.boolean(),
    invert: z.boolean(),
  }),
});

export const wireJobSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed", "cancelled"]),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  processingDurationMs: z.number().nullable(),
  output: z
    .object({
      width: z.number(),
      height: z.number(),
      mimeType: z.string(),
      byteSize: z.number(),
    })
    .nullable(),
  error: z
    .object({ code: z.enum(CONVERTER_ERROR_CODES), message: z.string() })
    .nullable(),
});
export type WireJob = z.infer<typeof wireJobSchema>;

export const conversionCreateResponseSchema = z.object({
  version: z.literal(CONVERSIONS_API_VERSION),
  job: wireJobSchema,
  pollToken: z.string(),
});
export type ConversionCreateResponse = z.infer<
  typeof conversionCreateResponseSchema
>;

export const conversionPollResponseSchema = z.object({
  version: z.literal(CONVERSIONS_API_VERSION),
  job: wireJobSchema,
  /** Present exactly when status is "completed". */
  outputToken: z.string().optional(),
});
export type ConversionPollResponse = z.infer<
  typeof conversionPollResponseSchema
>;

export const conversionErrorResponseSchema = z.object({
  error: z.enum(CONVERTER_ERROR_CODES),
  message: z.string(),
});
export type ConversionErrorResponse = z.infer<
  typeof conversionErrorResponseSchema
>;

/** Upload guard for the cropped image sent to the AI endpoint. */
export const CONVERSION_UPLOAD_LIMITS = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxBytes: 8 * 1024 * 1024,
} as const;
