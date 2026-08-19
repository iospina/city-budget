import type { Measure, SpendingPayload } from "../types";
import { SplitBar } from "./Bars";
import { servicesObligationsSplit } from "../lib/selectors";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * ServicesObligationsSplit (Section 13b). A thin two-part split bar dividing the
 * grand total into Services and Citywide Obligations, each labeled with its
 * amount and share of total. 12px summary bar. Exists only at the top level of
 * the Spending view (not in category detail, not in Revenue).
 */
const SERVICES_COLOR = "#3A3A3C"; // neutral dark (services), no category color
const OBLIGATIONS_COLOR = "#30B0C7"; // systemTeal — the obligations accent

export function ServicesObligationsSplit({
  payload,
  measure,
}: {
  payload: SpendingPayload;
  measure: Measure;
}) {
  const split = servicesObligationsSplit(payload, measure);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-4">
        <SplitLegend
          swatch={SERVICES_COLOR}
          label="Services"
          amount={split.services}
          share={split.servicesShare}
        />
        <SplitLegend
          swatch={OBLIGATIONS_COLOR}
          label="Citywide Obligations"
          amount={split.obligations}
          share={split.obligationsShare}
          alignRight
        />
      </div>
      <SplitBar
        servicesShare={split.servicesShare}
        servicesColor={SERVICES_COLOR}
        obligationsColor={OBLIGATIONS_COLOR}
      />
    </div>
  );
}

function SplitLegend({
  swatch,
  label,
  amount,
  share,
  alignRight = false,
}: {
  swatch: string;
  label: string;
  amount: number;
  share: number;
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "text-right" : "text-left"}>
      <div className={`flex items-center gap-1.5 ${alignRight ? "justify-end" : ""}`}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
        <span className="text-[13px] font-medium text-inkMuted">{label}</span>
      </div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">
        {formatCurrencyLong(amount)}
      </div>
      <div className="text-[12px] tabular-nums text-inkMuted">
        {formatPercent(share)} of total
      </div>
    </div>
  );
}
