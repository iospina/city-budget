import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { YoYBadge } from "./YoYBadge";
import { formatCurrencyLong, formatPercent, fiscalYearLabel } from "../lib/format";
import { track } from "../analytics/events";
import { DEFAULT_FISCAL_YEAR } from "../data/mockData";

/**
 * ShareControl + share card (Section 16, build-fixes).
 *
 * Resting placement:
 *  - Category detail: sticky bottom bar on mobile, inline right-aligned link on
 *    tablet/desktop. Never floating mid-screen.
 *  - Dashboards (spending/revenue): quiet inline link near the footnote on all
 *    breakpoints (not a prominent button), per the Build and Launch refinement.
 *
 * Sharing generates a share card matching the City Permits architecture: title,
 * subtitle, stat element, right-hand visual panel, URL footer. The card links to
 * a deep-link URL encoding the shared view plus the active fiscal year. Dashboard
 * shares show the proportion bar; category shares show the category color-and-
 * figure block.
 */

export interface ShareSegment {
  id: string;
  color: string;
  percent: number;
}

export type ShareContext =
  | {
      kind: "spending-dashboard";
      fiscalYear: number;
      total: number;
      segments: ShareSegment[];
    }
  | {
      kind: "revenue-dashboard";
      fiscalYear: number;
      total: number;
      segments: ShareSegment[];
    }
  | {
      kind: "category";
      fiscalYear: number;
      categoryId: string;
      categoryName: string;
      color: string;
      icon: string;
      amount: number;
      yoyPercent: number;
      shareOfServices: number;
      measureLabel: string;
    };

function buildShareUrl(ctx: ShareContext): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://citybudget.vercel.app";
  const params = new URLSearchParams();
  const fyMaybe = ctx.fiscalYear !== DEFAULT_FISCAL_YEAR ? String(ctx.fiscalYear) : "";

  if (ctx.kind === "category") {
    if (fyMaybe) params.set("fy", fyMaybe);
    const qs = params.toString();
    return `${origin}/category/${ctx.categoryId}${qs ? `?${qs}` : ""}`;
  }
  if (ctx.kind === "revenue-dashboard") params.set("view", "revenue");
  if (fyMaybe) params.set("fy", fyMaybe);
  const qs = params.toString();
  return `${origin}/${qs ? `?${qs}` : ""}`;
}

function shareKindLabel(ctx: ShareContext): string {
  if (ctx.kind === "category") return "category";
  if (ctx.kind === "revenue-dashboard") return "revenue-dashboard";
  return "spending-dashboard";
}

export function ShareControl({ context }: { context: ShareContext }) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    track.shareInitiated(
      shareKindLabel(context),
      context.fiscalYear,
      context.kind === "category" ? context.categoryName : undefined
    );
    setOpen(true);
  }

  const pill = (
    <button
      type="button"
      onClick={handleOpen}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-systemBlue shadow-md ring-1 ring-black/5 backdrop-blur-md backdrop-saturate-150"
      style={{ backgroundColor: "rgba(237, 240, 253, 0.72)" }}
    >
      <Icon name="share" size={18} />
      Share this Breakdown
    </button>
  );

  // Rendered through a portal to <body> so its full-screen dark overlay escapes
  // any transformed ancestor (e.g. the entrance-animation wrapper) and covers the
  // entire viewport, including the top controls.
  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <ShareCardModal context={context} onClose={() => setOpen(false)} />,
          document.body
        )
      : null;

  // Always render just the pill — the parent (DashboardActions) positions it
  // responsively (floating frosted pill on tablet/mobile, right-aligned in the
  // column on desktop).
  return (
    <>
      {pill}
      {modal}
    </>
  );
}

function ShareCardModal({
  context,
  onClose,
}: {
  context: ShareContext;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(context);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const isCategory = context.kind === "category";
  const subtitle = isCategory
    ? `${context.categoryName} Spending · ${fiscalYearLabel(context.fiscalYear)}`
    : context.kind === "revenue-dashboard"
      ? `Revenue Sources · ${fiscalYearLabel(context.fiscalYear)}`
      : `Spending by Service · ${fiscalYearLabel(context.fiscalYear)}`;
  const statLabel = isCategory
    ? context.measureLabel
    : context.kind === "revenue-dashboard"
      ? "Total Revenue"
      : "Total Spending";
  const statValue = isCategory ? context.amount : context.total;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Share card"
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-card bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-card-title text-ink">Share this Breakdown</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-inkMuted hover:bg-black/5"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* ---- The share card itself ---- */}
        <div className="overflow-hidden rounded-card ring-1 ring-black/10">
          <div className="flex items-stretch gap-4 bg-gradient-to-br from-[#f4f6fb] to-white p-4">
            {/* left: title + subtitle + stat */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded"
                    style={{ backgroundColor: "#007AFF" }}
                  >
                    <Icon name="account_balance" size={14} color="#fff" />
                  </span>
                  City Budget
                </div>
                <p className="mt-1 text-[12px] text-inkMuted">{subtitle}</p>
              </div>
              <div className="mt-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-inkMuted">
                  {statLabel}
                </div>
                <div className="text-[24px] font-bold tabular-nums leading-tight text-ink">
                  {formatCurrencyLong(statValue)}
                </div>
              </div>
            </div>

            {/* right: visual panel */}
            <div className="flex w-28 shrink-0 items-center justify-center">
              {isCategory ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: context.color }}
                  >
                    <Icon
                      name={context.icon}
                      size={28}
                      color={context.color.toUpperCase() === "#FFCC00" ? "#1C1C1E" : "#fff"}
                    />
                  </span>
                  <YoYBadge percent={context.yoyPercent} />
                  <span className="text-[11px] tabular-nums text-inkMuted">
                    {formatPercent(context.shareOfServices)} of services
                  </span>
                </div>
              ) : (
                <div className="flex h-16 w-full flex-col justify-center">
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {context.segments.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          width: `${s.percent}%`,
                          minWidth: 4,
                          backgroundColor: s.color,
                        }}
                      />
                    ))}
                  </div>
                  <span className="mt-2 text-center text-[11px] text-inkMuted">
                    {context.kind === "revenue-dashboard" ? "Four sources" : "Ten services"}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* footer: URL */}
          <div className="truncate border-t border-black/5 bg-white px-4 py-2 text-[11px] text-inkMuted">
            {url}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-pill bg-systemBlue px-4 py-2 text-[14px] font-semibold text-white"
          >
            <Icon name={copied ? "check" : "content_copy"} size={18} />
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
