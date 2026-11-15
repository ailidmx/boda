import assert from "node:assert/strict";
import test from "node:test";

// tabNav.js is a browser module: stub the small DOM surface it touches so the
// URL ↔ tab mapping can be exercised in Node (the same way the browser would).
function stubBrowser(pathname = "/dashboard/") {
  const pushed = [];
  globalThis.window = {
    location: { pathname },
    history: { pushState: (_state, _title, url) => pushed.push(url) },
    dispatchEvent() {},
    addEventListener() {},
  };
  globalThis.document = {
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
  return pushed;
}

// ── URL ↔ tab mapping ────────────────────────────────────────────────────
test("every tab keeps its own URL segment", async () => {
  const pushed = stubBrowser("/dashboard/invitados");
  const { navigateToTab } = await import("../src/tabNav.js");
  navigateToTab("ceremonia");
  assert.deepEqual(pushed, ["/dashboard/ceremonia"]);
});

test("a ceremonia deep link resolves to the ceremonia tab", async () => {
  stubBrowser("/dashboard/ceremonia");
  const { getTabFromPath } = await import("../src/tabNav.js");
  assert.equal(getTabFromPath(), "ceremonia");
});

test("the plaza tab also keeps its own URL segment", async () => {
  const pushed = stubBrowser("/dashboard/invitados");
  const { navigateToTab, getTabFromPath } = await import("../src/tabNav.js");
  navigateToTab("plaza");
  assert.deepEqual(pushed, ["/dashboard/plaza"]);
  window.location.pathname = "/dashboard/plaza";
  assert.equal(getTabFromPath(), "plaza");
});

test("an unknown deep link falls back to the guests tab", async () => {
  stubBrowser("/dashboard/no-existe");
  const { getTabFromPath } = await import("../src/tabNav.js");
  assert.equal(getTabFromPath(), "guests");
});
