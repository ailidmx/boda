// domain.js — budget/timeline/provider domain constants + invariants (PURE).
// No Firestore / React / DOM. This is the single source of truth for category
// ids, status vocabularies, and the "one selected offer per slot" invariant.

export const PROVIDER_CATEGORIES = [
  { id: "music", label: "Música" },
  { id: "food", label: "Comida / Catering" },
  { id: "beverages", label: "Bebidas" },
  { id: "desserts", label: "Postres" },
  { id: "furniture", label: "Mobiliario" },
  { id: "decoration", label: "Decoración" },
  { id: "photography", label: "Fotografía" },
  { id: "video", label: "Video" },
  { id: "lighting", label: "Iluminación" },
  { id: "venue", label: "Venue" },
  { id: "transport", label: "Transporte" },
  { id: "accommodation", label: "Alojamiento" },
  { id: "staff", label: "Staff" },
  { id: "flowers", label: "Flores" },
  { id: "entertainment", label: "Entretenimiento" },
  { id: "rental", label: "Renta de equipo" },
  { id: "couple", label: "Novios" },
  { id: "post_wedding_trip", label: "Viaje / Playa" },
  { id: "services", label: "Servicios" },
  { id: "custom", label: "Personalizado" },
];

export const CANDIDATE_STATUSES = ["considering", "quoted", "shortlisted", "rejected", "selected"];
export const OFFER_STATUSES = ["draft", "requested", "quoted", "negotiating", "accepted", "rejected", "expired"];
export const BUDGET_SOURCE_TYPES = ["provider_offer", "formula", "manual", "adjustment", "tax", "contingency", "other"];
export const PAYMENT_TYPES = ["deposit", "installment", "balance", "refund"];
export const PAYMENT_DUE_RULES = ["on_booking", "one_week_before", "event_day", "specific_date", "custom"];

/**
 * Select (or clear) the single offer for a slot. A slot holds AT MOST one
 * selected offer; this always REPLACES the previous one atomically.
 */
export function selectSlotOffer(slot, offerId) {
  const selected = offerId == null || offerId === "" ? null : offerId;
  return { ...slot, selectedOfferId: selected };
}

/**
 * Mark one candidate "selected" and demote any previously-selected candidate.
 * Returns a NEW candidates array (never mutates the input).
 */
export function selectCandidate(candidates = [], candidateId) {
  return candidates.map((c) => ({
    ...c,
    status: c.id === candidateId
      ? "selected"
      : (c.status === "selected" ? "considering" : c.status),
  }));
}

export default {
  PROVIDER_CATEGORIES,
  CANDIDATE_STATUSES,
  OFFER_STATUSES,
  BUDGET_SOURCE_TYPES,
  PAYMENT_TYPES,
  PAYMENT_DUE_RULES,
  selectSlotOffer,
  selectCandidate,
};
