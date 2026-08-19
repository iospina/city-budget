import type { Measure, MeasureAmounts, MeasureAvailability } from "../types";

/**
 * Per-year measure availability (Section 13).
 *
 * Adopted and Modified are set at the start of a fiscal year, so they are real
 * from day one. Committed and Cash Spent describe execution, so early in a live
 * year they carry only the months elapsed so far. Presenting those as the year's
 * figures would read as a collapse in spending rather than a year in progress.
 *
 * This is a data test, not a year test: a closed year passes on its own merits
 * without the code needing to know which year is current.
 *
 * Threshold chosen against real citywide Checkbook figures (2026-08-19):
 *
 *   FY2026 (closed):      modified 109.7%  committed 100.2%  cash spent  97.0%
 *   FY2027 (7 weeks in):  modified 100.3%  committed  32.4%  cash spent  10.6%
 *
 * The gap between a closed year and a live one is wide, so 60% sits in open
 * space rather than near either cluster. An earlier 25% bar let FY2027's
 * Committed through: a Police-only sample had suggested roughly 10 to 14%, but
 * citywide Committed runs far higher because large obligations are encumbered
 * at the start of the year rather than spent evenly across it.
 */
export const MEASURE_AVAILABILITY_MIN_RATIO = 0.6;

export function computeMeasureAvailability(total: MeasureAmounts): MeasureAvailability {
  const adopted = total.adopted;
  const resolves = (value: number): boolean =>
    adopted > 0 && value / adopted >= MEASURE_AVAILABILITY_MIN_RATIO;
  const availability: Record<Measure, boolean> = {
    adopted: adopted > 0,
    modified: resolves(total.modified),
    committed: resolves(total.committed),
    cash_spent: resolves(total.cash_spent),
  };
  return availability;
}
