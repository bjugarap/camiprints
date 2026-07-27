import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Every image on the site renders through this component. Real assets do not
 * exist yet: when `src` is null the slot renders the handoff's placeholder
 * treatment (45° cross-hatch for line art, flat tint for category thumbs)
 * with a clearly-marked mono label. Dropping in real assets later changes no
 * layout — only the `src` fields in the data.
 */
export interface ArtworkProps {
  src?: string | null;
  alt: string;
  /** Placeholder caption, e.g. "page — friendly t-rex". */
  label: string;
  /** "hatch" for coloring pages, a tint class for category thumbnails. */
  placeholder?: "hatch" | string;
  sizes?: string;
  className?: string;
  labelClassName?: string;
}

export function Artwork({
  src,
  alt,
  label,
  placeholder = "hatch",
  sizes,
  className,
  labelClassName,
}: ArtworkProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center overflow-hidden p-1 text-center",
        placeholder === "hatch" ? "placeholder-hatch" : placeholder,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "font-mono text-[11.5px] leading-[1.7] text-ink-25",
          labelClassName,
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Category-slug → thumbnail tint utility class (tints are tokens). */
export const categoryTintClass: Record<string, string> = {
  animals: "bg-tint-animals",
  dinosaurs: "bg-tint-dinosaurs",
  ocean: "bg-tint-ocean",
  space: "bg-tint-space",
  fantasy: "bg-tint-fantasy",
  vehicles: "bg-tint-vehicles",
  nature: "bg-tint-nature",
  holidays: "bg-tint-holidays",
};
