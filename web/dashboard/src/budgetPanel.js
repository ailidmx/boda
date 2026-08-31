import { serverTimestamp } from "firebase/firestore";
import { PROVIDER_CATEGORIES, PAYMENT_TYPES } from "./budget/domain.js";
import { settleBudget } from "./budget/settlement.js";
import {
  buildBudgetEventPayload,
  buildBudgetManualItemPayload,
  buildContributionPayload,
  buildPaymentPayload,
} from "../../shared/payload-builders.js";
import {
  validateBudgetManualItemPayload,
  validateContributionPayload,
  validatePaymentPayload,
} from "../../shared/validation.js";

const CATEGORY_LABEL = new Map(PROVIDER_CATEGORIES.map((category) => [category.id, category.label]));
const PAYMENT_LABEL = { deposit: "Apartado", installment: "A una semana", balance: "Día del evento", refund: "Reembolso" };
const STATUS_LABEL = { planned: "Previsto", committed: "Confirmado", paid: "Pagado", cleared: "Liquidado", pledged: "Prometido", received: "Recibido", cancelled: "Cancelado" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(value) || 0);
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function openModal(title, html, onSave) {
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `<div class="se-modal budget-modal"><div class="se-modal-head"><h3>${esc(title)}</h3><button class="se-modal-close" type="button" data-close>✕</button></div><div class="se-modal-form">${html}</div></div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.querySelector("[data-save]")?.addEventListener("click", async () => {
    try { await onSave(overlay); close(); } catch (error) { window.alert(error.message || "No se pudo guardar."); }
  });
}

function assertValid(result) {
  if (!result.valid) throw new Error(result.errors.join("\n"));
}

function itemOptions(items, selected = "") {
  return items.map((item) => `<option value="${esc(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.name)} · ${esc(money(item.amount))}</option>`).join("");
}

function openItemModal(ctx, item) {
  openModal(item ? "Editar partida" : "Nueva partida", `
    <label>Concepto <input data-name value="${esc(item?.name || "")}" /></label>
    <label>Categoría <select data-category>${PROVIDER_CATEGORIES.map((category) => `<option value="${category.id}" ${item?.categoryId === category.id ? "selected" : ""}>${esc(category.label)}</option>`).join("")}</select></label>
    <label>Importe total (MXN) <input data-amount type="number" min="0" step="0.01" value="${esc(item?.amount ?? "")}" /></label>
    <label>Estado <select data-status>${["planned", "committed", "paid", "cancelled"].map((status) => `<option value="${status}" ${item?.status === status ? "selected" : ""}>${STATUS_LABEL[status]}</option>`).join("")}</select></label>
    <label>Responsabilidad <select data-shares><option value="half">David y Aydé 50/50</option><option value="david" ${item?.responsibilityShares?.david === 1 ? "selected" : ""}>David 100%</option><option value="ayde" ${item?.responsibilityShares?.ayde === 1 ? "selected" : ""}>Aydé 100%</option></select></label>
    <label>Descripción <textarea data-description>${esc(item?.description || "")}</textarea></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (element) => {
    const share = element.querySelector("[data-shares]").value;
    const payload = buildBudgetManualItemPayload({
      eventId: "main", categoryId: element.querySelector("[data-category]").value,
      name: element.querySelector("[data-name]").value, description: element.querySelector("[data-description]").value,
      amount: element.querySelector("[data-amount]").value, currency: "MXN", status: element.querySelector("[data-status]").value,
      payerAllocations: [], timestamp: serverTimestamp(),
    });
    payload.id = item?.id || uid("budget");
    payload.responsibilityShares = share === "david" ? { david: 1, ayde: 0 } : share === "ayde" ? { david: 0, ayde: 1 } : { david: 0.5, ayde: 0.5 };
    assertValid(validateBudgetManualItemPayload(payload));
    await ctx.saveManualItem(payload);
  });
}

function openPaymentModal(ctx, payment) {
  openModal(payment ? "Editar pago" : "Registrar pago", `
    <label>Partida <select data-item>${itemOptions(ctx.items, payment?.budgetItemId)}</select></label>
    <label>Tipo <select data-type>${PAYMENT_TYPES.map((type) => `<option value="${type}" ${payment?.type === type ? "selected" : ""}>${PAYMENT_LABEL[type]}</option>`).join("")}</select></label>
    <label>Importe (MXN) <input data-amount type="number" min="0" step="0.01" value="${esc(payment?.amount ?? "")}" /></label>
    <label>Pagado por <select data-payer><option value="david" ${payment?.payerId === "david" ? "selected" : ""}>David</option><option value="ayde" ${payment?.payerId === "ayde" ? "selected" : ""}>Aydé</option><option value="couple" ${payment?.payerId === "couple" ? "selected" : ""}>Los dos</option><option value="external" ${payment?.payerId === "external" ? "selected" : ""}>Otra persona</option></select></label>
    <label>Estado <select data-status><option value="paid">Pagado</option><option value="planned" ${payment?.status === "planned" ? "selected" : ""}>Previsto</option><option value="cleared" ${payment?.status === "cleared" ? "selected" : ""}>Liquidado</option></select></label>
    <label>Fecha <input data-date type="date" value="${esc(payment?.paidAt || "")}" /></label>
    <label>Notas <textarea data-notes>${esc(payment?.notes || "")}</textarea></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (element) => {
    const payload = buildPaymentPayload({
      budgetItemId: element.querySelector("[data-item]").value, amount: element.querySelector("[data-amount]").value,
      payerId: element.querySelector("[data-payer]").value, paidAt: element.querySelector("[data-date]").value || null,
      type: element.querySelector("[data-type]").value, kind: element.querySelector("[data-status]").value === "planned" ? "planned" : "actual",
      status: element.querySelector("[data-status]").value, notes: element.querySelector("[data-notes]").value,
      currency: "MXN", timestamp: serverTimestamp(),
    });
    payload.id = payment?.id || uid("payment");
    assertValid(validatePaymentPayload(payload));
    await ctx.savePayment(payload);
  });
}

