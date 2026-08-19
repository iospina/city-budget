import type { RevenuePayload, ServiceCategoryId, SpendingPayload } from "../types";
import {
  buildRevenuePayload,
  buildSpendingPayload,
} from "../data/mockData";
import { CATEGORY_BY_ID } from "../lib/tokens";
import { displayYears } from "../lib/fiscalYears";
import { computeMeasureAvailability } from "../lib/measureAvailability";
import { grandTotalFor } from "../lib/selectors";

/**
 * Color, icon, and name are DESIGN TOKENS, not data — they belong to the client,
 * not the pre-aggregated payload. The pipeline stamps them at ingest time, so a
 * design change (e.g. Health and Hospitals red -> pink) would otherwise require a
 * re-seed. Re-applying them by category id here means design tweaks take effect
 * on the next deploy with no re-ingestion.
 */
/**
 * Recompute per-measure availability from the payload's own grand totals.
 *
 * Done here rather than trusted from storage for two reasons: years aggregated
 * before the field existed carry no value, and the threshold is a presentation
 * judgement that should be changeable by deploying rather than by re-running a
 * multi-minute ingestion.
 */
function applyMeasureAvailability(payload: SpendingPayload): SpendingPayload {
  payload.measureAvailability = computeMeasureAvailability({
    adopted: grandTotalFor(payload, "adopted"),
    modified: grandTotalFor(payload, "modified"),
    committed: grandTotalFor(payload, "committed"),
    cash_spent: grandTotalFor(payload, "cash_spent"),
  });
  return payload;
}

function applyDesignTokens(payload: SpendingPayload): SpendingPayload {
  for (const c of payload.categories) {
    const token = CATEGORY_BY_ID[c.id as ServiceCategoryId];
    if (token) {
      c.color = token.color;
      c.icon = token.icon;
      c.name = token.name;
    }
  }
  return payload;
}

/**
 * City Budget's OWN lightweight API layer.
 *
 * UI components fetch from here and NEVER from Checkbook directly (Section 9).
 *
 * Behavior: try City Budget's `/api/*` endpoints first (pre-aggregated data from
 * Postgres, populated by the local seed run or the cron). If those are not
 * available yet — local dev with no serverless, or an unseeded database — fall
 * back to mock data shaped exactly like the real aggregates. This makes the
 * deployed app switch to real data automatically once Neon is seeded, with no
 * further code change, and keeps the app rendering before then.
 */

const SIMULATED_LATENCY_MS = 180;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Try a City Budget API endpoint; return null on any failure (so we can fall back). */
async function tryApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // no serverless in local dev, network error, etc.
  }
}

/** GET /api/fiscal-years — available years, most recent first. */
export async function getFiscalYears(): Promise<number[]> {
  const live = await tryApi<number[]>("/api/fiscal-years");
  if (live && live.length > 0) return live;
  return delay(displayYears(), 60);
}

/** GET /api/spending?year=YYYY — aggregated spending payload. */
export async function getSpending(year: number): Promise<SpendingPayload> {
  const live = await tryApi<SpendingPayload>(`/api/spending?year=${year}`);
  if (live) return applyMeasureAvailability(applyDesignTokens(live));
  return applyMeasureAvailability(applyDesignTokens(buildSpendingPayload(year)));
}

/** GET /api/revenue?year=YYYY — aggregated revenue payload. */
export async function getRevenue(year: number): Promise<RevenuePayload> {
  const live = await tryApi<RevenuePayload>(`/api/revenue?year=${year}`);
  if (live) return live;
  return delay(buildRevenuePayload(year));
}
