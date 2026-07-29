"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/shared/button";
import { Toggle } from "@/shared/toggle";
import {
  CONTRAST_LEVEL_LABELS,
  CONTRAST_LEVELS,
  DETAIL_WORD_LABELS,
  DETAIL_WORDS,
  LINE_WEIGHT_LABELS,
  LINE_WEIGHTS,
  type ConversionEngine,
  type ConversionSettings,
} from "@/types/converter";

import { WordSlider } from "./word-slider";

/**
 * Step 4 · Adjust — operates on the FINISHED page: the result sits beside
 * the controls, so every slider has something visible to change. Nothing
 * regenerates on its own; "Redraw" is an explicit button (an AI redraw is
 * a new request), enabled only once a setting actually differs from the
 * ones this page was drawn with. One control is visible until "More
 * adjustments" opens the rest (hi-fi 5d's disclosure pattern).
 */
export function StepAdjust({
  engine,
  resultUrl,
  settings,
  dirty,
  onSettingsChange,
  onRedraw,
  onContinue,
  onBack,
}: {
  engine: ConversionEngine;
  resultUrl: string | null;
  settings: ConversionSettings;
  /** True when settings differ from the ones the result was made with. */
  dirty: boolean;
  onSettingsChange: (settings: Partial<ConversionSettings>) => void;
  onRedraw: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const ai = engine === "ai";

  return (
    <div className="flex flex-col items-start gap-[26px] md:flex-row">
      {/* The finished page. */}
      <div className="w-full flex-1 rounded-xl border border-line bg-card p-3.5">
        <div className="relative min-h-[330px] overflow-hidden rounded-lg border border-thumb-line bg-card">
          {resultUrl ? (
            <Image
              src={resultUrl}
              alt="Your coloring page as it looks right now"
              fill
              unoptimized
              className="object-contain"
            />
          ) : null}
        </div>
      </div>

      {/* Controls. */}
      <div className="flex w-full flex-none flex-col gap-3.5 md:w-[392px]">
        <div>
          <h2 className="text-subsection text-ink">Make it look right</h2>
          <p className="mt-1 text-base/[1.5] text-ink-60">
            Happy with it? Continue. Otherwise change anything and redraw.
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

        <div className="mt-0.5 flex flex-col gap-2.5">
          <Button size="xl" onClick={onContinue}>
            Looks right — continue
          </Button>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={!dirty}
              onClick={onRedraw}
            >
              {ai ? "Redraw with these changes" : "Apply these changes"}
            </Button>
            <Button variant="secondary" size="lg" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>

        <p className="text-sm/[1.45] text-ink-40">
          {dirty
            ? ai
              ? "Redrawing asks the AI for a fresh page with these settings."
              : "Applying redraws the page on this device — instant and free."
            : "Move a slider to enable redrawing."}
        </p>
      </div>
    </div>
  );
}
