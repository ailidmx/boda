import { useEffect, useRef } from "react";
import { trackSectionTime } from "../analytics.js";

/**
 * useSectionTime — track how long a section stays in the viewport and log it
 * to Analytics as a `section_time` event (seconds).
 *
 * Uses an IntersectionObserver to detect when the section enters/leaves the
 * viewport, accumulating the time it is visible. The accumulated seconds are
 * logged when the section leaves the viewport, and also flushed on page hide /
 * visibility change so time spent right before leaving the page is not lost.
 *
 * The accumulation is PAUSED while the tab is hidden (`document.hidden`) or
 * while the guest is inactive (`isActive === false`, from the activity
 * tracker). Idle/hidden time is not "time spent" on a section, so it is
 * excluded from the reported seconds.
 *
 * Safe no-op when Analytics is unavailable or IntersectionObserver is missing.
 *
 * @param {string} sectionId  The section's id (used as `section_id`).
 * @param {React.RefObject} ref  Ref to the section's DOM node.
 * @param {boolean} [isActive]  Whether the guest is currently active (from
 *   `useActivityTracker`). When false, accumulation pauses. Defaults to true.
 */
export function useSectionTime(sectionId, ref, isActive = true) {
  const accumulatedRef = useRef(0); // total visible seconds so far
  const lastEnterRef = useRef(null); // timestamp of last enter (ms)
  const observerRef = useRef(null);
  const isActiveRef = useRef(isActive);

  // Keep the latest `isActive` in a ref so the observer callback (which is
  // registered once) always reads the current value without re-subscribing.
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const node = ref?.current;
    if (!node || !sectionId) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;

    // Whether we should be counting right now: the section is in view AND the
    // tab is visible AND the guest is active.
    const shouldCount = () =>
      !document.hidden && isActiveRef.current && lastEnterRef.current != null;

    const flush = () => {
      if (shouldCount()) {
        accumulatedRef.current += (Date.now() - lastEnterRef.current) / 1000;
      }
      lastEnterRef.current = null;
      const seconds = Math.round(accumulatedRef.current);
      if (seconds > 0) {
        trackSectionTime(sectionId, seconds);
        accumulatedRef.current = 0;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            lastEnterRef.current = Date.now();
          } else if (lastEnterRef.current != null) {
            flush();
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    observerRef.current = observer;

    // Flush on page hide / tab switch so we don't lose the last chunk of time.
    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      flush();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, ref]);
}
