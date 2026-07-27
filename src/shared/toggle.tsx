"use client";

import { cn } from "@/lib/utils";

/**
 * Toggle switch (handoff §Choice & toggle). Track 36×64, or 22×38 inside the
 * header's Calm Mode pill. On: accent track, white knob. Off: white track
 * with line-strong border and knob. The knob moves without animation —
 * motion is limited to colour changes.
 */
export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: "sm" | "md";
  /** Accessible name; required because the visual label sits outside. */
  label: string;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  size = "md",
  label,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-full",
        size === "md" ? "h-9 w-16 px-1" : "h-[22px] w-[38px] px-0.5",
        checked
          ? "justify-end bg-accent"
          : "justify-start border-[1.5px] border-line-strong bg-card",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "rounded-full",
          size === "md" ? "size-7" : "size-4",
          checked ? "bg-card" : "bg-line-strong",
        )}
      />
    </button>
  );
}
