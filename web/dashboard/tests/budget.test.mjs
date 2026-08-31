import assert from "node:assert/strict";
import test from "node:test";

import {
  slotDurationHours,
  roundQuantity,
  calculateBase,
  calculateOfferCost,
} from "../src/budget/pricing.js";

import { projectBudget } from "../src/budget/projection.js";

import { selectSlotOffer, selectCandidate } from "../src/budget/domain.js";
import { buildContributionPayload, buildPaymentPayload } from "../../shared/payload-builders.js";

const SAT_18 = "2027-02-20T18:00:00-06:00";
const SAT_20 = "2027-02-20T20:00:00-06:00";
const SAT_21 = "2027-02-20T21:00:00-06:00";
const FRI_14 = "2027-02-19T14:00:00-06:00";
const SUN_10 = "2027-02-21T10:00:00-06:00";

// ── Pricing models ───────────────────────────────────────────────────────
test("hourly × duration", () => {
  const offer = { pricingModel: "hourly", pricingData: { hourlyRate: 5000 } };
  const slot = { startDateTime: SAT_18, endDateTime: SAT_20 };
  const cost = calculateOfferCost({ offer, slot, weddingContext: {} });
  assert.equal(cost.total, 10000);
  assert.equal(cost.breakdown[0].label, "Tarifa por hora");
});

test("hourly recalculates when duration changes", () => {
  const offer = { pricingModel: "hourly", pricingData: { hourlyRate: 5000 } };
  const a = calculateOfferCost({ offer, slot: { startDateTime: SAT_18, endDateTime: SAT_20 } });
  const b = calculateOfferCost({ offer, slot: { startDateTime: SAT_18, endDateTime: SAT_21 } });
  assert.equal(a.total, 10000);
  assert.equal(b.total, 15000);
});

test("fixed package", () => {
  const offer = { pricingModel: "fixed", pricingData: { amount: 13000 } };
  assert.equal(calculateOfferCost({ offer }).total, 13000);
});

test("per-person × guest count", () => {
  const offer = { pricingModel: "per_person", pricingData: { pricePerPerson: 520 } };
  const cost = calculateOfferCost({ offer, weddingContext: { guestCount: 150 } });
  assert.equal(cost.total, 78000);
});

test("per-person recalculates when guest count changes", () => {
  const offer = { pricingModel: "per_person", pricingData: { pricePerPerson: 110 } };
  assert.equal(calculateOfferCost({ offer, weddingContext: { guestCount: 152 } }).total, 16720);
  assert.equal(calculateOfferCost({ offer, weddingContext: { guestCount: 145 } }).total, 15950);
});

test("per-item × quantity × rental days", () => {
  const offer = { pricingModel: "per_item", pricingData: { pricePerItem: 20, quantity: 150 } };
  const slot = { startDateTime: FRI_14, endDateTime: SUN_10 }; // 2 days
  const cost = calculateOfferCost({ offer, slot, requirements: { quantity: 150 } });
  assert.equal(cost.total, 150 * 20 * 2);
});

test("daily rate over a multi-day slot", () => {
  const offer = { pricingModel: "daily", pricingData: { dayRate: 9500 } };
  const slot = { startDateTime: FRI_14, endDateTime: SUN_10 };
  assert.equal(calculateOfferCost({ offer, slot }).total, 9500 * 2);
});

test("quantity_formula: guestCount × multiplier / divisor × unitPrice", () => {
  const offer = {
    pricingModel: "quantity_formula",
    pricingData: { quantityFormula: { source: "guestCount", multiplier: 3, divisor: 1, rounding: "none" }, unitPrice: 25, unitLabel: "cerveza" },
  };
  const cost = calculateOfferCost({ offer, weddingContext: { guestCount: 152 } });
  assert.equal(cost.total, 456 * 25);
});

test("quantity_formula: one bottle per 10 people rounds UP (ceil)", () => {
  const offer = {
    pricingModel: "quantity_formula",
    pricingData: { quantityFormula: { source: "guestCount", multiplier: 1, divisor: 10, rounding: "ceil" }, unitPrice: 400 },
  };
  const cost = calculateOfferCost({ offer, weddingContext: { guestCount: 152 } });
  assert.equal(cost.total, 16 * 400); // 15.2 → 16 bottles
});

test("package + extra hours", () => {
  const offer = { pricingModel: "package", pricingData: { packagePrice: 13000, includedHours: 3, extraHourRate: 2000 } };
  const slot = { startDateTime: SAT_18, endDateTime: "2027-02-20T23:00:00-06:00" }; // 5h
  assert.equal(calculateOfferCost({ offer, slot }).total, 13000 + 2 * 2000);
});

test("additional fixed travel fee", () => {
  const offer = { pricingModel: "hourly", pricingData: { hourlyRate: 5000 }, additionalCharges: [{ type: "travel", name: "Viaje", calculationMode: "fixed", value: 1500 }] };
  const slot = { startDateTime: SAT_18, endDateTime: SAT_20 };
  const cost = calculateOfferCost({ offer, slot });
  assert.equal(cost.subtotal, 10000);
  assert.equal(cost.chargesTotal, 1500);
  assert.equal(cost.total, 11500);
});

