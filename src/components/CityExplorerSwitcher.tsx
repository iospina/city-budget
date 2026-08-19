import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { ExplorerProduct } from "../types";
import { track } from "../analytics/events";

/**
 * CityExplorerSwitcher — shared platform shell (Implementation Brief Section 23).
 *
 * SHIPS IN BOTH City Budget and City Permits. Built once here and exported for
 * reuse; active product is driven by the `product` prop so a future third
 * product drops in without modifying the component.
 *
 * Behavior (locked):
 *  - Trigger: apps (grid) icon, top-right, every screen.
 *  - Active product: 100% opacity, bold label. Inactive: 61.8% opacity, regular.
 *  - Desktop: hover on inactive animates to 100% opacity, ease-in-out ~150ms.
 *  - Mobile: tap navigates immediately, no hover.
 *  - Touch target is the full circle regardless of opacity (opacity never shrinks tap area).
 *  - Card: City Explorer title, two product circles, "Built by Ignacio Ospina"
 *    with portfolio link + LinkedIn icon.
 *  - Mobile: background dims when the card is open.
 *  - Close: explicit X and tap-outside.
 */

interface ProductDef {
  id: ExplorerProduct;
  title: string;
  icon: string;
  color: string;
  href: string;
}

const PRODUCTS: ProductDef[] = [
  // City Permits: square_foot on systemOrange. City Budget: account_balance on systemBlue.
  { id: "city-permits", title: "City Permits", icon: "square_foot", color: "#FF9500", href: "https://citypermits.vercel.app" },
  { id: "city-budget", title: "City Budget", icon: "account_balance", color: "#007AFF", href: "https://citybudget.vercel.app" },
];

const PORTFOLIO_URL = "https://ignacioospina.com";
const LINKEDIN_URL = "https://www.linkedin.com/in/ignacioospina/";

interface CityExplorerSwitcherProps {
  /** Which product is currently active. Drives the active/inactive styling. */
  product: ExplorerProduct;
}

export function CityExplorerSwitcher({ product }: CityExplorerSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    setOpen((o) => {
      if (!o) track.cityExplorerOpened();
      return !o;
    });
  }

  // Close on tap/click outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger: apps (grid) icon */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open City Explorer"
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-black/5 active:bg-black/10 transition-colors"
      >
        <Icon name="apps" size={24} />
      </button>

      {/* Mobile dim backdrop when open (md+ shows no dim, just the popover). */}
      {open && (
        <div
          className="fixed inset-0 z-40 animate-fade bg-black/30 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="City Explorer"
          className="absolute right-0 z-50 mt-2 w-72 animate-pop-in rounded-card bg-white p-4 shadow-xl ring-1 ring-black/5"
        >
          <div className="relative mb-3 flex items-center justify-center">
            <h2 className="text-card-title text-ink">City Explorer</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close City Explorer"
              className="absolute right-0 flex h-7 w-7 items-center justify-center rounded-full text-inkMuted hover:bg-black/5"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex items-stretch gap-3">
            {PRODUCTS.map((p) => {
              const active = p.id === product;
              return (
                <a
                  key={p.id}
                  href={p.href}
                  onClick={() => track.cityExplorerProductSelected(p.id)}
                  aria-current={active ? "page" : undefined}
                  className="group flex flex-1 flex-col items-center gap-2 rounded-xl p-2 hover:bg-black/[0.03]"
                >
                  {/* Full-size circle is always the tap target; opacity affects only paint. */}
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full transition-opacity duration-150 ease-in-out"
                    style={{
                      backgroundColor: p.color,
                      opacity: active ? 1 : 0.618, // golden ratio inactive
                    }}
                  >
                    <Icon name={p.icon} size={28} color="#fff" />
                  </span>
                  <span
                    className="text-center text-[13px] text-ink transition-opacity duration-150 ease-in-out group-hover:opacity-100"
                    style={{
                      fontWeight: active ? 700 : 400,
                      opacity: active ? 1 : 0.618,
                    }}
                  >
                    {p.title}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="mt-4 flex items-end justify-center gap-1.5 border-t border-black/5 pt-3 text-[12px] leading-none text-inkMuted">
            <span>Built by</span>
            <a
              href={PORTFOLIO_URL}
              className="font-medium text-ink underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Ignacio Ospina
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="inline-flex items-center text-inkMuted hover:text-ink"
            >
              {/* Inline LinkedIn glyph (not a Material Symbol) */}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM0 8.5h5V24H0V8.5Zm7.5 0h4.8v2.1h.07c.67-1.2 2.3-2.46 4.73-2.46 5.06 0 6 3.33 6 7.66V24h-5v-6.84c0-1.63-.03-3.72-2.27-3.72-2.27 0-2.62 1.77-2.62 3.6V24h-5V8.5Z" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
