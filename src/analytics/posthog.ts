import posthog from "posthog-js";
import { isInternalDevice } from "./internalOptOut";

/**
 * PostHog analytics client.
 *
 * Day 1: initialize only. We do NOT wire any product events yet — that is a
 * Day 2 task (see Implementation Brief Section 22 for the event list:
 * dashboard_loaded, view_toggled_spending, measure_changed, etc.).
 *
 * Initialization is deliberately non-blocking: if no key is present (local dev
 * without an .env), we no-op so the UI still renders. Analytics must never
 * block UI rendering (Section 22).
 */
let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
    "https://us.i.posthog.com";

  if (!key) {
    // No key in this environment — skip init quietly. UI is unaffected.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[analytics] VITE_POSTHOG_KEY not set — PostHog disabled.");
    }
    return;
  }

  // Ignacio's own devices (?internal=1) never load PostHog, so nothing is sent.
  if (isInternalDevice()) {
    // eslint-disable-next-line no-console
    console.info("[analytics] Internal device — analytics disabled.");
    return;
  }

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // pageviews/events wired manually
    autocapture: false,
    person_profiles: "identified_only",
  });
  initialized = true;
}

/** True once PostHog has a key and is initialized. Events no-op otherwise. */
export function isAnalyticsEnabled(): boolean {
  return initialized;
}

export { posthog };
