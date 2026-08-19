import type { Measure, SpendingPayload } from "../types";
import { StackedProportionBar, type ProportionSegment } from "./Bars";
import {
  servicesTotalFor,
  sortedCategories,
  categoryShareOfServices,
} from "../lib/selectors";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * ServicesSummaryCard (Sections 13b & 19). Structurally parallel to the
 * Obligations card: leads with the Services rollup headline, dollar total, and
 * share of total, then a plain muted denominator line, then the stacked
 * proportion bar across all ten categories.
 *
 * Denominator transparency: the percentages on category rows are share of
 * SERVICE spending, not of the total budget — stated as a plain description
 * line (not a tooltip, not a per-row icon).
 */
interface ServicesSummaryCardProps {
  payload: SpendingPayload;
  measure: Measure;
  activeCategoryId?: string | null;
  onSliceClick?: (id: string) => void;
}

export function ServicesSummaryCard({
  payload,
  measure,
  activeCategoryId,
  onSliceClick,
}: ServicesSummaryCardProps) {
  const servicesTotal = servicesTotalFor(payload, measure);
  const totalShare = (servicesTotal / payload.fiscalYear[measure]) * 100;

  const segments: ProportionSegment[] = sortedCategories(payload, measure).map((c) => ({
    id: c.id,
    label: c.name,
    percent: categoryShareOfServices(c, payload, measure),
    color: c.color,
  }));

  return (
    <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-card-title text-ink">Spending by Service</h2>
      <div className="mt-1 text-[24px] font-semibold tabular-nums leading-tight text-ink">
        {formatCurrencyLong(servicesTotal)}
      </div>
      <div className="text-[13px] tabular-nums text-inkMuted">
        {formatPercent(totalShare)} of total spending
      </div>

      {/* Plain denominator note (Section 13b) */}
      <p className="mt-2 text-description text-inkMuted">
        Percentages are share of service spending, not of the total budget.
      </p>

      <div className="mt-3">
        <StackedProportionBar
          segments={segments}
          activeId={activeCategoryId}
          onSegmentClick={onSliceClick}
        />
      </div>
    </div>
  );
}
