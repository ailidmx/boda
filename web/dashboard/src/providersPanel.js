// providersPanel.js — Provider / offer catalog management (vanilla JS).
// Lists providers + their offers and provides add/edit modals. Persistence goes
// through the injected repository callbacks; this module never touches Firestore.

import { OFFER_STATUSES, PROVIDER_CATEGORIES, PROVIDER_STATUSES } from "./budget/domain.js";

const CATEGORY_LABEL = new Map(PROVIDER_CATEGORIES.map((c) => [c.id, c.label]));
const PROVIDER_STATUS_LABEL = new Map(PROVIDER_STATUSES.map((s) => [s.id, s.label]));
const OFFER_STATUS_LABEL = new Map([
  ["draft", "Borrador"], ["requested", "Solicitada"], ["quoted", "Cotizada"],
  ["negotiating", "En negociación"], ["accepted", "Aceptada"],
  ["rejected", "Rechazada"], ["expired", "Vencida"],
]);

// Pricing fields shown for each simple model. Complex models (tiered,
// quantity_formula, composite) fall back to a JSON textarea.
const PRICING_FIELDS = {
  fixed: [["amount", "Precio (MXN)"]],
  hourly: [["hourlyRate", "Tarifa por hora (MXN)"], ["minimumDuration", "Duración mínima (h)"]],
  daily: [["dayRate", "Tarifa por día (MXN)"]],
  per_person: [["pricePerPerson", "Precio por persona (MXN)"]],
  per_item: [["pricePerItem", "Precio por artículo (MXN)"]],
  per_unit: [["unitPrice", "Precio por unidad (MXN)"]],
  package: [["packagePrice", "Precio del paquete (MXN)"], ["includedHours", "Horas incluidas"], ["extraHourRate", "Hora extra (MXN)"]],
  custom: [["amount", "Monto (MXN)"]],
};
const COMPLEX_MODELS = ["tiered", "quantity_formula", "composite"];
const SIMPLE_MODELS = Object.keys(PRICING_FIELDS);

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

