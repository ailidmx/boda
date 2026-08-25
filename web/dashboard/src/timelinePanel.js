// timelinePanel.js — Multi-layer wedding timeline editor (vanilla JS).
//
// Renders the `timeline_layers` + `timeline_slots` collections as a set of
// parallel "tracks" (one per layer), each listing its slots sorted
// chronologically. Provides add/edit/delete modals for both layers and slots.
//
// This is a PRESENTATION module: it never touches Firestore. Persistence flows
// through the injected callbacks (saveLayer / saveSlot / deleteLayer /
// deleteSlot), which the dashboard wires to `timelineRepository` + the shared
// payload-builders + validators. Domain vocabulary (provider categories) comes
// from `./budget/domain.js`.

import { PROVIDER_CATEGORIES } from "./budget/domain.js";

const CATEGORY_LABEL = new Map(PROVIDER_CATEGORIES.map((c) => [c.id, c.label]));

const SLOT_STATUSES = ["planned", "confirmed", "tentative", "cancelled", "done"];
const STATUS_LABEL = {
  planned: "Planeado",
  confirmed: "Confirmado",
  tentative: "Tentativo",
  cancelled: "Cancelado",
  done: "Listo",
};

const DEFAULT_COLOR = "#c9b896";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Parse a slot's `startAt`/`endAt` into a Date. Accepts Date, Firestore
// Timestamp ({ seconds } / toDate()), or an ISO / "YYYY-MM-DDTHH:mm" string.
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  if (typeof v === "object" && v.seconds != null) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayShort = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

// "HH:mm – HH:mm" when both ends share a day, otherwise with day prefixes.
function fmtRange(slot) {
  const s = toDate(slot.startAt);
  const e = toDate(slot.endAt);
  if (!s && !e) return "—";
  if (!s) return hm(e);
  if (!e) return hm(s);
  if (s.toDateString() === e.toDateString()) return `${hm(s)} – ${hm(e)}`;
  return `${dayShort(s)} ${hm(s)} – ${dayShort(e)} ${hm(e)}`;
}

// datetime-local input value for an existing slot time.
function toLocalInput(v) {
  const d = toDate(v);
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-MX")}`;
}

