import { neon } from "@neondatabase/serverless";

/**
 * Postgres (Neon) access for the pre-aggregated objects (Section 6 step 9).
 *
 * The client reads ONLY these aggregated objects, never Checkbook directly.
 * Schema is deliberately simple: one row per (domain, fiscal_year) holding the
 * finished aggregate as JSONB plus a last-updated timestamp. This matches the
 * shape the client already consumes (SpendingPayload / RevenuePayload).
 *
 * Requires env: DATABASE_URL (Neon connection string). Wire this in Vercel
 * Project Settings -> Environment Variables before enabling the cron.
 */

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (Neon connection string).");
  return neon(url);
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS aggregates (
  domain       TEXT NOT NULL,                 -- 'spending' | 'revenue'
  fiscal_year  INTEGER NOT NULL,
  payload      JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, fiscal_year)
);
`;

export async function ensureSchema(): Promise<void> {
  await sql()(SCHEMA);
}

export async function writeAggregate(
  domain: "spending" | "revenue",
  fiscalYear: number,
  payload: unknown
): Promise<void> {
  const db = sql();
  await db(
    `INSERT INTO aggregates (domain, fiscal_year, payload, last_updated)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (domain, fiscal_year)
     DO UPDATE SET payload = EXCLUDED.payload, last_updated = now()`,
    [domain, fiscalYear, JSON.stringify(payload)]
  );
}

export async function readAggregate(
  domain: "spending" | "revenue",
  fiscalYear: number
): Promise<{ payload: unknown; lastUpdated: string } | null> {
  const db = sql();
  const rows = (await db(
    `SELECT payload, last_updated FROM aggregates WHERE domain = $1 AND fiscal_year = $2`,
    [domain, fiscalYear]
  )) as { payload: unknown; last_updated: string }[];
  if (!rows.length) return null;
  return { payload: rows[0].payload, lastUpdated: rows[0].last_updated };
}

export async function availableFiscalYears(): Promise<number[]> {
  const db = sql();
  const rows = (await db(
    `SELECT DISTINCT fiscal_year FROM aggregates ORDER BY fiscal_year DESC`
  )) as { fiscal_year: number }[];
  return rows.map((r) => r.fiscal_year);
}
