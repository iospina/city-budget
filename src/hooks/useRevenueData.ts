import { useEffect, useState } from "react";
import type { RevenuePayload } from "../types";
import { getRevenue } from "../api";

/**
 * Fetches the aggregated revenue payload for a fiscal year from City Budget's
 * own /api layer. Re-fetches when the fiscal year changes (global state).
 */
export function useRevenueData(year: number) {
  const [payload, setPayload] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRevenue(year).then((data) => {
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