function openContributionModal(ctx, contribution) {
  openModal(contribution ? "Editar aportación" : "Nueva aportación / padrino", `
    <label>Persona <input data-name value="${esc(contribution?.contributorName || contribution?.sourceLabel || "")}" /></label>
    <label>Partida financiada <select data-item>${itemOptions(ctx.items, contribution?.budgetItemId || contribution?.appliesToItemId)}</select></label>
    <label>Cobertura <select data-mode><option value="amount">Importe</option><option value="full" ${contribution?.coverageMode === "full" ? "selected" : ""}>Servicio completo</option><option value="percentage" ${contribution?.coverageMode === "percentage" ? "selected" : ""}>Porcentaje</option></select></label>
    <label>Importe (MXN) <input data-amount type="number" min="0" step="0.01" value="${esc(contribution?.amount ?? contribution?.committedAmount ?? "")}" /></label>
    <label>Porcentaje <input data-percentage type="number" min="0" max="100" step="1" value="${esc(contribution?.percentage ?? "")}" /></label>
    <label>Estado <select data-status><option value="pledged">Prometido</option><option value="received" ${contribution?.status === "received" ? "selected" : ""}>Recibido</option><option value="cancelled" ${contribution?.status === "cancelled" ? "selected" : ""}>Cancelado</option></select></label>
    <label>Notas <textarea data-notes>${esc(contribution?.notes || "")}</textarea></label>
    <div class="se-modal-actions"><button class="se-btn is-primary" data-save type="button">Guardar</button><button class="se-btn" data-close type="button">Cancelar</button></div>
  `, async (element) => {
    const amount = element.querySelector("[data-amount]").value;
    const percentage = element.querySelector("[data-percentage]").value;
    const name = element.querySelector("[data-name]").value;
    const payload = buildContributionPayload({
      sourceType: "person", sourceLabel: name, contributorName: name, coverageMode: element.querySelector("[data-mode]").value,
      amount: amount === "" ? null : amount, committedAmount: amount === "" ? null : amount,
      percentage: percentage === "" ? null : percentage, budgetItemId: element.querySelector("[data-item]").value,
      status: element.querySelector("[data-status]").value, notes: element.querySelector("[data-notes]").value,
      currency: "MXN", timestamp: serverTimestamp(),
    });
    payload.id = contribution?.id || uid("contribution");
    assertValid(validateContributionPayload(payload));
    await ctx.saveContribution(payload);
  });
}

function summaryCard(label, value, hint = "") {
  return `<article class="budget-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</article>`;
}

