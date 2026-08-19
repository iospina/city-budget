import { SegmentedControl } from "./SegmentedControl";
import { FiscalYearSelector } from "./FiscalYearSelector";
import { CityExplorerSwitcher } from "./CityExplorerSwitcher";
import { useAppState } from "../state/AppState";
import type { ProductView } from "../types";
import { track } from "../analytics/events";

/**
 * TopChrome — global chrome (Sections 11 & 12).
 *
 * Desktop (one row): Spending/Revenue segmented control (left), Fiscal Year
 * selector (center), CityExplorerSwitcher (right).
 *
 * Mobile (two rows): Fiscal Year selector + CityExplorerSwitcher on one row,
 * Spending/Revenue segmented control on the row beneath.
 *
 * The segmented control scrolls away with the header on mobile and tablet (this
 * whole bar is in normal flow, not sticky/fixed — Section 11).
 *
 * The CityExplorerSwitcher's top-right placement is the one fixed cross-product
 * convention. For Day 1 it is hardcoded to product="city-budget".
 */
interface TopChromeProps {
  years: number[];
}

export function TopChrome({ years }: TopChromeProps) {
  const { view, setView, fiscalYear, setFiscalYear } = useAppState();

  function handleViewChange(next: ProductView) {
    if (next === view) return;
    setView(next);
    if (next === "spending") track.viewToggledSpending();
    else track.viewToggledRevenue();
  }

  function handleYearChange(year: number) {
    if (year === fiscalYear) return;
    setFiscalYear(year);
    track.fiscalYearChanged(year);
  }

  return (
    <header className="mx-auto w-full max-w-5xl px-4 pt-4">
      {/* ---- Desktop: single row (md and up). Fiscal Year (left),
           Spending/Revenue segmented control (center), switcher (right). ---- */}
      <div className="hidden items-center md:flex">
        <div className="flex-1">
          <FiscalYearSelector years={years} value={fiscalYear} onChange={handleYearChange} />
        </div>
        <div className="flex flex-1 justify-center">
          <SegmentedControl value={view} onChange={handleViewChange} />
        </div>
        <div className="flex flex-1 justify-end">
          <CityExplorerSwitcher product="city-budget" />
        </div>
      </div>

      {/* ---- Mobile: two rows (below md) ---- */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <FiscalYearSelector years={years} value={fiscalYear} onChange={handleYearChange} />
          <CityExplorerSwitcher product="city-budget" />
        </div>
        <div className="mt-3 flex justify-center">
          <SegmentedControl value={view} onChange={handleViewChange} />
        </div>
      </div>
    </header>
  );
}
