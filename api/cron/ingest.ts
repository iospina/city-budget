import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureSchema } from "../../pipeline/db";
import {
  ingestRevenueYear,
  ingestSpendingYear,
  prevTotalsFromCategories,
} from "../../pipeline/ingest";
import { MOCK_FISCAL_YEARS } from "../../src/data/mockData";
import type { ServiceCategoryId } from "../../src/types";

/**
 * Vercel cron handler (Section 7 #5). Runs daily, pulls the in-scope fiscal
 * years from Checkbook, pre-aggregates, and writes to Postgres. Mirrors the
 * City Permits DOB-NOW pull pattern.
 *
 * Mechanics handled downstream: ≈3s throttle between Checkbook calls (Incapsula),
 * pagination past the 20k cap, 3-char zero-padded agency codes, Budget `year` vs
 * Revenue `fiscal_year`.
 *
 * Schedule is configured in vercel.json. Protect manual invocation with
 * CRON_SECRET (Vercel sets the Authorization: Bearer header on scheduled runs).
 *
 * NOTE: not active until DATABASE_URL is wired in Vercel env. Until then the
 * client serves mock data from src/api. Flip the client read layer to the HTTP
 * endpoints below once a run has populated the table.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const years = [...MOCK_FISCAL_YEARS].sort((a, b) => a - b); // oldest -> newest for YoY chaining
  try {
    await ensureSchema();

    let prevCategories: { id: ServiceCategoryId; adopted: number }[] | null = null;
    const done: number[] = [];

    for (const year of years) {
      await ingestRevenueYear(year);
      // ingestSpendingYear returns this year's category adopted totals, chained
      // forward as the next year's adopted-to-adopted YoY basis.
      prevCategories = await ingestSpendingYear(
        year,
        prevCategories ? prevTotalsFromCategories(prevCategories) : undefined
      );
      done.push(year);
    }

    return res.status(200).json({ ok: true, ingested: done });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "ingestion failed",
    });
  }
}
