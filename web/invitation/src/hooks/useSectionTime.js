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
 * Safe no-op when Analytics is unavailable or IntersectionObserver is missing.
 *
 * @param {string} sectionId  The section's id (used as `section_id`).
 * @param {React.RefObject} ref  Ref to the section's DOM node.
 */
export function useSectionTime(sectionId, ref) {
  const accumulatedRef = useRef(0); // total visible seconds so far
  const lastEnterRef = useRef(null); // timestamp of last enter (ms)
  const observerRef = useRef(null);

  useEffect(() => {
    const node = ref?.current;
    if (!node || !sectionId) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;

    const flush = () => {
      if (lastEnterRef.current != null) {
        accumulatedRef.current += (Date.now() - lastEnterRef.current) / 1000;
        lastEnterRef.current = null;
      }
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
            accumulatedRef.current +=
              (Date.now() - lastEnterRef.current) / 1000;
            lastEnterRef.current = null;
            const seconds = Math.round(accumulatedRef.current);
            if (seconds > 0) {
              trackSectionTime(sectionId, seconds);
              accumulatedRef.current = 0;
            }
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
