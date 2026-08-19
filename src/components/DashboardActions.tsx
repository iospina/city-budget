import { ShareControl, type ShareContext } from "./ShareControl";
import { Attribution } from "./Attribution";

/**
 * Share control + attribution placement for the dashboards (Spending / Revenue).
 *
 *  - Up to 1439px (portrait tablet + mobile): a floating, centered group pinned
 *    near the bottom of the screen (not a full-width bar). The Share pill itself
 *    is frosted (iOS-style blur behind it); the attribution pill sits below it.
 *    The container is content-width and centered so it doesn't block taps on the
 *    content behind it.
 *  - 1440px and up (desktop): static, right-aligned within the right column.
 */
export function DashboardActions({ context }: { context: ShareContext }) {
  return (
    <>
      {/* Progressive blur + fade behind the floating pill — tablet/mobile only.
          Hidden at the desktop breakpoint where the actions are inline. */}
      <div
        aria-hidden
        className="cb-bottom-fade pointer-events-none fixed inset-x-0 bottom-0 z-20 h-36 min-[1440px]:hidden"
      />
      <div
        className="
          fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2
          min-[1440px]:static min-[1440px]:left-auto min-[1440px]:bottom-auto
          min-[1440px]:z-auto min-[1440px]:translate-x-0 min-[1440px]:items-end min-[1440px]:gap-3
        "
      >
        <ShareControl context={context} />
        <Attribution />
      </div>
    </>
  );
}
