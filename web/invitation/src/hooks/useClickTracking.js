import { useEffect } from "react";
import { trackClick } from "../analytics.js";

/**
 * Derive a stable, human-readable identifier for a clicked element so every
 * click can be clearly identified in Analytics.
 *
 * Priority:
 *   1. `data-analytics` attribute (explicit, most reliable).
 *   2. The element's `id`.
 *   3. A compact `tag.class` (first class) + trimmed text fallback.
 *
 * @param {Element} el  The clicked element.
 * @returns {string}  A stable identifier like "nav.gift" or "rsvp.submit".
 */
export function resolveClickId(el) {
  if (!el) return "unknown";
  const explicit = el.getAttribute && el.getAttribute("data-analytics");
  if (explicit) return explicit;
  if (el.id) return el.id;
  const tag = (el.tagName || "").toLowerCase();
  const cls = (el.className && String(el.className).split(" ")[0]) || "";
  const text = (el.textContent || "").trim().slice(0, 24);
  return [tag, cls, text].filter(Boolean).join(".");
}

/**
 * useClickTracking — add a single delegated click listener on `document` that
 * logs every click to Analytics via `trackClick`. The identifier is resolved
 * from the clicked element (see `resolveClickId`), and the nearest ancestor
 * section id is attached as context so we know where the click happened.
 *
 * Safe no-op when Analytics is unavailable.
 *
 * @param {string} [rootSelector]  Optional CSS selector to scope tracking to a
 *   subtree (e.g. "#main"). Defaults to the whole document.
 */
export function useClickTracking(rootSelector) {
  useEffect(() => {
    const onClick = (event) => {
      const target = event.target;
      if (!target || !target.closest) return;

      // If scoped, ignore clicks outside the root.
      if (rootSelector && !target.closest(rootSelector)) return;

      const el = target.closest(
        "a, button, [data-analytics], [role='button'], input, select, textarea",
      ) || target;

      const elementId = resolveClickId(el);

      // Attach the enclosing section id (e.g. "rsvp", "music") as context.
      const section = el.closest("[id]");
      const sectionId = section ? section.id : "";

      trackClick(elementId, { section_id: sectionId });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [rootSelector]);
}
