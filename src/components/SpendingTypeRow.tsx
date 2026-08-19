import { PartToWholeBar } from "./Bars";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * SpendingTypeRow (Section 16). One of the six resident-facing spending types
 * within a category detail. Label, amount right-aligned, "X% of [Category]"
 * sub-label, and a 6px part-to-whole bar in the category's own color. Types
 * with $0 for the category are omitted by the parent (not rendered here).
 */
export function SpendingTypeRow({
  label,
  amount,
  share,
  categoryName,
  color,
}: {
  label: string;
  amount: number;
  share: number;
  categoryName: string;
  color: string;
}) {
  return (
    <div className="rounded-card bg-white px-4 py-3 ring-1 ring-black/5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-ink">{label}</span>
        <span className="text-[16px] font-bold tabular-nums text-ink md:text-[17px]">
          {formatCurrencyLong(amount)}
        </span>
      </div>
      <div className="mt-1 text-[12px] tabular-nums text-inkMuted">
        {formatPercent(share)} of {categoryName}
      </div>
      <div className="mt-2">
        <PartToWholeBar percent={share} color={color} />
      </div>
    </div>
  );
}
