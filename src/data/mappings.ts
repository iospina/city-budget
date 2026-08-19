/**
 * Field-to-Label Mappings (final). Source: Notion "Field-to-Label Mappings".
 *
 * Two parts: the spending-type rule set (expense_category -> one of six types,
 * or route-to-Obligations) and the revenue-source mapping (funding_class -> one
 * of four sources). Consumed by the Day 2 pre-aggregation pipeline; kept here
 * now in one config so future-year values classify automatically.
 */

export type SpendingType =
  | "personal-services"
  | "contractual-services"
  | "supplies"
  | "property-and-equipment"
  | "grants-and-benefit-payments"
  | "other-than-personal-services";

export const SPENDING_TYPE_LABELS: Record<SpendingType, string> = {
  "personal-services": "Personal Services",
  "contractual-services": "Contractual Services",
  supplies: "Supplies",
  "property-and-equipment": "Property and Equipment",
  "grants-and-benefit-payments": "Grants and Benefit Payments",
  "other-than-personal-services": "Other than Personal Services",
};

/** Special sentinel: expense_category routes out to Citywide Obligations. */
export const ROUTE_TO_OBLIGATIONS = "route-to-obligations" as const;

/**
 * Ordered classification rules (first match wins, case-insensitive).
 * Order is deliberate: Obligations first (pension/debt never miscatch), then
 * Personal Services, then Grants/Benefits (before Property/Supplies/Contractual
 * so delegate-agency and benefit lines are not pulled into Contractual by a
 * stray CONTRACT token), then Property (before Supplies/Contractual), Supplies,
 * Contractual, and finally Other as the catch-all.
 */
