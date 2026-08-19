import { currentFiscalYear, displayYears } from "../lib/fiscalYears";
import type {
  FiscalYear,
  ObligationLine,
  RevenuePayload,
  RevenueSource,
  ServiceCategory,
  ServiceCategoryId,
  SpendingPayload,
  SpendingTypeAmount,
} from "../types";
import { CATEGORY_TOKENS } from "../lib/tokens";
import { calendarSpan } from "../lib/format";
import {
  SPENDING_TYPE_LABELS,
  type SpendingType,
} from "./mappings";

/**
 * MOCK DATA (Day 1). Shapes mirror the real aggregated objects exactly so the
 * UI renders with correct structure. Day 2 replaces this with pre-aggregated
 * data from the Checkbook pipeline. Values are plausible placeholders, NOT real
 * figures. Each category carries DISTINCT values (build-fix acceptance #1) and
 * each fiscal year differs (so the year selector visibly changes data).
 */

/** Mock years track the real range so local dev without serverless shows the
 *  same fiscal years the deployed app offers (most recent first). */
export const MOCK_FISCAL_YEARS: number[] = displayYears();
export const DEFAULT_FISCAL_YEAR = MOCK_FISCAL_YEARS[0]; // most recent (Section 12)

/** Base FY2025 adopted amounts per category (dollars). Distinct per category. */
const BASE_CATEGORY_ADOPTED: Record<ServiceCategoryId, number> = {
  education: 38_000_000_000,
  "social-services": 18_500_000_000,
  "public-safety": 11_400_000_000,
  "health-and-hospitals": 9_200_000_000,
  "other-services": 5_200_000_000,
  sanitation: 1_900_000_000,
  transportation: 1_600_000_000,
  "environment-and-water": 1_500_000_000,
  "housing-and-buildings": 1_500_000_000,
  "parks-and-recreation": 700_000_000,
};

/** Base FY2025 adopted amounts per obligation line (dollars). */
const BASE_OBLIGATIONS: { id: string; name: string; adopted: number }[] = [
  { id: "fringe-benefits", name: "Fringe Benefits", adopted: 12_500_000_000 },
  { id: "pension-contributions", name: "Pension Contributions", adopted: 9_600_000_000 },
  { id: "debt-service", name: "Debt Service", adopted: 8_400_000_000 },
  { id: "reserves-and-other", name: "Reserves and Other", adopted: 2_000_000_000 },
];

/**
 * Per-category spending-type weight profiles (sum to 1.0 each). Distinct per
 * category so the detail view reads legibly: Public Safety is staff-heavy,
 * Social Services is grants-heavy, etc. Types weighted 0 produce $0 and are
 * omitted on the detail view (demonstrates the $0-omission rule). The order
 * here is the six locked types from the Field-to-Label Mappings.
 */
const SPENDING_TYPE_ORDER: SpendingType[] = [
  "personal-services",
  "contractual-services",
  "supplies",
  "property-and-equipment",
  "grants-and-benefit-payments",
  "other-than-personal-services",
];

const TYPE_PROFILES: Record<ServiceCategoryId, number[]> = {
  // [PS, Contractual, Supplies, Property, Grants, OTPS]
  education: [0.42, 0.12, 0.04, 0.03, 0.35, 0.04],
  "health-and-hospitals": [0.18, 0.22, 0.06, 0.03, 0.46, 0.05],
  "public-safety": [0.74, 0.1, 0.04, 0.04, 0.0, 0.08],
  "social-services": [0.08, 0.16, 0.01, 0.01, 0.7, 0.04],
  transportation: [0.34, 0.3, 0.05, 0.1, 0.12, 0.09],
  "environment-and-water": [0.3, 0.34, 0.05, 0.16, 0.0, 0.15],
  "housing-and-buildings": [0.4, 0.22, 0.03, 0.05, 0.22, 0.08],
  sanitation: [0.62, 0.18, 0.06, 0.08, 0.0, 0.06],
  "parks-and-recreation": [0.66, 0.16, 0.05, 0.08, 0.0, 0.05],
  "other-services": [0.3, 0.3, 0.04, 0.06, 0.2, 0.1],
};

