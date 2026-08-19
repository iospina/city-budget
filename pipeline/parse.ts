import { XMLParser } from "fast-xml-parser";

/**
 * Checkbook NYC response parsing.
 *
 * Budget responses nest adopted/modified/committed inside <budget_amounts> and
 * cash_expense inside <expenditure_amounts> — NOT flat siblings. Spending and
 * Revenue responses are flat. Empty fields come back as self-closing tags.
 * result_records.transaction is a single object when one record matches and an
 * array when many; we normalize to an array either way.
 */

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep raw strings; we coerce money fields ourselves
  trimValues: true,
});

function toNumber(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export interface BudgetRecord {
  agency: string;
  expense_category: string;
  adopted: number;
  modified: number;
  committed: number;
  cash_expense: number;
}

export interface RevenueRecord {
  agency: string;
  funding_class: string;
  revenue_category: string;
  revenue_class: string;
  revenue_source: string;
  adopted: number;
  modified: number;
  recognized: number;
}

interface CheckbookEnvelope {
  response?: {
    status?: { result?: string };
    record_count?: string | number;
    result_records?: Record<string, unknown>;
  };
}

/**
 * Pull the transaction array out of <result_records>. The REAL API wraps records
 * in a domain-specific element — <budget_transactions>, <spending_transactions>,
 * or <revenue_transactions> — each containing <transaction> children. (The API
 * Investigation doc's samples were simplified and showed <transaction> directly
 * under <result_records>; we handle both shapes.)
 */
function extractTransactions(rr: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!rr || typeof rr !== "object") return [];
  // Documented (flat) shape.
  if ("transaction" in rr) return asArray(rr.transaction) as Record<string, unknown>[];
  // Real shape: a "<domain>_transactions" wrapper holding <transaction>.
  for (const [key, value] of Object.entries(rr)) {
    if (
      key.endsWith("transactions") &&
      value &&
      typeof value === "object" &&
      "transaction" in (value as Record<string, unknown>)
    ) {
      return asArray((value as Record<string, unknown>).transaction) as Record<
        string,
        unknown
      >[];
    }
  }
  return [];
}

/** Read record_count and a normalized transaction array from any response. */
export function readEnvelope(xml: string): {
  ok: boolean;
  recordCount: number;
  transactions: Record<string, unknown>[];
} {
  if (!xml || !xml.trim()) {
    // The empty-body symptom of an accidental XML prolog (see API Investigation).
    return { ok: false, recordCount: 0, transactions: [] };
  }
  const parsed = parser.parse(xml) as CheckbookEnvelope;
  const response = parsed.response;
  const ok = response?.status?.result === "success";
  const rr = response?.result_records;
  // record_count lives inside <result_records> on the real API; fall back to the
  // top level for the documented shape.
  const recordCount = toNumber(
    (rr?.record_count as string | number | undefined) ?? response?.record_count
  );
  const transactions = extractTransactions(rr);
  return { ok, recordCount, transactions };
}

/** Parse a Budget-domain response, flattening the nested amount wrappers. */
export function parseBudgetResponse(xml: string): BudgetRecord[] {
  const { transactions } = readEnvelope(xml);
  return transactions.map((t) => {
    const budget = (t.budget_amounts ?? {}) as Record<string, unknown>;
    const exp = (t.expenditure_amounts ?? {}) as Record<string, unknown>;
    return {
      agency: String(t.agency ?? ""),
      expense_category: String(t.expense_category ?? ""),
      adopted: toNumber(budget.adopted),
      modified: toNumber(budget.modified),
      committed: toNumber(budget.committed),
      cash_expense: toNumber(exp.cash_expense),
    };
  });
}

/** Parse a Revenue-domain response (flat columns). */
export function parseRevenueResponse(xml: string): RevenueRecord[] {
  const { transactions } = readEnvelope(xml);
  return transactions.map((t) => ({
    agency: String(t.agency ?? ""),
    funding_class: String(t.funding_class ?? ""),
    revenue_category: String(t.revenue_category ?? ""),
    revenue_class: String(t.revenue_class ?? ""),
    revenue_source: String(t.revenue_source ?? ""),
    adopted: toNumber(t.adopted),
    modified: toNumber(t.modified),
    recognized: toNumber(t.recognized),
  }));
}
