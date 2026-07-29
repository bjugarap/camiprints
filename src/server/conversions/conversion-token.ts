import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Stateless job continuity for serverless. Instead of a server-side job
 * store (which breaks the moment create and poll land on different
 * instances), everything the poll/output endpoints need is carried in an
 * AES-256-GCM-encrypted, authenticated token held by the client. Clients
 * cannot read or forge it; tampering fails authentication and maps to the
 * same generic error as an expired job.
 *
 * `kind` binds a token to one endpoint so a poll token can never be spent
 * as an output token or vice versa.
 */
export interface PollTokenPayload {
  kind: "poll";
  jobId: string;
  vendor: string;
  model: string;
  requestId: string;
  pollUrl: string;
  createdAt: number; // ms epoch — the server-side timeout anchor
  attempt: number;
  /** The user asked for inverted output — validation must expect it. */
  invert: boolean;
}

export interface OutputTokenPayload {
  kind: "output";
  jobId: string;
  resultUrl: string;
  createdAt: number;
  width: number;
  height: number;
}

export type ConversionTokenPayload = PollTokenPayload | OutputTokenPayload;

function keyMaterial(): Buffer {
  // Derived from the vendor key so no extra secret needs provisioning;
  // rotating BFL_API_KEY invalidates in-flight tokens, which is acceptable
  // for sub-2-minute jobs. A dedicated secret can replace this later.
  const secret = process.env.BFL_API_KEY || "camiprints-dev-secret";
  return createHash("sha256")
    .update(`camiprints-conversion-token:${secret}`)
    .digest();
}

export function sealConversionToken(payload: ConversionTokenPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function openConversionToken(
  token: string,
): ConversionTokenPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 12 + 16 + 2) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as ConversionTokenPayload;
    if (payload.kind !== "poll" && payload.kind !== "output") return null;
    return payload;
  } catch {
    return null; // Tampered, truncated, or sealed under a rotated key.
  }
}
