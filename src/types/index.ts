/**
 * Core data model (Implementation Brief Section 5).
 *
 * The app operates on AGGREGATED category objects, not raw transaction rows.
 * Checkbook returns up to 3.1M+ spending records per fiscal year; these are
 * pre-aggregated server-side (Day 2 Vercel cron) and served from City Budget's
 * own API layer. The client only ever reads the objects below.
 */

/** The four budget measures. A global "lens" alongside fiscal year (Section 13). */
export type Measure = "adopted" | "modified" | "committed" | "cash_spent";

/**
 * Which measures have real data for a given fiscal year. Execution measures
 * (Committed, Cash Spent) are near zero early in a live fiscal year, so they are
 * shown disabled rather than displayed as if they were real figures.
 * Optional: payloads aggregated before this field existed omit it, and the
 * client treats a missing value as "all four available".
 */
export type MeasureAvailability = Record<Measure, boolean>;

/** Revenue has only three measures (build-fix acceptance criterion #4). */
export type RevenueMeasure = "adopted" | "modified" | "recognized";

/** Spending vs Revenue top-level view (segmented control). */
export type ProductView = "spending" | "revenue";

/** Which product is active inside the City Explorer shell. */
export type ExplorerProduct = "city-budget" | "city-permits";

/** The four measure-keyed money fields every spending object carries. */
export interface MeasureAmounts {
  adopted: number;
  modified: number;
  committed: number;
  cash_spent: number;
}

/** The ten locked service-category identifiers. */
export type ServiceCategoryId =
  | "education"
  | "health-and-hospitals"
  | "public-safety"
  | "social-services"
  | "transportation"
  | "environment-and-water"
  | "housing-and-buildings"
  | "sanitation"
  | "parks-and-recreation"
  | "other-services";

/** A spending-type subtotal within a category (Section 16 + Field-to-Label Mappings). */
export interface SpendingTypeAmount extends MeasureAmounts {
  type: string; // SpendingType id (see data/mappings)
  label: string; // resident-facing label
}

export interface ServiceCategory extends MeasureAmounts {
  id: ServiceCategoryId;
  name: string;
  color: string; // hex from Section 8
  icon: string; // Material Symbol name from Section 8
  /** Share of service spending (NOT of the total budget) for the active measure. */
  shareOfServices: number;
  /** Year-over-year percent change vs the prior fiscal year (adopted-to-adopted basis). */
  yoyPercent: number;
  /** The six resident-facing spending types; $0 types are omitted on the detail view. */
  spendingTypes: SpendingTypeAmount[];
}

/** A Citywide Obligations line — not a service category (Section 13b). */
export interface ObligationLine extends MeasureAmounts {
  id: string;
  name: string; // Debt Service, Pension Contributions, Fringe Benefits, Reserves and Other
  shareOfObligations: number;
}

/** A resident-facing revenue source (Section 17 + Field-to-Label Mappings). */
export interface RevenueSource {
  id: string;
  name: string; // City Sources, State Sources, Federal Sources, Other Sources
  adopted: number;
  modified: number;
  recognized: number;
  shareOfTotal: number;
}

/** Top-level fiscal-year totals (Section 5). */
export interface FiscalYear extends MeasureAmounts {
  year: number;
  /** e.g. "July 2024 – June 2025" */
  calendarSpan: string;
}

/** The full aggregated spending payload for one fiscal year (served from /api/spending). */
export interface SpendingPayload {
  fiscalYear: FiscalYear;
  /** Services portion totals (sum of the ten categories) per measure. */
  servicesTotal: MeasureAmounts;
  /** Obligations portion totals (sum of obligation lines) per measure. */
  obligationsTotal: MeasureAmounts;
  categories: ServiceCategory[];
  obligations: ObligationLine[];
  /** Per-measure availability for this year. Absent on pre-existing payloads. */
  measureAvailability?: MeasureAvailability;
  lastUpdated: string; // ISO timestamp
}

/** The full aggregated revenue payload for one fiscal year (served from /api/revenue). */
export interface RevenuePayload {
  year: number;
  totalRecognized: number;
  totalAdopted: number;
  totalModified: number;
  sources: RevenueSource[];
  lastUpdated: string;
}
