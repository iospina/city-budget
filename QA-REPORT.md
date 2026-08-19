# City Budget — Day 3 QA Report

Conformance pass against the **User Stories** Gherkin acceptance criteria
(including the Resolved Decisions and the 2026-06-13 Design Finalization
overrides), plus the Implementation Brief locked sections and the Build-and-Launch
build-fixes. Verified by code review, a production build, a server type-check,
and automated render + data assertions.

**Result: all 12 stories conform.** Four conformance gaps were found and fixed
during this pass. Two items are documented as deliberate, defensible deviations.
Two are known mock-data simplifications that resolve when the live pipeline runs.

---

## Verification performed

- `npm run build` — clean (TypeScript strict, 65 modules, no errors).
- Server type-check of `pipeline/` + `api/` — clean.
- Data-layer assertions — category values distinct, shares sum to 100%, years
  differ, classification/padding rules match the API Investigation examples.
- Render assertions — SpendingView, RevenueView, and CategoryDetail mount and
  emit the expected structure; pipeline parse + aggregate verified against the
  API Investigation's real sample XML.

---

## Fixes applied this pass

1. **Spending-type order (Story 4).** Rows were sorted by amount; the spec
   requires the fixed canonical order (Personal Services, Contractual Services,
   Supplies, Property and Equipment, Grants and Benefit Payments, Other than
   Personal Services), with $0 types omitted. Fixed — now renders in canonical
   order.
2. **No tooltip on the proportion bar (Story 1 / Section 15).** Slices carried a
   native `title` tooltip. Removed; the bar shows no tooltip and a tap still
   highlights the matching row (aria-label retained for accessibility).
3. **Source footnote (Stories 1 & 2).** Now cites Checkbook NYC, the Office of
   the Comptroller, the active Fiscal Year and its calendar span, and the
   last-updated date — on every view.
4. **Dollar amounts written in full (Story 1 / Section 19).** Category rows,
   obligation lines, revenue rows, and spending-type rows now use full form
   ("$38.0 billion"), not abbreviated ("$38.0B").

---

## Story-by-story status

| # | Story | Status | Notes |
|---|-------|--------|-------|
| 1 | Load the spending dashboard | Pass | Tooltip + footnote + currency fixes applied. |
| 2 | Change the fiscal year | Pass | Native dropdown, global state, persists across screens; footnote reflects active year. |
| 3 | Expand/collapse detailed amounts | N/A (retired) | Superseded by the always-visible MeasureLens. |
| 4 | Open a service category detail | Pass | Spending-type order fixed; six types, $0 omitted; All Services back; FY/measure preserved. |
| 5 | Services Navigation legend | N/A (retired) | Category list + tappable bar are the navigation. |
| 6 | Toggle Spending / Revenue | Pass | Segmented control top-of-chrome (resolved decision), identity colors, FY preserved, returns to overview. |
| 7 | View revenue sources | Pass | Green identity, 3-measure lens, four rows, no icons/YoY, no stacked bar. |
| 8 | Share a breakdown | Pass | Card (title/subtitle/stat/visual/URL) + deep link; sticky mobile / inline desktop; dashboards + detail. |
| 9 | Switch products via City Explorer | Pass | Trigger, 61.8% inactive, hover→100%, full tap target, mobile dim, X + tap-outside, same-tab nav. |
| 10 | Track core MVP events | Pass | Full event set, session properties, two raw intervals, no activation event, non-blocking. |
| 11 | Reframe figures with the measure lens | Pass | Global, persists, default Adopted; reframes overview/split/categories/subtotals. (YoY note below.) |
| 12 | Services and Obligations split | Pass | Grand-total headline, split bar, share-of-services, plain denominator line, parallel cards, spending-only. |

---

## Deliberate deviations (confirm if undesired)

- **MeasureLens pill values stay abbreviated** ("$122.9B"). The pills are a
  compact 2×2 control (~115px wide); full "billion" values overflow them. The
  no-abbreviation rule is applied in full to every figure row and headline; the
  pill is treated as a space-constrained control affordance. All other
  resident-facing amounts are written in full.
- **MeasureLens layout is 2×2 (spending) / 1×3 (revenue).** The User Stories
  Design Finalization (2026-06-13) said "1×4 vertical stack," but the later
  Build-and-Launch plan (2026-06-22) specifies 2×2 / 1×3 "already reflected in
  the final screens." Implemented per the more recent source.

## Known mock-data simplifications (resolve with the live pipeline)

- **Year-over-year basis.** The YoY badge uses an adopted-to-adopted basis
  (consistent with Story 1's resolved decision). Story 11 / Section 13 also call
  for YoY to recompute per active measure; the live pipeline computes prior-year
  totals per measure, at which point the badge can reframe with the lens. The
  source docs themselves note both bases; flagged for a one-line decision.
- **Hero grand-total YoY** is an adopted-weighted approximation in the mock
  layer; the live aggregate carries the true prior-year grand total per measure.

---

## Build-and-Launch build-fixes (confirmed)

- Tablet/all-breakpoint category rows render distinct per-category data (not a
  repeated Education row). Verified.
- "Share this Breakdown" docked (sticky bottom mobile / inline tablet+desktop),
  present on both dashboards and category detail; never floating mid-screen.
- Category-detail back control "All Services" at top-left with the Fiscal Year
  selector centered on that view.
- Revenue measure lens shows three pills (Adopted, Modified, Recognized).

---

## Not in this build (by scope)

Real Checkbook data is not yet flowing — the ingestion pipeline, cron, and
`/api` read endpoints are written and Neon-ready but dormant until `DATABASE_URL`
and `CRON_SECRET` are set in Vercel and one cron run has populated Postgres.
PostHog events are wired but inert until `VITE_POSTHOG_KEY` is set. Both are
credential steps, not code work.
