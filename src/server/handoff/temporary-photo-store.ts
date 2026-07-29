/**
 * Short-lived private storage that carries an image from the Chrome
 * extension into the website tab. Records are:
 *  - expiring:   dead after HANDOFF_LIMITS.tokenTtlSeconds regardless of use
 *  - single-use: redeem() atomically returns-and-deletes
 *  - private:    no public URLs ever exist; bytes only leave through redeem
 *
 * Implementations: InMemoryTemporaryPhotoStore (dev/single-instance) today;
 * a Supabase private-bucket or Cloudflare R2 implementation drops in behind
 * this interface for multi-instance production (see docs/security.md).
 */
export interface StoredHandoffPhoto {
  bytes: Uint8Array;
  mimeType: string;
  /** Sanitized display name — never a caller-controlled path. */
  originalFilename?: string;
  createdAt: number;
  expiresAt: number;
}

export interface TemporaryPhotoStore {
  put(token: string, record: StoredHandoffPhoto): Promise<void>;
  /**
   * Atomic single-use read: returns the record and deletes it in the same
   * operation, or null if the token is unknown, already used or expired.
   * Callers cannot distinguish those cases — deliberately.
   */
  redeem(token: string, now?: number): Promise<StoredHandoffPhoto | null>;
  delete(token: string): Promise<void>;
  /** Remove expired records; returns how many were swept. */
  sweep(now?: number): Promise<number>;
}
