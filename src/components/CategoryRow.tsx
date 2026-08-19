import type { Measure, ServiceCategory, SpendingPayload } from "../types";
import { Icon } from "./Icon";
import { PartToWholeBar } from "./Bars";
import { YoYBadge } from "./YoYBadge";
import { amountFor, categoryShareOfServices } from "../lib/selectors";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * CategoryRow (Section 13b/16). A white card row: category circle (icon + color),
 * name, amount (active measure), share of services, YoY badge, and a 6px
 * part-to-whole bar in the category color. Tappable (opens detail on Day 2).
 *
 * Each row reflects its own category's data at the active measure — distinct
 * per category (build-fix acceptance #1). Highlightable via a proportion-bar
 * slice tap (neutral highlight).
 */
interface CategoryRowProps {
  category: ServiceCategory;
  payload: SpendingPayload;
  measure: Measure;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}

export function CategoryRow({
  category,
  payload,
  measure,
  highlighted = false,
  onSelect,
}: CategoryRowProps) {
  const amount = amountFor(category, measure);
  const share = categoryShareOfServices(category, payload, measure);

  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(category.id) : undefined}
      className={[
        "flex w-full items-center gap-3 rounded-card bg-white px-4 py-3 text-left ring-1 transition-colors",
        highlighted ? "ring-2 ring-black/15 bg-black/[0.02]" : "ring-black/5 hover:bg-black/[0.015]",
      ].join(" ")}
    >
      {/* Category circle */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color }}
      >
        <Icon name={category.icon} size={20} color={iconInkFor(category.color)} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium text-ink">{category.name}</span>
          <span className="shrink-0 text-[16px] font-bold tabular-nums text-ink md:text-[17px]">
            {formatCurrencyLong(amount)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-[12px] tabular-nums text-inkMuted">
            {formatPercent(share)} of services
          </span>
          <YoYBadge percent={category.yoyPercent} />
        </div>
        <div className="mt-2">
          <PartToWholeBar percent={share} color={category.color} />
        </div>
      </div>
    </button>
  );
}

/** Education yellow needs dark ink on its icon; everything else reads on white. */
function iconInkFor(hex: string): string {
  return hex.toUpperCase() === "#FFCC00" ? "#1C1C1E" : "#FFFFFF";
}
