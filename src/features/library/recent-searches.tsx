"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "camiprints:recent-searches";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(values: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values.slice(0, MAX_RECENT)));
  } catch {
    // Best-effort; recent searches are a convenience only.
  }
}

/** Records the current query into device-local recent searches. */
export function RecordSearch({ query }: { query: string }) {
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const existing = readRecent().filter(
      (v) => v.toLowerCase() !== q.toLowerCase(),
    );
    writeRecent([q, ...existing]);
  }, [query]);
  return null;
}

/**
 * Recent searches (wireframe 4b): static chips with an ✕ each — device
 * local, never sent anywhere.
 */
export function RecentSearches() {
  const [recent, setRecent] = useState<string[] | null>(null);
  useEffect(() => setRecent(readRecent()), []);

  if (!recent || recent.length === 0) return null;

  return (
    <section aria-label="Recent searches" className="mt-6">
      <h2 className="text-sm font-medium text-ink-60">Recent searches</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {recent.map((term) => (
          <li
            key={term}
            className="flex h-9 items-center rounded-full border border-accent-tint-line bg-accent-tint pl-[13px] text-sm font-medium text-accent"
          >
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              className="flex h-full items-center"
            >
              {term}
            </Link>
            <button
              type="button"
              aria-label={`Remove “${term}” from recent searches`}
              onClick={() => {
                const next = readRecent().filter((v) => v !== term);
                writeRecent(next);
                setRecent(next);
              }}
              className="flex h-full cursor-pointer items-center px-[9px] hover:text-accent-hover"
            >
              <span aria-hidden>✕</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
