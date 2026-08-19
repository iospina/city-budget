/**
 * Number/label formatting helpers.
 * Copy rules (Section 19): no abbreviations — write "$106.5 billion" in full;
 * "billion" / "year-over-year" not capitalized mid-sentence; no em dashes.
 */

/** Full-word currency, e.g. 122_000_000_000 -> "$122.0 billion". */
export function formatCurrencyLong(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000_000).toFixed(1)} trillion`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)} billion`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)} million`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(0)} thousand`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/** Compact currency for tight row layouts, e.g. "$38.0B". */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}$${(abs / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Percent share, e.g. 0.421 -> "42.1%". Input is a 0–100 percentage already. */
export function formatPercent(pct: number, digits = 1): string {
  return `${pct.toFixed(digits)}%`;
}

/** Year-over-year badge text, e.g. +3.4 -> "+3.4% year-over-year". */
export function formatYoY(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** "Fiscal Year 2025" (Section 12/19). */
export function fiscalYearLabel(year: number): string {
  return `Fiscal Year ${year}`;
}

/** Calendar span a fiscal year maps to: July of prior year through June (Section 5). */
export function calendarSpan(year: number): string {
  return `July ${year - 1} – June ${year}`;
}
