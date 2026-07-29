"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import {
  CONVERTER_STYLE_LABELS,
  CONVERTER_STYLES,
  type ConverterStyle,
} from "@/types/converter";

/**
 * Step 3 · Style. Three cards, one choice. Selection mirrors the category
 * tile pattern: accent border + tint + a trailing ✓, never colour alone.
 * The mini swatches suggest line density with a plain stripe pattern.
 */
const SWATCH_SPACING: Record<ConverterStyle, number> = {
  bold: 12,
  classic: 8,
  detailed: 5,
};

export function StepStyle({
  style,
  onStyleSelect,
  onBack,
  onNext,
}: {
  style: ConverterStyle;
  onStyleSelect: (style: ConverterStyle) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mx-auto max-w-[640px]">
      <h2 className="text-subsection text-ink">Pick a style</h2>
      <p className="mt-1.5 text-base/[1.5] text-ink-60">
        You can fine-tune it on the next step.
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
        <Button size="xl" className="flex-1" onClick={onNext}>
          Next: adjust it
        </Button>
      </div>
    </div>
  );
}
