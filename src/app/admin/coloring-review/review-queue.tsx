"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { ManifestEntry } from "../../../../content/coloring-pages/manifest";

/** The reviewer's vocabulary — mirrors the content plan's rejection list. */
const REJECTION_REASONS = [
  "malformed anatomy",
  "duplicate limbs",
  "poor line quality",
  "gray shading",
  "excessive detail",
  "insufficient detail",
  "clipped subject",
  "incorrect category",
  "copyrighted resemblance",
  "text error",
  "weak composition",
  "unsafe content",
  "other",
] as const;

function EntryCard({
  entry,
  categoryTitle,
}: {
  entry: ManifestEntry;
  categoryTitle: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [compare, setCompare] = useState(false);
  const previousAttempt = [...entry.history]
    .reverse()
    .find((attempt) => attempt.imagePath);

  const review = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/coloring/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "reject"
            ? { id: entry.id, action, reason }
            : { id: entry.id, action },
        ),
      });
      if (!response.ok) throw new Error(`review ${response.status}`);
      router.refresh();
    } catch (error) {
      alert(String(error));
    } finally {
      setBusy(false);
    }
  };

  const flags = entry.validation?.flags ?? [];
  return (
    <div
      className={cn(
        "rounded-card border bg-card p-4 shadow-card",
        entry.status === "approved" && "border-accent",
        entry.status === "rejected" && "border-line-strong opacity-80",
        entry.status === "failed" && "border-dashed border-line-strong",
        entry.status === "generated" && "border-line",
      )}
    >
      <div className="flex gap-4">
        {entry.previewPath ? (
          <div className="flex gap-2">
            {/* Full-resolution result opens in a new tab. */}
            <a href={entry.outputPath ?? entry.previewPath} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- local review tool; raw file fidelity matters. */}
              <img
                src={entry.previewPath}
                alt={`Generated page: ${entry.title}`}
                className="w-[180px] rounded-thumb border border-line bg-white"
              />
            </a>
            {compare && previousAttempt ? (
              // eslint-disable-next-line @next/next/no-img-element -- local review tool.
              <img
                src={`/api/admin/coloring/attempt?id=${entry.id}&attempt=${previousAttempt.attempt}`}
                alt={`Previous attempt ${previousAttempt.attempt}`}
                className="w-[180px] rounded-thumb border border-dashed border-line-strong bg-white"
              />
            ) : null}
          </div>
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-thumb border border-dashed border-line-strong text-sm text-ink-40">
            {entry.status === "failed" ? "generation failed" : "no output"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-40">
            {categoryTitle} · {entry.complexity} · {entry.status}
          </p>
          <h3 className="text-subsection text-ink">{entry.title}</h3>
          <p className="mt-1 break-all font-mono text-[12.5px] text-ink-40">
            {entry.id} · attempt {entry.attempt} · seed {entry.seed ?? "—"} ·{" "}
            {entry.model ?? "—"} · {entry.promptVersion}
          </p>
          {flags.length > 0 ? (
            <p className="mt-1.5 text-sm font-semibold text-ink">
              ⚠ validation flags: {flags.join(", ")}
            </p>
          ) : null}
          {entry.lastError ? (
            <p className="mt-1.5 text-sm text-ink-60">error: {entry.lastError}</p>
          ) : null}
          {entry.rejectionReason ? (
            <p className="mt-1.5 text-sm text-ink-60">
              rejected: {entry.rejectionReason}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-2 cursor-pointer text-sm font-semibold text-accent underline"
            onClick={() => setShowPrompt((v) => !v)}
          >
            {showPrompt ? "Hide prompt" : "Show prompt"}
          </button>
          {showPrompt ? (
            <p className="mt-1 max-h-40 overflow-y-auto rounded-lg bg-paper p-2 text-[13px]/[1.5] text-ink-60">
              {entry.subjectPrompt}
            </p>
          ) : null}

          {entry.status !== "failed" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy || entry.status === "approved"}
                onClick={() => review("approve")}
                className="h-10 cursor-pointer rounded-full bg-accent px-4 text-[14.5px] font-semibold text-white disabled:opacity-40"
              >
                Approve
              </button>
              <select
                aria-label="Rejection reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-10 rounded-full border border-line bg-card px-3 text-[14px] text-ink"
              >
                {REJECTION_REASONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || entry.status === "rejected"}
                onClick={() => review("reject")}
                className="h-10 cursor-pointer rounded-full border-[1.5px] border-line px-4 text-[14.5px] font-semibold text-ink disabled:opacity-40"
              >
                Reject
              </button>
              {previousAttempt ? (
                <button
                  type="button"
                  onClick={() => setCompare((v) => !v)}
                  className="h-10 cursor-pointer rounded-full border border-line px-4 text-[14px] text-ink-60"
                >
                  {compare ? "Hide previous" : "Compare previous"}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 font-mono text-[13px] text-ink-60">
              npm run coloring:generate -- --id={entry.id}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewQueue({
  entries,
  categoryTitles,
}: {
  entries: ManifestEntry[];
  categoryTitles: Record<string, string>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ManifestEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.categorySlug) ?? [];
      list.push(entry);
      map.set(entry.categorySlug, list);
    }
    return [...map.entries()];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p className="mt-8 text-base text-ink-60">
        Nothing to review yet — run{" "}
        <code>npm run coloring:generate -- --samples</code> first.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-8">
      {grouped.map(([slug, list]) => (
        <section key={slug} aria-label={categoryTitles[slug] ?? slug}>
          <h2 className="text-subsection mb-3 text-ink">
            {categoryTitles[slug] ?? slug}{" "}
            <span className="text-ink-40">({list.length})</span>
          </h2>
          <div className="space-y-3">
            {list.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                categoryTitle={categoryTitles[slug] ?? slug}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
