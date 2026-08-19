/**
 * One-shot diagnostic: send a single real Budget request (DOE, agency_code 040,
 * FY2024) to Checkbook and print exactly what comes back — HTTP status, content
 * type, body length, the first part of the body, and the parsed record_count.
 *
 * This tells us whether we're getting (a) real XML with records, (b) success
 * with 0 records (request-shape problem), or (c) an Incapsula challenge/HTML
 * page (bot-protection block). Usage: npm run probe
 */
import { buildAgencyBudgetRequest, CHECKBOOK_ENDPOINT } from "../src/api/checkbookClient";
import { readEnvelope } from "../pipeline/parse";

async function main() {
  const body = buildAgencyBudgetRequest("040", 2024); // DOE, padded
  console.log("POST", CHECKBOOK_ENDPOINT);
  console.log("--- request body ---");
  console.log(body);
  console.log("--------------------\n");

  const res = await fetch(CHECKBOOK_ENDPOINT, { method: "POST", body });
  const text = await res.text();

  console.log("HTTP status:", res.status);
  console.log("content-type:", res.headers.get("content-type"));
  console.log("body length:", text.length);
  console.log("--- first 1000 chars of body ---");
  console.log(text.slice(0, 1000));
  console.log("--------------------------------\n");

  try {
    const env = readEnvelope(text);
    console.log("parsed ok (status=success):", env.ok);
    console.log("parsed record_count:", env.recordCount);
    console.log("parsed transactions on this page:", env.transactions.length);
  } catch (e) {
    console.log("parse error:", e instanceof Error ? e.message : e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("fetch threw:", e instanceof Error ? e.message : e);
  process.exit(1);
});
