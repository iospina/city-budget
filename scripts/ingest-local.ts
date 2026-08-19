/**
 * Local seed runner. Runs the full Checkbook ingestion from your own machine
 * (residential IP, free to throttle) and writes the aggregates to Neon Postgres.
 *
 * Why local: the full pull is ~80 agencies × 5 years throttled ~3s apart, which
 * far exceeds any Vercel function timeout, and a home connection is far more
 * likely to clear Checkbook's Incapsula bot-protection than a datacenter IP.
 *
 * Usage:
 *   1. Put your Neon connection string in .env as DATABASE_URL=...
 *   2. npm run ingest            (all years)
 *      npm run ingest -- 2025    (a single year, e.g. for a quick test)
 *
 * This takes several minutes for all five years (the throttle is deliberate).
 * Re-running is safe — it upserts.
 */
import { readFileSync } from "node:fs";
import { ensureSchema, readAggregate } from "../pipeline/db";
import {
  ingestRevenueYear,
  ingestSpendingYear,
  prevTotalsFromCategories,
} from "../pipeline/ingest";
import { ingestYears } from "../src/lib/fiscalYears";
import type { ServiceCategoryId } from "../src/types";

type CatAdopted = { id: ServiceCategoryId; adopted: number };

/** Category adopted totals already stored for a year, or null if not seeded. */
async function seededCategories(year: number): Promise<CatAdopted[] | null> {
  const row = await readAggregate("spending", year);
  if (!row) return null;
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : (row.payload as any);
  return (payload.categories ?? []).map((c: any) => ({ id: c.id, adopted: c.adopted }));
}

// Minimal .env loader (no dependency): only sets keys not already in the env.
function loadDotEnv(path = ".env"): void {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // no .env file — rely on the ambient environment
  }
}

async function main() {
  loadDotEnv();
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL is not set. Add it to .env (Neon connection string).");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const revenueOnly = args.includes("--revenue-only");
  const yearArg = args.find((a) => /^\d{4}$/.test(a));
  // A specific year is always (re)ingested; the all-years run resumes by skipping
  // years already fully seeded (unless --force).
  const years = yearArg
    ? [Number(yearArg)]
    : ingestYears(); // oldest -> newest, derived from the clock (Section 12)
  const allowSkip = !yearArg && !force;

  console.log(`Seeding Neon for fiscal year(s): ${years.join(", ")}`);
  console.log("This is throttled ~3s per Checkbook call and may take several minutes...");
  console.log("Resumable: already-seeded years are skipped (pass --force to redo).\n");

  await ensureSchema();

  let prev: CatAdopted[] | null = null;
  for (const year of years) {
    if (revenueOnly) {
      // Re-pull only revenue (spending is unaffected by the revenue fix).
      process.stdout.write(`FY${year}: revenue... `);
      await ingestRevenueYear(year);
      console.log("done.");
      continue;
    }
    if (allowSkip) {
      const existing = await seededCategories(year);
      const haveRevenue = await readAggregate("revenue", year);
      if (existing && haveRevenue) {
        prev = existing; // keep the YoY chain intact
        console.log(`FY${year}: already seeded, skipping.`);
        continue;
      }
    }
    // If we have no prior-year basis in hand (e.g. a single-year re-seed), read
    // the prior year from the DB so year-over-year compares to the right year.
    if (!prev) prev = await seededCategories(year - 1);

    process.stdout.write(`FY${year}: revenue... `);
    await ingestRevenueYear(year);
    process.stdout.write("spending... ");
    prev = await ingestSpendingYear(
      year,
      prev ? prevTotalsFromCategories(prev) : undefined
    );
    console.log("done.");
  }

  console.log("\n✓ Seed complete. Set DATABASE_URL in Vercel and the /api endpoints will serve this data.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Ingestion failed:", err instanceof Error ? err.message : err);
  console.error(
    "If this is an empty-body or 403/Incapsula error, the endpoint may be rate-limiting; " +
      "wait a minute and retry, or seed one year at a time (npm run ingest -- 2025)."
  );
  process.exit(1);
});