/** Allocate a category's measure amount across the six types by its profile. */
function allocateTypes(
  categoryId: ServiceCategoryId,
  measures: { adopted: number; modified: number; committed: number; cash_spent: number }
): SpendingTypeAmount[] {
  const weights = TYPE_PROFILES[categoryId];
  const out: SpendingTypeAmount[] = [];
  SPENDING_TYPE_ORDER.forEach((type, i) => {
    const w = weights[i];
    out.push({
      type,
      label: SPENDING_TYPE_LABELS[type],
      adopted: Math.round(measures.adopted * w),
      modified: Math.round(measures.modified * w),
      committed: Math.round(measures.committed * w),
      cash_spent: Math.round(measures.cash_spent * w),
    });
  });
  return out;
}

/** Per-year scale factor applied to the FY2025 base (older years are smaller). */
const YEAR_SCALE: Record<number, number> = {
  2021: 0.86,
  2022: 0.9,
  2023: 0.945,
  2024: 0.975,
  2025: 1.0,
  2026: 1.03,
  2027: 1.12,
};

/** Deterministic pseudo-random in [-1, 1] from a string seed (stable across renders). */
function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [-1, 1]
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * Derive the four measures from an adopted base with small, stable variation.
 *
 * A fiscal year still in progress is modelled differently: Adopted and Modified
 * are set at the start of the year and are therefore complete, but Committed and
 * Cash Spent only reflect the months elapsed so far. Without this, mock data
 * makes every year look closed, and local development never exercises the
 * disabled MeasureLens pills that a live year produces.
 *
 * The in-progress ratios approximate the real citywide shape measured for FY2027
 * in August 2026: Committed near a third of Adopted, Cash Spent near a tenth.
 */
function deriveMeasures(adopted: number, seed: string, year: number) {
  const modified = adopted * (1.02 + 0.03 * seededUnit(seed + "mod"));
  let committed = modified * (0.99 + 0.015 * seededUnit(seed + "com"));
  let cash_spent = committed * (0.93 + 0.04 * seededUnit(seed + "cash"));
  if (year >= currentFiscalYear()) {
    committed = adopted * (0.32 + 0.03 * seededUnit(seed + "prog"));
    cash_spent = adopted * (0.11 + 0.02 * seededUnit(seed + "cashprog"));
  }
  return {
    adopted: Math.round(adopted),
    modified: Math.round(modified),
    committed: Math.round(committed),
    cash_spent: Math.round(cash_spent),
  };
}

function sumMeasures(items: { adopted: number; modified: number; committed: number; cash_spent: number }[]) {
  return items.reduce(
    (acc, it) => ({
      adopted: acc.adopted + it.adopted,
      modified: acc.modified + it.modified,
      committed: acc.committed + it.committed,
      cash_spent: acc.cash_spent + it.cash_spent,
    }),
    { adopted: 0, modified: 0, committed: 0, cash_spent: 0 }
  );
}