export function renderBudgetPanel(ctx) {
  const { container, items = [], contributions = [], payments = [], event = {} } = ctx;
  if (!container) return;
  const settlement = settleBudget({ items: items.filter((item) => item.status !== "cancelled"), contributions, payments });
  const targetGuests = event.targetGuestCount || event.guestCount || 152;
  const paidActual = payments.filter((payment) => payment.kind !== "planned" && ["paid", "cleared"].includes(payment.status)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const planned = payments.filter((payment) => payment.kind === "planned" || payment.status === "planned");
  const itemName = (id) => items.find((item) => item.id === id)?.name || "Partida";
  const transfer = settlement.transfer?.amount > 0 ? `${settlement.transfer.from === "david" ? "David" : "Aydé"} → ${settlement.transfer.to === "david" ? "David" : "Aydé"}: ${money(settlement.transfer.amount)}` : "Cuentas equilibradas";

  container.innerHTML = `
    <div class="budget-toolbar">
      <label class="budget-guest-target">Objetivo <input type="number" min="1" data-guest-target value="${esc(targetGuests)}" /> invitados</label>
      <button class="dashboard-button" data-new-item>＋ Partida</button>
      <button class="dashboard-button" data-new-payment>＋ Pago</button>
      <button class="dashboard-button" data-new-contribution>＋ Padrino</button>
    </div>
    <div class="budget-kpis">
      ${summaryCard("Presupuesto total", money(settlement.grossBudget), `${items.length} partidas`)}
      ${summaryCard("Pagado", money(paidActual), `${money(settlement.outstanding)} pendiente`)}
      ${summaryCard("Padrinos", money(settlement.externalCommitted), `${money(settlement.externalReceived)} recibido`)}
      ${summaryCard("A cargo de la pareja", money(settlement.coupleResponsibility), `${money(targetGuests ? settlement.grossBudget / targetGuests : 0)} / invitado`)}
      ${summaryCard("David debe cubrir", money(settlement.expected.david), `Pagado ${money(settlement.paid.david)}`)}
      ${summaryCard("Aydé debe cubrir", money(settlement.expected.ayde), `Pagado ${money(settlement.paid.ayde)}`)}
    </div>
    <div class="budget-settlement"><strong>Ajuste entre ustedes:</strong> ${esc(transfer)}</div>
    <div class="budget-columns">
      <section><div class="budget-subhead"><h3>Partidas</h3><span>${items.length}</span></div><div class="budget-list">
        ${items.map((item) => `<article class="budget-row"><div><strong>${esc(item.name)}</strong><small>${esc(CATEGORY_LABEL.get(item.categoryId) || item.categoryId || "Otro")} · ${esc(STATUS_LABEL[item.status] || item.status || "Previsto")}</small></div><b>${esc(money(item.amount))}</b><button class="dashboard-link-btn" data-edit-item="${esc(item.id)}">✏️</button></article>`).join("") || `<p class="provider-empty">Sin partidas.</p>`}
      </div></section>
      <section><div class="budget-subhead"><h3>Próximos pagos</h3><span>${planned.length}</span></div><div class="budget-list">
        ${planned.map((payment) => `<article class="budget-row"><div><strong>${esc(itemName(payment.budgetItemId))}</strong><small>${esc(PAYMENT_LABEL[payment.type] || payment.type)} · ${esc(payment.plannedPayerLabel || payment.payerId || "Sin asignar")}</small></div><b>${esc(money(payment.amount))}</b><button class="dashboard-link-btn" data-edit-payment="${esc(payment.id)}">✏️</button></article>`).join("") || `<p class="provider-empty">Sin pagos pendientes.</p>`}
      </div></section>
      <section><div class="budget-subhead"><h3>Padrinos</h3><span>${contributions.length}</span></div><div class="budget-list">
        ${contributions.map((contribution) => `<article class="budget-row"><div><strong>${esc(contribution.contributorName || contribution.sourceLabel || "Padrino")}</strong><small>${esc(itemName(contribution.budgetItemId || contribution.appliesToItemId))} · ${esc(STATUS_LABEL[contribution.status] || contribution.status)}</small></div><b>${esc(contribution.coverageMode === "full" ? "100%" : contribution.coverageMode === "percentage" ? `${contribution.percentage || 0}%` : money(contribution.amount || contribution.committedAmount))}</b><button class="dashboard-link-btn" data-edit-contribution="${esc(contribution.id)}">✏️</button></article>`).join("") || `<p class="provider-empty">Sin padrinos.</p>`}
      </div></section>
    </div>`;

  container.querySelector("[data-guest-target]")?.addEventListener("change", async (eventInput) => {
    await ctx.saveEventContext({ id: "main", ...buildBudgetEventPayload({ guestCount: Number(eventInput.target.value), currency: "MXN", timezone: "America/Mexico_City", targets: event.targets || {}, timestamp: serverTimestamp() }), targetGuestCount: Number(eventInput.target.value) });
  });
  container.querySelector("[data-new-item]")?.addEventListener("click", () => openItemModal(ctx));
  container.querySelector("[data-new-payment]")?.addEventListener("click", () => openPaymentModal(ctx));
  container.querySelector("[data-new-contribution]")?.addEventListener("click", () => openContributionModal(ctx));
  container.querySelectorAll("[data-edit-item]").forEach((button) => button.addEventListener("click", () => openItemModal(ctx, items.find((item) => item.id === button.dataset.editItem))));
  container.querySelectorAll("[data-edit-payment]").forEach((button) => button.addEventListener("click", () => openPaymentModal(ctx, payments.find((payment) => payment.id === button.dataset.editPayment))));
  container.querySelectorAll("[data-edit-contribution]").forEach((button) => button.addEventListener("click", () => openContributionModal(ctx, contributions.find((contribution) => contribution.id === button.dataset.editContribution))));
}

export default { renderBudgetPanel };
