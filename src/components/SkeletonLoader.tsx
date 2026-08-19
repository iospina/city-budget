/**
 * SkeletonLoader (Section 20). Matches the card and row geometry of the real
 * components exactly so layout does not shift on load. Skeletons, not spinners.
 * Covers the brief fetch from City Budget's own /api layer.
 *
 * Geometry mirrors: HeroCard (3 zones), ServicesSummaryCard (rollup + 12px bar),
 * the flat category list (ten rows), and the ObligationsCard.
 */

function Bar({ w, h = 12, className = "" }: { w: string; h?: number; className?: string }) {
  return (
    <div
      className={`skeleton rounded-full ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

function HeroSkeleton() {
  return (
    <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="grid gap-6 md:grid-cols-[1.2fr_auto_1fr_auto_1.3fr] md:gap-0">
        <div className="md:pr-6">
          <Bar w="84px" h={22} />
          <Bar w="140px" h={12} className="mt-3" />
          <Bar w="200px" h={34} className="mt-2" />
          <Bar w="120px" h={22} className="mt-3" />
        </div>
        <div className="hidden w-px bg-black/5 md:block" />
        <div className="md:px-6">
          <Bar w="60px" h={12} />
          <div className="mt-3 flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Bar key={i} w="100%" h={34} className="!rounded-pill" />
            ))}
          </div>
        </div>
        <div className="hidden w-px bg-black/5 md:block" />
        <div className="md:pl-6">
          <Bar w="120px" h={12} />
          <div className="mt-3 flex justify-between">
            <Bar w="80px" h={36} />
            <Bar w="80px" h={36} />
          </div>
          <Bar w="100%" h={12} className="mt-3" />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
      <Bar w="160px" h={16} />
      <Bar w="200px" h={26} className="mt-2" />
      <Bar w="120px" h={12} className="mt-2" />
      <Bar w="100%" h={12} className="mt-4" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-card bg-white px-4 py-3 ring-1 ring-black/5">
      <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <Bar w="40%" h={14} />
          <Bar w="56px" h={16} />
        </div>
        <Bar w="100%" h={6} className="mt-3" />
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4" aria-busy="true" aria-label="Loading">
      <HeroSkeleton />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SummarySkeleton />
          <div className="mt-3 flex flex-col gap-2.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="md:col-span-1">
          <SummarySkeleton />
        </div>
      </div>
    </div>
  );
}