export const SPENDING_TYPE_RULES: {
  type: SpendingType | typeof ROUTE_TO_OBLIGATIONS;
  tokens: string[];
}[] = [
  {
    type: ROUTE_TO_OBLIGATIONS,
    tokens: [
      "PENSION", "RETIRE", "ACTUARIAL", "ANNUITY", "HEALTH INSURANCE",
      "SOCIAL SECURITY", "FRINGE", "WELFARE BEN", "UNEMPLOYMENT INS",
      "DISABILITY BENEFIT", "TIAA", "INTEREST ON BONDS", "INTEREST ON NOTES",
      "REDEMPTION", "SERIAL BONDS", "DEBT SRVCE", "DEBT SERVICE", "FINANCING",
      "COMMITMENT FEE", "COUNTERPARTIES", "SALES TAX ALLOCATED TO MAC",
      "OPERATION EXPENDITURES MAC", "REBATE ON INTEREST", "SUPPLEMENTAL PENSION",
    ],
  },
  {
    type: "personal-services",
    tokens: [
      "POSITIONS", "PERSONNEL", "PRSONNEL", "SALAR", "WAGES", "OVERTIME",
      "DIFFERENTIAL", "PER SESSION", "TERMINAL LEAVE", "BONUS", "BACKPAY",
      "HOLIDAY PAY", "LONGEVITY", "UNSALARIED", "GROSS HOLDING",
      "SEASONAL POSITIONS", "PART-TIME POSITIONS", "NEW POSITIONS", "SEVERANCE",
      "PAYROLL", "DEFERRED WAGES", "DEF WAGES", "ALLOWANCE FOR UNIFORMS",
      "CUSTODIAL ALLOWANCES", "SUPPER MONEY", "-PS", "JTPA-WAGES", "DAILY",
      "MONTHLY", "VOLUNTARY VACATION", "NON-PENSIONABLE-PREPARATION",
    ],
  },
  {
    type: "grants-and-benefit-payments",
    tokens: [
      "MEDICAL ASSISTANCE", "ASSISTANCE", "HOME RELIEF", "AID TO DEPENDENT",
      "DEPENDENT CHILDREN", "FOSTER CARE", "CHILD WELFARE", "ADOPTION",
      "HEAD START", "DAY CARE", "HOMELESS", "AIDS SERVICES", "PUBLIC ASSISTANCE",
      "REDUCED FARE", "RENTAL ASSISTANCE", "SHELTER", "BURIAL",
      "EMERGENCY ASSISTANCE", "ALLOWANCES TO PARTICIPANTS", "DELEGATE AGENCIES",
      "COMMUNITY CONSULTANT", "LEGAL AID", "PAYMENTS TO LIBRARIES",
      "PAYMENTS TO CULTURAL", "CULTURAL INSTITUT", "PAYMENTS TO HHC",
      "PAY TO METRO TRANSPORT", "MTA FOR STATION", "PAY TO NYC HOUSING",
      "PAYMENTS TO DELEGATE", "GRANTS", "SUBSIDY", "SUBSIDIES",
    ],
  },
  {
    type: "property-and-equipment",
    tokens: [
      "EQUIPMENT", "EQUIP", "FURNITURE", "FURITURE", "MOTOR VEHICLE",
      "CONSTRUCTION", "LAND ACQUISITION", "LEASEHOLD IMP",
      "IMPROVEMENTS OTHER THAN BLDGS", "MACHINERY", "KITCHEN UTENSILS",
    ],
  },
  {
    type: "supplies",
    tokens: [
      "SUPPLIES", "MATERIALS", "FOOD", "FORAGE", "FUEL", "BOOKS",
      "TESTING MATERIALS", "AUDIO VISUAL SUPPLIES", "MEDICAL,SURGICAL & LAB SUPPLY",
    ],
  },
  {
    type: "contractual-services",
    tokens: [
      "PROF SERV", "PROFESSIONAL", "CONTRACTUAL", "CONTRACT", "MAINT & REP",
      "MAINT & OPER", "MAINTENANCE", "REPAIR", "TELEPHONE", "COMMUNICATN",
      "COMMUNICATIONS", "TELECOMMUNICATIONS", "POSTAGE", "PRINTING",
      "ADVERTISING", "TRAINING", "CLEANING SERVICES", "SECURITY SERVICES",
      "SNOW REMOVAL", "DATA PROCESSING SERVICES", "OFFICE SERVICES",
      "TEMPORARY SERVICE", "EVALUATION SERVICES", "RESEARCH & EVALU",
    ],
  },
  // Everything else falls through to "other-than-personal-services".
];

/**
 * Classify a raw expense_category string. Returns a SpendingType or the
 * ROUTE_TO_OBLIGATIONS sentinel. Day 2 pipeline calls this per line item.
 */
export function classifyExpenseCategory(
  raw: string
): SpendingType | typeof ROUTE_TO_OBLIGATIONS {
  const upper = raw.toUpperCase();
  for (const rule of SPENDING_TYPE_RULES) {
    if (rule.tokens.some((t) => upper.includes(t))) return rule.type;
  }
  return "other-than-personal-services";
}

/** Revenue-source mapping: funding_class -> one of four resident-facing sources. */
export const REVENUE_SOURCE_MAP: { label: string; fundingClasses: string[] }[] = [
  { label: "City Sources", fundingClasses: ["CITY FUNDS"] },
  { label: "State Sources", fundingClasses: ["STATE", "UNRESTRICTED FEDERAL AND STATE AID"] },
  { label: "Federal Sources", fundingClasses: ["FEDERAL - CD", "FEDERAL - OTHER"] },
  {
    label: "Other Sources",
    fundingClasses: ["CAPITAL FUNDS - I.F.A.", "INTRA-CITY SALES", "OTHER CATEGORICAL"],
  },
];

/** Map a funding_class (case-insensitive) to its resident-facing source label. */
export function mapFundingClass(fundingClass: string): string {
  const upper = fundingClass.trim().toUpperCase();
  for (const src of REVENUE_SOURCE_MAP) {
    if (src.fundingClasses.some((fc) => fc.toUpperCase() === upper)) return src.label;
  }
  return "Other Sources";
}