export function renderTimelinePanel(ctx) {
  const { container, layers, slots, offers, saveLayer, saveSlot, deleteLayer, deleteSlot } = ctx;
  if (!container) return;

  const offerById = new Map((offers || []).map((o) => [o.id, o]));
  const slotsByLayer = new Map();
  (slots || []).forEach((s) => {
    const key = s.layerId || "";
    if (!slotsByLayer.has(key)) slotsByLayer.set(key, []);
    slotsByLayer.get(key).push(s);
  });
  const sortSlots = (arr) =>
    [...arr].sort((a, b) => (toDate(a.startAt)?.getTime() || 0) - (toDate(b.startAt)?.getTime() || 0));

  const slotRow = (s) => {
    const cat = s.categoryId ? `<span class="timeline-cat">${esc(CATEGORY_LABEL.get(s.categoryId) || s.categoryId)}</span>` : "";
    const status = s.status ? `<span class="timeline-status is-${esc(s.status)}">${esc(STATUS_LABEL[s.status] || s.status)}</span>` : "";
    const budget = fmtMoney(s.estimatedBudget);
    const offer = s.selectedOfferId && offerById.get(s.selectedOfferId)
      ? `<span class="timeline-slot-offer" title="Oferta seleccionada">🤝 ${esc(offerById.get(s.selectedOfferId).name)}</span>`
      : "";
    return `
      <div class="timeline-slot" data-slot-id="${esc(s.id)}">
        <span class="timeline-slot-time">${esc(fmtRange(s))}</span>
        <span class="timeline-slot-name">${esc(s.name || "Sin nombre")}</span>
        ${cat}${status}
        ${budget ? `<span class="timeline-slot-budget">${esc(budget)}</span>` : ""}
        ${offer}
        <span class="timeline-slot-actions">
          <button type="button" class="dashboard-link-btn" data-edit-slot="${esc(s.id)}" title="Editar actividad">✏️</button>
          <button type="button" class="dashboard-link-btn" data-delete-slot="${esc(s.id)}" title="Eliminar actividad">🗑</button>
        </span>
      </div>`;
  };

  const layerCard = (layer) => {
    const layerSlots = sortSlots(slotsByLayer.get(layer.id) || []);
    return `
      <article class="timeline-layer" data-layer-id="${esc(layer.id)}">
        <div class="timeline-layer-head">
          <span class="timeline-layer-swatch" style="background:${esc(layer.color || DEFAULT_COLOR)}"></span>
          ${layer.icon ? `<span class="timeline-layer-icon">${esc(layer.icon)}</span>` : ""}
          <strong>${esc(layer.name || "Capa")}</strong>
          ${layer.locked ? '<span class="timeline-layer-flag" title="Bloqueada">🔒</span>' : ""}
          ${layer.visible === false ? '<span class="timeline-layer-flag timeline-layer-flag-muted" title="Oculta">oculta</span>' : ""}
          <span class="timeline-layer-actions">
            <button type="button" class="dashboard-link-btn" data-new-slot="${esc(layer.id)}" title="Agregar actividad a esta capa">＋</button>
            <button type="button" class="dashboard-link-btn" data-edit-layer="${esc(layer.id)}" title="Editar capa">✏️</button>
            <button type="button" class="dashboard-link-btn" data-delete-layer="${esc(layer.id)}" title="Eliminar capa">🗑</button>
          </span>
        </div>
        <div class="timeline-layer-slots">
          ${layerSlots.map(slotRow).join("") || '<p class="timeline-empty">Sin actividades en esta capa.</p>'}
        </div>
      </article>`;
  };

  const sortedLayers = [...(layers || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const orphanSlots = sortSlots(slotsByLayer.get("") || []);

  container.innerHTML = `
    <div class="timeline-toolbar">
      <button class="dashboard-button" type="button" data-new-layer>＋ Capa</button>
      <button class="dashboard-button" type="button" data-new-slot>＋ Actividad</button>
      <span class="timeline-hint">Las capas son pistas paralelas (programa, música, comida…); cada actividad vive en una capa y tiene hora de inicio y fin.</span>
    </div>
    <div class="timeline-layers">
      ${sortedLayers.map(layerCard).join("") || '<p class="dashboard-grid-empty">Aún no hay capas. Crea la primera con "＋ Capa".</p>'}
    </div>
    ${orphanSlots.length ? `
      <div class="timeline-orphans">
        <h3 class="timeline-orphans-title">Sin capa</h3>
        <div class="timeline-layer-slots">${orphanSlots.map(slotRow).join("")}</div>
      </div>` : ""}
  `;

  container.querySelector("[data-new-layer]")?.addEventListener("click", () => openLayerModal(ctx));
  container.querySelectorAll("[data-new-slot]").forEach((b) => {
    // The toolbar button has `data-new-slot` with NO value (empty string), so
    // fall back to null — otherwise the guard would skip wiring its handler.
    b.addEventListener("click", () => openSlotModal(ctx, null, b.dataset.newSlot || null));
  });
  container.querySelectorAll("[data-edit-layer]").forEach((b) => b.addEventListener("click", () => openLayerModal(ctx, b.dataset.editLayer)));
  container.querySelectorAll("[data-delete-layer]").forEach((b) => b.addEventListener("click", async () => {
    if (window.confirm("¿Eliminar esta capa? Sus actividades quedarán 'sin capa'.")) { await deleteLayer(b.dataset.deleteLayer); }
  }));
  container.querySelectorAll("[data-edit-slot]").forEach((b) => b.addEventListener("click", () => openSlotModal(ctx, b.dataset.editSlot)));
  container.querySelectorAll("[data-delete-slot]").forEach((b) => b.addEventListener("click", async () => {
    if (window.confirm("¿Eliminar esta actividad?")) { await deleteSlot(b.dataset.deleteSlot); }
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
  overlay.querySelector("[data-save]")?.addEventListener("click", async () => {
    try {
      await onSave(overlay, close);
    } catch (err) {
      window.alert(err?.message || "No se pudo guardar.");
    }
  });
}

function openLayerModal(ctx, id) {
  const layer = id ? (ctx.layers || []).find((x) => x.id === id) : null;
  const catOptions = [`<option value="">—</option>`, ...PROVIDER_CATEGORIES.map((c) => `<option value="${esc(c.id)}" ${layer?.categoryId === c.id ? "selected" : ""}>${esc(c.label)}</option>`)].join("");

  modal(id ? "Editar capa" : "Nueva capa", `
    <label>Nombre <input data-name value="${esc(layer?.name || "")}" placeholder="Programa, Música, Comida…"/></label>
    <div class="se-form-row">
      <label>Clave <input data-key value="${esc(layer?.key || "")}" placeholder="programa"/></label>
      <label>Orden <input type="number" data-order value="${esc(layer?.order ?? (ctx.layers?.length || 0))}"/></label>
    </div>
    <label>Categoría <select data-category>${catOptions}</select></label>
    <div class="se-form-row">
      <label>Color <input type="color" data-color value="${esc(layer?.color || DEFAULT_COLOR)}"/></label>
      <label>Icono <input data-icon value="${esc(layer?.icon || "")}" placeholder="🎵"/></label>
    </div>
    <label class="dashboard-checkbox-cell"><input type="checkbox" data-visible ${layer?.visible === false ? "" : "checked"}/><span>Visible</span></label>
    <label class="dashboard-checkbox-cell"><input type="checkbox" data-locked ${layer?.locked ? "checked" : ""}/><span>Bloqueada</span></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (el, close) => {
    await ctx.saveLayer({
      id: id || `layer-${Date.now().toString(36)}`,
      eventId: layer?.eventId || "",
      key: el.querySelector("[data-key]").value.trim(),
      name: el.querySelector("[data-name]").value.trim() || "Capa",
      type: layer?.type || "custom",
      categoryId: el.querySelector("[data-category]").value,
      order: Number(el.querySelector("[data-order]").value) || 0,
      color: el.querySelector("[data-color]").value,
      icon: el.querySelector("[data-icon]").value.trim(),
      visible: el.querySelector("[data-visible]").checked,
      locked: el.querySelector("[data-locked]").checked,
    });
    close();
  });
}

function openSlotModal(ctx, id, presetLayerId) {
  const slot = id ? (ctx.slots || []).find((x) => x.id === id) : null;
  const layerId = slot?.layerId || presetLayerId || "";
  const sortedLayers = (ctx.layers || []).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const layerOptions = [`<option value="">— Sin capa —</option>`, ...sortedLayers.map((l) => `<option value="${esc(l.id)}" ${layerId === l.id ? "selected" : ""}>${esc(l.name)}</option>`)].join("");
  const catOptions = [`<option value="">—</option>`, ...PROVIDER_CATEGORIES.map((c) => `<option value="${esc(c.id)}" ${slot?.categoryId === c.id ? "selected" : ""}>${esc(c.label)}</option>`)].join("");
  const statusOptions = SLOT_STATUSES.map((s) => `<option value="${s}" ${(slot?.status || "planned") === s ? "selected" : ""}>${esc(STATUS_LABEL[s])}</option>`).join("");

  modal(id ? "Editar actividad" : "Nueva actividad", `
    <label>Actividad <input data-name value="${esc(slot?.name || "")}" placeholder="Cóctel, ceremonia, baile…"/></label>
    <label>Capa <select data-layer>${layerOptions}</select></label>
    <label>Categoría <select data-category>${catOptions}</select></label>
    <div class="se-form-row">
      <label>Inicio <input type="datetime-local" data-start value="${esc(toLocalInput(slot?.startAt))}"/></label>
      <label>Fin <input type="datetime-local" data-end value="${esc(toLocalInput(slot?.endAt))}"/></label>
    </div>
    <label>Descripción <textarea data-description rows="2">${esc(slot?.description || "")}</textarea></label>
    <div class="se-form-row">
      <label>Estado <select data-status>${statusOptions}</select></label>
      <label>Presupuesto estimado (MXN) <input type="number" step="0.01" data-budget value="${esc(slot?.estimatedBudget ?? "")}"/></label>
    </div>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (el, close) => {
    const startAt = el.querySelector("[data-start]").value;
    const endAt = el.querySelector("[data-end]").value;
    await ctx.saveSlot({
      id: id || `slot-${Date.now().toString(36)}`,
      eventId: slot?.eventId || "",
      layerId: el.querySelector("[data-layer]").value,
      name: el.querySelector("[data-name]").value.trim() || "Actividad",
      description: el.querySelector("[data-description]").value.trim(),
      categoryId: el.querySelector("[data-category]").value,
      startAt: startAt || null,
      endAt: endAt || null,
      status: el.querySelector("[data-status]").value,
      estimatedBudget: el.querySelector("[data-budget]").value ? Number(el.querySelector("[data-budget]").value) : null,
      targetBudget: slot?.targetBudget ?? null,
      selectedOfferId: slot?.selectedOfferId ?? null,
    });
    close();
  });
}

export default { renderTimelinePanel };



