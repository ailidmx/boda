import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStayCartItems,
  trackPageView,
  trackAction,
  ACTION_TYPES,
} from "../src/analytics.js";
import { resolveClickId } from "../src/hooks/useClickTracking.js";


// ── buildStayCartItems ──────────────────────────────────────────────────

test("builds a primary stay cart item", () => {
  const items = buildStayCartItems({
    primary: {
      cabin: { name: "Casona" },
      assignedCabin: "casona",
      perPersonToPay: 1500,
      activeCabinPerPerson: 2000,
    },
    extra: null,
  });
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    item_id: "stay:casona",
    item_name: "Casona",
    item_category: "stay",
    price: 1500,
    original_price: 2000,
    quantity: 1,
  });
});

test("builds primary + extra stay cart items", () => {
  const items = buildStayCartItems({
    primary: {
      cabin: { name: "Casona" },
      assignedCabin: "casona",
      perPersonToPay: 1500,
      activeCabinPerPerson: 2000,
    },
    extra: {
      cabin: { name: "Azalea" },
      assignedCabin: "azalea",
      perPersonToPay: 800,
      activeCabinPerPerson: 800,
    },
  });
  assert.equal(items.length, 2);
  assert.equal(items[0].item_id, "stay:casona");
  assert.equal(items[1].item_id, "xtra:azalea");
  assert.equal(items[1].item_category, "extra_stay");
});

test("returns empty array when no priced stays", () => {
  assert.deepEqual(buildStayCartItems({ primary: null, extra: null }), []);
  assert.deepEqual(buildStayCartItems({}), []);
  assert.deepEqual(buildStayCartItems(), []);
});

test("falls back to cabin id when no name", () => {
  const items = buildStayCartItems({
    primary: {
      cabin: {},
      assignedCabin: "casona",
      perPersonToPay: 0,
      activeCabinPerPerson: 0,
    },
    extra: null,
  });
  assert.equal(items[0].item_name, "casona");
  assert.equal(items[0].price, 0);
});

test("covered stay (price 0) still produces an item", () => {
  const items = buildStayCartItems({
    primary: {
      cabin: { name: "Casona" },
      assignedCabin: "casona",
      perPersonToPay: 0, // covered by the couple
      activeCabinPerPerson: 2000,
    },
    extra: null,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 0);
  assert.equal(items[0].original_price, 2000);
});

// ── resolveClickId ──────────────────────────────────────────────────────

function makeEl({ id, className, text, dataAnalytics }) {
  return {
    id: id || "",
    className: className || "",
    tagName: "BUTTON",
    textContent: text || "",
    getAttribute(name) {
      if (name === "data-analytics") return dataAnalytics || null;
      return null;
    },
  };
}

test("prefers the data-analytics attribute", () => {
  const el = makeEl({
    id: "some-id",
    className: "btn",
    text: "Save",
    dataAnalytics: "rsvp.submit",
  });
  assert.equal(resolveClickId(el), "rsvp.submit");
});

test("falls back to the element id", () => {
  const el = makeEl({ id: "nav-gift", className: "nav-link", text: "Gift" });
  assert.equal(resolveClickId(el), "nav-gift");
});

test("falls back to tag.class.text", () => {
  const el = makeEl({ className: "button--gold", text: "Confirm" });
  assert.equal(resolveClickId(el), "button.button--gold.Confirm");
});

test("handles missing element", () => {
  assert.equal(resolveClickId(null), "unknown");
  assert.equal(resolveClickId(undefined), "unknown");
});

// ── trackPageView / trackAction (no-op safety) ─────────────────────────
// In a Node test environment `analytics` is unavailable, so these helpers are
// no-ops. We assert they never throw and that the ACTION_TYPES catalog is
// stable (used by reports to filter events).

test("trackPageView is a safe no-op without analytics", () => {
  assert.doesNotThrow(() =>
    trackPageView({ pageTitle: "story", pagePath: "/#story", navigationType: "nav" }),
  );
  assert.doesNotThrow(() => trackPageView());
});

test("trackAction is a safe no-op without analytics", () => {
  assert.doesNotThrow(() =>
    trackAction(ACTION_TYPES.FAB, "music.fab", { section_id: "music" }),
  );
  assert.doesNotThrow(() => trackAction(ACTION_TYPES.RSVP_ANSWER, "rsvp.answer.4"));
});

test("ACTION_TYPES exposes the canonical categories", () => {
  assert.deepEqual(ACTION_TYPES, {
    NAVIGATION: "navigation",
    FAB: "fab",
    RSVP_ANSWER: "rsvp_answer",
    FORM_SUBMIT: "form_submit",
    MENU: "menu",
    TOGGLE: "toggle",
    MODAL: "modal",
  });
});

