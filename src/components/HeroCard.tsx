import type { Measure, SpendingPayload } from "../types";
import { IDENTITY, MEASURE_SUBLABEL, SPENDING_MEASURES } from "../lib/tokens";
import { grandTotalFor } from "../lib/selectors";
import { formatCurrencyLong, fiscalYearLabel } from "../lib/format";
import { MeasureLens } from "./MeasureLens";
import { ServicesObligationsSplit } from "./ServicesObligationsSplit";
import { YoYBadge } from "./YoYBadge";

/**
 * HeroCard — spending variant (Sections 10 & 13b).
 *
 * Full-width white card on the gradient background. Holds everything about the
 * total in three horizontal zones separated by vertical rules on desktop:
 *   1. identity + headline (systemPink "SPENDING" band, headline total, YoY)
 *   2. the MeasureLens pills
 *   3. the Services / Obligations split
 * Mobile stacks the three zones vertically with generous spacing.
 *
 * The headline is the active measure's grand total (Adopted by default) and is
 * the single dominant figure: 36px/700 desktop, 32px/700 mobile.
 */
interface HeroCardProps {
  payload: SpendingPayload;
  measure: Measure;
  onMeasureChange: (measure: Measure) => void;
}

export function HeroCard({ payload, measure, onMeasureChange }: HeroCardProps) {
  const total = grandTotalFor(payload, measure);
  // Hero YoY: weighted overall change is approximated here by the services-weighted
  // figure on adopted basis; Day 2 computes the true grand-total YoY per measure.
  const heroYoY = approxGrandYoY(payload);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-4">
      <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="grid gap-6 md:grid-cols-[1.2fr_auto_1fr_auto_1.3fr] md:items-stretch md:gap-0">
          {/* Zone 1 — identity + headline */}
          <div className="md:pr-6">
            <span
              className="text-[13px] font-bold tracking-wide"
              style={{ color: IDENTITY.spending.textColor }}
            >
              {IDENTITY.spending.label}
            </span>
            <div className="mt-3 text-[13px] font-medium text-inkMuted">
              {MEASURE_SUBLABEL[measure]} · {fiscalYearLabel(payload.fiscalYear.year)}
            </div>
            <div
              key={`${measure}-${total}`}
              className="mt-1 animate-figure-in font-bold tabular-nums leading-none text-ink text-[32px] md:text-[36px]"
            >
              {formatCurrencyLong(total)}
            </div>
            <div className="mt-2.5">
              <YoYBadge percent={heroYoY} showWord size="md" />
            </div>
            <p className="mt-3 text-[12px] text-inkMuted">{payload.fiscalYear.calendarSpan}</p>
          </div>

          {/* vertical rule (desktop only) */}
          <div className="hidden w-px bg-black/5 md:block" aria-hidden />

          {/* Zone 2 — MeasureLens */}
          <div className="md:px-6">
            <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-inkMuted">
              Measure
            </div>
            <MeasureLens
              variant="spending"
              value={measure}
              onChange={onMeasureChange}
              pills={SPENDING_MEASURES.map((m) => ({
                id: m.id,
                label: m.label,
                amount: grandTotalFor(payload, m.id),
              }))}
            />
          </div>

          {/* vertical rule (desktop only) */}
          <div className="hidden w-px bg-black/5 md:block" aria-hidden />

          {/* Zone 3 — Services / Obligations split */}
          <div className="md:pl-6">
            <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-inkMuted">
              Services and Obligations
            </div>
            <ServicesObligationsSplit payload={payload} measure={measure} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Adopted-basis grand YoY approximation for Day 1 (Day 2 computes per measure). */
function approxGrandYoY(payload: SpendingPayload): number {
  // Weighted by category adopted share — placeholder until real prior-year totals.
  const weighted = payload.categories.reduce(
    (acc, c) => acc + c.yoyPercent * c.adopted,
    0
  );
  const denom = payload.categories.reduce((acc, c) => acc + c.adopted, 0);
  return denom > 0 ? weighted / denom : 0;
}
