"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import {
  CONVERTER_STYLE_LABELS,
  CONVERTER_STYLES,
  type ConversionEngine,
  type ConverterStyle,
} from "@/types/converter";

/**
 * Step 3 · Style — the settings home and the launch pad: generation fires
 * from here, so the very next thing the user sees is their picture.
 * Selection mirrors the category tile pattern: accent border + tint + a
 * trailing ✓, never colour alone.
 */
const SWATCH_SPACING: Record<ConverterStyle, number> = {
  bold: 12,
  classic: 8,
  detailed: 5,
};

export function StepStyle({
  style,
  engine,
  canSwitchEngine,
  onStyleSelect,
  onEngineChange,
  onBack,
  onConvert,
}: {
  style: ConverterStyle;
  engine: ConversionEngine;
  canSwitchEngine: boolean;
  onStyleSelect: (style: ConverterStyle) => void;
  onEngineChange: (engine: ConversionEngine) => void;
  onBack: () => void;
  onConvert: () => void;
}) {
  const ai = engine === "ai";
  return (
    <div className="mx-auto max-w-[640px]">
      <h2 className="text-subsection text-ink">Pick a style</h2>
      <p className="mt-1.5 text-base/[1.5] text-ink-60">
        {ai
          ? "The AI draws your page in this style. You can fine-tune it after."
          : "You can fine-tune the result after."}
      </p>

      <div
        role="radiogroup"
        aria-label="Line-art style"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {CONVERTER_STYLES.map((option) => {
          const selected = style === option;
          const { name, hint } = CONVERTER_STYLE_LABELS[option];
          const gap = SWATCH_SPACING[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onStyleSelect(option)}
              className={cn(
                "cursor-pointer rounded-card bg-card p-3 text-left",
                selected
                  ? "border-2 border-accent bg-accent-tint p-[11px]"
                  : "border border-line shadow-card",
              )}
            >
              <div
                aria-hidden
                className="h-20 rounded-thumb border border-thumb-line bg-card"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, #F6F1E8, #F6F1E8 ${
                    option === "bold" ? 3 : 1.5
                  }px, #FBF8F2 ${option === "bold" ? 3 : 1.5}px, #FBF8F2 ${gap}px)`,
                }}
              />
              <p
                className={cn(
                  "mt-2.5 text-[17px] font-semibold",
                  selected ? "text-accent" : "text-ink",
                )}
              >
                {name}
                {selected ? " ✓" : ""}
              </p>
              <p className="mt-0.5 text-sm/[1.45] text-ink-60">{hint}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex gap-3">
        <Button variant="secondary" size="xl" onClick={onBack}>
          Back
        </Button>
        <Button size="xl" className="flex-1" onClick={onConvert}>
          {ai ? "Create AI Coloring Page" : "Make my page"}
        </Button>
      </div>

      {canSwitchEngine ? (
        <Button
          variant="quiet"
          size="md"
          className="mt-3 text-[15px]"
          onClick={() => onEngineChange(ai ? "local" : "ai")}
        >
          {ai
            ? "Use Quick Outline instead — fast · private · lower quality"
            : "Use AI Coloring Page instead — best quality"}
        </Button>
      ) : null}

      <p className="mt-3 text-sm/[1.45] text-ink-40">
        {ai
          ? "Your photo is sent securely to draw the page, then deleted. It is never published or added to the library."
          : "Quick Outline runs on this device — your photo never leaves it. Nothing is published."}
      </p>
    </div>
  );
}
