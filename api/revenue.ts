import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/revenue?year=YYYY — pre-aggregated RevenuePayload from Postgres.
 * Self-contained with full error capture (see api/spending.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const year = Number(req.query.year);
    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "year query param required" });
    }
    const url = process.env.DATABASE_URL;
    if (!url) return res.status(500).json({ error: "DATABASE_URL not set" });

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = (await sql(
      `SELECT payload FROM aggregates WHERE domain = 'revenue' AND fiscal_year = $1`,
      [year]
    )) as { payload: unknown }[];

    if (!rows.length) return res.status(404).json({ error: `no revenue data for ${year}` });
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(rows[0].payload);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
