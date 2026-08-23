// pricing.js — pure wedding pricing engine. No Firestore / React / DOM.
//
// Calculates the cost of a provider offer given a timeline slot + requirement
// inputs + a shared wedding context (guest count). Returns a STRUCTURED
// breakdown (not just a number) so the UI can explain WHY something costs what
// it costs.

export const PRICING_MODELS = [
  "fixed", "hourly", "daily", "per_person", "per_item", "per_unit",
  "package", "tiered", "quantity_formula", "composite", "custom",
];

export const ROUNDING_MODES = ["none", "ceil", "floor", "nearest", "package_size"];

export const CHARGE_TYPES = [
  "travel", "delivery", "pickup", "setup", "breakdown", "equipment",
  "staff", "overtime", "deposit", "tax", "service_charge", "custom",
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v) {
  if (v instanceof Date) return v;
  if (v && typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  if (v && typeof v === "object" && v.seconds != null) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Derive hours from a slot's canonical start/end date-times. */
export function slotDurationHours(slot = {}) {
  const start = toDate(slot.startDateTime ?? slot.startAt);
  const end = toDate(slot.endDateTime ?? slot.endAt);
  if (!start || !end || !(end > start)) return 0;
  return (end - start) / 3_600_000;
}

export function slotDurationDays(slot = {}) {
  return slotDurationHours(slot) / 24;
}

/** Round a fractional quantity per a purchasing rule. */
export function roundQuantity(value, mode = "none", packageSize = 1) {
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "floor") return Math.floor(value);
  if (mode === "nearest") return Math.round(value);
  if (mode === "package_size" && packageSize > 0) return Math.ceil(value / packageSize) * packageSize;
  return value; // "none" — keep the decimal estimate
}

/**
 * Resolve a quantity/count source to a number.
 *   - number → itself
 *   - object { sourceType, value } → value (or mapped source)
 *   - string key → ctx[key] (guestCount / slotGuestCount / custom requirement)
 */
export function resolveSourceValue(source, ctx = {}, fallback = 0) {
  if (source == null) return fallback;
  if (typeof source === "number") return source;
  if (typeof source === "object") {
    const v = source.value ?? source.amount ?? source.quantity;
    if (v != null) return num(v);
    return fallback;
  }
  const key = String(source);
  if (key === "guestCount" || key === "weddingGuestCount") return num(ctx.guestCount ?? fallback);
  if (key === "slotGuestCount" || key === "attendeesForSlot") return num(ctx.slotGuestCount ?? ctx.guestCount ?? fallback);
  if (ctx[key] != null) return num(ctx[key]);
  return fallback;
}

function line(label, amount, detail) {
  return { label, amount, detail };
}

/** Calculate the BASE amount for a pricing model → { label, amount, detail }. */
export function calculateBase(model, data = {}, ctx = {}) {
  const guestCount = num(ctx.guestCount);
  const hours = num(ctx.durationHours);
  const days = num(ctx.durationDays ?? hours / 24);

  switch (model) {
    case "fixed": {
      const amount = num(data.amount ?? data.price);
      return line("Precio fijo", amount, String(amount));
    }
    case "hourly": {
      const rate = num(data.hourlyRate);
      let h = hours;
      if (data.minimumDuration) h = Math.max(h, num(data.minimumDuration));
      if (data.maximumDuration) h = Math.min(h, num(data.maximumDuration));
      const amount = h * rate;
      return line("Tarifa por hora", amount, `${h} h × ${rate}`);
    }
    case "daily": {
      const rate = num(data.dayRate ?? data.dailyRate);
      const d = Math.max(1, Math.ceil(days || 1));
      return line("Tarifa por día", d * rate, `${d} día(s) × ${rate}`);
    }
    case "per_person": {
      const price = num(data.pricePerPerson);
      return line("Por persona", guestCount * price, `${guestCount} × ${price}`);
    }
    case "per_item": {
      const price = num(data.pricePerItem);
      const q = resolveSourceValue(data.quantitySource ?? data.quantity ?? "quantity", ctx, 1);
      const rentalDays = Math.max(1, Math.ceil(days || 1));
      return line("Por artículo", q * price * rentalDays, `${q} × ${price} × ${rentalDays} día(s)`);
    }
    case "per_unit": {
      const price = num(data.unitPrice);
      const q = resolveSourceValue(data.quantitySource ?? data.quantity ?? "quantity", ctx, 1);
      return line("Por unidad", q * price, `${q} × ${price}`);
    }
    case "package": {
      const packagePrice = num(data.packagePrice);
      const includedHours = num(data.includedHours);
      const extraRate = num(data.extraHourRate);
      const extraHours = Math.max(0, hours - includedHours);
      const extra = extraHours * extraRate;
      return line("Paquete", packagePrice + extra, extraHours > 0 ? `${packagePrice} + ${extraHours} h extra × ${extraRate}` : String(packagePrice));
    }
    case "quantity_formula": {
      const f = data.quantityFormula || {};
      const source = resolveSourceValue(f.source ?? "guestCount", ctx, guestCount);
      const multiplier = num(f.multiplier ?? 1);
      const divisor = num(f.divisor ?? 1) || 1;
      const raw = (source * multiplier) / divisor;
      const q = roundQuantity(raw, f.rounding ?? f.roundingMode ?? "none", num(f.packageSize ?? 1));
      const price = num(data.unitPrice);
      return line(data.unitLabel ? `Consumible · ${data.unitLabel}` : "Fórmula de cantidad", q * price, `${source} × ${multiplier} / ${divisor} = ${q} × ${price}`);
    }
    case "tiered": {
      const tiers = data.tiers || [];
      const baseQty = resolveSourceValue(data.basisSource ?? "guestCount", ctx, guestCount);
      const tier = tiers.find((t) => baseQty <= num(t.upTo ?? Infinity)) || tiers[tiers.length - 1];
      const amount = tier ? num(tier.price ?? tier.flatPrice) : 0;
      return line("Escalonado", amount, tier ? String(tier.label ?? tier.upTo ?? "") : "—");
    }
    case "composite": {
      const parts = (data.components || []).map((c) => calculateBase(c.pricingModel, c.pricingData || {}, ctx));
      const amount = parts.reduce((s, p) => s + p.amount, 0);
      return line("Compuesto", amount, parts.map((p) => p.label).join(" + "));
    }
    default:
      return line("Personalizado", num(data.amount), String(num(data.amount)));
  }
}

/** Calculate explicit additional charges (travel/setup/staff/…). */
export function calculateAdditionalCharges(charges = [], ctx = {}) {
  const subtotal = num(ctx.subtotal);
  const guestCount = num(ctx.guestCount);
  const hours = num(ctx.durationHours);
  return charges.map((c) => {
    const value = num(c.value);
    let amount = 0;
    let detail = "";
    switch (c.calculationMode ?? c.mode ?? "fixed") {
      case "per_hour": amount = value * hours; detail = `${hours} h × ${value}`; break;
      case "per_person": amount = value * guestCount; detail = `${guestCount} × ${value}`; break;
      case "per_item": amount = value * num(c.quantity ?? 1); detail = `${c.quantity ?? 1} × ${value}`; break;
      case "percentage": amount = subtotal * (value / 100); detail = `${value}% de ${subtotal}`; break;
      default: amount = value; detail = String(value);
    }
    return {
      type: c.type ?? "custom",
      name: c.name ?? c.type ?? "Cargo",
      amount,
      detail,
      taxable: c.taxable !== false,
      optional: Boolean(c.optional),
    };
  });
}

export function calculateTax(taxConfig, taxableBase) {
  if (!taxConfig) return { amount: 0, rate: 0, mode: "none", label: "" };
  const mode = taxConfig.mode ?? (taxConfig.included ? "included" : "excluded");
  const rate = num(taxConfig.rate ?? taxConfig.percentage);
  if (mode === "excluded") {
    return { amount: taxableBase * (rate / 100), rate, mode, label: `IVA ${rate}% (no incluido)` };
  }
  if (mode === "included") return { amount: 0, rate, mode, label: `IVA ${rate}% incluido` };
  return { amount: 0, rate: 0, mode: "none", label: "" };
}

/** Full cost of an offer for a slot. Returns a structured breakdown. */
export function calculateOfferCost({ offer = {}, slot = {}, requirements = {}, weddingContext = {} }) {
  const currency = offer.currency || weddingContext.currency || "MXN";
  const ctx = {
    guestCount: num(weddingContext.guestCount),
    slotGuestCount: num(requirements?.guestCount ?? requirements?.slotGuestCount ?? weddingContext.guestCount),
    durationHours: slotDurationHours(slot),
    durationDays: slotDurationDays(slot),
    ...(requirements || {}),
  };

  const base = calculateBase(offer.pricingModel, offer.pricingData || {}, ctx);
  const subtotal = base.amount;
  const charges = calculateAdditionalCharges(offer.additionalCharges || [], { ...ctx, subtotal });
  const chargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  const taxableCharges = charges.filter((c) => c.taxable).reduce((s, c) => s + c.amount, 0);
  const tax = calculateTax(offer.taxConfiguration, subtotal + taxableCharges);
  const total = subtotal + chargesTotal + tax.amount;

  return {
    currency,
    subtotal,
    charges,
    chargesTotal,
    taxes: tax.amount,
    tax,
    total,
    breakdown: [
      { kind: "base", ...base },
      ...charges.map((c) => ({ kind: "charge", ...c })),
      ...(tax.amount ? [{ kind: "tax", label: tax.label, amount: tax.amount, detail: `${tax.rate}%` }] : []),
    ],
  };
}

export default {
  PRICING_MODELS,
  ROUNDING_MODES,
  CHARGE_TYPES,
  slotDurationHours,
  slotDurationDays,
  roundQuantity,
  resolveSourceValue,
  calculateBase,
  calculateAdditionalCharges,
  calculateTax,
  calculateOfferCost,
};