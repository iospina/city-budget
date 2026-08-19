import { useEffect, useRef, useState } from "react";
import { AppStateProvider, useAppState } from "./state/AppState";
import { TopChrome } from "./components/TopChrome";
import { SpendingView } from "./components/SpendingView";
import { RevenueView } from "./components/RevenueView";
import { CategoryDetail } from "./components/CategoryDetail";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { useSpendingData } from "./hooks/useSpendingData";
import { useRevenueData } from "./hooks/useRevenueData";
import { getFiscalYears } from "./api";
import { MOCK_FISCAL_YEARS } from "./data/mockData";
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
  const { fiscalYear, view, selectedCategoryId } = useAppState();
  const [years, setYears] = useState<number[]>(
    [...MOCK_FISCAL_YEARS].sort((a, b) => b - a)
  );
  const spending = useSpendingData(fiscalYear);
  const revenue = useRevenueData(fiscalYear);

  useEffect(() => {
    getFiscalYears().then(setYears);
  }, []);

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
