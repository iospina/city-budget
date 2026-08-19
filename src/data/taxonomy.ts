import type { ServiceCategoryId } from "../types";

/**
 * Agency-to-Service-Category taxonomy (verified, FY2024).
 * Source: Notion "Agency to Service Category Taxonomy" page.
 *
 * HARD REQUIREMENT: agency_code must be a 3-character zero-padded string when
 * sent to Checkbook. Bare integers below 100 silently return zero records
 * (this was the apparent "DOE failure" — DOE is 040, not 40). Use padAgencyCode().
 *
 * This config is consumed by the Day 2 pre-aggregation pipeline. It is included
 * now so the real pipeline is correct on Day 1's foundation.
 */

export interface AgencyEntry {
  code: number;
  name: string;
  category: ServiceCategoryId;
}

/** Pad an agency code to exactly 3 characters (e.g. 40 -> "040", 816 -> "816"). */
export function padAgencyCode(code: number): string {
  return String(code).padStart(3, "0");
}

/** Agency codes confirmed defunct ($0 in FY2024) — excluded from all rollups. */
export const DEFUNCT_CODES: ReadonlySet<number> = new Set([94, 817, 130]);

/** Agencies whose record count can exceed the 20,000-per-call cap (need pagination). */
export const PAGINATION_REQUIRED_CODES: ReadonlySet<number> = new Set([816]);

