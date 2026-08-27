import { useEffect, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { trackPageView } from "../analytics.js";
import { isLocalHost } from "../environment.js";

/**
 * Custom event dispatched by the navigation (Nav.jsx) whenever a nav link is
 * clicked, so a page view can be attributed to the navigation cause instead of
 * a plain scroll. The detail carries the target section id and the navigation
 * type ("nav" | "side_drawer" | "mobile_menu" | "fab").
 */
export const NAVIGATE_EVENT = "boda:navigate";

/**
 * Dispatch a navigation event so `usePageViewTracking` can attribute the next
 * page view to the navigation cause. Call this from nav link click handlers.
 *
 * @param {object} opts
 * @param {string} opts.sectionId       Target section id (e.g. "story").
 * @param {string} [opts.navigationType]  "nav" | "side_drawer" | "mobile_menu"
 *   | "fab". Defaults to "nav".
 */
export function dispatchNavigate({ sectionId, navigationType = "nav" } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, {
      detail: { sectionId, navigationType },
    }),
  );
}


/**
 * usePageViewTracking — treat every section view as a page view.
 *
 * This single-page invitation renders all sections stacked vertically, so
 * "which page is the guest on" is really "which section is currently visible".
 * This hook observes every `<section id="...">` (plus the hero and footer) with
 * an IntersectionObserver and, whenever the dominant visible section changes,
 * logs a `page_view` Analytics event with:
 *   - page_title   : the section id (e.g. "story")
 *   - page_path    : "/#story"
 *   - navigation_type : how the guest got there
 *
 * The navigation cause is captured via the `boda:navigate` custom event that
 * Nav dispatches when a nav link is clicked. If no navigation event preceded
 * the section change, it is attributed to "scroll" (or "initial" for the very
 * first section on load).
 *
 * Each page view is ALSO persisted to the append-only `page_views` Firestore
 * collection (guestId, sectionId, navigationType, createdAt) so the couple can
 * analyze per-user page views without GA4 credentials. The write is best-effort
 * and fire-and-forget — it must never block or break the invitation.
 *
 * Safe no-op when not signed in, when Analytics is unavailable, or when the
 * browser lacks IntersectionObserver.
 *
 * @param {object} opts
 * @param {string} [opts.guestId]  The signed-in guest's id (auth uid). When
 *   omitted, page views are still logged to Analytics but not persisted.
 */
export function usePageViewTracking({ guestId } = {}) {
  // The section id currently considered "the page" the guest is on.
  const currentRef = useRef(null);
  // The navigation cause pending attribution for the next section change.
  const pendingNavRef = useRef(null);
  // Whether we've logged the very first page view yet.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;

    // The sections we treat as "pages". The hero has no id, so we give it a
    // stable synthetic id. Everything else is a real `<section id="...">`.
    const hero = document.querySelector("main > .hero, main > [class*='hero']");
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    const nodes = hero ? [hero, ...sections] : sections;

    if (nodes.length === 0) return undefined;

    // Map each observed node to its page id.
    const idFor = (node) => node.id || "home";

    // Track the intersection ratio of each node so we can pick the dominant one.
    const ratios = new Map();

    const logPageView = (sectionId, navigationType) => {
      if (!sectionId) return;
      trackPageView({
        pageTitle: sectionId,
        pagePath: `/#${sectionId}`,
        navigationType,
      });

      // Persist for per-user analysis (best-effort).
      if (guestId && !isLocalHost()) {
        addDoc(collection(db, "page_views"), {
          guestId,
          sectionId,
          navigationType,
          createdAt: serverTimestamp(),
        }).catch((error) => {
          if (typeof console !== "undefined") {
            console.warn("[pageview] failed to log page view", error);
          }
        });
      }
    };

    // Determine the dominant visible section and, if it changed, log a page view.
    const updateCurrent = () => {
      let bestId = null;
      let bestRatio = 0;
      ratios.forEach((ratio, node) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = idFor(node);
        }
      });
      if (!bestId) return;

      if (currentRef.current === bestId) return;

      // Attribute the cause: a pending navigation event wins; otherwise the
      // first change is "initial" and later ones are "scroll".
      let navigationType = "scroll";
      if (pendingNavRef.current) {
        navigationType = pendingNavRef.current;
        pendingNavRef.current = null;
      } else if (!initializedRef.current) {
        navigationType = "initial";
      }

      currentRef.current = bestId;
      initializedRef.current = true;
      logPageView(bestId, navigationType);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        updateCurrent();
      },
      // A low threshold so we catch sections as soon as they peek in, and a
      // generous rootMargin so the "current" section updates as the guest
      // scrolls toward it (matching the nav scroll-spy feel).
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: "0px 0px -20% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));

    // Capture the navigation cause from Nav.jsx.
    const onNavigate = (event) => {
      const detail = event?.detail || {};
      pendingNavRef.current = detail.navigationType || "nav";
      // If the target section is already the current one (e.g. re-clicking the
      // active link), still log a page view so the navigation is recorded.
      if (detail.sectionId && detail.sectionId === currentRef.current) {
        logPageView(detail.sectionId, pendingNavRef.current);
        pendingNavRef.current = null;
      }
    };
    window.addEventListener(NAVIGATE_EVENT, onNavigate);

    // Log the initial page view once the observer has settled.
    const initialTimer = window.setTimeout(updateCurrent, 300);

    return () => {
      observer.disconnect();
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      window.clearTimeout(initialTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId]);
}
