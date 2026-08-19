/**
 * Quick sanity check on what the seed wrote to Neon. Reads DATABASE_URL from
 * .env and prints the stored aggregates so we can confirm real (non-zero) data
 * landed. Usage: npm run check  [year]   (defaults to 2024)
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadDotEnv(path = ".env"): void {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* rely on ambient env */
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

async function main() {
  loadDotEnv();
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL not set in .env");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const year = Number(process.argv[2] ?? 2024);

  const rows = (await sql(
    `SELECT domain, payload FROM aggregates WHERE fiscal_year = $1 ORDER BY domain`,
    [year]
  )) as { domain: string; payload: any }[];

  if (!rows.length) {
    console.log(`No rows in 'aggregates' for FY${year}. The seed wrote nothing.`);
    process.exit(0);
  }

  for (const { domain, payload } of rows) {
    console.log(`\n=== ${domain.toUpperCase()} FY${year} ===`);
    if (domain === "spending") {
      const p = typeof payload === "string" ? JSON.parse(payload) : payload;
      console.log("Grand total (adopted):", fmt(p.fiscalYear?.adopted ?? 0));
      console.log("Services total:", fmt(p.servicesTotal?.adopted ?? 0));
      console.log("Obligations total:", fmt(p.obligationsTotal?.adopted ?? 0));
      console.log("Categories with $0 adopted:",
        (p.categories ?? []).filter((c: any) => !c.adopted).map((c: any) => c.name).join(", ") || "none");
      console.log("Top 3 categories:");
      [...(p.categories ?? [])]
        .sort((a: any, b: any) => b.adopted - a.adopted)
        .slice(0, 3)
        .forEach((c: any) => console.log(`  ${c.name}: ${fmt(c.adopted)} (YoY ${c.yoyPercent?.toFixed?.(1) ?? "n/a"}%)`));
    } else {
      const p = typeof payload === "string" ? JSON.parse(payload) : payload;
      console.log("Total adopted:   ", fmt(p.totalAdopted ?? 0));
      console.log("Total modified:  ", fmt(p.totalModified ?? 0));
      console.log("Total recognized:", fmt(p.totalRecognized ?? 0));
      (p.sources ?? []).forEach((s: any) =>
        console.log(`  ${s.name}: adopted ${fmt(s.adopted)} / recognized ${fmt(s.recognized)}`));
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ Check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
