"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";

/**
 * The ♡ icon button on the detail page and mobile print bar. Favourites
 * persist per device (localStorage); they sync server-side once accounts
 * exist. State is doubled — glyph and accessible label both change — so
 * colour never carries the meaning alone.
 */
const STORAGE_KEY = "camiprints:favourites";

function readFavourites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function FavouriteButton({
  pageKey,
  size = "lg",
  className,
}: {
  /** Stable identity, "category/slug". */
  pageKey: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readFavourites().includes(pageKey));
  }, [pageKey]);

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    try {
      const others = readFavourites().filter((key) => key !== pageKey);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next ? [...others, pageKey] : others),
      );
    } catch {
      // Private browsing — the in-memory state still reflects the tap.
    }
  };

  return (
    <Button
      variant="icon"
      size={size}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favourites" : "Save to favourites"}
      onClick={toggle}
      className={cn("text-[19px]", saved && "text-accent", className)}
    >
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
    </Button>
  );
}
