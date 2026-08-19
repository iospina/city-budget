import { useEffect } from "react";
import type { SpendingPayload } from "../types";
import { useAppState } from "../state/AppState";
import { Icon } from "./Icon";
import { FiscalYearSelector } from "./FiscalYearSelector";
import { CityExplorerSwitcher } from "./CityExplorerSwitcher";
import { PartToWholeBar } from "./Bars";
import { YoYBadge } from "./YoYBadge";
import { SpendingTypeRow } from "./SpendingTypeRow";
import { SourceFootnote } from "./SourceFootnote";
import { DashboardActions } from "./DashboardActions";
import { SPENDING_MEASURES } from "../lib/tokens";
import {
  amountFor,
  categoryShareOfServices,
  categorySpendingTypes,
} from "../lib/selectors";
import { formatCurrencyLong, formatPercent } from "../lib/format";
import { track } from "../analytics/events";

/**
 * CategoryDetail (Section 16). Opens when a category row is selected.
 *
 * Top chrome here breaks from the dashboard arrangement (a deliberate, defensible
 * navigation convention): the "All Services" back control sits at top-left, the
 * Fiscal Year selector shifts to center, and the City Explorer switcher stays
 * top-right. Fiscal year and measure remain global — the detail reflects them.
 *
 * Header: category circle, name, percentage of services, headline amount (active
 * measure), year-over-year badge, measure label, part-to-whole bar.
 * Then the six spending-type rows ($0 types omitted). Then Share this Breakdown
 * (sticky bottom bar on mobile, inline on tablet/desktop).
 */
interface CategoryDetailProps {
  payload: SpendingPayload;
  categoryId: string;
  years: number[];
}

export function CategoryDetail({ payload, categoryId, years }: CategoryDetailProps) {
  const { measure, fiscalYear, setFiscalYear, closeCategory } = useAppState();
  const category = payload.categories.find((c) => c.id === categoryId);

  const rows = category ? categorySpendingTypes(category, measure) : [];

  // Opening a category is a forward navigation: start at the top of the screen
  // rather than inheriting the dashboard's scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [categoryId]);

  // Analytics: a category detail was viewed (Section 22), plus the spending-type
  // breakdown rendered. Fire on mount and when the category changes.
  useEffect(() => {
    if (!category) return;
    track.categoryDetailViewed(category.name);
    track.spendingTypeViewed(category.name, rows.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  if (!category) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 text-center text-inkMuted">
        <p>That category was not found.</p>
        <button
          type="button"
          onClick={closeCategory}
          className="mt-3 text-systemBlue hover:underline"
        >
          All Services
        </button>
      </div>
    );
  }

  const amount = amountFor(category, measure);
  const share = categoryShareOfServices(category, payload, measure);
  const measureLabel =
    SPENDING_MEASURES.find((m) => m.id === measure)?.label ?? "Adopted";
  const iconInk = category.color.toUpperCase() === "#FFCC00" ? "#1C1C1E" : "#fff";

  return (
    <div className="min-h-full animate-detail-in pb-8 max-[1439px]:pb-32">
      {/* Detail top chrome: back (left), Fiscal Year (center), switcher (right) */}
      <header className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="flex items-center">
          <div className="flex-1">
            <button
              type="button"
              onClick={closeCategory}
              className="group inline-flex items-center gap-1 text-[14px] font-medium text-systemBlue"
            >
              <Icon name="arrow_back" size={20} />
              <span className="group-hover:underline">All Services</span>
            </button>
          </div>
          <div className="flex flex-1 justify-center">
            <FiscalYearSelector
              years={years}
              value={fiscalYear}
              onChange={(y) => {
                if (y !== fiscalYear) {
                  setFiscalYear(y);
                  track.fiscalYearChanged(y);
                }
              }}
            />
          </div>
          <div className="flex flex-1 justify-end">
            <CityExplorerSwitcher product="city-budget" />
          </div>
        </div>
      </header>

      {/* Header card */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: category.color }}
            >
              <Icon name={category.icon} size={26} color={iconInk} />
            </span>
            <div>
              <h1 className="text-[20px] font-bold text-ink">{category.name}</h1>
              <div className="text-[13px] tabular-nums text-inkMuted">
                {formatPercent(share)} of services
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-start gap-2 md:flex-row md:items-end md:justify-between md:gap-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wide text-inkMuted">
                {measureLabel}
              </div>
              <div
                key={`${measure}-${amount}`}
                className="animate-figure-in whitespace-nowrap text-[24px] font-bold tabular-nums leading-none text-ink md:text-[28px]"
              >
                {formatCurrencyLong(amount)}
              </div>
            </div>
            <YoYBadge percent={category.yoyPercent} showWord size="md" />
          </div>

          <div className="mt-3">
            <PartToWholeBar percent={share} color={category.color} />
          </div>
        </div>
      </section>

      {/* Spending-type breakdown */}
      <main className="mx-auto w-full max-w-3xl px-4 pt-5">
        <h2 className="text-section-header px-1 text-ink">{category.name} Spending</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          {rows.map(({ type, amount: typeAmount, share: typeShare }) => (
            <SpendingTypeRow
              key={type.type}
              label={type.label}
              amount={typeAmount}
              share={typeShare}
              categoryName={category.name}
              color={category.color}
            />
          ))}
        </div>

      </main>

      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-6 max-[1439px]:pb-32">
        <SourceFootnote lastUpdated={payload.lastUpdated} fiscalYear={fiscalYear} />
        <div className="mt-4">
          <DashboardActions
            context={{
              kind: "category",
              fiscalYear,
              categoryId: category.id,
              categoryName: category.name,
              color: category.color,
              icon: category.icon,
              amount,
              yoyPercent: category.yoyPercent,
              shareOfServices: share,
              measureLabel,
            }}
          />
        </div>
      </div>
    </div>
  );
}
