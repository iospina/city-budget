import { fetchAllPages } from "./checkbookFetch";
import { parseBudgetResponse, parseRevenueResponse, type BudgetRecord } from "./parse";
import {
  addAgencyRecords,
  aggregateRevenue,
  createAccumulator,
  finalizeSpending,
  type PrevYearTotals,
} from "./aggregate";
import {
  AGENCY_TAXONOMY,
  DEFUNCT_CODES,
  OBLIGATION_CODES,
  padAgencyCode,
} from "../src/data/taxonomy";
import { calendarSpan } from "../src/lib/format";
import { writeAggregate } from "./db";
import type { ServiceCategoryId } from "../src/types";

/**
 * The ingestion run (Section 6). Orchestrates fetch -> parse -> aggregate ->
 * write for one fiscal year. Designed to be called by the Vercel cron handler.
 *
 * Throttling and pagination live in checkbookFetch (≈3s between calls; paginate
 * past the 20k cap for agencies like DOHMH 816). agency_code is zero-padded to
 * three characters before every Budget call.
 */

const BUDGET_COLUMNS = [
  "agency",
  "expense_category",
  "adopted",
  "modified",
  "committed",
  "cash_expense",
];

const REVENUE_COLUMNS = [
  "agency",
  "funding_class",
  "revenue_category",
  "revenue_class",
  "revenue_source",
  "adopted",
  "modified",
  "recognized",
];

/** All agency codes to pull for spending: taxonomy (minus defunct) + obligation codes. */
function spendingCodes(): number[] {
  const codes = new Set<number>();
  for (const a of AGENCY_TAXONOMY) if (!DEFUNCT_CODES.has(a.code)) codes.add(a.code);
  for (const c of Object.keys(OBLIGATION_CODES)) codes.add(Number(c));
  return [...codes];
}

async function fetchAgencyBudget(code: number, year: number): Promise<BudgetRecord[]> {
  const pages = await fetchAllPages({
    domain: "Budget",
    criteria: [
      { name: "year", value: String(year) }, // Budget uses `year`, not `fiscal_year`
      { name: "agency_code", value: padAgencyCode(code) }, // 3-char zero-padded
    ],
    responseColumns: BUDGET_COLUMNS,
  });
  return pages.flatMap(parseBudgetResponse);
}

/**
 * Build the spending aggregate for one fiscal year (optionally with prior-year
 * YoY). Returns the per-category adopted totals so the caller can chain them as
 * the next year's YoY basis.
 */
export async function ingestSpendingYear(
  year: number,
  prev?: PrevYearTotals
): Promise<{ id: ServiceCategoryId; adopted: number }[]> {
  const acc = createAccumulator();
  for (const code of spendingCodes()) {
    const records = await fetchAgencyBudget(code, year);
    addAgencyRecords(acc, code, records);
  }
  const agg = finalizeSpending(acc, prev);

  const fiscalYear = {
    year,
    calendarSpan: calendarSpan(year),
    adopted: agg.servicesTotal.adopted + agg.obligationsTotal.adopted,
    modified: agg.servicesTotal.modified + agg.obligationsTotal.modified,
    committed: agg.servicesTotal.committed + agg.obligationsTotal.committed,
    cash_spent: agg.servicesTotal.cash_spent + agg.obligationsTotal.cash_spent,
  };

  await writeAggregate("spending", year, {
    fiscalYear,
    servicesTotal: agg.servicesTotal,
    obligationsTotal: agg.obligationsTotal,
    categories: agg.categories,
    obligations: agg.obligations,
    lastUpdated: new Date().toISOString(),
  });

  return agg.categories.map((c) => ({ id: c.id, adopted: c.adopted }));
}

/** Extract prior-year category adopted totals for the next year's YoY basis. */
export function prevTotalsFromCategories(
  categories: { id: ServiceCategoryId; adopted: number }[]
): PrevYearTotals {
  const categoryAdopted: PrevYearTotals["categoryAdopted"] = {};
  for (const c of categories) categoryAdopted[c.id] = c.adopted;
  return { categoryAdopted };
}

/** Build and store the revenue aggregate for one fiscal year. */
export async function ingestRevenueYear(year: number): Promise<void> {
  const pages = await fetchAllPages({
    domain: "Revenue",
    criteria: [{ name: "fiscal_year", value: String(year) }], // Revenue uses `fiscal_year`
    responseColumns: REVENUE_COLUMNS,
  });
  const records = pages.flatMap(parseRevenueResponse);
  const sources = aggregateRevenue(records);

  const totalRecognized = sources.reduce((s, r) => s + r.recognized, 0);
  const totalAdopted = sources.reduce((s, r) => s + r.adopted, 0);
  const totalModified = sources.reduce((s, r) => s + r.modified, 0);

  await writeAggregate("revenue", year, {
    year,
    totalRecognized,
    totalAdopted,
    totalModified,
    sources,
    lastUpdated: new Date().toISOString(),
  });
}
