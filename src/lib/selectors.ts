import type {
  Measure,
  MeasureAmounts,
  ObligationLine,
  RevenueMeasure,
  RevenuePayload,
  RevenueSource,
  ServiceCategory,
  SpendingPayload,
  SpendingTypeAmount,
} from "../types";

/**
 * Measure-aware selectors. The active measure is a global lens (Section 13):
 * selecting it reframes every figure. Shares and the services/obligations split
 * recompute on the selected measure rather than reading the stored adopted-basis
 * share, so the whole view stays internally consistent.
 */

export function amountFor(item: MeasureAmounts, measure: Measure): number {
  return item[measure];
}

/** Services total for the active measure. */
export function servicesTotalFor(payload: SpendingPayload, measure: Measure): number {
  return payload.servicesTotal[measure];
}

/** Obligations total for the active measure. */
export function obligationsTotalFor(payload: SpendingPayload, measure: Measure): number {
  return payload.obligationsTotal[measure];
}

/** Grand total (services + obligations) for the active measure. */
export function grandTotalFor(payload: SpendingPayload, measure: Measure): number {
  return payload.fiscalYear[measure];
}

/** Share of SERVICES (not total) for a category at the active measure. */
export function categoryShareOfServices(
  category: ServiceCategory,
  payload: SpendingPayload,
  measure: Measure
): number {
  const total = servicesTotalFor(payload, measure);
  return total > 0 ? (category[measure] / total) * 100 : 0;
}

/** Share of OBLIGATIONS for a line at the active measure. */
export function obligationShare(
  line: ObligationLine,
  payload: SpendingPayload,
  measure: Measure
): number {
  const total = obligationsTotalFor(payload, measure);
  return total > 0 ? (line[measure] / total) * 100 : 0;
}

/** Categories sorted by the active measure, descending (largest first). */
export function sortedCategories(
  payload: SpendingPayload,
  measure: Measure
): ServiceCategory[] {
  return [...payload.categories].sort((a, b) => b[measure] - a[measure]);
}

/**
 * Spending-type rows for a category at the active measure (Story 4 / Section 16).
 * Rendered in the FIXED canonical order (Personal Services, Contractual Services,
 * Supplies, Property and Equipment, Grants and Benefit Payments, Other than
 * Personal Services) — NOT sorted by amount. Types that are $0 for the category
 * are omitted, so a category may show fewer than six rows. Each row's share is
 * computed against the category total at the active measure.
 *
 * (category.spendingTypes is already stored in canonical order by the data layer.)
 */
export function categorySpendingTypes(
  category: ServiceCategory,
  measure: Measure
): { type: SpendingTypeAmount; amount: number; share: number }[] {
  const categoryTotal = category[measure];
  return category.spendingTypes
    .map((t) => ({ type: t, amount: t[measure] }))
    .filter((r) => r.amount > 0)
    .map((r) => ({
      ...r,
      share: categoryTotal > 0 ? (r.amount / categoryTotal) * 100 : 0,
    }));
}

/** Revenue amount for a source at the active revenue measure. */
export function revenueAmountFor(source: RevenueSource, measure: RevenueMeasure): number {
  return source[measure];
}

/** Revenue total at the active revenue measure. */
export function revenueTotalFor(payload: RevenuePayload, measure: RevenueMeasure): number {
  return payload.sources.reduce((sum, s) => sum + s[measure], 0);
}

/** Revenue sources sorted largest-first by the active measure, with share of total. */
export function sortedRevenueSources(
  payload: RevenuePayload,
  measure: RevenueMeasure
): { source: RevenueSource; amount: number; share: number }[] {
  const total = revenueTotalFor(payload, measure);
  return [...payload.sources]
    .map((s) => ({ source: s, amount: s[measure], share: total > 0 ? (s[measure] / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Services vs Obligations split for the active measure (for the split bar). */
export function servicesObligationsSplit(payload: SpendingPayload, measure: Measure) {
  const services = servicesTotalFor(payload, measure);
  const obligations = obligationsTotalFor(payload, measure);
  const total = services + obligations;
  return {
    services,
    obligations,
    servicesShare: total > 0 ? (services / total) * 100 : 0,
    obligationsShare: total > 0 ? (obligations / total) * 100 : 0,
  };
}
