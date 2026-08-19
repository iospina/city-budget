import type { Measure, RevenueMeasure, ServiceCategoryId } from "../types";

/**
 * Locked design-system tokens (Implementation Brief Section 8).
 * Colors/icons here are the single source of truth for category identity.
 */

export interface CategoryToken {
  id: ServiceCategoryId;
  name: string;
  systemColorName: string;
  color: string;
  icon: string; // Material Symbol (Rounded)
}

/** Ten categories, in the locked display order. */
export const CATEGORY_TOKENS: CategoryToken[] = [
  { id: "education", name: "Education", systemColorName: "systemYellow", color: "#FFCC00", icon: "school" },
  { id: "health-and-hospitals", name: "Health and Hospitals", systemColorName: "systemPink", color: "#FF2D55", icon: "favorite" },
  { id: "public-safety", name: "Public Safety", systemColorName: "systemIndigo", color: "#5856D6", icon: "shield" },
  { id: "social-services", name: "Social Services", systemColorName: "systemPurple", color: "#AF52DE", icon: "people" },
  { id: "transportation", name: "Transportation", systemColorName: "systemBlue", color: "#007AFF", icon: "directions_subway" },
  { id: "environment-and-water", name: "Environment and Water", systemColorName: "systemCyan", color: "#32ADE6", icon: "water_drop" },
  { id: "housing-and-buildings", name: "Housing and Buildings", systemColorName: "systemBrown", color: "#A2845E", icon: "apartment" },
  { id: "sanitation", name: "Sanitation", systemColorName: "systemGreen", color: "#34C759", icon: "recycling" },
  { id: "parks-and-recreation", name: "Parks and Recreation", systemColorName: "systemMint", color: "#00C7BE", icon: "park" },
  { id: "other-services", name: "Other Services", systemColorName: "systemOrange", color: "#FF9500", icon: "category" },
];

export const CATEGORY_BY_ID: Record<ServiceCategoryId, CategoryToken> =
  Object.fromEntries(CATEGORY_TOKENS.map((c) => [c.id, c])) as Record<
    ServiceCategoryId,
    CategoryToken
  >;

/**
 * Identity treatment per view.
 *  - color:     the full identity fill (bars, active pills, share band).
 *  - textColor: identity color when used as TEXT. Pink reads fine as text;
 *               systemGreen is too light, so revenue text uses a darker green.
 *  - tint20:    20% opacity of the identity color — the inactive measure-pill fill.
 */
export const IDENTITY = {
  spending: {
    color: "#FF2D55",
    textColor: "#FF2D55",
    tint20: "rgba(255, 45, 85, 0.2)",
    systemColorName: "systemPink",
    label: "SPENDING",
  },
  revenue: {
    color: "#34C759",
    textColor: "#008932",
    tint20: "rgba(52, 199, 89, 0.2)",
    systemColorName: "systemGreen",
    label: "REVENUE",
  },
} as const;

/** Part-to-whole bar track color (Section 15). */
export const TRACK_COLOR = "#D0D0D0";

/** Two-tier bar heights (Section 15). */
export const BAR_HEIGHT = {
  summary: 12, // Services/Obligations split + ten-category proportion bar
  row: 6, // category rows + obligation lines
} as const;

/** Minimum stacked-proportion-bar segment width (Section 15). */
export const MIN_SEGMENT_WIDTH = 14; // px, within the 12–16px locked range

/** Spending measures: four pills (build-fix #4). */
export const SPENDING_MEASURES: { id: Measure; label: string }[] = [
  { id: "adopted", label: "Adopted" },
  { id: "modified", label: "Modified" },
  { id: "committed", label: "Committed" },
  { id: "cash_spent", label: "Cash Spent" },
];

/** Revenue measures: three pills only (build-fix #4). */
export const REVENUE_MEASURES: { id: RevenueMeasure; label: string }[] = [
  { id: "adopted", label: "Adopted" },
  { id: "modified", label: "Modified" },
  { id: "recognized", label: "Recognized" },
];

/** Sublabel for the hero card per active measure (Section 19 copy rules). */
export const MEASURE_SUBLABEL: Record<Measure, string> = {
  adopted: "Total Adopted Spending",
  modified: "Total Modified Spending",
  committed: "Total Committed Spending",
  cash_spent: "Total Cash Spent",
};

/** Revenue hero sublabel per active revenue measure (Section 19 copy rules). */
export const REVENUE_MEASURE_SUBLABEL: Record<RevenueMeasure, string> = {
  adopted: "Total Adopted Revenue",
  modified: "Total Modified Revenue",
  recognized: "Total Recognized Revenue",
};
