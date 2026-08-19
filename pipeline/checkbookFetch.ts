import { readEnvelope } from "./parse";
import {
  CHECKBOOK_ENDPOINT,
  MAX_RECORDS_PER_CALL,
  THROTTLE_MS,
  buildRequestBody,
  type CheckbookDomain,
} from "../src/api/checkbookClient";

/**
 * Server-side Checkbook fetch (runs only in the Vercel cron / ingestion, never
 * in the browser). Encodes the verified mechanics:
 *  - POST with NO Content-Type header (the API works without it; setting it can
 *    trigger the empty-body failure mode).
 *  - Body begins directly with <request> (buildRequestBody guarantees no prolog).
 *  - Throttle ~3s between calls to clear Incapsula bot-protection.
 *  - Paginate with records_from when record_count exceeds 20,000 (e.g. DOHMH 816).
 */

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Throttle so consecutive calls are at least THROTTLE_MS apart. */
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + THROTTLE_MS - now);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

const MAX_ATTEMPTS = 4;

/**
 * POST once, with retry + backoff. Transient failures are expected on a long
 * run against a bot-protected endpoint: a dropped connection ("fetch failed"),
 * a 5xx, an empty body, or a non-XML Incapsula challenge. Any of these is
 * retried with increasing backoff rather than aborting the whole ingest. A
 * valid XML response (even an API-level error) is returned for the caller to
 * interpret.
 */
async function postOnce(body: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    try {
      const res = await fetch(CHECKBOOK_ENDPOINT, {
        method: "POST",
        // Intentionally NO 'Content-Type' header.
        body,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Checkbook HTTP ${res.status}`);
      if (!text.trim()) throw new Error("empty body");
      if (!text.includes("<response")) throw new Error("non-XML response (bot challenge?)");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = 5000 * attempt * attempt; // 5s, 20s, 45s
        // eslint-disable-next-line no-console
        console.warn(
          `  ↻ fetch attempt ${attempt}/${MAX_ATTEMPTS} failed (${
            err instanceof Error ? err.message : err
          }); retrying in ${backoffMs / 1000}s`
        );
        await sleep(backoffMs);
      }
    }
  }
  throw new Error(
    `Checkbook request failed after ${MAX_ATTEMPTS} attempts: ${
      lastErr instanceof Error ? lastErr.message : lastErr
    }`
  );
}

/**
 * Fetch ALL pages of records for one query. Stops when fewer than a full page
 * is returned or the known record_count is reached. Defensive pagination for any
 * agency approaching the 20k cap.
 */
export async function fetchAllPages(args: {
  domain: CheckbookDomain;
  criteria: { name: string; value: string }[];
  responseColumns: string[];
}): Promise<string[]> {
  const pages: string[] = [];
  let recordsFrom = 1;
  let total = Infinity;

  while (recordsFrom <= total) {
    const body = buildRequestBody({
      domain: args.domain,
      criteria: args.criteria,
      responseColumns: args.responseColumns,
      recordsFrom,
      maxRecords: MAX_RECORDS_PER_CALL,
    });
    const xml = await postOnce(body);
    const { ok, recordCount, transactions } = readEnvelope(xml);
    if (!ok) {
      throw new Error(
        `Checkbook returned a non-success/empty body for ${args.domain} ` +
          `(records_from=${recordsFrom}). Check for an accidental XML prolog.`
      );
    }
    pages.push(xml);
    total = recordCount;
    if (transactions.length < MAX_RECORDS_PER_CALL) break;
    recordsFrom += MAX_RECORDS_PER_CALL;
  }
  return pages;
}
