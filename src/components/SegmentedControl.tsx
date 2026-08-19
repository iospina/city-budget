import type { ProductView } from "../types";

/**
 * iOS-style Spending / Revenue segmented control (Section 11).
 * Labels only, no colored dots. A white thumb slides between the two options
 * (~200ms, standard easing) per the Story 6 motion note. Not sticky — it scrolls
 * away with the header (placement handled by TopChrome).
 */
interface SegmentedControlProps {
  value: ProductView;
  onChange: (value: ProductView) => void;
}

const SEGMENTS: { id: ProductView; label: string; activeColor: string }[] = [
  { id: "spending", label: "Spending", activeColor: "#FF2D55" }, // systemPink
  { id: "revenue", label: "Revenue", activeColor: "#008932" }, // darker systemGreen (legible as text)
];

export function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  const activeIndex = SEGMENTS.findIndex((s) => s.id === value);

  return (
    <div
      role="tablist"
      aria-label="Spending or Revenue"
      className="relative inline-flex rounded-[9px] p-0.5"
      style={{ backgroundColor: "#E8E8ED" }}
    >
      {/* Sliding thumb */}
      <span
        aria-hidden
        className="absolute bottom-0.5 top-0.5 rounded-[7px] bg-white shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: "calc(50% - 2px)",
          left: 2,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {SEGMENTS.map((seg) => {
        const active = seg.id === value;
        return (
          <button
            key={seg.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(seg.id)}
            className="relative z-10 flex-1 rounded-[7px] px-4 py-1.5 text-[14px] transition-colors"
            style={{ color: active ? seg.activeColor : "#1C1C1E", fontWeight: active ? 600 : 400 }}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
