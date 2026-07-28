import Link from "next/link";

import { Button } from "@/shared/button";

/**
 * Detail 404 (hi-fi 6c "Page unavailable"): calm, two ways forward, no
 * dead end for a child who tapped a stale link.
 */
export default function PageNotFound() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-12 md:px-9">
      <div className="mx-auto max-w-[520px] rounded-card border border-line bg-card p-[22px] text-center shadow-card">
        <div
          aria-hidden
          className="mx-auto flex size-16 items-center justify-center rounded-full border border-accent-tint-line bg-accent-tint font-display text-[26px] font-bold text-accent"
        >
          ?
        </div>
        <h1 className="mt-3 font-display text-2xl/[1.15] font-bold text-ink">
          We can’t find that page
        </h1>
        <p className="mx-auto mt-1.5 max-w-[44ch] text-base/[1.5] text-ink-60">
          It may have been renamed. Here’s where to go next.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button asChild size="lg">
            <Link href="/coloring-pages">Browse coloring pages</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
