import { Icon } from "./Icon";
import { fiscalYearLabel } from "../lib/format";

/**
 * Fiscal Year selector (Section 12). Native-style dropdown showing
 * "Fiscal Year 2025". Lives in the global top row (center). Fiscal year is
 * global app state — changing it here updates all data across the app.
 */
interface FiscalYearSelectorProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

export function FiscalYearSelector({ years, value, onChange }: FiscalYearSelectorProps) {
  return (
    <div className="relative inline-flex items-center">
      {/* Native select for real OS dropdown behavior; styled label overlaid. */}
      <select
        aria-label="Fiscal Year"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="peer appearance-none rounded-full border border-black/10 bg-white/80 py-1.5 pl-3.5 pr-9 text-[14px] font-medium text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-systemBlue/40"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {fiscalYearLabel(y)}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        size={20}
        className="pointer-events-none absolute right-2.5 text-inkMuted"
      />
    </div>
  );
}