export function renderProvidersPanel(ctx) {
  const { container, providers, offers, saveProvider, deleteProvider, saveOffer, deleteOffer } = ctx;
  if (!container) return;

  const offersByProvider = new Map();
  (offers || []).forEach((o) => {
    if (!offersByProvider.has(o.providerId)) offersByProvider.set(o.providerId, []);
    offersByProvider.get(o.providerId).push(o);
  });

  const card = (p) => {
    const pOffers = offersByProvider.get(p.id) || [];
    const cats = (p.categoryIds || []).map((id) => `<span class="provider-cat">${esc(CATEGORY_LABEL.get(id) || id)}</span>`).join("");
    const contact = [p.contact?.person, p.contact?.phone, p.contact?.email]
      .filter(Boolean)
      .map((v) => `<span class="provider-contact">${esc(v)}</span>`)
      .join(" · ");
    const providerStatus = p.status || "prospect";
    const offerRows = pOffers.map((o) => `
      <div class="offer-item">
        <span class="offer-name">${esc(o.name)}</span>
        <span class="offer-meta">${esc(OFFER_STATUS_LABEL.get(o.status || "draft") || o.status)} · ${esc(o.pricingModel)}${o.currency ? ` · ${esc(o.currency)}` : ""}</span>
        <button class="dashboard-link-btn" data-edit-offer="${esc(o.id)}" title="Editar oferta">✏️</button>
        <button class="dashboard-link-btn" data-delete-offer="${esc(o.id)}" title="Eliminar oferta">🗑</button>
      </div>`).join("") || '<p class="provider-empty">Sin ofertas aún.</p>';
    return `
      <article class="provider-card" data-provider="${esc(p.id)}">
        <div class="provider-head">
          <strong>${esc(p.name)}</strong>
          <span class="provider-cats">${cats}</span>
          <span class="provider-cat provider-status is-${esc(providerStatus)}">${esc(PROVIDER_STATUS_LABEL.get(providerStatus) || providerStatus)}</span>
          <span class="provider-actions">
            <button class="dashboard-link-btn" data-new-offer="${esc(p.id)}" title="Agregar oferta">＋</button>
            <button class="dashboard-link-btn" data-edit-provider="${esc(p.id)}" title="Editar proveedor">✏️</button>
            <button class="dashboard-link-btn" data-delete-provider="${esc(p.id)}" title="Eliminar proveedor">🗑</button>
          </span>
        </div>
        ${contact ? `<div class="provider-meta">${contact}</div>` : ""}
        ${p.notes ? `<p class="provider-notes">${esc(p.notes)}</p>` : ""}
        <div class="provider-offers">${offerRows}</div>
      </article>`;
  };

  container.innerHTML = `
    <div class="providers-toolbar">
      <button class="dashboard-button" type="button" data-new-provider>＋ Agregar proveedor</button>
    </div>
    <div class="providers-list">${(providers || []).map(card).join("") || '<p class="dashboard-grid-empty">Aún no hay proveedores.</p>'}</div>`;

  container.querySelector("[data-new-provider]")?.addEventListener("click", () => openProviderModal(ctx));
  container.querySelectorAll("[data-edit-provider]").forEach((b) => b.addEventListener("click", () => openProviderModal(ctx, b.dataset.editProvider)));
  container.querySelectorAll("[data-delete-provider]").forEach((b) => b.addEventListener("click", async () => {
    if (window.confirm("¿Eliminar este proveedor y todas sus ofertas?")) { await deleteProvider(b.dataset.deleteProvider); }
  }));
  container.querySelectorAll("[data-new-offer]").forEach((b) => b.addEventListener("click", () => openOfferModal(ctx, b.dataset.newOffer)));
  container.querySelectorAll("[data-edit-offer]").forEach((b) => b.addEventListener("click", () => {
    const offer = (offers || []).find((o) => o.id === b.dataset.editOffer);
    if (offer) openOfferModal(ctx, offer.providerId, offer);
  }));
  container.querySelectorAll("[data-delete-offer]").forEach((b) => b.addEventListener("click", async () => {
    if (window.confirm("¿Eliminar esta oferta?")) { await deleteOffer(b.dataset.deleteOffer); }
  }));
}

