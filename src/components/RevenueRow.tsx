import { PartToWholeBar } from "./Bars";
import { IDENTITY } from "../lib/tokens";
import { formatCurrencyLong, formatPercent } from "../lib/format";

/**
 * RevenueRow (Section 17). No circle icon — the green part-to-whole bar carries
 * the income identity and the label leads. No year-over-year badge on revenue
 * rows. Amount right-aligned, share beneath.
 */
export function RevenueRow({
  name,
  amount,
  share,
}: {
  name: string;
  amount: number;
  share: number;
}) {
  return (
    <div className="rounded-card bg-white px-4 py-3 ring-1 ring-black/5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-ink">{name}</span>
        <span className="text-[16px] font-bold tabular-nums text-ink md:text-[17px]">
          {formatCurrencyLong(amount)}
        </span>
      </div>
      <div className="mt-1 text-[12px] tabular-nums text-inkMuted">
        {formatPercent(share)} of total revenue
      </div>
      <div className="mt-2">
        <PartToWholeBar percent={share} color={IDENTITY.revenue.color} />
      </div>
    </div>
  );
}
