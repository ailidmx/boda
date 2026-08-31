import assert from "node:assert/strict";
import test from "node:test";
import { buildProviderMigration } from "../../../scripts/import-boda-providers.mjs";

test("provider migration seeds documented providers without inventing placeholders", () => {
  const result = buildProviderMigration([], null);
  assert.deepEqual(result.providers.map((provider) => provider.name), [
    "Club Roca Azul",
    "Deliciosas Carnitas El Inge",
    "Marimba Vientos Sur",
  ]);
  assert.equal(result.offers.length, 2);
  assert.equal(result.itemUpdates.length, 0);
});

test("provider migration links Roca Azul and carnitas while leaving generic expenses unmatched", () => {
  const items = [
    { id: "roca", name: "Roca Azul - Espacio", categoryId: "venue", amount: 24570, pricingModel: "fixed", pricingData: { amount: 24570 } },
    { id: "carnitas", name: "Carnitas sábado", categoryId: "food", amount: 16500 },
    { id: "dress", name: "Vestido novia", categoryId: "couple", amount: 5000 },
  ];
  const result = buildProviderMigration(items, null);
  assert.equal(result.offers.length, 3);
  assert.deepEqual(result.itemUpdates.map((update) => update.id).sort(), ["carnitas", "roca"]);
  assert.deepEqual(result.unmatchedItems, [{ id: "dress", name: "Vestido novia" }]);
});

test("provider migration is deterministic", () => {
  const items = [{ id: "roca", name: "Roca Azul - Espacio", categoryId: "venue", amount: 24570 }];
  assert.deepEqual(buildProviderMigration(items, null), buildProviderMigration(items, null));
});
