import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Measure, MeasureAvailability, ProductView, RevenueMeasure } from "../types";
import { currentFiscalYear, isPlausibleFiscalYear } from "../lib/fiscalYears";

/** Most recent fiscal year, derived from the clock rather than hardcoded. The
 *  real list arrives from /api/fiscal-years; App clamps to it once it loads. */
const DEFAULT_FISCAL_YEAR = currentFiscalYear();

/** Years with no availability metadata are treated as fully available. */
export const ALL_MEASURES_AVAILABLE: MeasureAvailability = {
  adopted: true,
  modified: true,
  committed: true,
  cash_spent: true,
};

/**
 * Global app state (Sections 12 & 13). Two global lenses — fiscal year and
 * measure — plus the Spending/Revenue view and the selected category.
 *
 * Spending and Revenue each carry their OWN measure: spending has four
 * (adopted/modified/committed/cash spent), revenue has three
 * (adopted/modified/recognized) — the domains expose different fields, so the
 * lenses are separate but the pill component is shared (per the late-stage
 * resolved decision in the Build and Launch plan).
 *
 * The app opens on Spending, most recent fiscal year, Adopted measure (Section 26).
 *
 * State is mirrored to the URL for shareable deep links (Section 16 / 26):
 *   /                     spending dashboard (default fy)
 *   /?view=revenue&fy=Y   revenue dashboard
 *   /?fy=Y                spending dashboard, specific year
 *   /category/<id>?fy=Y   a category detail
 */
interface AppState {
  fiscalYear: number;
  view: ProductView;
  /**
   * The spending measure in effect. This is the user's chosen measure unless it
   * has no data for the active year, in which case it falls back to Adopted.
   *
   * The choice itself is held separately and never overwritten, so moving to a
   * year where the measure is unavailable and back again restores it rather than
   * silently stranding the user on Adopted.
   */
  measure: Measure;
  /** Which measures have data for the active year. */
  measureAvailability: MeasureAvailability;
  setMeasureAvailability: (availability: MeasureAvailability) => void;
  /** Revenue measure (three). */
  revenueMeasure: RevenueMeasure;
  selectedCategoryId: string | null;
  setFiscalYear: (year: number) => void;
  setView: (view: ProductView) => void;
  setMeasure: (measure: Measure) => void;
  setRevenueMeasure: (measure: RevenueMeasure) => void;
  openCategory: (id: string) => void;
  closeCategory: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

interface RouteState {
  view: ProductView;
  fiscalYear: number;
  selectedCategoryId: string | null;
}

function parseLocation(): RouteState {
  if (typeof window === "undefined") {
    return { view: "spending", fiscalYear: DEFAULT_FISCAL_YEAR, selectedCategoryId: null };
  }
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);

  const yearParam = Number(params.get("fy"));
  // Validated against a plausible range, not a fixed list: the real list of
  // seeded years is not known synchronously at parse time, and a hardcoded list
  // silently redirects deep links to years added later.
  const fiscalYear = isPlausibleFiscalYear(yearParam) ? yearParam : DEFAULT_FISCAL_YEAR;

  const categoryMatch = pathname.match(/^\/category\/([a-z-]+)\/?$/);
  const selectedCategoryId = categoryMatch ? categoryMatch[1] : null;

  // Category detail is a spending concept; revenue only applies on the dashboard.
  const view: ProductView =
    !selectedCategoryId && params.get("view") === "revenue" ? "revenue" : "spending";

  return { view, fiscalYear, selectedCategoryId };
}

function buildUrl(route: RouteState): string {
  const params = new URLSearchParams();
  if (route.selectedCategoryId) {
    if (route.fiscalYear !== DEFAULT_FISCAL_YEAR) params.set("fy", String(route.fiscalYear));
    const qs = params.toString();
    return `/category/${route.selectedCategoryId}${qs ? `?${qs}` : ""}`;
  }
  if (route.view === "revenue") params.set("view", "revenue");
  if (route.fiscalYear !== DEFAULT_FISCAL_YEAR) params.set("fy", String(route.fiscalYear));
  const qs = params.toString();
  return `/${qs ? `?${qs}` : ""}`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initial = parseLocation();
  const [fiscalYear, setFiscalYearState] = useState<number>(initial.fiscalYear);
  const [view, setViewState] = useState<ProductView>(initial.view);
  const [preferredMeasure, setPreferredMeasure] = useState<Measure>("adopted");
  const [measureAvailability, setAvailabilityState] =
    useState<MeasureAvailability>(ALL_MEASURES_AVAILABLE);
  // Derived, never stored: keeps the user's choice intact across years.
  const measure: Measure = measureAvailability[preferredMeasure] ? preferredMeasure : "adopted";
  const [revenueMeasure, setRevenueMeasureState] = useState<RevenueMeasure>("adopted");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initial.selectedCategoryId
  );

  const prevCategoryRef = useRef<string | null>(initial.selectedCategoryId);
  const suppressSync = useRef(false);

  // Sync state -> URL. pushState when entering/leaving a category (so browser
  // Back works as the "All Services" control); replaceState for in-screen changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    const url = buildUrl({ view, fiscalYear, selectedCategoryId });
    const enteringOrLeavingCategory =
      (prevCategoryRef.current === null) !== (selectedCategoryId === null) ||
      prevCategoryRef.current !== selectedCategoryId;
    if (enteringOrLeavingCategory && selectedCategoryId !== prevCategoryRef.current) {
      window.history.pushState({}, "", url);
    } else {
      window.history.replaceState({}, "", url);
    }
    prevCategoryRef.current = selectedCategoryId;
  }, [view, fiscalYear, selectedCategoryId]);

  // Sync URL -> state on browser back/forward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPop() {
      const route = parseLocation();
      suppressSync.current = true;
      setViewState(route.view);
      setFiscalYearState(route.fiscalYear);
      setSelectedCategoryId(route.selectedCategoryId);
      prevCategoryRef.current = route.selectedCategoryId;
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setFiscalYear = useCallback((year: number) => setFiscalYearState(year), []);
  const setMeasure = useCallback((m: Measure) => setPreferredMeasure(m), []);
  const setMeasureAvailability = useCallback((next: MeasureAvailability) => {
    // Value-compare so re-fetching the same year does not re-render the tree.
    setAvailabilityState((prev) =>
      prev.adopted === next.adopted &&
      prev.modified === next.modified &&
      prev.committed === next.committed &&
      prev.cash_spent === next.cash_spent
        ? prev
        : next
    );
  }, []);
  const setRevenueMeasure = useCallback((m: RevenueMeasure) => setRevenueMeasureState(m), []);
  const setView = useCallback((v: ProductView) => {
    setViewState(v);
    setSelectedCategoryId(null); // switching domain returns to that dashboard
  }, []);
  const openCategory = useCallback((id: string) => setSelectedCategoryId(id), []);
  const closeCategory = useCallback(() => setSelectedCategoryId(null), []);

  const value = useMemo<AppState>(
    () => ({
      fiscalYear,
      view,
      measure,
      measureAvailability,
      setMeasureAvailability,
      revenueMeasure,
      selectedCategoryId,
      setFiscalYear,
      setView,
      setMeasure,
      setRevenueMeasure,
      openCategory,
      closeCategory,
    }),
    [
      fiscalYear,
      view,
      measure,
      measureAvailability,
      setMeasureAvailability,
      revenueMeasure,
      selectedCategoryId,
      setFiscalYear,
      setView,
      setMeasure,
      setRevenueMeasure,
      openCategory,
      closeCategory,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within an AppStateProvider");
  return ctx;
}
