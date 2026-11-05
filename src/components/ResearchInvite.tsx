import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { track } from "../analytics/events";
import { isInternalDevice } from "../analytics/internalOptOut";

/**
 * Research invite, shown inside a category detail (the activation moment),
 * never on the dashboard. At most once per visit, and never again on this
 * device after "Tell me" or "No thanks". Hidden on Ignacio's own devices.
 * "Tell me" opens Tally form aOedKv with ?src=citybudget&category=…
 */
const FORM_URL = "https://tally.so/r/aOedKv";
const DONE_KEY = "cb_research_invite_done";
const VISIT_KEY = "cb_research_invite_shown_this_visit";

function canShow(): boolean {
  if (isInternalDevice()) return false;
  try {
    if (sessionStorage.getItem(VISIT_KEY) === "1") return false;
    return localStorage.getItem(DONE_KEY) !== "1";
  } catch {
    return true;
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Storage blocked: the invite may show again on a later visit.
  }
}

export function ResearchInvite({ categoryName }: { categoryName: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShow()) return;
    try {
      sessionStorage.setItem(VISIT_KEY, "1");
    } catch {
      // Storage blocked: harmless.
    }
    setVisible(true);
    track.researchInviteShown(categoryName);
    // Decide once, on the first category detail of the visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const href = `${FORM_URL}?${new URLSearchParams({
    src: "citybudget",
    category: categoryName,
  }).toString()}`;

  const close = () => {
    markDone();
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Research invite"
      className="mt-4 rounded-2xl border border-[#d3e3fd] bg-[#f1f6fe] px-[18px] py-4"
    >
      <div className="flex items-start gap-2.5">
        <Icon name="feedback" size={22} color="#007AFF" />
        <div>
          <p className="text-[15px] font-semibold text-ink">
            Use this for work or to follow the city's money?
          </p>
          <p className="mt-1 text-[13px] leading-snug text-inkMuted">
            Tell me how in 15 minutes. I'm building this solo, and your answer
            shapes what comes next.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            track.researchInviteDismissed(categoryName);
            close();
          }}
          className="rounded-full px-4 py-2 text-[14px] font-medium text-systemBlue hover:bg-[#e8f0fe]"
        >
          No thanks
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          onClick={() => {
            track.researchInviteClicked(categoryName);
            close();
          }}
          className="rounded-full bg-systemBlue px-[18px] py-2 text-[14px] font-medium text-white no-underline hover:opacity-90"
        >
          Tell me
        </a>
      </div>
    </div>
  );
}
