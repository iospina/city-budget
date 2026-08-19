import type { MeasureAvailability } from "../src/types";
import { computeMeasureAvailability } from "../src/lib/measureAvailability";
import type { BudgetRecord, RevenueRecord } from "./parse";
import {
  AGENCY_BY_CODE,
  DEFUNCT_CODES,
  OBLIGATION_CODES,
} from "../src/data/taxonomy";
import {
  classifyExpenseCategory,
  mapFundingClass,
  ROUTE_TO_OBLIGATIONS,
  SPENDING_TYPE_LABELS,
  type SpendingType,
} from "../src/data/mappings";
import { CATEGORY_TOKENS } from "../src/lib/tokens";
import type {
  MeasureAmounts,
  ObligationLine,
  RevenueSource,
  ServiceCategory,
  ServiceCategoryId,
  SpendingTypeAmount,
} from "../src/types";

/**
 * Pre-aggregation (Section 6 steps 3–7). Turns parsed Checkbook records into the
 * aggregated objects the client reads. Applies the agency-to-category taxonomy,
 * the spending-type rule set, and routes obligation-flagged lines to Citywide
 * Obligations rather than any service category.
 *
 * The cron drives the per-agency fetch loop (3-char zero-padded codes) and hands
 * each agency's records here tagged with its code. A single unfiltered pull
 * additionally captures the non-coded obligation/adjustment lines by name (see
 * routeObligationByName) — those have no agency_code.
 */

const ZERO: MeasureAmounts = { adopted: 0, modified: 0, committed: 0, cash_spent: 0 };

function addInto(target: MeasureAmounts, rec: BudgetRecord): void {
  target.adopted += rec.adopted;
  target.modified += rec.modified;
  target.committed += rec.committed;
  target.cash_spent += rec.cash_expense; // cash_expense -> cash_spent
}

type ObligationGroup =
  | "Debt Service"
  | "Pension Contributions"
  | "Fringe Benefits"
  | "Reserves and Other";

/** Sub-classify an obligation-flagged expense line into one of the four display groups. */
export function routeObligationByName(expenseCategory: string): ObligationGroup {
  const s = expenseCategory.toUpperCase();
  if (/(INTEREST ON|BOND|REDEMPTION|DEBT|FINANCING|MAC)/.test(s)) return "Debt Service";
  if (/(PENSION|RETIRE|ACTUARIAL|ANNUITY|SUPPLEMENTAL PENSION)/.test(s))
    return "Pension Contributions";
  if (/(FRINGE|HEALTH INSURANCE|WELFARE BEN|SOCIAL SECURITY|TIAA|UNEMPLOYMENT|DISABILITY)/.test(s))
    return "Fringe Benefits";
  return "Reserves and Other";
}

/** Map a whole obligation AGENCY code to its primary display group. */
function obligationGroupForCode(code: number): ObligationGroup {
  if (code === 99 || code === 100) return "Debt Service";
  if (code === 95) return "Pension Contributions";
  return "Reserves and Other"; // 98 Miscellaneous is line-classified, default here
}

export interface SpendingAggregate {
  categories: ServiceCategory[];
  obligations: ObligationLine[];
  servicesTotal: MeasureAmounts;
  obligationsTotal: MeasureAmounts;
  measureAvailability: MeasureAvailability;
}

// Availability rule lives in src/lib/measureAvailability so the client can
// apply the same test to years aggregated before the field existed.

class Accumulator {
  // category id -> totals + spending-type subtotals
  catTotals = new Map<ServiceCategoryId, MeasureAmounts>();
  catTypes = new Map<ServiceCategoryId, Map<SpendingType, MeasureAmounts>>();
  obligations = new Map<ObligationGroup, MeasureAmounts>();

  private ensureCat(id: ServiceCategoryId) {
    if (!this.catTotals.has(id)) this.catTotals.set(id, { ...ZERO });
    if (!this.catTypes.has(id)) this.catTypes.set(id, new Map());
  }

  addToCategory(id: ServiceCategoryId, type: SpendingType, rec: BudgetRecord) {
    this.ensureCat(id);
    addInto(this.catTotals.get(id)!, rec);
    const types = this.catTypes.get(id)!;
    if (!types.has(type)) types.set(type, { ...ZERO });
    addInto(types.get(type)!, rec);
  }

  addToObligation(group: ObligationGroup, rec: BudgetRecord) {
    if (!this.obligations.has(group)) this.obligations.set(group, { ...ZERO });
    addInto(this.obligations.get(group)!, rec);
  }
}

/**
 * Add one agency's budget records to the accumulator.
 * @param acc accumulator
 * @param code the agency_code (numeric) these records were fetched under
 * @param records parsed budget records for that agency + fiscal year
 */
export function addAgencyRecords(
  acc: Accumulator,
  code: number,
  records: BudgetRecord[]
): void {
  if (DEFUNCT_CODES.has(code)) return; // confirmed $0, excluded

  // Whole-agency obligation lines (Debt 99/100, Pension 95, Misc 98).
  if (code in OBLIGATION_CODES) {
    for (const rec of records) {
      const group =
        code === 98 ? routeObligationByName(rec.expense_category) : obligationGroupForCode(code);
      acc.addToObligation(group, rec);
    }
    return;
  }

  const entry = AGENCY_BY_CODE[code];
  if (!entry) return; // unknown code — skip (or log for taxonomy gap)

  for (const rec of records) {
    const type = classifyExpenseCategory(rec.expense_category);
    if (type === ROUTE_TO_OBLIGATIONS) {
      // Obligation-flagged line sitting inside an operating agency: route OUT.
      acc.addToObligation(routeObligationByName(rec.expense_category), rec);
    } else {
      acc.addToCategory(entry.category, type, rec);
    }
  }
}

