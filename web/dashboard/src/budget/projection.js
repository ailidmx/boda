// projection.js — pure budget projection. Derives budget lines from selected
// offers + manual items. Candidate (unselected) offers are EXCLUDED.
import { calculateOfferCost } from "./pricing.js";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Budget projection = selected offers + manual items.
 * @returns {{ lines, total, byCategory, unresolved }}
 */
export function projectBudget({ slots = [], offers = [], manualItems = [], weddingContext = {} }) {
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const lines = [];
  const unresolved = [];

  for (const slot of slots) {
    if (slot.selectedOfferId && offerById.has(slot.selectedOfferId)) {
      const offer = offerById.get(slot.selectedOfferId);
      const cost = calculateOfferCost({ offer, slot, requirements: slot.requirements || {}, weddingContext });
      lines.push({
        id: `slot:${slot.id}`,
        sourceType: "provider_offer",
        sourceId: offer.id,
        categoryId: slot.categoryId || offer.categoryId,
        description: slot.name || offer.name,
        amount: cost.total,
        currency: cost.currency,
        cost,
      });
    } else {
      unresolved.push(slot.id);
    }
  }

  for (const item of manualItems) {
    lines.push({
      id: `manual:${item.id}`,
      sourceType: "manual",
      sourceId: item.id,
      categoryId: item.categoryId,
      description: item.name ?? item.title,
      amount: num(item.amount),
      currency: item.currency || "MXN",
    });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const byCategory = {};
  for (const l of lines) {
    const c = l.categoryId || "other";
    byCategory[c] = (byCategory[c] || 0) + l.amount;
  }

  return { lines, total, byCategory, unresolved };
}

export default { projectBudget };
