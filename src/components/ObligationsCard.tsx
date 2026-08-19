import type { Measure, SpendingPayload } from "../types";
import { PartToWholeBar } from "./Bars";
import {
  amountFor,
  obligationsTotalFor,
  obligationShare,
} from "../lib/selectors";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * ObligationsCard (Sections 13b & 14). The Citywide Obligations block.
 *
 * Uses the SAME card fill as service cards — no dashed border. Its separation
 * comes from position, label, and the absence of any category color, NOT a
 * different card style. Structurally parallel to the Services summary card:
 * name, dollar rollup, share of total, a plain description line, then the
 * itemized lines (Debt Service, Pension Contributions, Fringe Benefits,
 * Reserves and Other) each with amount, share, and a neutral 6px bar.
 *
 * Static in MVP (no drill-down).
 */
// systemTeal — the obligations accent. Not one of the ten category colors, so
// Obligations still reads as "not a service" while breaking the gray monotony.
const OBLIGATION_BAR_COLOR = "#30B0C7";

interface ObligationsCardProps {
  payload: SpendingPayload;
  measure: Measure;
}

export function ObligationsCard({ payload, measure }: ObligationsCardProps) {
  const total = obligationsTotalFor(payload, measure);
  const totalShare = (total / payload.fiscalYear[measure]) * 100;

  // Stable display order: largest first by the active measure.
  const lines = [...payload.obligations].sort((a, b) => b[measure] - a[measure]);

  return (
    <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-card-title text-ink">Citywide Obligations</h2>
      <div className="mt-1 text-[24px] font-semibold tabular-nums leading-tight text-ink">
        {formatCurrencyLong(total)}
      </div>
      <div className="text-[13px] tabular-nums text-inkMuted">
        {formatPercent(totalShare)} of total spending
      </div>
      <p className="mt-2 text-description text-inkMuted">
        Debt, pensions, and benefits the city owes citywide, not a single service.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {lines.map((line) => {
          const amount = amountFor(line, measure);
          const share = obligationShare(line, payload, measure);
          return (
            <div key={line.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium text-ink">{line.name}</span>
                <span className="text-[16px] font-bold tabular-nums text-ink md:text-[17px]">
                  {formatCurrencyLong(amount)}
                </span>
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums text-inkMuted">
                {formatPercent(share)} of obligations
              </div>
              <div className="mt-1.5">
                <PartToWholeBar percent={share} color={OBLIGATION_BAR_COLOR} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
