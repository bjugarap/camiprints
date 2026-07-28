/**
 * Loading skeletons for the listing grid (wireframe 1h). Static blocks —
 * no shimmer animation; nothing moves on load.
 */
export function SkeletonCard({ thumbHeight = 190 }: { thumbHeight?: number }) {
  return (
    <div
      aria-hidden
      className="rounded-card border border-line bg-card p-3 shadow-card"
    >
      <div
        className="w-full rounded-thumb bg-paper"
        style={{ height: thumbHeight }}
      />
      <div className="mt-3 h-4 w-2/3 rounded bg-paper" />
      <div className="mt-2 h-3.5 w-1/2 rounded bg-paper" />
      <div className="mt-3 flex gap-2">
        <div className="h-12 flex-1 rounded-full bg-paper" />
        <div className="h-12 flex-1 rounded-full bg-paper" />
      </div>
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-10">
      <p className="sr-only" role="status">
        Loading pages…
      </p>
      <div aria-hidden>
        <div className="h-4 w-44 rounded bg-line/50" />
        <div className="mt-3 h-10 w-72 rounded bg-line/50" />
        <div className="mt-[18px] flex gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 flex-1 rounded-xl bg-card" />
          ))}
        </div>
        <div className="mt-[18px] h-12 rounded-field bg-card" />
      </div>
      <div className="mt-[22px] grid grid-cols-1 gap-[18px] pb-[34px] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
