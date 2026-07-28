"use client";

import Link from "next/link";
import { useState } from "react";

import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";
import { ORIENTATION_LABELS, type ColoringPage } from "@/types/catalog";

/**
 * The detail-page artwork frame (hi-fi 6b): the page on a white sheet with a
 * dashed trim edge, so the preview reads as paper rather than as a card.
 * Landscape artwork rotates only the sheet — the action column never moves.
 * Zoom in widens the sheet inside a scrollable frame; Full screen preview
 * goes to the print-preview route.
 */
export function ArtworkFrame({
  page,
  printUrl,
}: {
  page: ColoringPage;
  printUrl: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const portrait = page.orientation === "portrait";

  return (
    <div>
      <div className="rounded-card border border-line bg-card p-5 shadow-frame">
        <div className="overflow-auto">
          <div
            className="rounded-[6px] border-[1.5px] border-dashed border-trim bg-card"
            style={{
              aspectRatio: portrait ? "8.5 / 11" : "11 / 8.5",
              width: zoomed ? "150%" : "100%",
            }}
          >
            <Artwork
              src={page.previewUrl ?? page.thumbnailUrl}
              alt={`Coloring page — ${page.title}`}
              label={`coloring page — ${page.title.toLowerCase()}\nshown on US Letter, 8.5 × 11 in\n${ORIENTATION_LABELS[page.orientation].toLowerCase()}`}
              placeholder="bg-card"
              labelClassName="whitespace-pre-line text-[12px]"
              className="size-full rounded-[4.5px]"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 hidden justify-center gap-2.5 md:flex">
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={zoomed}
          onClick={() => setZoomed((z) => !z)}
          className="border-line text-[14.5px]"
        >
          {zoomed ? "Zoom out" : "Zoom in"}
        </Button>
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="border-line text-[14.5px]"
        >
          <Link href={printUrl}>Full screen preview</Link>
        </Button>
      </div>
    </div>
  );
}
