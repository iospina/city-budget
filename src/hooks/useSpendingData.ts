import { useEffect, useState } from "react";
import type { SpendingPayload } from "../types";
import { getSpending } from "../api";

/**
 * Fetches the aggregated spending payload for a fiscal year from City Budget's
 * own /api layer. Re-fetches whenever the fiscal year changes (global state).
 * Returns a loading flag so the SkeletonLoader can cover the brief fetch.
 */
export function useSpendingData(year: number) {
  const [payload, setPayload] = useState<SpendingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSpending(year).then((data) => {
      if (cancelled) return;
      setPayload(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  return { payload, loading };
}
