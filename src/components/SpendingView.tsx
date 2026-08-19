import { useState } from "react";
import type { SpendingPayload } from "../types";
import { useAppState } from "../state/AppState";
import { HeroCard } from "./HeroCard";
import { ServicesSummaryCard } from "./ServicesSummaryCard";
import { CategoryList } from "./CategoryList";
import { ObligationsCard } from "./ObligationsCard";
import { SourceFootnote } from "./SourceFootnote";
import { DashboardActions } from "./DashboardActions";
import { grandTotalFor, sortedCategories, categoryShareOfServices } from "../lib/selectors";
import { track } from "../analytics/events";

/**
 * SpendingView (Section 13b desktop layout).
 *
 * Hero card (full width), then a second row: Services (2/3 column — summary card
 * with the rollup headline, denominator line, proportion bar, then the flat
 * category list) beside Citywide Obligations (1/3 column). Mobile stacks.
 *
 * Tapping a category ROW opens its detail. Tapping a proportion-bar SLICE
 * highlights the matching row (neutral highlight + scroll into view) — these
 * stay distinct interactions and distinct analytics events (Section 15/22).
 */
export function SpendingView({ payload }: { payload: SpendingPayload }) {
  const { measure, setMeasure, fiscalYear, openCategory } = useAppState();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  function handleSliceClick(id: string) {
    setHighlightedId(id);
    const cat = payload.categories.find((c) => c.id === id);
    if (cat) track.stackedBarSliceTapped(cat.name);
    const el = document.getElementById(`category-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleMeasureChange(m: typeof measure) {
    setMeasure(m);
    track.measureChanged(m, "spending");
  }

  function handleRowSelect(id: string) {
    const cat = payload.categories.find((c) => c.id === id);
    if (cat) track.categoryRowSelected(cat.name);
    openCategory(id);
  }

  return (
    <>
      <HeroCard payload={payload} measure={measure} onMeasureChange={handleMeasureChange} />

      <main className="mx-auto w-full max-w-5xl px-4 pb-4 pt-4 max-[1439px]:pb-32">
        <div className="grid gap-4 md:grid-cols-3 md:items-start">
          {/* Services — 2/3 column */}
          <div className="md:col-span-2">
            <ServicesSummaryCard
              payload={payload}
              measure={measure}
              activeCategoryId={highlightedId}
              onSliceClick={handleSliceClick}
            />
            <div className="mt-3">
              <CategoryList
                payload={payload}
                measure={measure}
                highlightedId={highlightedId}
                onSelect={handleRowSelect}
              />
            </div>
          </div>

          {/* Citywide Obligations — 1/3 column, with the source caption and
              Share control directly beneath it so they aren't stranded far below
              the long category list on wide layouts. */}
          <div className="flex flex-col gap-4 md:col-span-1">
            <ObligationsCard payload={payload} measure={measure} />
            <SourceFootnote
              lastUpdated={payload.lastUpdated}
              fiscalYear={fiscalYear}
              note="Total spending and total revenue need not match; adopted revenue and adopted spending differ."
            />
            <DashboardActions
              context={{
                kind: "spending-dashboard",
                fiscalYear,
                total: grandTotalFor(payload, measure),
                segments: sortedCategories(payload, measure).map((c) => ({
                  id: c.id,
                  color: c.color,
                  percent: categoryShareOfServices(c, payload, measure),
                })),
              }}
            />
          </div>
        </div>
      </main>
    </>
  );
}
