import { IDENTITY } from "../lib/tokens";
import { formatCurrencyCompact } from "../lib/format";

/**
 * MeasureLens (Section 13). Pills showing each measure's name and value. One tap
 * switches the active measure globally — every figure across the view reframes.
 * Always visible on desktop and mobile (the retired Expand Details disclosure is
 * gone). Each pill is 34px tall, 13–14px text. Active pill is filled in the
 * view's identity color with white text; inactive pills are light gray.
 *
 * Layout follows the count (late-stage resolved decision):
 *   - Spending: four measures, 2x2 grid.
 *   - Revenue: three measures, 1x3 row.
 * The pill component itself is identical across both; only the grid differs.
 *
 * Availability: not every measure resolves in every fiscal year. Early in a live
 * fiscal year the execution measures (Committed, Cash Spent) have barely any
 * data behind them. Those pills stay in place, rendered inactive and untappable
 * with a plain-language note in place of the figure, rather than disappearing.
 * Hiding them would make the control change shape between years and quietly
 * imply the measures do not exist; showing a near-zero figure would read as a
 * collapse in spending rather than a year in progress (Section 19: where data is
 * known to be incomplete, the interface says so).
 */
export interface MeasurePill {
  id: string;
  label: string;
  amount: number;
  /** Whether this measure has real data for the active year. Omitted = available. */
  available?: boolean;
}

/** Shown in place of the figure on a measure that has no data yet. */
export const MEASURE_UNAVAILABLE_LABEL = "Not available";

interface MeasureLensProps<T extends string> {
  pills: MeasurePill[];
  value: T;
  onChange: (id: T) => void;
  /** "spending" -> 2x2, systemPink; "revenue" -> 1x3, systemGreen. */
  variant: "spending" | "revenue";
}

export function MeasureLens<T extends string>({
  pills,
  value,
  onChange,
  variant,
}: MeasureLensProps<T>) {
  const identity = variant === "spending" ? IDENTITY.spending : IDENTITY.revenue;
  const gridCols = variant === "spending" ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`grid ${gridCols} gap-2`} role="group" aria-label="Measure">
      {pills.map((p) => {
        const available = p.available !== false;
        const active = available && p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!available}
            aria-pressed={available ? active : undefined}
            aria-label={
              available ? undefined : `${p.label}, not yet available for this fiscal year`
            }
            onClick={() => available && onChange(p.id as T)}
            className={`flex min-h-[46px] flex-col items-start justify-center gap-0.5 rounded-pill px-3 py-1.5 text-left transition-colors ${
              available ? "" : "cursor-not-allowed"
            }`}
            style={{
              backgroundColor: !available ? "#F2F2F7" : active ? identity.tint20 : "#E8E8ED",
            }}
          >
            <span
              className="text-[12px] leading-tight"
              style={{ color: available ? undefined : "#AEAEB2" }}
            >
              <span className={available ? "text-inkMuted" : ""}>{p.label}</span>
            </span>
            {available ? (
              <span className="text-[13px] font-semibold tabular-nums leading-tight text-ink">
                {formatCurrencyCompact(p.amount)}
              </span>
            ) : (
              <span className="text-[12px] font-medium leading-tight" style={{ color: "#AEAEB2" }}>
                {MEASURE_UNAVAILABLE_LABEL}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
