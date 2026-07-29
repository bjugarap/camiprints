"use client";

import Image from "next/image";

import { Button } from "@/shared/button";
import type {
  ConversionErrorInfo,
  ConversionProgress,
} from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

/**
 * The working state while a page is generated (step 4), the calm failure
 * shell if it fails (settings always intact, per the handoff: "never a
 * restart"), and the step-5 full-size preview.
 */
export function StepWorking({
  progress,
  onCancel,
}: {
  progress: ConversionProgress | null;
  onCancel: () => void;
}) {
  const total = progress?.totalStages ?? 6;
  const completed = progress?.completedStages ?? 0;
  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-eyebrow text-ink-40">Step 4 · working</p>
      <h2 className="text-subsection mt-2 text-ink">Making your page…</h2>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label="Conversion progress"
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>
      <p aria-live="polite" className="mt-2.5 text-[15.5px] text-ink-60">
        {progress?.message ?? "Preparing your photo…"} You can wait here.
      </p>
      <Button variant="secondary" size="md" className="mt-4" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export function StepFailed({
  error,
  quickOutlineAvailable,
  onQuickOutline,
  onRetryPrimary,
  onPickDifferentPhoto,
  onBackToAdjustments,
}: {
  error: ConversionErrorInfo;
  /** AI failed and the on-device engine can stand in. */
  quickOutlineAvailable: boolean;
  onQuickOutline: () => void;
  onRetryPrimary: () => void;
  onPickDifferentPhoto: () => void;
  onBackToAdjustments: () => void;
}) {
  const copy = CONVERTER_ERROR_COPY[error.code];
  // When the daily AI budget is spent, Quick Outline IS the primary remedy
  // — don't offer it twice.
  const offerQuickOutline =
    quickOutlineAvailable && error.code !== "ai-daily-limit";
  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-eyebrow text-ink-40">Step 4 · it didn’t work</p>
      <div
        role="alert"
        className="mt-3 rounded-xl border-[1.5px] border-error bg-card p-[16px_18px]"
      >
        <h2 className="font-display text-[21px]/[1.2] font-bold text-error">
          {copy.heading}
        </h2>
        <p className="mt-1.5 text-[15.5px]/[1.5] text-ink-60">
          Your settings are still here. Try one of these:
        </p>
        <div className="mt-3.5 flex flex-col gap-2.5">
          <Button size="lg" onClick={onRetryPrimary}>
            {copy.remedy}
          </Button>
          {offerQuickOutline ? (
            <Button variant="secondary" size="lg" onClick={onQuickOutline}>
              Use Quick Outline instead
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" onClick={onPickDifferentPhoto}>
            Pick a different photo
          </Button>
          <Button variant="quiet" size="md" onClick={onBackToAdjustments}>
            Back to style &amp; settings
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StepPreviewResult({
  resultUrl,
  landscape,
  onContinue,
  onBackToAdjustments,
}: {
  resultUrl: string | null;
  landscape: boolean;
  onContinue: () => void;
  onBackToAdjustments: () => void;
}) {
  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-eyebrow text-ink-40">Step 5 · preview</p>
      <h2 className="text-subsection mt-2 text-ink">Here’s your page</h2>
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
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button size="xl" className="flex-1" onClick={onContinue}>
          Use this page
        </Button>
        <Button variant="secondary" size="xl" onClick={onBackToAdjustments}>
          Adjust it
        </Button>
      </div>
    </div>
  );
}
