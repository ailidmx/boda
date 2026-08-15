import { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { trackEvent } from "../analytics.js";

/**
 * useActivityTracker — detect when the signed-in guest stops interacting with
 * the invitation (inactivity) and record it for analytics + the couple.
 *
 * It listens to the common user-activity events (mouse, keyboard, scroll,
 * touch, pointer) and resets an idle timer on each one. When the guest has
 * been idle for `INACTIVITY_THRESHOLD_MS` (default 5 minutes), it:
 *   1. logs a Firebase Analytics `user_inactive` event (with the idle seconds),
 *   2. writes a lightweight document to the `activity_events` collection so the
 *      couple can see who stopped browsing and when (a Cloud Function can also
 *      notify them).
 *
 * The hook exposes `isActive` (false once the guest goes idle) so other hooks
 * (e.g. `useSectionTime`) can pause their accumulation while the guest is not
 * actually engaged — idle time is not "time spent" on a section.
 *
 * Safe no-op when not signed in, when Analytics is unavailable, or when the
 * browser lacks the needed APIs.
 *
 * @param {object} opts
 * @param {string} [opts.guestId]  The signed-in guest's id (auth uid). When
 *   omitted, the tracker still logs analytics but skips the Firestore write.
 * @param {number} [opts.thresholdMs]  Idle threshold in ms (default 5 min).
 * @returns {{ isActive: boolean, lastActivityAt: number|null }}
 */
export function useActivityTracker({
  guestId,
  thresholdMs = 5 * 60 * 1000,
} = {}) {
  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const idleLoggedRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Reset the idle timer and mark the guest active again.
    const markActive = () => {
      lastActivityRef.current = Date.now();
      idleLoggedRef.current = false;
      setIsActive(true);
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(onIdle, thresholdMs);
    };

    // Fired once the guest has been idle for `thresholdMs`.
    const onIdle = () => {
      if (idleLoggedRef.current) return;
      idleLoggedRef.current = true;
      setIsActive(false);

      const idleSeconds = Math.round((Date.now() - lastActivityRef.current) / 1000);

      // 1) Analytics event (safe no-op when Analytics is off).
      trackEvent("user_inactive", {
        idle_seconds: idleSeconds,
        guest_id: guestId || "",
      });

      // 2) Firestore record for the couple (best-effort, fire-and-forget).
      if (guestId) {
        addDoc(collection(db, "activity_events"), {
          guestId,
          type: "inactive",
          idleSeconds,
          createdAt: serverTimestamp(),
        }).catch((error) => {
          if (typeof console !== "undefined") {
            console.warn("[activity] failed to log inactivity", error);
          }
        });
      }
    };

    // The events that count as "activity". `pointerdown` covers mouse + touch
    // taps; we keep `mousemove`/`scroll` throttled via the timer reset itself
    // (they fire often, but resetting a timer is cheap).
    const ACTIVITY_EVENTS = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
      "wheel",
    ];

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, markActive, { passive: true }),
    );

    // Start the idle timer immediately.
    timerRef.current = window.setTimeout(onIdle, thresholdMs);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, markActive),
      );
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId, thresholdMs]);

  return { isActive, lastActivityAt: lastActivityRef.current };
}
