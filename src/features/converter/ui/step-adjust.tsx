"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import { Toggle } from "@/shared/toggle";
import {
  CONTRAST_LEVEL_LABELS,
  CONTRAST_LEVELS,
  DETAIL_WORD_LABELS,
  DETAIL_WORDS,
  LINE_WEIGHT_LABELS,
  LINE_WEIGHTS,
  type ConversionSettings,
} from "@/types/converter";

import { WordSlider } from "./word-slider";

/**
 * Step 4 · Adjust (hi-fi 5d): live preview left; right column shows
 * exactly one control — the detail slider — until "More adjustments" opens
 * the four expert controls. Deliberate: novices stay unblocked.
 */
export function StepAdjust({
  settings,
  previewUrl,
  previewPending,
  onSettingsChange,
  onBack,
  onConvert,
}: {
  settings: ConversionSettings;
  /** Provider preview if the provider offers one, else the cropped photo. */
  previewUrl: string | null;
  previewPending: boolean;
  onSettingsChange: (settings: Partial<ConversionSettings>) => void;
  onBack: () => void;
  onConvert: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-[26px] md:flex-row">
      {/* Live preview. */}
      <div className="w-full flex-1 rounded-xl border border-line bg-card p-3.5">
        <div className="relative min-h-[330px] overflow-hidden rounded-lg border border-thumb-line bg-card">
          {previewUrl ? (
            // Only the image dims while a refresh is pending — dimming the
            // whole pane would sink its text below WCAG AA contrast.
            <Image
              src={previewUrl}
              alt="Preview of your coloring page so far"
              fill
              unoptimized
              className={cn("object-contain", previewPending && "opacity-60")}
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center font-mono text-[11.5px] text-ink-40">
              live line-art preview of your photo
            </p>
          )}
        </div>
      </div>

      {/* Controls. */}
      <div className="flex w-full flex-none flex-col gap-3.5 md:w-[392px]">
        <div>
          <h2 className="text-subsection text-ink">Make it look right</h2>
          <p className="mt-1 text-base/[1.5] text-ink-60">
            Move the slider until the lines look good. You can skip this.
          </p>
        </div>

        <WordSlider
          label="How much detail"
          words={DETAIL_WORDS}
          wordLabels={DETAIL_WORD_LABELS}
          value={settings.detail}
          onChange={(detail) => onSettingsChange({ detail })}
          endLabels={["Simpler", "More lines"]}
        />

        <div className="rounded-xl border border-line bg-card">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="more-adjustments"
            onClick={() => setMoreOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
          >
            <span>
              <span className="block text-base font-semibold text-ink">
                More adjustments
              </span>
              <span className="mt-0.5 block text-[13.5px] text-ink-40">
                Line thickness, contrast, background removal
              </span>
            </span>
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line text-sm text-ink-60"
            >
              {moreOpen ? "▴" : "▾"}
            </span>
          </button>
          {moreOpen ? (
            <div
              id="more-adjustments"
              className="flex flex-col gap-3 border-t border-line p-4"
            >
              <WordSlider
                label="Line thickness"
                words={LINE_WEIGHTS}
                wordLabels={LINE_WEIGHT_LABELS}
                value={settings.advanced.lineWeight}
                onChange={(lineWeight) =>
                  onSettingsChange({
                    advanced: { ...settings.advanced, lineWeight },
                  })
                }
                endLabels={["Fine", "Thick"]}
              />
              <WordSlider
                label="Contrast"
                words={CONTRAST_LEVELS}
                wordLabels={CONTRAST_LEVEL_LABELS}
                value={settings.advanced.contrast}
                onChange={(contrast) =>
                  onSettingsChange({
                    advanced: { ...settings.advanced, contrast },
                  })
                }
                endLabels={["Softer", "Stronger"]}
              />
              <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
                <span className="text-base font-semibold text-ink">
                  Remove the background
                </span>
                <Toggle
                  checked={settings.advanced.removeBackground}
                  onCheckedChange={(removeBackground) =>
                    onSettingsChange({
                      advanced: { ...settings.advanced, removeBackground },
                    })
                  }
                  label="Remove the background"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
                <span className="text-base font-semibold text-ink">
                  Invert light and dark
                </span>
                <Toggle
                  checked={settings.advanced.invert}
                  onCheckedChange={(invert) =>
                    onSettingsChange({
                      advanced: { ...settings.advanced, invert },
                    })
                  }
                  label="Invert light and dark"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-0.5 flex gap-3">
          <Button size="xl" className="flex-1" onClick={onConvert}>
            Make my page
          </Button>
          <Button variant="secondary" size="xl" onClick={onBack}>
            Back
          </Button>
        </div>

        <p className="text-sm/[1.45] text-ink-40">
          Your photo is deleted after you leave. Nothing is published.
        </p>
      </div>
    </div>
  );
}
