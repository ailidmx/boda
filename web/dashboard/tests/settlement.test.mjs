import test from "node:test";
import assert from "node:assert/strict";
import { contributionAmount, normalizeShares, settleBudget } from "../src/budget/settlement.js";

test("responsibility defaults to 50/50", () => {
  assert.deepEqual(normalizeShares(), { david: 0.5, ayde: 0.5 });
});

test("full padrino funding stays in gross budget and removes couple responsibility", () => {
  const result = settleBudget({
    items: [{ id: "dress", amount: 5000 }],
    contributions: [{ budgetItemId: "dress", coverageMode: "full", status: "pledged" }],
  });
  assert.equal(result.grossBudget, 5000);
  assert.equal(result.externalCommitted, 5000);
  assert.equal(result.coupleResponsibility, 0);
  assert.equal(result.externalReceived, 0);
});

test("partial padrino amount is capped at the service total", () => {
  assert.equal(contributionAmount({ coverageMode: "amount", amount: 12000, status: "received" }, 5000), 12000);
  const result = settleBudget({
    items: [{ id: "music", amount: 5000 }],
    contributions: [{ budgetItemId: "music", coverageMode: "amount", amount: 12000, status: "received" }],
  });
  assert.equal(result.externalCommitted, 5000);
});

test("custom responsibility and actual payer produce a couple transfer", () => {
  const result = settleBudget({
    items: [
      { id: "ring", amount: 6000, responsibilityShares: { david: 1, ayde: 0 } },
      { id: "food", amount: 10000 },
    ],
    payments: [
      { budgetItemId: "ring", amount: 6000, payerId: "david", status: "paid" },
      { budgetItemId: "food", amount: 10000, payerId: "ayde", status: "paid" },
    ],
  });
  assert.deepEqual(result.expected, { david: 11000, ayde: 5000 });
  assert.deepEqual(result.paid, { david: 6000, ayde: 10000 });
  assert.deepEqual(result.transfer, { from: "david", to: "ayde", amount: 5000 });
  assert.equal(result.outstanding, 0);
});

test("planned installments are not counted as money already paid", () => {
  const result = settleBudget({
    items: [{ id: "vendor", amount: 10000 }],
    payments: [
      { budgetItemId: "vendor", kind: "planned", amount: 1000, payerId: "david", status: "planned" },
      { budgetItemId: "vendor", kind: "planned", amount: 4500, payerId: "ayde", status: "planned" },
    ],
  });
  assert.equal(result.couplePaid, 0);
  assert.equal(result.outstanding, 10000);
});
