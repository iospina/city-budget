import { posthog, isAnalyticsEnabled } from "./posthog";

/**
 * Analytics events (Implementation Brief Section 22).
 *
 * Design rules encoded here:
 *  - Analytics must NOT block UI rendering: every capture is fire-and-forget and
 *    guarded so a missing/uninitialized PostHog is a silent no-op.
 *  - Session properties (device type, breakpoint, entry view) attach to ALL events.
 *  - There is NO fired `activation_reached` event. Activation is defined
 *    behaviorally and computed later from the funnel.
 *  - Two between-event intervals are captured as raw, unthresholded values:
 *      (1) session start -> first category_detail_viewed
 *      (2) category_detail_viewed -> the next engaged event
 *    Both are reliable between-event intervals; no threshold is baked in.
 *  - Bar-slice taps and category-row taps stay DISTINCT events.
 */

export type AnalyticsEvent =
  | "dashboard_loaded"
  | "view_toggled_spending"
  | "view_toggled_revenue"
  | "fiscal_year_changed"
  | "measure_changed"
  | "category_row_selected"
  | "category_detail_viewed"
  | "spending_type_viewed"
  | "revenue_view_loaded"
  | "stacked_bar_slice_tapped"
  | "share_initiated"
  | "city_explorer_opened"
  | "city_explorer_product_selected";

type Props = Record<string, string | number | boolean | null | undefined>;

// ---- Session properties (computed once) -------------------------------------

let sessionProps: Props = {};
let sessionStart = 0;

function breakpoint(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Tablet|iPad/.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/.test(ua)) return "mobile";
  return "desktop";
}

/** Call once on app start, before any event. entryView is the view at load. */
export function initSession(entryView: "spending" | "revenue"): void {
  sessionStart = Date.now();
  sessionProps = {
    // Tag every City Budget event so it is cleanly filterable in the shared
    // PostHog project (City Permits and City Budget report into the same
    // project on the free plan). Filter PostHog on app = "city-budget".
    app: "city-budget",
    device_type: deviceType(),
    breakpoint:
      typeof window === "undefined" ? "desktop" : breakpoint(window.innerWidth),
    entry_view: entryView,
  };
}

// ---- Timing intervals (raw, unthresholded) ----------------------------------

let firstCategoryDetailCaptured = false;
let lastCategoryDetailAt: number | null = null;
let breakdownActionCaptured = false;

// ---- Core capture -----------------------------------------------------------

function capture(event: AnalyticsEvent, props: Props = {}): void {
  try {
    if (!isAnalyticsEnabled() || typeof posthog?.capture !== "function") return;
    posthog.capture(event, {
      ...sessionProps,
      ...props,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Never let analytics throw into the UI.
  }
}

/**
 * Engaged actions following a category detail view: changed fiscal year,
 * changed measure, viewed a second category, or shared. The FIRST such action
 * after a category_detail_viewed records the raw "time in breakdown before
 * acting" interval (once).
 */
function maybeCaptureBreakdownInterval(): void {
  if (lastCategoryDetailAt !== null && !breakdownActionCaptured) {
    breakdownActionCaptured = true;
    capture("category_detail_viewed", {
      _interval_name: "time_in_breakdown_before_acting_ms",
      time_in_breakdown_before_acting_ms: Date.now() - lastCategoryDetailAt,
    });
  }
}

// ---- Named event helpers ----------------------------------------------------

export const track = {
  dashboardLoaded: (fiscalYear: number) =>
    capture("dashboard_loaded", { fiscal_year: fiscalYear }),

  viewToggledSpending: () => {
    maybeCaptureBreakdownInterval();
    capture("view_toggled_spending");
  },
  viewToggledRevenue: () => {
    maybeCaptureBreakdownInterval();
    capture("view_toggled_revenue");
  },

  fiscalYearChanged: (fiscalYear: number) => {
    maybeCaptureBreakdownInterval();
    capture("fiscal_year_changed", { fiscal_year: fiscalYear });
  },

  measureChanged: (measure: string, view: string) => {
    maybeCaptureBreakdownInterval();
    capture("measure_changed", { measure, view });
  },

  categoryRowSelected: (categoryName: string) =>
    capture("category_row_selected", { category: categoryName }),

  categoryDetailViewed: (categoryName: string) => {
    // Interval (1): session start -> first category detail (raw, once).
    if (!firstCategoryDetailCaptured) {
      firstCategoryDetailCaptured = true;
      capture("category_detail_viewed", {
        category: categoryName,
        time_to_first_category_detail_ms: Date.now() - sessionStart,
      });
    } else {
      // A second/subsequent category view is itself an engaged action.
      maybeCaptureBreakdownInterval();
      capture("category_detail_viewed", { category: categoryName });
    }
    // Arm interval (2) from this view.
    lastCategoryDetailAt = Date.now();
    breakdownActionCaptured = false;
  },

  spendingTypeViewed: (categoryName: string, typeCount: number) =>
    capture("spending_type_viewed", { category: categoryName, type_count: typeCount }),

  revenueViewLoaded: (fiscalYear: number) =>
    capture("revenue_view_loaded", { fiscal_year: fiscalYear }),

  stackedBarSliceTapped: (categoryName: string) =>
    capture("stacked_bar_slice_tapped", { category: categoryName }),

  shareInitiated: (shareKind: string, fiscalYear: number, categoryName?: string) => {
    maybeCaptureBreakdownInterval();
    capture("share_initiated", {
      share_kind: shareKind,
      fiscal_year: fiscalYear,
      category: categoryName,
    });
  },

  cityExplorerOpened: () => capture("city_explorer_opened"),
  cityExplorerProductSelected: (product: string) =>
    capture("city_explorer_product_selected", { product }),
};
