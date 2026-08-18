import { getFunctions, httpsCallable } from "firebase/functions";

// ── Guest Modals (delete confirm + send invite) ───────────────────────
//
// This module owns the two guest-related confirmation/send modals:
//   - `openDeleteConfirm`  — "Eliminar invitado" (soft-delete via repository)
//   - `openSendInviteModal` — "Enviar invitación" (WhatsApp / email via the
//     `sendInvitation` Cloud Function)
//
// It is a presentation module — it renders modals and wires DOM events, but
// never touches Firestore directly. All persistence flows through the injected
// `softDeleteGuest` repository function and the `saveGuestInline` helper.

/**
 * Open the "Eliminar invitado" confirm modal. Soft-deletes the guest via the
 * injected `softDeleteGuest` repository function.
 *
 * @param {object} guest The guest to delete.
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function openDeleteConfirm(guest, ctx) {
  const { guestFullName, softDeleteGuest } = ctx;

  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 28rem;">
      <div class="dashboard-modal-heading">
        <h3>Eliminar invitado</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="dashboard-modal-form">
        <p style="line-height:1.6;color:#55452d;">
          ¿Estás segura de eliminar a <strong>${guestFullName(guest)}</strong>
          (ID: <code>${guest.id}</code>)?
        </p>

        <p style="font-size:0.85rem;color:#a0352c;">
          Esta acción marcará al invitado como eliminado en Firestore. Los datos estáticos se restaurarán al recargar.
        </p>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" style="background:#a0352c;" type="button" data-confirm-delete>
            Eliminar
          </button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>
            Cancelar
          </button>
        </div>
        <small data-guest-editor-status></small>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector("[data-confirm-delete]").addEventListener("click", async () => {
    const status = overlay.querySelector("[data-guest-editor-status]");
    status.textContent = "Eliminando…";
    status.dataset.state = "working";
    try {
      await softDeleteGuest(guest.id);

      status.textContent = "✅ Marcado como eliminado. Recarga para ver los cambios.";

      status.dataset.state = "success";
      setTimeout(() => overlay.remove(), 1500);
    } catch (err) {
      console.error("Failed to mark guest as deleted", err);
      status.textContent = "❌ Error al eliminar.";
      status.dataset.state = "error";
    }
  });
}

/**
 * Open the "Enviar invitación" modal. Sends the guest their invitation link via
 * WhatsApp and/or email. The actual sending is delegated to the `sendInvitation`
 * Cloud Function (Gmail API + WhatsApp deep link), which is admin-only.
 *
 * `channel` (optional) pre-selects a channel and auto-triggers it. Each channel
 * button is disabled when that channel is not available for this guest:
 *   - No Firebase Auth account → both disabled (can't send anything).
 *   - Auth but no real email (or only a default-domain email) → email disabled.
 *   - Auth but no phone → WhatsApp disabled.
 *
 * @param {object} guest The guest to send the invitation to.
 * @param {string|null} channel Optional pre-selected channel ("whatsapp" | "email").
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function openSendInviteModal(guest, channel, ctx) {
  const {
    guestFullName,
    guestCanWhatsapp,
    guestCanEmail,
    guestHasAuth,
    guestSendEmail,
    getInviteUrl,
    saveGuestInline,
    renderGuestManager,
    DEFAULT_AUTH_EMAIL_DOMAIN,
  } = ctx;

  const canWhatsapp = guestCanWhatsapp(guest);
  const canEmail = guestCanEmail(guest);
  const hasAuth = guestHasAuth(guest);
  const email = guestSendEmail(guest);
  const phone = guest.identity?.phone || guest.phone || "";

  const waTitle = !hasAuth
    ? "Sin cuenta de Firebase Auth — no se puede enviar"
    : !phone
      ? "Sin teléfono — no se puede enviar por WhatsApp"
      : "Enviar invitación por WhatsApp";
  // The email channel no longer requires a Firebase Auth account — it only
  // needs a real (non-default-domain) email address.
  const emailTitle = !email
    ? "Sin correo — no se puede enviar por email"
    : email.endsWith(`@${DEFAULT_AUTH_EMAIL_DOMAIN}`)
      ? "Correo del dominio por defecto — no se puede enviar por email"
      : "Enviar invitación por email";

  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 30rem;">
      <div class="dashboard-modal-heading">
        <h3>Enviar invitación</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="dashboard-modal-form">
        <p style="line-height:1.6;color:#55452d;">
          Enviar la invitación a <strong>${guestFullName(guest)}</strong>
          (ID: <code>${guest.id}</code>).
        </p>
        <div class="dashboard-modal-field">
          <label>Teléfono (WhatsApp)</label>
          <input type="text" value="${phone}" readonly />
        </div>
        <div class="dashboard-modal-field">
          <label>Correo</label>
          <input type="text" value="${email}" readonly />
        </div>
        <div class="dashboard-modal-field">
          <label>Idioma</label>
          <input type="text" value="${guest.identity?.lang || guest.lang || "es"}" readonly />
        </div>
        <div class="dashboard-modal-field">
          <label>Enlace de invitación</label>
          <input type="text" value="${getInviteUrl(guest.id)}" readonly />
        </div>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="button" data-send-whatsapp title="${waTitle}" ${canWhatsapp ? "" : "disabled"}>WhatsApp</button>
          <button class="dashboard-button" type="button" data-send-email title="${emailTitle}" ${canEmail ? "" : "disabled"}>Email</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-send-invite-status></small>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const status = overlay.querySelector("[data-send-invite-status]");
  const run = async (ch) => {
    status.textContent = "Enviando…";
    status.dataset.state = "working";
    try {
      const functions = getFunctions();
      const sendInvitation = httpsCallable(functions, "sendInvitation");
      const result = await sendInvitation({ guestId: guest.id, channel: ch });
      const data = result.data || {};

      // For WhatsApp, the function returns a `waLink` (a wa.me deep link that
      // opens the guest's chat with the invitation message pre-filled). Open it
      // in a new tab so the admin reviews and sends it themselves in WhatsApp —
      // nothing is auto-sent. The status reflects that WhatsApp was opened.
      if (ch === "whatsapp" && data.waLink) {
        window.open(data.waLink, "_blank", "noopener,noreferrer");
        status.textContent = "✅ WhatsApp abierto — revisa y envía el mensaje.";
      } else {
        status.textContent = `✅ ${data.message || "Enviado."}`;
      }
      status.dataset.state = "success";
      // Mark the guest as invited so the "Enviada" checkbox reflects it.
      await saveGuestInline(guest.id, "invitationSent", true);
      renderGuestManager();
    } catch (err) {
      console.error("sendInvitation failed", err);
      status.textContent = `❌ ${err.message || "Error al enviar."}`;
      status.dataset.state = "error";
    }
  };



  overlay.querySelector("[data-send-whatsapp]").addEventListener("click", () => run("whatsapp"));
  overlay.querySelector("[data-send-email]").addEventListener("click", () => run("email"));

  // Auto-trigger the pre-selected channel (from the dedicated column button).
  if (channel === "whatsapp" && canWhatsapp) run("whatsapp");
  else if (channel === "email" && canEmail) run("email");
}
