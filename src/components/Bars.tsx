import { useEffect, useState } from "react";
import { TRACK_COLOR, BAR_HEIGHT, MIN_SEGMENT_WIDTH } from "../lib/tokens";

/**
 * The two-tier part-to-whole bar system (Section 15).
 *  - 12px summary bars: ServicesObligationsSplit, StackedProportionBar.
 *  - 6px row bars: category rows, obligation lines.
 *  - Track color #D0D0D0.
 *  - Stacked bar minimum segment width 12–16px so the smallest categories stay
 *    legible and tappable.
 *
 * Motion (Stories 1/4/12 motion notes): bars animate their fill/segment widths
 * from 0 on mount (~300ms, decelerated easing) and animate to new proportions
 * when the measure or fiscal year changes. The global prefers-reduced-motion
 * rule in index.css collapses these to instant.
 */

const BAR_TRANSITION = "transition-[width] duration-300 ease-out";

/** Run a value from 0 to `target` on the next frame so CSS can animate the change. */
function useAnimatedWidth(target: number): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, target))));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return w;
}

/** A single part-to-whole bar (one filled segment over the track). Row default 6px. */
export function PartToWholeBar({
  percent,
  color,
  height = BAR_HEIGHT.row,
  className = "",
}: {
  percent: number;
  color: string;
  height?: number;
  className?: string;
}) {
  const w = useAnimatedWidth(percent);
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor: TRACK_COLOR }}
      role="presentation"
    >
      <div
        className={`h-full rounded-full ${BAR_TRANSITION}`}
        style={{ width: `${w}%`, backgroundColor: color }}
      />
    </div>
  );
}

export interface ProportionSegment {
  id: string;
  label: string;
  percent: number;
  color: string;
}

/**
 * StackedProportionBar — the 12px multi-segment summary bar (Section 15).
 * Enforces a minimum pixel width per segment so tiny categories stay visible.
 * No tooltip interaction; tapping a slice notifies the parent (which highlights
 * the matching row). Segments grow from 0 on mount and animate to new widths
 * when the measure/year changes.
 */
export function StackedProportionBar({
  segments,
  height = BAR_HEIGHT.summary,
  onSegmentClick,
  activeId,
}: {
  segments: ProportionSegment[];
  height?: number;
  onSegmentClick?: (id: string) => void;
  activeId?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height, backgroundColor: TRACK_COLOR }}
      role="presentation"
    >
      {segments.map((seg) => (
        <button
          key={seg.id}
          type="button"
          onClick={onSegmentClick ? () => onSegmentClick(seg.id) : undefined}
          // No `title` attribute by design: the stacked proportion bar shows no
          // tooltip (Story 1 / Section 15). aria-label keeps it accessible; a
          // tap highlights the matching row in the list below.
          aria-label={`${seg.label}, ${seg.percent.toFixed(1)} percent`}
          className={`h-full shrink-0 border-r border-white/70 transition-[width,filter] duration-300 ease-out last:border-r-0 hover:brightness-110`}
          style={{
            width: mounted ? `${seg.percent}%` : "0%",
            minWidth: mounted ? MIN_SEGMENT_WIDTH : 0,
            backgroundColor: seg.color,
            cursor: onSegmentClick ? "pointer" : "default",
            filter: activeId && activeId === seg.id ? "brightness(1.12)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Two-part Services / Obligations split bar (Section 13b). 12px summary bar.
 * Both segments animate on mount and recompute their widths when the measure
 * changes (Story 12 motion note).
 */
export function SplitBar({
  servicesShare,
  servicesColor = "#3A3A3C",
  obligationsColor = "#C7C7CC",
  height = BAR_HEIGHT.summary,
}: {
  servicesShare: number;
  servicesColor?: string;
  obligationsColor?: string;
  height?: number;
}) {
  const w = useAnimatedWidth(servicesShare);
  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height }}
      role="presentation"
    >
      <div className={BAR_TRANSITION} style={{ width: `${w}%`, backgroundColor: servicesColor }} />
      <div
        className={BAR_TRANSITION}
        style={{ width: `${100 - w}%`, backgroundColor: obligationsColor }}
      />
    </div>
  );
}
