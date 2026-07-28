"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";
import { type ColoringPage } from "@/types/catalog";

/**
 * Print preview (hi-fi 6c) — a route, not a modal. The sheet renders as
 * real paper on the warm-grey backdrop. Focus lands on Print on entry,
 * browser Back works, Esc exits. Printing goes straight to the system
 * dialog; the print stylesheet leaves only the artwork inside the 0.5in
 * safe margin.
 */
export function PrintPreview({
  page,
  backHref,
}: {
  page: ColoringPage;
  backHref: string;
}) {
  const router = useRouter();
  const printRef = useRef<HTMLButtonElement>(null);
  const portrait = page.orientation === "portrait";

  useEffect(() => {
    printRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(backHref);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, backHref]);

  return (
    <div className="flex min-h-screen flex-col bg-backdrop">
      <div
        data-no-print
        className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:px-9"
      >
        <Button asChild variant="quiet" size="md">
          <Link href={backHref}>← Back to page</Link>
        </Button>
        <Button ref={printRef} size="md" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div
          data-print-sheet
          className="bg-white p-[18px] shadow-paper"
          style={{
            aspectRatio: portrait ? "8.5 / 11" : "11 / 8.5",
            width: portrait ? "min(88vw, 440px)" : "min(92vw, 620px)",
          }}
        >
          {/* The dashed edge marks the 0.5in safe margin on screen only —
              on paper the @page margin does the same job unmarked. */}
          <div className="size-full border-[1.5px] border-dashed border-trim print:border-0">
            <Artwork
              src={page.previewUrl ?? page.thumbnailUrl}
              alt={`Coloring page — ${page.title}`}
              label={`coloring page — ${page.title.toLowerCase()}\nartwork centred, 0.5in safe margin\nno branding`}
              placeholder="bg-white"
              labelClassName="whitespace-pre-line text-[12px]"
              className="size-full"
            />
          </div>
        </div>
      </div>

      <p
        data-no-print
        className="px-6 pb-6 text-center text-sm/[1.5] text-ink-60"
      >
        Nav, footer and every control are hidden in the printed sheet.
      </p>
    </div>
  );
}
