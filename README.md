# City Budget

Making New York City's Checkbook NYC spending and revenue legible to residents.
Service-category-first dashboard. Mobile-first. Built on the City Permits stack.

**Day 1** delivered the scaffold, the mock data layer, and the core spending
dashboard. **Day 2** adds the Revenue view, the Category detail screen, the Share
control with deep links, wired PostHog events, and the Checkbook ingestion
pipeline (serverless + Neon-ready, activated when credentials are wired). The
client still renders Day-1/2 mock data until a cron run populates Postgres.

## Stack

- React + TypeScript + Vite
- Tailwind CSS (design tokens from Implementation Brief Section 8)
- Roboto + Material Symbols Rounded (weight 400, fill on, optical size 20)
- PostHog (initialized; events wired on Day 2)
- Vercel deployment

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Environment

Copy `.env.example` to `.env` and set your PostHog key (optional for local dev;
the app renders fine without it):

```bash
cp .env.example .env
```

```
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

## Deploy to Vercel

The project is Vercel-ready (`vercel.json`, Vite framework preset, SPA rewrite).

**Option A — Vercel CLI**

```bash
npm i -g vercel
vercel            # first run links the project; follow prompts
vercel --prod     # production deploy
```

When prompted for the project name, use `citybudget` so the URL resolves to
`citybudget.vercel.app` (or the closest available).

**Option B — GitHub + Vercel dashboard**

1. Push this folder to a new GitHub repo named `city-budget`.
2. In the Vercel dashboard: New Project → import the repo.
3. Framework preset auto-detects as Vite. Build `npm run build`, output `dist`.
4. Add the `VITE_POSTHOG_*` environment variables.
5. Deploy. Rename the production domain to `citybudget.vercel.app` under
   Settings → Domains if it differs.

## Ingestion pipeline (Neon-ready, activate when credentials are wired)

Server-only code lives outside `src/` so it never enters the browser bundle:

- `pipeline/checkbookFetch.ts` — POST with no Content-Type, ~3s throttle
  (Incapsula), pagination past the 20k cap.
- `pipeline/parse.ts` — XML parse, flattening the nested
  `budget_amounts`/`expenditure_amounts` wrappers; empty body (the accidental-
  prolog symptom) yields zero records safely.
- `pipeline/aggregate.ts` — applies the taxonomy + spending-type rules; routes
  obligation-flagged lines to Citywide Obligations; aggregates revenue sources.
- `pipeline/ingest.ts` — the per-year fetch → parse → aggregate → write run
  (3-char zero-padded agency codes; Budget `year` vs Revenue `fiscal_year`).
- `pipeline/db.ts` — Neon Postgres schema + read/write of the aggregated JSON.
- `api/cron/ingest.ts` — the Vercel cron handler (daily, see `vercel.json`).
- `api/spending.ts`, `api/revenue.ts`, `api/fiscal-years.ts` — read endpoints.

**To go live:** set `DATABASE_URL` (Neon) and `CRON_SECRET` in Vercel env, deploy,
trigger one cron run to populate the table, then point the three functions in
`src/api/index.ts` at the `/api/*` endpoints (they already return the exact
payload shapes the client consumes). No component changes needed.

## Deep links (shareable views)

State is mirrored to the URL: `/` (spending), `/?view=revenue`, `/?fy=2024`,
`/category/education?fy=2024`. The Share control generates a share card plus a
deep link encoding the view and fiscal year. Browser Back acts as the category
detail's "All Services" control.

## Architecture notes

- **Data flow:** UI components read from City Budget's own API layer
  (`src/api/index.ts`), never from Checkbook directly. Day 1 serves mock data;
  Day 2 swaps the implementation to read pre-aggregated rows from Postgres
  (Neon) populated by a Vercel cron, with no component changes.
- **Verified Checkbook facts** are encoded now in `src/api/checkbookClient.ts`
  (no prolog, `year` vs `fiscal_year`, 3-char zero-padded `agency_code`, nested
  `budget_amounts`/`expenditure_amounts`, 20k pagination, ~3s throttle).
- **Taxonomy and mappings** (`src/data/taxonomy.ts`, `src/data/mappings.ts`) are
  the verified, build-ready config the Day 2 pipeline applies.
- **Global state** (`src/state/AppState.tsx`): fiscal year and measure are the
  two global lenses; changing either reframes every figure.

## Day 1 done state

- Repo initialized, Vercel-ready, builds clean. Deployed to citybudget.vercel.app.
- CityExplorerSwitcher, TopChrome (mobile two rows / desktop one row).
- Mock data layer behind `/api`-parity functions.
- HeroCard, MeasureLens, ServicesSummaryCard, CategoryRow, ObligationsCard,
  SkeletonLoader render with mock data.
- Measure pills + Fiscal Year selector drive global state.

## Day 3 done state

- QA pass against all 12 User Stories; four conformance gaps fixed (see
  `QA-REPORT.md`).
- Motion/interaction polish per the story Motion notes: part-to-whole, stacked
  proportion, and split bars animate their widths on mount and recompute on
  measure/year change; content fades in as data resolves; headline figures
  cross-fade on measure/year change; category detail has a forward-navigation
  entrance; the segmented control has a sliding thumb; the City Explorer card and
  share modal animate in. All collapse to instant under `prefers-reduced-motion`.

## Day 2 done state

- Revenue view: systemGreen identity, 1x3 measure lens (Adopted, Modified,
  Recognized), four source rows, no Services/Obligations split.
- Category detail: All Services back control top-left, Fiscal Year centered, six
  spending-type rows ($0 types omitted), measure-aware.
- Share control: sticky bottom bar on mobile / inline on tablet+desktop, on both
  dashboards and category detail; generates a share card + deep link.
- MeasureLens layout: 2x2 on Spending, 1x3 on Revenue.
- PostHog events wired (full Section 22 list, session properties, two raw
  between-event intervals, no activation event), non-blocking.
- Deep-link routing (view + fiscal year + category) with Back support.
- Checkbook ingestion pipeline written and Neon-ready (see above), with parse +
  aggregate verified against the API Investigation's real sample XML.

## Shared component

`src/components/CityExplorerSwitcher.tsx` is the shared platform shell (Section
23). It ships in both City Budget and City Permits; build once, import into
both. Active product is driven by the `product` prop. Day 1 renders it with
`product="city-budget"` hardcoded.

## Where this lives (August 2026)

Source of truth: `~/Code/CityBudget`. Moved out of iCloud Drive, which was
syncing `node_modules` and build output and corrupting builds.

Repo: https://github.com/iospina/city-budget (public, `main`).

Vercel: team `iospina`, project `citybudget`, live at https://citybudget.vercel.app.
Pushes to `main` deploy automatically, so Option B above is the live setup and the
Vercel CLI path is now only a fallback.

Sibling app: City Permits at `~/Code/CityPermits`, repo `iospina/city-permits`,
live at https://citypermits.vercel.app.
