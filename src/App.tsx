import { useEffect, useRef, useState } from "react";
import { ALL_MEASURES_AVAILABLE, AppStateProvider, useAppState } from "./state/AppState";
import { TopChrome } from "./components/TopChrome";
import { SpendingView } from "./components/SpendingView";
import { RevenueView } from "./components/RevenueView";
import { CategoryDetail } from "./components/CategoryDetail";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { useSpendingData } from "./hooks/useSpendingData";
import { useRevenueData } from "./hooks/useRevenueData";
import { getFiscalYears } from "./api";
import { displayYears } from "./lib/fiscalYears";
import { initSession, track } from "./analytics/events";

/**
 * App shell. Opens on Spending, most recent fiscal year, Adopted measure
 * (Section 26). Fiscal year and measure are global lenses. Deep links can open
 * the Revenue view or a category detail directly (state is parsed from the URL
 * in AppStateProvider).
 *
 * Routing:
 *   selectedCategoryId set  -> CategoryDetail (its own top chrome)
 *   view === "revenue"      -> RevenueView
 *   otherwise               -> SpendingView
 */
function AppShell() {
  const { fiscalYear, view, selectedCategoryId, setFiscalYear, setMeasureAvailability } =
    useAppState();
  // Seeded from the clock so the selector renders immediately, then replaced by
  // the years actually seeded in Postgres.
  const [years, setYears] = useState<number[]>(() => displayYears());
  const spending = useSpendingData(fiscalYear);
  const revenue = useRevenueData(fiscalYear);

  useEffect(() => {
    getFiscalYears().then((available) => {
      setYears(available);
      // The clock says a fiscal year has begun; Postgres decides whether it has
      // been ingested yet. If not, fall back to the most recent seeded year so
      // the app never opens on a year with no data behind it.
      if (available.length > 0 && !available.includes(fiscalYear)) {
        setFiscalYear(available[0]);
      }
    });
    // Runs once: the year list does not change within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publish this year's measure availability so the MeasureLens can disable the
  // measures that have no data yet (Task 2 / Section 13).
  useEffect(() => {
    if (spending.payload) {
      setMeasureAvailability(spending.payload.measureAvailability ?? ALL_MEASURES_AVAILABLE);
    }
  }, [spending.payload, setMeasureAvailability]);

  // Initialize the analytics session once, with the entry view (Section 22).
  const sessionInit = useRef(false);
  if (!sessionInit.current) {
    initSession(view);
    sessionInit.current = true;
  }

  // dashboard_loaded fires once when the spending dashboard first has data.
  const dashboardLoadedFired = useRef(false);
  useEffect(() => {
    if (!dashboardLoadedFired.current && spending.payload && !selectedCategoryId) {
      dashboardLoadedFired.current = true;
      track.dashboardLoaded(fiscalYear);
    }
  }, [spending.payload, selectedCategoryId, fiscalYear]);

  // ---- Category detail ----
  if (selectedCategoryId) {
    if (spending.loading || !spending.payload) return <SkeletonLoader />;
    return (
      <CategoryDetail
        payload={spending.payload}
        categoryId={selectedCategoryId}
        years={years}
      />
    );
  }

  // ---- Revenue dashboard ----
  if (view === "revenue") {
    return (
      <div className="min-h-full pb-2">
        <TopChrome years={years} />
        {revenue.loading || !revenue.payload ? (
          <SkeletonLoader />
        ) : (
          <div className="animate-content-in">
            <RevenueView payload={revenue.payload} />
          </div>
        )}
      </div>
    );
  }

  // ---- Spending dashboard ----
  return (
    <div className="min-h-full pb-2">
      <TopChrome years={years} />
      {spending.loading || !spending.payload ? (
        <SkeletonLoader />
      ) : (
        <div className="animate-content-in">
          <SpendingView payload={spending.payload} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