const SPENDING_TYPE_ORDER: SpendingType[] = [
  "personal-services",
  "contractual-services",
  "supplies",
  "property-and-equipment",
  "grants-and-benefit-payments",
  "other-than-personal-services",
];

const OBLIGATION_DISPLAY_ORDER: ObligationGroup[] = [
  "Debt Service",
  "Pension Contributions",
  "Fringe Benefits",
  "Reserves and Other",
];

function sumMeasures(items: MeasureAmounts[]): MeasureAmounts {
  return items.reduce(
    (a, m) => ({
      adopted: a.adopted + m.adopted,
      modified: a.modified + m.modified,
      committed: a.committed + m.committed,
      cash_spent: a.cash_spent + m.cash_spent,
    }),
    { ...ZERO }
  );
}

export interface PrevYearTotals {
  /** category id -> prior fiscal year adopted (for adopted-to-adopted YoY). */
  categoryAdopted: Partial<Record<ServiceCategoryId, number>>;
}

/** Finalize the accumulator into ServiceCategory/ObligationLine objects. */
export function finalizeSpending(
  acc: Accumulator,
  prev?: PrevYearTotals
): SpendingAggregate {
  const categories: ServiceCategory[] = CATEGORY_TOKENS.map((token) => {
    const totals = acc.catTotals.get(token.id) ?? { ...ZERO };
    const typeMap = acc.catTypes.get(token.id) ?? new Map();
    const spendingTypes: SpendingTypeAmount[] = SPENDING_TYPE_ORDER.map((type) => {
      const m = typeMap.get(type) ?? { ...ZERO };
      return { type, label: SPENDING_TYPE_LABELS[type], ...m };
    }).filter((t) => t.adopted + t.modified + t.committed + t.cash_spent > 0);

    const prevAdopted = prev?.categoryAdopted[token.id];
    const yoyPercent =
      prevAdopted && prevAdopted > 0
        ? ((totals.adopted - prevAdopted) / prevAdopted) * 100
        : 0;

    return {
      id: token.id,
      name: token.name,
      color: token.color,
      icon: token.icon,
      ...totals,
      shareOfServices: 0, // computed client-side per active measure
      yoyPercent,
      spendingTypes,
    };
  });

  const obligations: ObligationLine[] = OBLIGATION_DISPLAY_ORDER.map((group) => {
    const m = acc.obligations.get(group) ?? { ...ZERO };
    return {
      id: group.toLowerCase().replace(/\s+/g, "-"),
      name: group,
      ...m,
      shareOfObligations: 0, // computed client-side per active measure
    };
  });

  const servicesTotal = sumMeasures(categories.map((c) => ({ ...c })));
  const obligationsTotal = sumMeasures(obligations.map((o) => ({ ...o })));
  // Availability is judged on the citywide grand total, not on services alone,
  // so a year is assessed on the same figure the hero headline shows.
  const grandTotal: MeasureAmounts = {
    adopted: servicesTotal.adopted + obligationsTotal.adopted,
    modified: servicesTotal.modified + obligationsTotal.modified,
    committed: servicesTotal.committed + obligationsTotal.committed,
    cash_spent: servicesTotal.cash_spent + obligationsTotal.cash_spent,
  };
  return {
    categories,
    obligations,
    servicesTotal,
    obligationsTotal,
    measureAvailability: computeMeasureAvailability(grandTotal),
  };
}

export function createAccumulator(): Accumulator {
  return new Accumulator();
}

/** Aggregate revenue records into the four resident-facing sources (Section 7 mapping). */
export function aggregateRevenue(records: RevenueRecord[]): RevenueSource[] {
  const order = ["City Sources", "State Sources", "Federal Sources", "Other Sources"];
  const map = new Map<string, { adopted: number; modified: number; recognized: number }>();
  for (const label of order) map.set(label, { adopted: 0, modified: 0, recognized: 0 });

  // Recognized is a real per-transaction amount, so it sums across every row.
  // Adopted/Modified, however, are BUDGET figures attached to a revenue line and
  // repeated across its (thousands of) transaction rows. We count each unique
  // budget line ONCE, keyed ONLY on the line grain (funding/category/class/
  // source) — NOT on the amounts. The `modified` figure is revised across a
  // line's rows, so including it in the key would split one line into several
  // and multi-count `adopted`. We take the first amounts seen per line.
  const seenLines = new Set<string>();

  for (const rec of records) {
    const label = mapFundingClass(rec.funding_class);
    const bucket = map.get(label)!;
    bucket.recognized += rec.recognized;

    const lineKey = `${rec.funding_class}|${rec.revenue_category}|${rec.revenue_class}|${rec.revenue_source}`;
    if (!seenLines.has(lineKey)) {
      seenLines.add(lineKey);
      bucket.adopted += rec.adopted;
      bucket.modified += rec.modified;
    }
  }

  const totalRecognized = order.reduce((s, l) => s + map.get(l)!.recognized, 0) || 1;
  return order.map((label) => {
    const b = map.get(label)!;
    return {
      id: label.toLowerCase().replace(/\s+/g, "-"),
      name: label,
      adopted: b.adopted,
      modified: b.modified,
      recognized: b.recognized,
      shareOfTotal: (b.recognized / totalRecognized) * 100,
    };
  });
}
