/**
 * Fiscal-year range (Implementation Brief Sections 5, 12 and 26).
 *
 * NYC fiscal year N runs July of year N-1 through June of year N, so FY2027
 * began in July 2026. The range is derived from the clock rather than listed,
 * so the July rollover is automatic: a new year enters the ingest range and the
 * oldest year falls off the selector with no code change.
 *
 * This module is imported by BOTH the client and the ingestion pipeline. It
 * replaces the previous arrangement where the pipeline read its year range from
 * src/data/mockData, which coupled production ingestion to the mock layer.
 */

/** First fiscal year City Budget carries. Checkbook coverage starts well before
 *  this; the floor is a product decision about how much history to pre-aggregate. */
export const FIRST_FISCAL_YEAR = 2021;

/** Section 12: the five most recent fiscal years are offered in the selector. */
export const DISPLAY_YEAR_LIMIT = 5;

/** The fiscal year in progress. July onward belongs to the next fiscal year. */
export function currentFiscalYear(now: Date = new Date()): number {
  const month = now.getMonth(); // 0 = January
  return month >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

/**
 * Every fiscal year to ingest, oldest first. Oldest-first matters: the pipeline
 * chains each year's category totals forward as the next year's year-over-year
 * basis, so the order is load-bearing, not cosmetic.
 */
export function ingestYears(now: Date = new Date()): number[] {
  const latest = currentFiscalYear(now);
  const years: number[] = [];
  for (let y = FIRST_FISCAL_YEAR; y <= latest; y += 1) years.push(y);
  return years;
}

/**
 * The fiscal years that can still change, oldest first.
 *
 * The year in progress changes daily. The year just closed can still take late
 * adjustments. Everything older is static, so re-pulling it on a schedule burns
 * throttle budget against Checkbook for no benefit. A full history rebuild is
 * still available with `npm run ingest -- --force`.
 */
export function refreshYears(now: Date = new Date()): number[] {
  const current = currentFiscalYear(now);
  return [current - 1, current].filter((y) => y >= FIRST_FISCAL_YEAR);
}

/** The years offered in the selector, most recent first, capped per Section 12. */
export function displayYears(now: Date = new Date()): number[] {
  return ingestYears(now).slice(-DISPLAY_YEAR_LIMIT).reverse();
}

/** True when `year` is a fiscal year this app could plausibly hold. Used to
 *  validate a deep link before the real year list has loaded. */
export function isPlausibleFiscalYear(year: number, now: Date = new Date()): boolean {
  return Number.isInteger(year) && year >= FIRST_FISCAL_YEAR && year <= currentFiscalYear(now);
}
