import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Retired. Scheduled ingestion moved to GitHub Actions.
 *
 * This endpoint previously held the ingestion run itself, and could never have
 * worked. Two reasons, either of them fatal:
 *
 *   1. It imported ../../pipeline/* and ../../src/*. Vercel ships only what
 *      lives under api/, so every scheduled run died at module resolution with
 *      ERR_MODULE_NOT_FOUND in about 150ms, long before the handler ran. Every
 *      other function in this project, and every function in City Permits, is
 *      self-contained. This one was the exception.
 *   2. Even bundled correctly it could not finish. The pull is roughly 87
 *      agencies per fiscal year, throttled about 3 seconds apart to clear
 *      Checkbook's Incapsula bot protection. That is around 30 minutes against
 *      a function ceiling of 300s by default and 800s at most.
 *
 * The schedule now lives in .github/workflows/ingest.yml, which runs
 * scripts/ingest-local.ts on the same daily cadence with a 90 minute budget.
 *
 * Kept as a stub rather than deleted so that anything still pointing here gets
 * an explanation instead of an opaque 500. Self-contained by design: no imports
 * beyond the Vercel types, which is the rule this file used to break.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: "gone",
    message:
      "Scheduled ingestion moved to GitHub Actions. See .github/workflows/ingest.yml.",
  });
}
