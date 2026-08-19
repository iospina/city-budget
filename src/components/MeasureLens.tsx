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
 */
export interface MeasurePill {
  id: string;
  label: string;
  amount: number;
}

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
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p.id as T)}
            className="flex min-h-[46px] flex-col items-start justify-center gap-0.5 rounded-pill px-3 py-1.5 text-left transition-colors"
            style={{ backgroundColor: active ? identity.tint20 : "#E8E8ED" }}
          >
            <span className="text-[12px] leading-tight text-inkMuted">{p.label}</span>
            <span className="text-[13px] font-semibold tabular-nums leading-tight text-ink">
              {formatCurrencyCompact(p.amount)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
