import { useEffect } from "react";
import type { RevenueMeasure, RevenuePayload } from "../types";
import { useAppState } from "../state/AppState";
import { track } from "../analytics/events";
import { IDENTITY, REVENUE_MEASURES, REVENUE_MEASURE_SUBLABEL } from "../lib/tokens";
import { revenueTotalFor, sortedRevenueSources } from "../lib/selectors";
import { formatCurrencyLong, fiscalYearLabel } from "../lib/format";
import { MeasureLens } from "./MeasureLens";
import { RevenueRow } from "./RevenueRow";
import { SourceFootnote } from "./SourceFootnote";
import { DashboardActions } from "./DashboardActions";

/** Green shades for the four-source share-card visual (revenue has no category colors). */
const REVENUE_SHADES = ["#248A3D", "#34C759", "#5CD37C", "#8FE0A3"];

/**
 * RevenueView (Section 17). systemGreen identity. A revenue overview card leads
 * with the REVENUE band, the headline total at the active revenue measure, and
 * the 1x3 MeasureLens (Adopted, Modified, Recognized). NO Services/Obligations
 * split (a spending concept). NO year-over-year badges. Then the flat list of
 * four sources — City, State, Federal, Other — each a label-led row with a green
 * part-to-whole bar and no circle icon. Revenue stays flat (no drill-down) in MVP.
 */
export function RevenueView({ payload }: { payload: RevenuePayload }) {
  const { revenueMeasure, setRevenueMeasure, fiscalYear } = useAppState();
  const total = revenueTotalFor(payload, revenueMeasure);
  const rows = sortedRevenueSources(payload, revenueMeasure);

  // revenue_view_loaded fires once per fiscal year the revenue view shows (Section 22).
  useEffect(() => {
    track.revenueViewLoaded(fiscalYear);
  }, [fiscalYear]);

  function handleMeasureChange(m: RevenueMeasure) {
    setRevenueMeasure(m);
    track.measureChanged(m, "revenue");
  }

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <div className="grid gap-6 md:grid-cols-[1.4fr_auto_1.2fr] md:items-stretch md:gap-0">
            {/* identity + headline */}
            <div className="md:pr-6">
              <span
                className="text-[13px] font-bold tracking-wide"
                style={{ color: IDENTITY.revenue.textColor }}
              >
                {IDENTITY.revenue.label}
              </span>
              <div className="mt-3 text-[13px] font-medium text-inkMuted">
                {REVENUE_MEASURE_SUBLABEL[revenueMeasure]} · {fiscalYearLabel(fiscalYear)}
              </div>
              <div
                key={`${revenueMeasure}-${total}`}
                className="mt-1 animate-figure-in font-bold tabular-nums leading-none text-ink text-[32px] md:text-[36px]"
              >
                {formatCurrencyLong(total)}
              </div>
              <p className="mt-3 text-[12px] text-inkMuted">
                Where the city's money comes from.
              </p>
            </div>

            <div className="hidden w-px bg-black/5 md:block" aria-hidden />

            {/* measure lens (1x3) */}
            <div className="md:pl-6">
              <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-inkMuted">
                Measure
              </div>
              <MeasureLens
                variant="revenue"
                value={revenueMeasure}
                onChange={handleMeasureChange}
                pills={REVENUE_MEASURES.map((m) => ({
                  id: m.id,
                  label: m.label,
                  amount: revenueTotalFor({ ...payload }, m.id),
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl px-4 pt-4">
        <h2 className="text-section-header px-1 text-ink">Revenue Sources</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          {rows.map(({ source, amount, share }) => (
            <RevenueRow key={source.id} name={source.name} amount={amount} share={share} />
          ))}
        </div>

      </main>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-6 max-[1439px]:pb-32">
        <SourceFootnote
          lastUpdated={payload.lastUpdated}
          fiscalYear={fiscalYear}
          note="Total spending and total revenue need not match; adopted revenue and adopted spending differ."
        />
        <div className="mt-4">
          <DashboardActions
            context={{
              kind: "revenue-dashboard",
              fiscalYear,
              total,
              segments: rows.map(({ source, share }, i) => ({
                id: source.id,
                color: REVENUE_SHADES[i % REVENUE_SHADES.length],
                percent: share,
              })),
            }}
          />
        </div>
      </div>
    </>
  );
}
