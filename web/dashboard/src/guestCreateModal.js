import { getFunctions, httpsCallable } from "firebase/functions";

// ── Guest Create Modal ("Agregar invitado") ────────────────────────────────
//
// This module owns the "Agregar invitado" modal that lets the couple create a
// brand-new guest from the dashboard's INVITADOS table.
//
// Flow:
//   1. The couple fills in the guest's name (required), plus optional fields
//      (gender, age, language, invitation group, phone, email).
//   2. A unique guest id is derived from the name (slug) and deduped against
//      the existing guest ids.
//   3. The guest doc is created via the injected `createGuest` repository
//      function (which uses `setDoc` WITHOUT merge so a duplicate id fails
//      loudly).
//   4. If an email was provided, the `createGuestAuth` Cloud Function
//      provisions the guest's Firebase Auth account (uid == guest doc id) and
//      keeps `firebaseEmail` in sync.
//   5. The table re-renders so the new guest appears immediately.
//
// It is a presentation module — it renders the modal and wires DOM events, but
// never touches Firestore directly. All persistence flows through the injected
// `createGuest` repository function and the `createGuestAuth` Cloud Function.

/**
 * Open the "Agregar invitado" modal.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter):
 *   - createGuest(guestId, payload)  repository function (setDoc, no merge)
 *   - buildGuestCreatePayload(...)   shared payload-builder
 *   - buildGuestId({ firstName, lastName, maternalLastName })  slug helper
 *   - uniqueGuestId(baseId, existingIds)  dedupe helper
 *   - getActiveGuests()  live guest cache (to collect existing ids)
 *   - renderGuestManager()  re-render the table after success
 */
export function openCreateGuestModal(ctx) {
  const {
    createGuest,
    buildGuestCreatePayload,
    buildGuestId,
    uniqueGuestId,
    getActiveGuests,
    renderGuestManager,
  } = ctx;

  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 32rem;">
      <div class="dashboard-modal-heading">
        <h3>Agregar invitado</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="dashboard-modal-form">
        <p style="line-height:1.6;color:#55452d;font-size:0.9rem;">
          Crea un nuevo invitado. El ID se genera automáticamente a partir del
          nombre (y se deduplica si ya existe). Si escribes un correo, también
          se creará su cuenta de acceso.
        </p>

        <div class="dashboard-modal-field">
          <label>Nombre *</label>
          <input type="text" data-create-firstName placeholder="Nombre" />
        </div>
        <div class="dashboard-modal-field">
          <label>Nombre 2</label>
          <input type="text" data-create-middleName placeholder="Nombre 2" />
        </div>
        <div class="dashboard-modal-field">
          <label>Apellido *</label>
          <input type="text" data-create-lastName placeholder="Apellido" />
        </div>
        <div class="dashboard-modal-field">
          <label>Apellido 2</label>
          <input type="text" data-create-maternalLastName placeholder="Apellido 2" />
        </div>

        <div class="dashboard-modal-field">
          <label>Género</label>
          <select data-create-gender>
            <option value="">—</option>
            <option value="M">Mujer</option>
            <option value="H">Hombre</option>
          </select>
        </div>
        <div class="dashboard-modal-field">
          <label>Edad</label>
          <select data-create-age>
            <option value="">—</option>
            <option value="Adulto">Adulto</option>
            <option value="Niño">Niño</option>
          </select>
        </div>
        <div class="dashboard-modal-field">
          <label>Idioma</label>
          <select data-create-lang>
            <option value="es">Español</option>
            <option value="fr">Francés</option>
            <option value="en">Inglés</option>
          </select>
        </div>
        <div class="dashboard-modal-field">
          <label>Grupo de invitación</label>
          <input type="text" data-create-invitationGroup placeholder="Ej. Familia López" />
        </div>
        <div class="dashboard-modal-field">
          <label>Teléfono (WhatsApp)</label>
          <input type="text" data-create-phone placeholder="+52 …" />
        </div>
        <div class="dashboard-modal-field">
          <label>Correo de acceso</label>
          <input type="text" data-create-email placeholder="invitado@correo.com" />
        </div>

        <div class="dashboard-modal-field">
          <label>ID generado</label>
          <input type="text" data-create-id readonly placeholder="Se genera al escribir el nombre" />
        </div>

        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="button" data-create-submit>Crear invitado</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-create-status></small>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const status = overlay.querySelector("[data-create-status]");
  const idInput = overlay.querySelector("[data-create-id]");

  // Live-preview the generated (deduped) id as the couple types the name.
  const refreshId = () => {
    const firstName = overlay.querySelector("[data-create-firstName]").value;
    const lastName = overlay.querySelector("[data-create-lastName]").value;
    const maternalLastName = overlay.querySelector("[data-create-maternalLastName]").value;
    const base = buildGuestId({ firstName, lastName, maternalLastName });
    const existing = getActiveGuests().map((g) => g.id);
    idInput.value = base ? uniqueGuestId(base, existing) : "";
  };
  ["[data-create-firstName]", "[data-create-lastName]", "[data-create-maternalLastName]"].forEach((sel) => {
    overlay.querySelector(sel).addEventListener("input", refreshId);
  });

  overlay.querySelector("[data-create-submit]").addEventListener("click", async () => {
    const firstName = overlay.querySelector("[data-create-firstName]").value.trim();
    const lastName = overlay.querySelector("[data-create-lastName]").value.trim();
    if (!firstName || !lastName) {
      status.textContent = "❌ El nombre y el apellido son obligatorios.";
      status.dataset.state = "error";
      return;
    }

    const guestId = idInput.value;
    if (!guestId) {
      status.textContent = "❌ No se pudo generar un ID a partir del nombre.";
      status.dataset.state = "error";
      return;
    }

    const email = overlay.querySelector("[data-create-email]").value.trim();

    status.textContent = "Creando invitado…";
    status.dataset.state = "working";

    try {
      // 1. Create the guest doc (setDoc WITHOUT merge — a duplicate id fails loudly).
      const payload = buildGuestCreatePayload({
        guestId,
        firstName,
        middleName: overlay.querySelector("[data-create-middleName]").value,
        lastName,
        maternalLastName: overlay.querySelector("[data-create-maternalLastName]").value,
        gender: overlay.querySelector("[data-create-gender]").value,
        age: overlay.querySelector("[data-create-age]").value,
        lang: overlay.querySelector("[data-create-lang]").value,
        invitationGroup: overlay.querySelector("[data-create-invitationGroup]").value,
        tagGroup: overlay.querySelector("[data-create-invitationGroup]").value,
        phone: overlay.querySelector("[data-create-phone]").value,
        cloudinaryId: "",
        timestamp: new Date(),
      });
      await createGuest(guestId, payload);

      // 2. If an email was provided, provision the guest's Firebase Auth account.
      if (email) {
        const functions = getFunctions();
        const createGuestAuth = httpsCallable(functions, "createGuestAuth");
        await createGuestAuth({ guestId, email });
      }

      status.textContent = "✅ Invitado creado.";
      status.dataset.state = "success";
      renderGuestManager();
      setTimeout(close, 1200);
    } catch (err) {
      console.error("createGuest failed", err);
      status.textContent = `❌ ${err.message || "Error al crear el invitado."}`;
      status.dataset.state = "error";
    }
  });
}
