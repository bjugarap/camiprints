"use client";

import { useId } from "react";

/**
 * The converter's word slider (handoff §Slider): values are words, never
 * numbers. Label 17/600 left, current word 15/500 accent right; 10px track
 * with accent fill to the 30px thumb; end labels 13.5/500. Built on a
 * native range input so keyboard and screen-reader behaviour come free —
 * aria-valuetext speaks the word, not the index.
 */
export function WordSlider<Word extends string>({
  label,
  words,
  wordLabels,
  value,
  onChange,
  endLabels,
}: {
  label: string;
  words: readonly Word[];
  wordLabels: Record<Word, string>;
  value: Word;
  onChange: (word: Word) => void;
  /** Track-end captions, e.g. ["Simpler", "More lines"]. */
  endLabels: [string, string];
}) {
  const id = useId();
  const index = Math.max(0, words.indexOf(value));
  const percent = words.length > 1 ? (index / (words.length - 1)) * 100 : 0;

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[17px] font-semibold text-ink">
          {label}
        </label>
        <span aria-hidden className="text-[15px] font-medium text-accent">
          {wordLabels[value]}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={words.length - 1}
        step={1}
        value={index}
        aria-valuetext={wordLabels[value]}
        onChange={(event) => onChange(words[Number(event.target.value)])}
        className="converter-range mt-4"
        style={{
          background: `linear-gradient(to right, var(--color-accent) 0% ${percent}%, var(--color-line) ${percent}% 100%)`,
        }}
      />
      <div className="mt-2.5 flex justify-between text-[13.5px] font-medium text-ink-40">
        <span>{endLabels[0]}</span>
        <span>{endLabels[1]}</span>
      </div>
    </div>
  );
}