export const AGENCY_TAXONOMY: AgencyEntry[] = [
  // Education — systemYellow (libraries live here)
  { code: 40, name: "Department of Education", category: "education" },
  { code: 42, name: "City University of New York", category: "education" },
  { code: 35, name: "New York Research Libraries", category: "education" },
  { code: 37, name: "New York Public Library", category: "education" },
  { code: 38, name: "Brooklyn Public Library", category: "education" },
  { code: 39, name: "Queens Borough Public Library", category: "education" },

  // Health and Hospitals — systemRed
  { code: 816, name: "Department of Health and Mental Hygiene", category: "health-and-hospitals" },
  { code: 817, name: "Department of Mental Health", category: "health-and-hospitals" }, // defunct
  { code: 819, name: "Health and Hospitals Corporation", category: "health-and-hospitals" },

  // Public Safety — systemIndigo
  { code: 56, name: "Police Department", category: "public-safety" },
  { code: 57, name: "Fire Department", category: "public-safety" },
  { code: 72, name: "Department of Correction", category: "public-safety" },
  { code: 73, name: "Board of Correction", category: "public-safety" },
  { code: 17, name: "Department of Emergency Management", category: "public-safety" },
  { code: 781, name: "Department of Probation", category: "public-safety" },
  { code: 128, name: "Office of Criminal Justice", category: "public-safety" },
  { code: 130, name: "Department of Juvenile Justice", category: "public-safety" }, // defunct
  { code: 901, name: "District Attorney - New York County", category: "public-safety" },
  { code: 902, name: "District Attorney - Bronx County", category: "public-safety" },
  { code: 903, name: "District Attorney - Kings County", category: "public-safety" },
  { code: 904, name: "District Attorney - Queens County", category: "public-safety" },
  { code: 905, name: "District Attorney - Richmond County", category: "public-safety" },
  { code: 906, name: "Office of Prosecution - Special Narcotics", category: "public-safety" },

  // Social Services — systemPurple
  { code: 69, name: "Department of Social Services", category: "social-services" },
  { code: 68, name: "Administration for Children's Services", category: "social-services" },
  { code: 71, name: "Department of Homeless Services", category: "social-services" },
  { code: 125, name: "Department for the Aging", category: "social-services" },
  { code: 260, name: "Department of Youth and Community Development", category: "social-services" },
  { code: 63, name: "Department of Veterans' Services", category: "social-services" },

  // Transportation — systemBlue
  { code: 841, name: "Department of Transportation", category: "transportation" },
  { code: 156, name: "NYC Taxi and Limousine Commission", category: "transportation" },

  // Environment and Water — systemCyan
  { code: 826, name: "Department of Environmental Protection", category: "environment-and-water" },

  // Housing and Buildings — systemBrown
  { code: 806, name: "Housing Preservation and Development", category: "housing-and-buildings" },
  { code: 810, name: "Department of Buildings", category: "housing-and-buildings" },
  { code: 30, name: "Department of City Planning", category: "housing-and-buildings" },
  { code: 136, name: "Landmarks Preservation Commission", category: "housing-and-buildings" },

  // Sanitation — systemGreen
  { code: 827, name: "Department of Sanitation", category: "sanitation" },

  // Parks and Recreation — systemMint
  { code: 846, name: "Department of Parks and Recreation", category: "parks-and-recreation" },

  // Other Services — systemOrange (governance, admin, oversight, culture, local gov)
  { code: 2, name: "Mayoralty", category: "other-services" },
  { code: 15, name: "Office of the Comptroller", category: "other-services" },
  { code: 101, name: "Public Advocate", category: "other-services" },
  { code: 102, name: "City Council", category: "other-services" },
  { code: 103, name: "City Clerk", category: "other-services" },
  { code: 10, name: "Borough President - Manhattan", category: "other-services" },
  { code: 11, name: "Borough President - Bronx", category: "other-services" },
  { code: 12, name: "Borough President - Brooklyn", category: "other-services" },
  { code: 13, name: "Borough President - Queens", category: "other-services" },
  { code: 14, name: "Borough President - Staten Island", category: "other-services" },
  { code: 3, name: "Board of Elections", category: "other-services" },
  { code: 4, name: "Campaign Finance Board", category: "other-services" },
  { code: 138, name: "Districting Commission", category: "other-services" },
  { code: 836, name: "Department of Finance", category: "other-services" },
  { code: 856, name: "Department of Citywide Administrative Services", category: "other-services" },
  { code: 858, name: "Department of Information Technology and Telecommunications", category: "other-services" },
  { code: 860, name: "Department of Records and Information Services", category: "other-services" },
  { code: 127, name: "Financial Information Services Agency", category: "other-services" },
  { code: 131, name: "Office of Payroll Administration", category: "other-services" },
  { code: 8, name: "Office of the Actuary", category: "other-services" },
  { code: 850, name: "Department of Design and Construction", category: "other-services" },
  { code: 25, name: "Law Department", category: "other-services" },
  { code: 32, name: "Department of Investigation", category: "other-services" },
  { code: 54, name: "Civilian Complaint Review Board", category: "other-services" },
  { code: 21, name: "Office of Administrative Tax Appeals", category: "other-services" },
  { code: 820, name: "Office of Administrative Trials and Hearings", category: "other-services" },
  { code: 132, name: "Independent Budget Office", category: "other-services" },
  { code: 133, name: "Equal Employment Practices Commission", category: "other-services" },
  { code: 134, name: "Civil Service Commission", category: "other-services" },
  { code: 312, name: "Conflicts of Interest Board", category: "other-services" },
  { code: 313, name: "Office of Collective Bargaining", category: "other-services" },
  { code: 226, name: "Commission on Human Rights", category: "other-services" },
  { code: 213, name: "Office of Racial Equity", category: "other-services" },
  { code: 215, name: "Commission on Racial Equity", category: "other-services" },
  { code: 829, name: "Business Integrity Commission", category: "other-services" },
  { code: 866, name: "Department of Consumer and Worker Protection", category: "other-services" },
  { code: 801, name: "Department of Small Business Services", category: "other-services" },
  { code: 126, name: "Department of Cultural Affairs", category: "other-services" },
  // Community Boards (341–352, 381–392, 431–444, 471–488, 491–493) and
  // Public Administrators (941–945) also map to other-services; ranges are
  // expanded programmatically in the Day 2 pipeline rather than enumerated here.
];

/** Lookup: agency code -> taxonomy entry. */
export const AGENCY_BY_CODE: Record<number, AgencyEntry> = Object.fromEntries(
  AGENCY_TAXONOMY.map((a) => [a.code, a])
);

/**
 * Citywide Obligations routing (Section 13b). These roll up to the Obligations
 * block, NOT any service category. Coded lines filter by agency_code; the
 * non-coded adjustment/PEG lines are captured by name from the unfiltered pull.
 */
export const OBLIGATION_CODES: Record<number, string> = {
  99: "Debt Service",
  100: "MAC Debt Service Funding",
  95: "Pension Contributions",
  98: "Miscellaneous", // contains fringe benefits, health insurance, citywide costs
};

/** Resident-facing Obligations display groups (Section 13b). */
export const OBLIGATION_DISPLAY_GROUPS = [
  "Debt Service",
  "Pension Contributions",
  "Fringe Benefits",
  "Reserves and Other", // folds in Energy/Lease Adjustment, PEGs, General Reserve, etc.
] as const;
