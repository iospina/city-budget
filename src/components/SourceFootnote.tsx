import { calendarSpan, fiscalYearLabel } from "../lib/format";

/**
 * SourceFootnote (Sections 13b & 19, Stories 1/2). Flat, no card. Every view
 * cites its source, the data's last-updated date, and the active fiscal year and
 * its calendar span. Source-of-truth register, never editorializing. Optionally
 * acknowledges that total spending and total revenue need not match, so the two
 * sides differing is not read as an error.
 */
export function SourceFootnote({
  lastUpdated,
  fiscalYear,
  note,
}: {
  lastUpdated: string;
  fiscalYear: number;
  note?: string;
}) {
  const date = new Date(lastUpdated);
  const formatted = Number.isNaN(date.getTime())
    ? lastUpdated
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <footer className="text-[13px] leading-relaxed text-inkMuted">
      <p>
        Source: New York City Checkbook NYC, the Office of the Comptroller.{" "}
        {fiscalYearLabel(fiscalYear)} ({calendarSpan(fiscalYear)}). Last updated{" "}
        {formatted}.
      </p>
      {note ? <p className="mt-1">{note}</p> : null}
    </footer>
  );
}
