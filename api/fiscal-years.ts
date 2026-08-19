import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DISPLAY_YEAR_LIMIT } from "../src/lib/fiscalYears";

/**
 * GET /api/fiscal-years — the fiscal years that have pre-aggregated data,
 * most recent first. Self-contained with full error capture (see api/spending.ts).
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return res.status(500).json({ error: "DATABASE_URL not set" });

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    // Section 12: offer the five most recent years. Older years stay in the
    // table because year-over-year for the oldest displayed year is computed at
    // ingest time against its predecessor.
    const rows = (await sql(
      `SELECT DISTINCT fiscal_year FROM aggregates ORDER BY fiscal_year DESC LIMIT ${DISPLAY_YEAR_LIMIT}`
    )) as { fiscal_year: number }[];

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(rows.map((r) => r.fiscal_year));
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
