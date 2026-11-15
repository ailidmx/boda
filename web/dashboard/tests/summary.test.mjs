import assert from "node:assert/strict";
import test from "node:test";

import { summaryVisibleForTab } from "../src/summary.js";

test("the summary only lives on INVITADOS and MESAS", () => {
  assert.equal(summaryVisibleForTab("guests"), true);
  assert.equal(summaryVisibleForTab("tables"), true);
});

test("every other tab hides the invitation and day cards", () => {
  for (const tab of [
    "charts",
    "cabins",
    "thanks",
    "budget",
    "cardVotes",
    "guisoRankings",
    "songRequests",
    "analytics",
    "providers",
    "timeline",
    "ceremonia",
    "plaza",
    "unknown",
    "",
  ]) {
    assert.equal(summaryVisibleForTab(tab), false, `${tab} must hide the summary`);
  }
});