function modal(title, bodyHtml, onSave) {
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `<div class="se-modal"><div class="se-modal-head"><h3>${esc(title)}</h3><button class="se-modal-close" type="button" data-close>✕</button></div><div class="se-modal-form">${bodyHtml}</div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector("[data-close]")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-save]")?.addEventListener("click", async () => { await onSave(overlay, close); });
}

function openProviderModal(ctx, id) {
  const p = id ? (ctx.providers || []).find((x) => x.id === id) : null;
  const selected = new Set(p?.categoryIds || []);
  const catBoxes = PROVIDER_CATEGORIES.map((c) => `
    <label class="dashboard-checkbox-cell"><input type="checkbox" data-cat="${esc(c.id)}" ${selected.has(c.id) ? "checked" : ""}/><span>${esc(c.label)}</span></label>`).join("");

  modal(id ? "Editar proveedor" : "Nuevo proveedor", `
    <label>Nombre <input data-name value="${esc(p?.name || "")}"/></label>
    <div class="provider-cats-field">${catBoxes}</div>
    <label>Etapa <select data-status>${PROVIDER_STATUSES.map((s) => `<option value="${esc(s.id)}" ${(p?.status || "prospect") === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></label>
    <label>Persona de contacto <input data-contact-person value="${esc(p?.contact?.person || "")}"/></label>
    <label>Teléfono <input data-contact-phone value="${esc(p?.contact?.phone || "")}"/></label>
    <label>Correo <input data-contact-email value="${esc(p?.contact?.email || "")}"/></label>
    <label>Notas <textarea data-notes>${esc(p?.notes || "")}</textarea></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (el, close) => {
    const categoryIds = [...el.querySelectorAll("[data-cat]:checked")].map((c) => c.dataset.cat);
    await ctx.saveProvider({
      id: id || `prov-${Date.now().toString(36)}`,
      name: el.querySelector("[data-name]").value.trim() || "Proveedor",
      categoryIds,
      contact: {
        person: el.querySelector("[data-contact-person]").value.trim(),
        phone: el.querySelector("[data-contact-phone]").value.trim(),
        email: el.querySelector("[data-contact-email]").value.trim(),
      },
      notes: el.querySelector("[data-notes]").value.trim(),
      status: el.querySelector("[data-status]").value,
      categoryData: p?.categoryData || {},
    });
    close();
  });
}

function openOfferModal(ctx, providerId, offer) {
  const o = offer;
  const model = o?.pricingModel || "fixed";
  const isComplex = COMPLEX_MODELS.includes(model);
  const pricingData = o?.pricingData || {};

  const fieldsHtml = isComplex
    ? `<label>pricingData (JSON) <textarea data-pricing-json rows="4">${esc(JSON.stringify(pricingData, null, 2))}</textarea></label>`
    : (PRICING_FIELDS[model] || []).map(([key, label]) => `<label>${esc(label)} <input type="number" step="0.01" data-pricing-${esc(key)} value="${esc(pricingData[key] ?? "")}"/></label>`).join("");

  modal(o ? "Editar oferta" : "Nueva oferta", `
    <label>Nombre <input data-name value="${esc(o?.name || "")}"/></label>
    <label>Categoría <select data-category>${PROVIDER_CATEGORIES.map((c) => `<option value="${esc(c.id)}" ${o?.categoryId === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>
    <label>Modelo de precios <select data-model>${[...SIMPLE_MODELS, ...COMPLEX_MODELS].map((m) => `<option value="${m}" ${model === m ? "selected" : ""}>${m}</option>`).join("")}</select></label>
    <div data-fields>${fieldsHtml}</div>
    <label>Cargos adicionales (JSON) <textarea data-charges rows="3">${esc(JSON.stringify(o?.additionalCharges || [], null, 2))}</textarea></label>
    <label>Estado <select data-status>${OFFER_STATUSES.map((s) => `<option value="${esc(s)}" ${(o?.status || "draft") === s ? "selected" : ""}>${esc(OFFER_STATUS_LABEL.get(s) || s)}</option>`).join("")}</select></label>
    <label>Moneda <input data-currency value="${esc(o?.currency || "MXN")}"/></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (el, close) => {
    const chosenModel = el.querySelector("[data-model]").value;
    let pricingData = {};
    if (COMPLEX_MODELS.includes(chosenModel)) {
      try { pricingData = JSON.parse(el.querySelector("[data-pricing-json]").value || "{}"); } catch { window.alert("pricingData JSON inválido"); return; }
    } else {
      (PRICING_FIELDS[chosenModel] || []).forEach(([key]) => { pricingData[key] = Number(el.querySelector(`[data-pricing-${key}]`).value) || 0; });
    }
    let charges = [];
    try { charges = JSON.parse(el.querySelector("[data-charges]").value || "[]"); } catch { window.alert("Cargos JSON inválido"); return; }

    await ctx.saveOffer({
      id: o?.id || `offer-${Date.now().toString(36)}`,
      providerId,
      categoryId: el.querySelector("[data-category]").value,
      name: el.querySelector("[data-name]").value.trim() || "Oferta",
      pricingModel: chosenModel,
      pricingData,
      additionalCharges: charges,
      currency: el.querySelector("[data-currency]").value.trim() || "MXN",
      status: el.querySelector("[data-status]").value,
      active: o?.active !== false,
    });
    close();
  });
}

export default { renderProvidersPanel };