test("percentage service charge", () => {
  const offer = { pricingModel: "fixed", pricingData: { amount: 10000 }, additionalCharges: [{ type: "service_charge", name: "Servicio", calculationMode: "percentage", value: 10 }] };
  const cost = calculateOfferCost({ offer });
  assert.equal(cost.chargesTotal, 1000);
  assert.equal(cost.total, 11000);
});

test("tax excluded adds on top", () => {
  const offer = { pricingModel: "fixed", pricingData: { amount: 10000 }, taxConfiguration: { mode: "excluded", rate: 16 } };
  assert.equal(calculateOfferCost({ offer }).total, 11600);
});

// ── Slot selection invariant ─────────────────────────────────────────────
test("slot: zero selected allowed, one selected, second replaces first", () => {
  let slot = { id: "s1" };
  assert.equal(slot.selectedOfferId, undefined); // zero allowed

  slot = selectSlotOffer(slot, "offer-a");
  assert.equal(slot.selectedOfferId, "offer-a");

  slot = selectSlotOffer(slot, "offer-b");
  assert.equal(slot.selectedOfferId, "offer-b"); // replaced, never two
});

test("selectCandidate atomically unselects previous", () => {
  const cands = [
    { id: "c1", status: "selected" },
    { id: "c2", status: "shortlisted" },
    { id: "c3", status: "considering" },
  ];
  const next = selectCandidate(cands, "c3");
  assert.equal(next.filter((c) => c.status === "selected").length, 1);
  assert.equal(next.find((c) => c.id === "c3").status, "selected");
  assert.equal(next.find((c) => c.id === "c1").status, "considering");
});

// ── Budget projection ────────────────────────────────────────────────────
test("projectBudget: candidate excluded, selected included, manual included", () => {
  const offers = [
    { id: "offer-a", name: "Mariachi 10", categoryId: "music", pricingModel: "fixed", pricingData: { amount: 8500 } },
    { id: "offer-b", name: "Mariachi 12", categoryId: "music", pricingModel: "fixed", pricingData: { amount: 10500 } },
  ];
  const slots = [
    { id: "slot-music", name: "Cocktail Mariachi", categoryId: "music", selectedOfferId: "offer-b" },
    { id: "slot-photo", name: "Fotografía", categoryId: "photography", selectedOfferId: null },
  ];
  const manualItems = [{ id: "m1", name: "Licencia de matrimonio", categoryId: "services", amount: 2000 }];

  const budget = projectBudget({ slots, offers, manualItems });

  assert.equal(budget.total, 10500 + 2000);
  assert.equal(budget.byCategory.music, 10500);
  assert.equal(budget.byCategory.services, 2000);
  assert.deepEqual(budget.unresolved, ["slot-photo"]);
});

test("provider reuse: same offer in two slots contributes twice", () => {
  const offers = [{ id: "offer-x", name: "DJ", categoryId: "music", pricingModel: "fixed", pricingData: { amount: 8000 } }];
  const slots = [
    { id: "s1", name: "DJ cocktail", categoryId: "music", selectedOfferId: "offer-x" },
    { id: "s2", name: "DJ party", categoryId: "music", selectedOfferId: "offer-x" },
  ];
  const budget = projectBudget({ slots, offers });
  assert.equal(budget.total, 16000);
});

test("duration + quantity are derived (canonical start/end)", () => {
  assert.equal(slotDurationHours({ startDateTime: SAT_18, endDateTime: SAT_20 }), 2);
  assert.equal(roundQuantity(15.2, "ceil"), 16);
  assert.equal(roundQuantity(15.2, "none"), 15.2);
});

test("calculateBase defaults", () => {
  assert.equal(calculateBase("hourly", { hourlyRate: 4000 }, { durationHours: 2 }).amount, 8000);
  assert.equal(calculateBase("per_person", { pricePerPerson: 500 }, { guestCount: 100 }).amount, 50000);
});

test("payment payload keeps settlement-compatible payer and state", () => {
  const payload = buildPaymentPayload({
    budgetItemId: "food", amount: "500", payerId: "david",
    type: "deposit", kind: "actual", status: "paid",
  });
  assert.equal(payload.payerId, "david");
  assert.equal(payload.paidById, "david");
  assert.equal(payload.kind, "actual");
  assert.equal(payload.status, "paid");
});

test("contribution payload keeps both item references", () => {
  const payload = buildContributionPayload({
    sourceType: "person", contributorName: "Mamá", budgetItemId: "dress",
    coverageMode: "full", amount: 1000, status: "pledged",
  });
  assert.equal(payload.budgetItemId, "dress");
  assert.equal(payload.appliesToItemId, "dress");
  assert.equal(payload.contributorName, "Mamá");
  assert.equal(payload.coverageMode, "full");
});
