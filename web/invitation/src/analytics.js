import { analytics } from "./firebase.js";
import { logEvent } from "firebase/analytics";

/**
 * analytics.js — thin, safe wrapper around Firebase Analytics.
 *
 * The invitation already initializes Firebase Analytics in `firebase.js`
 * (measurementId G-ZDQX91613Z). This module exposes small helpers so the rest
 * of the app can log custom events (funnel steps, cart items, purchases,
 * section time, clicks) without repeating the `logEvent` boilerplate or
 * worrying about the environment.
 *
 * All helpers are no-ops when Analytics is unavailable (e.g. Node.js test
 * environments, or when the browser blocks it), so importing this module is
 * always safe.
 */

const isEnabled = () => typeof analytics !== "undefined" && analytics !== null;

/**
 * Log a raw Analytics event with params. Safe no-op when Analytics is off.
 * @param {string} name  Event name (e.g. "add_to_cart").
 * @param {object} [params]  Event parameters (strings/numbers/booleans).
 */
export function trackEvent(name, params = {}) {
  if (!isEnabled()) return;
  try {
    logEvent(analytics, name, params);
  } catch (error) {
    // Analytics must never break the invitation. Swallow and move on.
    if (typeof console !== "undefined") {
      console.warn("[analytics] failed to log event", name, error);
    }
  }
}

/**
 * Log a funnel step. `step` is a short slug (e.g. "view_cart", "confirm").
 * @param {string} step
 * @param {object} [params]
 */
export function trackFunnelStep(step, params = {}) {
  trackEvent("funnel_step", { step, ...params });
}

/**
 * Log a "cart item" (a priced thing the guest is committing to: a cabin stay,
 * an extra stay, player parts). Mirrors the e-commerce `add_to_cart` pattern.
 * @param {object} item  { item_id, item_name, price, quantity, ... }
 */
export function trackCartItem(item) {
  trackEvent("add_to_cart", {
    currency: "MXN",
    value: item.price ?? 0,
    items: [item],
  });
}

/**
 * Log a successful confirmation (the "sale" done). `items` is an array of
 * cart items; `value` is the total the guest commits to paying.
 * @param {object} opts  { value, currency, items, step }
 */
export function trackPurchase({ value = 0, currency = "MXN", items = [], step = "confirm" } = {}) {
  trackEvent("purchase", {
    currency,
    value,
    items,
    step,
  });
}

/**
 * Log time spent on a section (seconds). Used by the section-time tracking.
 * @param {string} sectionId
 * @param {number} seconds
 */
export function trackSectionTime(sectionId, seconds) {
  trackEvent("section_time", { section_id: sectionId, seconds });
}

/**
 * Log a generic click with an identifier.
 * @param {string} elementId  e.g. "nav.gift", "rsvp.submit".
 * @param {object} [params]
 */
export function trackClick(elementId, params = {}) {
  trackEvent("click", { element_id: elementId, ...params });
}

/**
 * Build the "cart items" for the RSVP funnel from the primary and extra stay
 * amounts returned by `computeStayAmounts`. Each item mirrors the e-commerce
 * `add_to_cart` shape (item_id, item_name, price, original_price, quantity).
 *
 * Pure helper so it can be unit-tested without a React renderer.
 * @param {object} opts  { primary, extra } — the two stay amounts (or null).
 * @returns {Array<object>}  Cart items (empty when no priced stays).
 */
export function buildStayCartItems({ primary, extra } = {}) {
  const items = [];
  if (primary?.cabin) {
    items.push({
      item_id: `stay:${primary.assignedCabin}`,
      item_name: primary.cabin.name || primary.assignedCabin,
      item_category: "stay",
      price: primary.perPersonToPay || 0,
      original_price: primary.activeCabinPerPerson || 0,
      quantity: 1,
    });
  }
  if (extra?.cabin) {
    items.push({
      item_id: `xtra:${extra.assignedCabin}`,
      item_name: extra.cabin.name || extra.assignedCabin,
      item_category: "extra_stay",
      price: extra.perPersonToPay || 0,
      original_price: extra.activeCabinPerPerson || 0,
      quantity: 1,
    });
  }
  return items;
}
