"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/shared/button";

/**
 * Step 6 · Done (hi-fi 5d): the finished sheet and the same print-first
 * hierarchy a child learned in the library. Print goes straight to the
 * system dialog — nothing between the child and paper. Download failures
 * are a polite live region that never auto-hides.
 */
export function StepPrint({
  resultUrl,
  landscape,
  onPrint,
  onDownloadPng,
  onDownloadPdf,
  onMakeAnother,
}: {
  resultUrl: string | null;
  landscape: boolean;
  onPrint: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => Promise<void>;
  onMakeAnother: () => void;
}) {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-eyebrow text-ink-40">Step 6 · done</p>
      <h2 className="text-subsection mt-2 text-ink">Your page is ready</h2>

      <div
        className="relative mx-auto mt-4 w-full max-w-[380px] bg-white p-[14px] shadow-paper"
        style={{ aspectRatio: landscape ? "11 / 8.5" : "8.5 / 11" }}
      >
        <div className="relative size-full border-[1.5px] border-dashed border-trim">
          {resultUrl ? (
            <Image
              src={resultUrl}
              alt="Your finished coloring page"
              fill
              unoptimized
              className="object-contain"
            />
          ) : null}
        </div>
      </div>

      <div aria-live="polite">
        {downloadError ? (
          <div className="mt-4 rounded-xl border-[1.5px] border-error bg-card p-4">
            <p className="font-display text-lg/[1.25] font-bold text-error">
              {downloadError}
            </p>
            <p className="mt-1 text-[15px]/[1.5] text-ink-60">
              Nothing was lost. Try again, or print the page instead.
            </p>
            <Button
              variant="quiet"
              size="md"
              className="mt-1.5"
              onClick={() => setDownloadError(null)}
            >
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <Button size="xl" onClick={onPrint}>
          Print it
        </Button>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 px-0"
            onClick={() => {
              setDownloadError(null);
              try {
                onDownloadPng();
              } catch {
                setDownloadError("The PNG didn’t download");
              }
            }}
          >
            Download PNG
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1 px-0"
            onClick={async () => {
              setDownloadError(null);
              try {
                await onDownloadPdf();
              } catch {
                setDownloadError("The PDF didn’t download");
              }
            }}
          >
            Download PDF
          </Button>
        </div>
        <Button variant="secondary" size="md" onClick={onMakeAnother}>
          Make another
        </Button>
      </div>

      <p className="mt-3 text-sm/[1.5] text-ink-40">
        Printing hides everything except the page itself. Your photo stays on
        this device.
      </p>
    </div>
  );
}
