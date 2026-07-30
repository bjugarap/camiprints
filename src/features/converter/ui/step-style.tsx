"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import {
  CONVERTER_STYLE_LABELS,
  CONVERTER_STYLES,
  type ConversionEngine,
  type ConverterStyle,
} from "@/types/converter";

/**
 * Step 3 · Style — the one creative control, and the launch pad:
 * generation fires from here and each page is exactly one generation.
 * Every style card carries a real sample (the same subject drawn in that
 * style, generated once with Flux and shipped as a static asset) so the
 * differences read visually — a pre-reader can pick by picture.
 * Selection mirrors the category tile pattern: accent border + tint + ✓.
 */
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
    <div className="mx-auto max-w-[720px]">
      <h2 className="text-subsection text-ink">Pick a style</h2>
      <p className="mt-1.5 text-base/[1.5] text-ink-60">
        Every example shows the same dog drawn that way. Your page comes out
        in the style you pick.
      </p>

      <div
        role="radiogroup"
        aria-label="Line-art style"
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {CONVERTER_STYLES.map((option) => {
          const selected = style === option;
          const { name, hint } = CONVERTER_STYLE_LABELS[option];
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
              <div className="relative aspect-square overflow-hidden rounded-thumb border border-thumb-line bg-white">
                <Image
                  src={`/styles/${option}.webp`}
                  alt={`Sample page in the ${name} style`}
                  fill
                  sizes="(max-width: 640px) 45vw, 220px"
                  className="object-cover"
                />
              </div>
              <p
                className={cn(
                  "mt-2.5 text-[16px] font-semibold",
                  selected ? "text-accent" : "text-ink",
                )}
              >
                {name}
                {selected ? " ✓" : ""}
              </p>
              <p className="mt-0.5 text-[13.5px]/[1.4] text-ink-60">{hint}</p>
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
