import { formatYoY } from "../lib/format";

/**
 * Year-over-year change badge (Section 10/16). Neutral, non-editorializing
 * (Section 19): a translation, not an opinion. Up uses systemGreen, down uses
 * systemRed, flat is muted. "year-over-year" is written in full where labeled.
 */
export function YoYBadge({
  percent,
  showWord = false,
  size = "sm",
}: {
  percent: number;
  showWord?: boolean;
  size?: "sm" | "md";
}) {
  const up = percent > 0.05;
  const down = percent < -0.05;
  const color = up ? "#1F8A40" : down ? "#C5283D" : "#8E8E93";
  const bg = up ? "rgba(52,199,89,0.12)" : down ? "rgba(255,59,48,0.12)" : "rgba(142,142,147,0.12)";
  const icon = up ? "arrow_upward" : down ? "arrow_downward" : "remove";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium tabular-nums ${
        size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-[12px]"
      }`}
      style={{ color, backgroundColor: bg }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: size === "md" ? 16 : 14 }} aria-hidden>
        {icon}
      </span>
      {formatYoY(percent)}
      {showWord ? <span className="ml-0.5 font-normal opacity-80">year-over-year</span> : null}
    </span>
  );
}