/** Build the full aggregated spending payload for a given fiscal year. */
export function buildSpendingPayload(year: number): SpendingPayload {
  const scale = YEAR_SCALE[year] ?? 1;
  const prevScale = YEAR_SCALE[year - 1] ?? scale * 0.97;

  const categories: ServiceCategory[] = CATEGORY_TOKENS.map((token) => {
    const baseAdopted = BASE_CATEGORY_ADOPTED[token.id];
    const seed = `${token.id}-${year}`;
    const adoptedThis = baseAdopted * scale * (1 + 0.02 * seededUnit(seed + "yr"));
    const measures = deriveMeasures(adoptedThis, seed, year);
    // YoY adopted-to-adopted basis (Section 26).
    const adoptedPrev = baseAdopted * prevScale * (1 + 0.02 * seededUnit(`${token.id}-${year - 1}yr`));
    const yoyPercent = ((measures.adopted - adoptedPrev) / adoptedPrev) * 100;
    return {
      id: token.id,
      name: token.name,
      color: token.color,
      icon: token.icon,
      ...measures,
      shareOfServices: 0, // filled below once the services total is known
      yoyPercent,
      spendingTypes: allocateTypes(token.id, measures),
    };
  });

  const obligations: ObligationLine[] = BASE_OBLIGATIONS.map((o) => {
    const seed = `${o.id}-${year}`;
    const adoptedThis = o.adopted * scale * (1 + 0.015 * seededUnit(seed + "yr"));
    const measures = deriveMeasures(adoptedThis, seed, year);
    return { id: o.id, name: o.name, ...measures, shareOfObligations: 0 };
  });

  const servicesTotal = sumMeasures(categories);
  const obligationsTotal = sumMeasures(obligations);

  // Fill share-of-services (adopted basis for the resting view; the UI recomputes
  // per active measure via selectors).
  for (const c of categories) {
    c.shareOfServices = (c.adopted / servicesTotal.adopted) * 100;
  }
  for (const o of obligations) {
    o.shareOfObligations = (o.adopted / obligationsTotal.adopted) * 100;
  }

  const grandTotal = {
    adopted: servicesTotal.adopted + obligationsTotal.adopted,
    modified: servicesTotal.modified + obligationsTotal.modified,
    committed: servicesTotal.committed + obligationsTotal.committed,
    cash_spent: servicesTotal.cash_spent + obligationsTotal.cash_spent,
  };

  const fiscalYear: FiscalYear = {
    year,
    calendarSpan: calendarSpan(year),
    ...grandTotal,
  };

  return {
    fiscalYear,
    servicesTotal,
    obligationsTotal,
    categories,
    obligations,
    // Mirrors the pipeline rule (pipeline/aggregate.ts) so local dev without
    // serverless exercises the same disabled-pill path as production: the live
    // fiscal year has no meaningful execution data yet.
    measureAvailability: {
      adopted: true,
      modified: true,
      committed: year < currentFiscalYear(),
      cash_spent: year < currentFiscalYear(),
    },
    lastUpdated: "2026-06-22T08:00:00.000Z",
  };
}

/** Base FY2025 revenue (recognized) per source (dollars). */
const BASE_REVENUE: { id: string; name: string; adopted: number }[] = [
  { id: "city-sources", name: "City Sources", adopted: 74_000_000_000 },
  { id: "federal-sources", name: "Federal Sources", adopted: 9_800_000_000 },
  { id: "state-sources", name: "State Sources", adopted: 18_600_000_000 },
  { id: "other-sources", name: "Other Sources", adopted: 6_200_000_000 },
];

/** Build the revenue payload for a given fiscal year (Day 2 fleshes out the view). */
export function buildRevenuePayload(year: number): RevenuePayload {
  const scale = YEAR_SCALE[year] ?? 1;
  const sources: RevenueSource[] = BASE_REVENUE.map((r) => {
    const seed = `${r.id}-${year}`;
    const adopted = Math.round(r.adopted * scale * (1 + 0.02 * seededUnit(seed + "adp")));
    const modified = Math.round(adopted * (1.01 + 0.02 * seededUnit(seed + "mod")));
    const recognized = Math.round(modified * (0.96 + 0.05 * seededUnit(seed + "rec")));
    return { id: r.id, name: r.name, adopted, modified, recognized, shareOfTotal: 0 };
  });

  const totalAdopted = sources.reduce((s, r) => s + r.adopted, 0);
  const totalModified = sources.reduce((s, r) => s + r.modified, 0);
  const totalRecognized = sources.reduce((s, r) => s + r.recognized, 0);
  for (const r of sources) r.shareOfTotal = (r.recognized / totalRecognized) * 100;

  return {
    year,
    totalAdopted,
    totalModified,
    totalRecognized,
    sources,
    lastUpdated: "2026-06-22T08:00:00.000Z",
  };
}
