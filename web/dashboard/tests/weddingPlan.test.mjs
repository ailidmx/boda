import assert from "node:assert/strict";
import test from "node:test";

import {
  validateProviderPayload,
  validateOfferPayload,
  validateTimelineSlotPayload,
  validateBudgetManualItemPayload,
  validateContributionPayload,
  validatePaymentPayload,
} from "../../shared/validation.js";

import {
  buildProviderPayload,
  buildOfferPayload,
  buildBudgetManualItemPayload,
} from "../../shared/payload-builders.js";

test("buildProviderPayload sanitizes + preserves arrays", () => {
  const p = buildProviderPayload({ name: "  Eventos García  ", categoryIds: ["furniture", " ", "decoration"], contact: { phone: "123" }, timestamp: null });
  assert.equal(p.name, "Eventos García");
  assert.deepEqual(p.categoryIds, ["furniture", "decoration"]);
  assert.equal(p.status, "active");
});

test("validateProviderPayload rejects empty name", () => {
  assert.equal(validateProviderPayload({ name: "" }).valid, false);
  assert.equal(validateProviderPayload({ name: "Beto", categoryIds: [] }).valid, true);
});

test("validateOfferPayload requires providerId + valid pricing model", () => {
  assert.equal(validateOfferPayload({ providerId: "", name: "Taquiza", pricingModel: "fixed" }).valid, false);
  assert.equal(validateOfferPayload({ providerId: "p1", name: "Taquiza", pricingModel: "per_person" }).valid, true);
  assert.equal(validateOfferPayload({ providerId: "p1", name: "Taquiza", pricingModel: "nonsense" }).valid, false);
});

test("buildOfferPayload defaults pricing model + currency", () => {
  const o = buildOfferPayload({ providerId: "p1", name: "Menu A", pricingData: { pricePerPerson: 520 }, timestamp: null });
  assert.equal(o.pricingModel, "fixed");
  assert.equal(o.currency, "MXN");
});

test("validateTimelineSlotPayload requires layerId + start/end", () => {
  assert.equal(validateTimelineSlotPayload({ layerId: "", name: "x", startAt: 1, endAt: 2 }).valid, false);
  assert.equal(validateTimelineSlotPayload({ layerId: "l1", name: "Cocktail", startAt: 1, endAt: 2 }).valid, true);
});

test("validateBudgetManualItemPayload requires name + numeric amount", () => {
  assert.equal(validateBudgetManualItemPayload({ name: "", amount: 10 }).valid, false);
  assert.equal(validateBudgetManualItemPayload({ name: "Licencia", amount: "not-a-number" }).valid, false);
  assert.equal(validateBudgetManualItemPayload({ name: "Licencia", amount: 1500 }).valid, true);
});

test("validateContributionPayload accepts amount or percentage", () => {
  assert.equal(validateContributionPayload({ sourceType: "person", amount: 5000 }).valid, true);
  assert.equal(validateContributionPayload({ sourceType: "person", percentage: 50 }).valid, true);
  assert.equal(validateContributionPayload({ sourceType: "weird" }).valid, false);
});

test("validatePaymentPayload checks type", () => {
  assert.equal(validatePaymentPayload({ amount: 1000, type: "deposit" }).valid, true);
  assert.equal(validatePaymentPayload({ amount: 1000, type: "other" }).valid, false);
});

test("buildBudgetManualItemPayload coerces amount", () => {
  const m = buildBudgetManualItemPayload({ name: "Permiso", amount: "750", timestamp: null });
  assert.equal(m.amount, 750);
  assert.equal(m.currency, "MXN");
});
