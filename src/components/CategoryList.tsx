import type { Measure, SpendingPayload } from "../types";
import { CategoryRow } from "./CategoryRow";
import { sortedCategories } from "../lib/selectors";

/**
 * CategoryList (Section 9). The flat list of all ten service categories, sorted
 * largest-first by the active measure. Always shows all ten (no cap — Section
 * 26). The list plus the tappable proportion bar ARE the navigation (Services
 * Navigation is retired, Section 18).
 */
interface CategoryListProps {
  payload: SpendingPayload;
  measure: Measure;
  highlightedId?: string | null;
  onSelect?: (id: string) => void;
}

export function CategoryList({
  payload,
  measure,
  highlightedId,
  onSelect,
}: CategoryListProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {sortedCategories(payload, measure).map((category) => (
        <div key={category.id} id={`category-${category.id}`}>
          <CategoryRow
            category={category}
            payload={payload}
            measure={measure}
            highlighted={highlightedId === category.id}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
