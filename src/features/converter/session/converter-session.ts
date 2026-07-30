import type { ConverterState } from "../machine/converter-machine";

/**
 * Refresh-proof persistence for the converter. The serializable machine
 * state lives in sessionStorage; the two blobs (source photo, finished
 * page) live in IndexedDB, which sessionStorage cannot hold. Everything is
 * best-effort: private-browsing modes that block storage degrade to an
 * in-memory session, never to an error the user sees.
 *
 * Retention: scoped to the tab session by construction — the snapshot dies
 * with sessionStorage, and orphaned IndexedDB blobs are overwritten by the
 * next session and removed by clearConverterSession() on Start Over. The
 * photo is never sent to a server by this module.
 */
// v2: the 5-step flow — v1 (six-step) snapshots are simply not restored.
const STATE_KEY = "camiprints:converter:v2";
const DB_NAME = "camiprints-converter";
const STORE = "blobs";
export const PHOTO_BLOB_KEY = "photo";
export const RESULT_BLOB_KEY = "result";

interface SessionSnapshot {
  version: 2;
  savedAt: string;
  state: ConverterState;
}

/* --------------------------------------------------------------- state */

export function saveConverterState(state: ConverterState): void {
  try {
    const snapshot: SessionSnapshot = {
      version: 2,
      savedAt: new Date().toISOString(),
      state,
    };
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable — the in-memory session still works.
  }
}

export function loadConverterState(): ConverterState | null {
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as SessionSnapshot;
    if (snapshot.version !== 2 || !snapshot.state?.status) return null;
    // Pre-engine (Sprint 3) snapshots are discarded rather than guessed at.
    if (snapshot.state.engine !== "ai" && snapshot.state.engine !== "local") {
      return null;
    }
    return snapshot.state;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- blobs */

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function saveSessionBlob(
  key: typeof PHOTO_BLOB_KEY | typeof RESULT_BLOB_KEY,
  blob: Blob,
): Promise<void> {
  await withStore("readwrite", (store) => store.put(blob, key));
}

export async function loadSessionBlob(
  key: typeof PHOTO_BLOB_KEY | typeof RESULT_BLOB_KEY,
): Promise<Blob | null> {
  const value = await withStore<unknown>("readonly", (store) => store.get(key));
  return value instanceof Blob ? value : null;
}

export async function deleteSessionBlob(
  key: typeof PHOTO_BLOB_KEY | typeof RESULT_BLOB_KEY,
): Promise<void> {
  await withStore("readwrite", (store) => store.delete(key));
}

/** Start Over / Make another: wipe everything this module ever stored. */
export async function clearConverterSession(): Promise<void> {
  try {
    window.sessionStorage.removeItem(STATE_KEY);
  } catch {
    // Ignore — nothing stored.
  }
  await withStore("readwrite", (store) => store.clear());
}
