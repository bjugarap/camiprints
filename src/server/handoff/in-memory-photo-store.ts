import type {
  StoredHandoffPhoto,
  TemporaryPhotoStore,
} from "./temporary-photo-store";

/**
 * Map-backed TemporaryPhotoStore. Correct for local development and any
 * single-instance deployment; NOT sufficient for multi-instance serverless,
 * where the create and redeem requests may land on different instances —
 * production swaps in a shared implementation (Supabase private bucket /
 * R2) behind the same interface.
 *
 * The map lives on globalThis so dev-server hot reloads don't orphan
 * pending handoffs.
 */
const GLOBAL_KEY = Symbol.for("camiprints.handoff-store");

type Registry = Map<string, StoredHandoffPhoto>;

function registry(): Registry {
  const holder = globalThis as { [GLOBAL_KEY]?: Registry };
  holder[GLOBAL_KEY] ??= new Map();
  return holder[GLOBAL_KEY];
}

export class InMemoryTemporaryPhotoStore implements TemporaryPhotoStore {
  async put(token: string, record: StoredHandoffPhoto): Promise<void> {
    registry().set(token, record);
  }

  async redeem(
    token: string,
    now = Date.now(),
  ): Promise<StoredHandoffPhoto | null> {
    const store = registry();
    const record = store.get(token);
    // Delete first — even an expired record is burned by the attempt.
    store.delete(token);
    if (!record || record.expiresAt <= now) return null;
    return record;
  }

  async delete(token: string): Promise<void> {
    registry().delete(token);
  }

  async sweep(now = Date.now()): Promise<number> {
    const store = registry();
    let swept = 0;
    for (const [token, record] of store) {
      if (record.expiresAt <= now) {
        store.delete(token);
        swept += 1;
      }
    }
    return swept;
  }
}
