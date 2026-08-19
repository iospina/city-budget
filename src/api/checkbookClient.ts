/**
 * Checkbook NYC request builder — SCAFFOLD ONLY (Day 1).
 *
 * This module encodes every verified API fact so the Day 2 pre-aggregation
 * pipeline (Vercel cron) is correct from the start. It does NOT call the live
 * API on Day 1. The client UI never touches this — it reads City Budget's own
 * /api layer (see ./index.ts). This runs server-side at ingestion time only.
 *
 * VERIFIED API FACTS (from the Checkbook NYC API Investigation):
 *  - Endpoint: POST https://www.checkbooknyc.com/api  (single endpoint, all domains)
 *  - Body is RAW XML and MUST begin directly with <request> — including the XML
 *    prolog (<?xml ...?>) makes the API return HTTP 200 with an EMPTY body.
 *  - Send NO Content-Type header (the API works without it; setting it can hurt).
 *  - Budget domain uses the `year` parameter; Spending and Revenue use `fiscal_year`.
 *  - agency_code must be zero-padded to exactly 3 chars (DOE = "040"). Bare
 *    sub-100 integers silently return 0 records; 4-char values error (code 1108).
 *  - Budget measures are nested: adopted/modified/committed inside <budget_amounts>,
 *    cash_expense inside <expenditure_amounts>. NOT flat siblings.
 *  - Measure -> column: Adopted=adopted, Modified=modified, Committed=committed,
 *    Cash Spent=cash_expense.
 *  - Max 20,000 records per call; paginate with records_from / max_records.
 *    DOHMH (816) exceeds 20k and requires pagination.
 *  - Throttle requests ~3s apart (Incapsula bot protection blocks rapid/parallel calls).
 */

export const CHECKBOOK_ENDPOINT = "https://www.checkbooknyc.com/api";
export const MAX_RECORDS_PER_CALL = 20_000;
export const THROTTLE_MS = 3_000; // ~3s between requests clears Incapsula

export type CheckbookDomain = "Budget" | "Spending" | "Revenue";

interface Criterion {
  name: string;
  value: string;
}

interface BuildRequestArgs {
  domain: CheckbookDomain;
  criteria: Criterion[];
  responseColumns: string[];
  recordsFrom?: number;
  maxRecords?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a Checkbook request body. NOTE: the returned string begins directly
 * with <request> — never prepend the XML prolog.
 *
 * The value MUST sit in a <value> element directly under <criteria> — the
 * <values><value>…</value></values> nesting parses but reads as empty (error 1102).
 */
export function buildRequestBody({
  domain,
  criteria,
  responseColumns,
  recordsFrom = 1,
  maxRecords = MAX_RECORDS_PER_CALL,
}: BuildRequestArgs): string {
  const criteriaXml = criteria
    .map(
      (c) =>
        `    <criteria><name>${escapeXml(c.name)}</name><type>value</type><value>${escapeXml(
          c.value
        )}</value></criteria>`
    )
    .join("\n");
  const columnsXml = responseColumns
    .map((col) => `    <column>${escapeXml(col)}</column>`)
    .join("\n");

  // Begins with <request> — no prolog.
  return `<request>
  <type_of_data>${domain}</type_of_data>
  <records_from>${recordsFrom}</records_from>
  <max_records>${maxRecords}</max_records>
  <search_criteria>
${criteriaXml}
  </search_criteria>
  <response_columns>
${columnsXml}
  </response_columns>
</request>`;
}

/** The fiscal-year criterion name differs by domain: Budget=`year`, others=`fiscal_year`. */
export function fiscalYearCriterionName(domain: CheckbookDomain): "year" | "fiscal_year" {
  return domain === "Budget" ? "year" : "fiscal_year";
}

/**
 * Build a per-agency Budget request for all four measures, correctly handling
 * the 3-char zero-padding requirement. Used by the Day 2 pipeline per agency
 * per fiscal year.
 */
export function buildAgencyBudgetRequest(
  paddedAgencyCode: string,
  year: number,
  recordsFrom = 1
): string {
  return buildRequestBody({
    domain: "Budget",
    criteria: [
      { name: "year", value: String(year) },
      { name: "agency_code", value: paddedAgencyCode }, // already 3-char padded
    ],
    responseColumns: [
      "agency",
      "expense_category",
      "adopted",
      "modified",
      "committed",
      "cash_expense",
    ],
    recordsFrom,
  });
}

/**
 * Day 2 fetch wrapper (intentionally not implemented on Day 1).
 * When implemented: POST with NO Content-Type header, throttle THROTTLE_MS
 * between calls, paginate when record_count > MAX_RECORDS_PER_CALL, parse the
 * nested <budget_amounts>/<expenditure_amounts> wrappers.
 */
export async function fetchCheckbook(_body: string): Promise<never> {
  throw new Error(
    "fetchCheckbook is a Day 2 task. The Day 1 build serves mock data from City Budget's own /api layer."
  );
}
