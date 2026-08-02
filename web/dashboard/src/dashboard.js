import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

import { db } from "./firebase.js";
import { getActiveGuests, getGuestsByUnit, getGuest, getGuestByEmail } from "./guests.js";
import { buildInvitationUrl } from "./invitation-profile.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";


const DASHBOARD_CODE = "vivelafrance";


const COLLECTIONS = {
  rsvps: "rsvp_submissions",
  suggestions: "experience_suggestions",
  coast: "coast_interest",
  petanque: "petanque_participation",
};

const state = {
  rsvps: [],
  suggestions: [],
  coast: [],
  petanque: [],
  invitationGroups: [], // from Firestore collection "invitation_groups"
  filterGroup: "",
  filterCabin: "",
  filterQuery: "",
  groupBy: "group",
  activeTab: "guests",
};

// ── Sub-page routing ─────────────────────────────────────────────────────

/**
 * Map URL path segments to internal tab IDs.
 */
const PATH_TO_TAB = {
  invitados: "guests",
  grupos: "groups",
  cabins: "cabins",
  tables: "tables",
  rsvps: "rsvps",
  suggestions: "suggestions",
  coast: "coast",
  petanque: "petanque",
};

/**
 * Map internal tab IDs to URL path segments.
 */
const TAB_TO_PATH = {
  guests: "invitados",
  groups: "grupos",
  cabins: "cabins",
  tables: "tables",
  rsvps: "rsvps",
  suggestions: "suggestions",
  coast: "coast",
  petanque: "petanque",
};

/**
 * Get the active tab from the URL path.
 * Returns "guests" as default.
 */
function getTabFromPath() {
  const path = window.location.pathname.replace(/\/+$/u, "");
  const match = path.match(/^\/dashboard\/(\w+)$/u);
  if (match) {
    const segment = match[1];
    if (PATH_TO_TAB[segment]) return PATH_TO_TAB[segment];
  }
  return "guests";
}

/**
 * Navigate to a sub-page tab without full page reload.
 */
function navigateToTab(tabId) {
  const segment = TAB_TO_PATH[tabId] || "invitados";
  const newPath = `/dashboard/${segment}`;
  if (window.location.pathname.replace(/\/+$/u, "") !== newPath) {
    window.history.pushState({ tab: tabId }, "", newPath);
  }
  switchTab(tabId);
}

const fieldLabels = {
  attendance: "Asistencia",
  accommodation: "Alojamiento",
  independentArrival: "Llegada independiente",
  sundayMorning: "Domingo por la mañana",
  travelStatus: "Viaje",
  partySize: "Personas",
  adults: "Adultos",
  children: "Menores",
  guests: "Invitados del grupo",
  groupName: "Grupo",
  email: "Correo",
  whatsapp: "WhatsApp",
  arrivalFrom: "Origen",
  arrivalTo: "Llegada a",
  arrivalDate: "Fecha de llegada",
  arrivalTime: "Hora de llegada",
  arrivalAirline: "Aerolínea de llegada",
  arrivalFlight: "Vuelo de llegada",
  departureFrom: "Salida desde",
  departureTo: "Destino",
  departureDate: "Fecha de salida",
  departureTime: "Hora de salida",
  departureAirline: "Aerolínea de salida",
  departureFlight: "Vuelo de salida",
  route: "Ruta",
  notes: "Notas",
  invitationCode: "Perfil de invitación",
  dessert: "Postre",
  foodSuggestion: "Comida",
  songTitle: "Canción",
  songArtist: "Artista",
  singInterest: "Quiere cantar",
  extra: "Otra sugerencia",
  interest: "Interés",
  nights: "Noches",
  destination: "Destino preferido",
  style: "Organización",
  note: "Nota",
  // Petanque fields
  petanqueParticipation: "Participa en petanca",
  petanquePartySize: "Personas en petanca",
  petanqueNames: "Nombres de participantes",
  petanqueOwnBoules: "¿Tienen sus propias boules?",
};

const valueLabels = {
  yes: "Sí",
  no: "No",
  maybe: "Tal vez",
  solo: "Individual",
  group: "Grupo",
  onsite_two_nights: "Cabañas · 2 noches",
  independent: "Por su cuenta",
  friday: "Desde el viernes",
  saturday: "Solo el sábado",
  booked: "Viaje reservado",
  planning: "Viaje en preparación",
  local: "Local",
  barra: "Barra de Navidad",
  manzanillo: "Manzanillo",
  either: "Cualquiera",
  other: "Otra idea",
  shared: "Alojamiento en grupo",
  day: "Solo playa y cena",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return valueLabels[value] || String(value);
}

function submittedAt(record) {
  const date = record.createdAt?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Fecha pendiente";
}

function numeric(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showMessage(message, stateName = "") {
  const status = document.querySelector("[data-dashboard-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = stateName;
}

// ── Access control ─────────────────────────────────────────────────────
// There is no dedicated admin login. The dashboard reuses the same Firebase
// Auth session as the invitation and only grants access to guests who belong
// to the "Novios" group (David and Aydé). Everyone else sees an access-denied
// screen and is redirected back to the invitation.

const NOVIOS_GROUP = "Novios";

function isNovioGuest(guest) {
  return Boolean(guest && (guest.group === NOVIOS_GROUP || guest.isNovio));
}

function renderAccessDenied(app) {
  document.title = "Acceso restringido · David & Aydé";
  app.innerHTML = `
    <main class="dashboard-login">
      <section class="dashboard-login-card">
        <a class="dashboard-back" href="/">← Volver a la invitación</a>
        <div class="dashboard-login-icon" aria-hidden="true">◆</div>
        <p class="dashboard-eyebrow">Zona privada</p>
        <h1>Panel de los novios</h1>
        <p class="dashboard-login-desc">
          Este panel está reservado a David y Aydé. Si crees que deberías tener
          acceso, escríbenos directamente.
        </p>
        <a class="dashboard-button" href="/">Volver a la invitación</a>
      </section>
    </main>
  `;
}

// ── Guest Manager ──────────────────────────────────────────────────────


function getUniqueGuestGroups() {
  const groups = new Set(getActiveGuests().map((g) => g.group || "Sin grupo"));
  return [...groups].sort();
}

function getUniqueCabins() {
  const cabins = [
    ...new Set(
      getActiveGuests()
        .filter((g) => g.hasCabin && g.unit)
        .map((g) => g.unit),
    ),
  ];
  return cabins.sort();
}

function getFilteredGuests() {
  let filtered = getActiveGuests();

  if (state.filterGroup) {
    filtered = filtered.filter((g) => g.group === state.filterGroup);
  }
  if (state.filterCabin) {
    filtered = filtered.filter((g) => g.unit === state.filterCabin);
  }
  if (state.filterQuery) {
    const q = state.filterQuery.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q),
    );
  }
  return filtered;
}

function getInviteUrl(guestId) {
  return buildInvitationUrl(window.location.origin, guestId);
}

function getRsvpForGuest(guestId) {
  return state.rsvps.find((r) => r.invitationCode === guestId);
}

function guestStatusBadge(guest) {
  const rsvp = getRsvpForGuest(guest.id);
  if (!rsvp) return make("span", "dashboard-badge dashboard-badge-pending", "Pendiente");
  if (rsvp.attendance === "yes") return make("span", "dashboard-badge dashboard-badge-yes", "✅ Confirmado");
  if (rsvp.attendance === "no") return make("span", "dashboard-badge dashboard-badge-no", "❌ No asiste");
  return make("span", "dashboard-badge dashboard-badge-maybe", "🤷 Tal vez");
}

// ── Guest Editor Modal ─────────────────────────────────────────────────

function openGuestEditor(guest) {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal">
      <div class="dashboard-modal-heading">
        <h3>Editar invitado</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-guest-form>
        <input type="hidden" name="id" value="${guest.id}" />

        <div class="dashboard-modal-field">
          <label for="edit-firstName">Nombre</label>
          <input id="edit-firstName" name="firstName" value="${guest.firstName}" required />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-lastName">Apellido</label>
          <input id="edit-lastName" name="lastName" value="${guest.lastName || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-group">Grupo</label>
          <select id="edit-group" name="group">
            ${getUniqueGuestGroups()
              .map(
                (g) =>
                  `<option value="${g}" ${guest.group === g ? "selected" : ""}>${g}</option>`,
              )
              .join("")}
            <option value="__create_group__" style="color:#a0352c;font-weight:600;">＋ Crear nuevo grupo…</option>
          </select>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-hasCabin">¿Tiene cabaña?</label>
          <select id="edit-hasCabin" name="hasCabin">
            <option value="true" ${guest.hasCabin ? "selected" : ""}>Sí</option>
            <option value="false" ${!guest.hasCabin ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="dashboard-modal-field" id="edit-cabin-fields" style="${guest.hasCabin ? "" : "display:none"}">
          <label for="edit-unit">Cabaña</label>
          <select id="edit-unit" name="unit">
            <option value="">—</option>
            ${getUniqueCabins()
              .map(
                (c) =>
                  `<option value="${c}" ${guest.unit === c ? "selected" : ""}>${c}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div class="dashboard-modal-field" id="edit-occupancy-field" style="${guest.hasCabin ? "" : "display:none"}">
          <label for="edit-occupancy">Ocupación</label>
          <select id="edit-occupancy" name="occupancy">
            <option value="privada" ${guest.occupancy === "privada" ? "selected" : ""}>Privada</option>
            <option value="compartida" ${guest.occupancy === "compartida" ? "selected" : ""}>Compartida</option>
          </select>
        </div>

        <div class="dashboard-modal-field" id="edit-payment-field" style="${guest.hasCabin ? "" : "display:none"}">
          <label for="edit-payment">Pago</label>
          <select id="edit-payment" name="payment">
            <option value="pagada" ${guest.payment === "pagada" ? "selected" : ""}>Pagada</option>
            <option value="porpagar" ${guest.payment === "porpagar" ? "selected" : ""}>Por pagar</option>
          </select>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-cabinLabel">Nombre visible de cabaña</label>
          <input id="edit-cabinLabel" name="cabinLabel" value="${guest.cabinLabel || ""}" placeholder="Ej: Cabaña 4" />
        </div>

        <div class="dashboard-modal-field" id="edit-room-field" style="${guest.hasCabin ? "" : "display:none"}">
          <label for="edit-room">Cuarto / Habitación</label>
          <input id="edit-room" name="room" value="${guest.room || ""}" placeholder="Ej: VILLA AZALEA-1, SUITE DON CARLOS-2" />
          <small style="color:#8a7a5f;display:block;margin-top:0.25rem;">Nivel de detalle dentro de la cabaña (cuarto asignado).</small>
        </div>

        <hr class="dashboard-modal-divider" />

        <div class="dashboard-modal-field">
          <label for="edit-customGreeting">Saludo personalizado (HTML)</label>
          <input id="edit-customGreeting" name="customGreeting" value="${guest.customContent?.greeting || ""}" placeholder="Ej: ¡Bienvenidos, familia!" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-customMessage">Mensaje personalizado (HTML)</label>
          <textarea id="edit-customMessage" name="customMessage" rows="3" placeholder="Ej: Les tenemos una sorpresa preparada…">${guest.customContent?.message || ""}</textarea>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-customSection">Sección extra (HTML)</label>
          <textarea id="edit-customSection" name="customSection" rows="4" placeholder="Ej: <div><h3>Nota especial</h3><p>...</p></div>">${guest.customContent?.section || ""}</textarea>
        </div>

        <div class="dashboard-modal-actions">

          <button class="dashboard-button" type="submit">Guardar cambios</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-guest-editor-status></small>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Toggle cabin fields when hasCabin changes
  const hasCabinSelect = overlay.querySelector("[name=hasCabin]");
  const cabinFields = overlay.querySelector("#edit-cabin-fields");
  const occupancyField = overlay.querySelector("#edit-occupancy-field");
  const paymentField = overlay.querySelector("#edit-payment-field");
  const roomField = overlay.querySelector("#edit-room-field");
  hasCabinSelect.addEventListener("change", () => {
    const show = hasCabinSelect.value === "true";
    cabinFields.style.display = show ? "" : "none";
    occupancyField.style.display = show ? "" : "none";
    paymentField.style.display = show ? "" : "none";
    if (roomField) roomField.style.display = show ? "" : "none";
  });

  // Close handlers
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Handle group select change for "create new group"
  const groupSelect = overlay.querySelector("[name=group]");
  groupSelect.addEventListener("change", async () => {
    if (groupSelect.value === "__create_group__") {
      openCreateGroupModal((newGroupName) => {
        // Add the new option and select it
        const opt = document.createElement("option");
        opt.value = newGroupName;
        opt.textContent = newGroupName;
        opt.selected = true;
        groupSelect.insertBefore(opt, groupSelect.querySelector('[value="__create_group__"]'));
        groupSelect.value = newGroupName;
      });
    }
  });

  // Submit handler
  const form = overlay.querySelector("[data-guest-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const status = overlay.querySelector("[data-guest-editor-status]");
    status.textContent = "Guardando…";
    status.dataset.state = "working";

    const hasCabin = data.get("hasCabin") === "true";
    const customGreeting = data.get("customGreeting") || "";
    const customMessage = data.get("customMessage") || "";
    const customSection = data.get("customSection") || "";

    const updated = {
      id: data.get("id"),
      firstName: data.get("firstName"),
      lastName: data.get("lastName") || "",
      group: data.get("group"),
      hasCabin,
      unit: hasCabin ? data.get("unit") || "" : "",
      occupancy: hasCabin ? data.get("occupancy") || "" : "",
      payment: hasCabin ? data.get("payment") || "" : "",
      cabinLabel: hasCabin ? data.get("cabinLabel") || "" : "",
      room: hasCabin ? data.get("room") || "" : "",
    };

    // Only include customContent if at least one field is non-empty
    if (customGreeting || customMessage || customSection) {
      updated.customContent = {};
      if (customGreeting) updated.customContent.greeting = customGreeting;
      if (customMessage) updated.customContent.message = customMessage;
      if (customSection) updated.customContent.section = customSection;
    }

    try {
      await setDoc(doc(db, "guests", updated.id), updated);

      status.textContent = "✅ Guardado. Recarga la página para ver los cambios.";
      status.dataset.state = "success";
      setTimeout(() => overlay.remove(), 1500);
    } catch (err) {
      console.error("Failed to save guest", err);
      status.textContent = "❌ Error al guardar. Intenta de nuevo.";
      status.dataset.state = "error";
    }
  });
}

// ── Inline save helper ─────────────────────────────────────────────────

async function saveGuestInline(guestId, field, value) {
  try {
    await setDoc(doc(db, "guests", guestId), { [field]: value }, { merge: true });
    // Also update the in-memory guest
    const guest = getGuest(guestId);
    if (guest) guest[field] = value;
    return true;
  } catch (err) {
    console.error("Failed to save guest inline", err);
    return false;
  }
}

// ── Delete confirm modal ───────────────────────────────────────────────

function openDeleteConfirm(guest) {
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
          ¿Estás segura de eliminar a <strong>${guest.firstName} ${guest.lastName}</strong>
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
      await setDoc(doc(db, "guests", guest.id), { _deleted: true }, { merge: true });
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

// ── Create Group Modal ─────────────────────────────────────────────────

function openCreateGroupModal(callback) {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 28rem;">
      <div class="dashboard-modal-heading">
        <h3>Crear nuevo grupo</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-create-group-form>
        <div class="dashboard-modal-field">
          <label for="new-group-name">Nombre del grupo</label>
          <input id="new-group-name" name="groupName" type="text" required autofocus
            placeholder="Ej: Familia de David, PetanclubGDL…" />
        </div>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="submit">Crear grupo</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-create-group-status></small>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const form = overlay.querySelector("[data-create-group-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get("groupName")?.trim();
    if (!name) return;

    const status = overlay.querySelector("[data-create-group-status]");
    status.textContent = "Creando…";
    status.dataset.state = "working";

    try {
      await setDoc(doc(db, "invitation_groups", name), {
        tag: { color: "#55452d", textColor: "#ffffff", label: name },
        customContent: { greeting: "", message: "", section: "", hideSections: [] },
      });
      status.textContent = "✅ Grupo creado";
      status.dataset.state = "success";
      if (callback) callback(name);
      setTimeout(() => overlay.remove(), 1000);
    } catch (err) {
      console.error("Failed to create group", err);
      status.textContent = "❌ Error al crear el grupo";
      status.dataset.state = "error";
    }
  });

  // Focus the input
  setTimeout(() => overlay.querySelector("#new-group-name")?.focus(), 100);
}

// ── Groups Panel ────────────────────────────────────────────────────────

function renderGroupsPanel() {
  const container = document.querySelector("[data-groups-manager]");
  if (!container) return;

  const groups = state.invitationGroups;

  container.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="dashboard-button" type="button" data-create-group>+ Nuevo grupo</button>
    </div>
    ${groups.length === 0
      ? '<p class="dashboard-empty">No hay grupos personalizados. Crea uno para añadir contenido especial.</p>'
      : `<div class="dashboard-groups-grid">
          ${groups
            .map(
              (g) => {
                const tag = g.tag || {};
                const tagBg = tag.color || "#55452d";
                const tagText = tag.textColor || "#ffffff";
                const tagLabel = tag.label || g.id;
                return `
            <div class="dashboard-group-card" data-group-card="${g.id}">
              <div class="dashboard-group-card-heading" style="background:${tagBg};color:${tagText};">
                <strong>${tagLabel}</strong>
                <button class="dashboard-link-btn" data-delete-group="${g.id}" title="Eliminar grupo" style="color:${tagText};">🗑️</button>
              </div>
              <div class="dashboard-group-card-body">
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Color de fondo</label>
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <input type="color" value="${tagBg}"
                      data-group-field="tag.color" data-group-id="${g.id}" style="width:3rem;height:2.2rem;padding:0;border:1px solid rgba(85,69,45,0.2);border-radius:0.4rem;cursor:pointer;" />
                    <input type="text" value="${tagBg}"
                      data-group-field="tag.color" data-group-id="${g.id}" placeholder="#55452d" style="flex:1;" />
                  </div>
                </div>
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Color de texto</label>
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <input type="color" value="${tagText}"
                      data-group-field="tag.textColor" data-group-id="${g.id}" style="width:3rem;height:2.2rem;padding:0;border:1px solid rgba(85,69,45,0.2);border-radius:0.4rem;cursor:pointer;" />
                    <input type="text" value="${tagText}"
                      data-group-field="tag.textColor" data-group-id="${g.id}" placeholder="#ffffff" style="flex:1;" />
                  </div>
                </div>
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Texto visible</label>
                  <input type="text" value="${tagLabel}"
                    data-group-field="tag.label" data-group-id="${g.id}" placeholder="${g.id}" />
                </div>
                <hr style="border:0;border-top:1px solid rgba(85,69,45,0.12);margin:0.25rem 0;" />
                <div class="dashboard-modal-field">
                  <label>Saludo personalizado (HTML)</label>
                  <input type="text" value="${(g.customContent?.greeting || "").replace(/"/g, "&#34;")}"
                    data-group-field="greeting" data-group-id="${g.id}" placeholder="Ej: ¡Bienvenidos, familia!" />
                </div>
                <div class="dashboard-modal-field">
                  <label>Mensaje personalizado (HTML)</label>
                  <textarea rows="2" data-group-field="message" data-group-id="${g.id}" placeholder="Ej: Les tenemos una sorpresa preparada…">${g.customContent?.message || ""}</textarea>
                </div>
                <div class="dashboard-modal-field">
                  <label>Sección extra (HTML)</label>
                  <textarea rows="3" data-group-field="section" data-group-id="${g.id}" placeholder="Ej: <div><h3>Nota especial</h3><p>...</p></div>">${g.customContent?.section || ""}</textarea>
                </div>
                <div class="dashboard-modal-field">
                  <label>Secciones a ocultar (IDs separados por coma)</label>
                  <input type="text" value="${(g.customContent?.hideSections || []).join(", ")}"
                    data-group-field="hideSections" data-group-id="${g.id}" placeholder="Ej: schedule, gift" />
                </div>
                <small data-group-status="${g.id}" style="color:#4caf50;font-size:0.8rem;"></small>
              </div>
            </div>`;}
            )
            .join("")}
          </div>`
    }
  `;

  // ── Create new group ──
  container.querySelector("[data-create-group]")?.addEventListener("click", () => {
    openCreateGroupModal();
  });

  // ── Inline save on change ──
  container.querySelectorAll("[data-group-field]").forEach((el) => {
    const save = async () => {
      const groupId = el.dataset.groupId;
      const field = el.dataset.groupField;
      const status = container.querySelector(`[data-group-status="${groupId}"]`);
      let value;
      if (field === "hideSections") {
        value = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        value = el.value;
      }
      try {
        // Tag fields are at root level (tag.color, tag.textColor, tag.label)
        // Custom content fields are under customContent.*
        const isTagField = field.startsWith("tag.");
        const docField = isTagField ? field : `customContent.${field}`;
        await setDoc(
          doc(db, "invitation_groups", groupId),
          { [docField]: value },
          { merge: true },
        );
        if (status) {
          status.textContent = "✅ Guardado";
          setTimeout(() => { if (status) status.textContent = ""; }, 2000);
        }
      } catch (err) {
        console.error("Failed to save group field", err);
        if (status) {
          status.textContent = "❌ Error";
          status.style.color = "#a0352c";
          setTimeout(() => { if (status) status.style.color = "#4caf50"; }, 2000);
        }
      }
    };
    el.addEventListener("change", save);
    el.addEventListener("blur", save);
  });

  // ── Delete group ──
  container.querySelectorAll("[data-delete-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.deleteGroup;
      if (confirm(`¿Eliminar el grupo "${groupId}"? Esto no afecta a los invitados asignados a este grupo.`)) {
        deleteDoc(doc(db, "invitation_groups", groupId)).catch((err) => {
          console.error("Failed to delete group", err);
          alert("Error al eliminar el grupo.");
        });
      }
    });
  });
}

// ── Guest Manager (grouped, inline editable) ───────────────────────────

function renderGuestManager() {
  const container = document.querySelector("[data-guest-manager]");
  if (!container) return;

  const filtered = getFilteredGuests();

  // Group by the selected dimension (group / cabin / room)
  const groupKeyOf = (g) => {
    if (state.groupBy === "cabin") return g.hasCabin && g.unit ? g.cabinLabel || g.unit : "Sin cabaña";
    if (state.groupBy === "room") return g.room || "Sin cuarto";
    return g.group || "Sin grupo";
  };

  const grouped = {};
  filtered.forEach((g) => {
    const key = groupKeyOf(g);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  const groupKeys = Object.keys(grouped).sort();

  container.innerHTML = `
    <div class="dashboard-guest-filters">
      <div class="dashboard-filter-group">
        <label for="filter-group">Grupo</label>
        <select id="filter-group" data-filter-group>
          <option value="">Todos los grupos</option>
          ${getUniqueGuestGroups()
            .map(
              (g) =>
                `<option value="${g}" ${state.filterGroup === g ? "selected" : ""}>${g}</option>`,
            )
            .join("")}
          <option value="__create_group__" style="color:#a0352c;font-weight:600;">＋ Crear nuevo grupo…</option>
        </select>
      </div>
      <div class="dashboard-filter-group">
        <label for="filter-cabin">Cabaña</label>
        <select id="filter-cabin" data-filter-cabin>
          <option value="">Todas las cabañas</option>
          ${getUniqueCabins()
            .map(
              (c) =>
                `<option value="${c}" ${state.filterCabin === c ? "selected" : ""}>${c}</option>`,
            )
            .join("")}
        </select>
      </div>
      <div class="dashboard-filter-group">
        <label for="filter-query">Buscar</label>
        <input
          id="filter-query"
          type="text"
          data-filter-query
          placeholder="Nombre, ID o grupo…"
          value="${state.filterQuery}"
        />
      </div>
      <div class="dashboard-filter-group">
        <label for="filter-groupby">Agrupar por</label>
        <select id="filter-groupby" data-filter-groupby>
          <option value="group" ${state.groupBy === "group" ? "selected" : ""}>Grupo</option>
          <option value="cabin" ${state.groupBy === "cabin" ? "selected" : ""}>Cabaña</option>
          <option value="room" ${state.groupBy === "room" ? "selected" : ""}>Cuarto</option>
        </select>
      </div>
      <div class="dashboard-filter-count">
        <strong>${filtered.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
    </div>
    <div class="dashboard-guest-table-wrap">
      <table class="dashboard-guest-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Grupo</th>
            <th>Cabaña</th>
            <th>Cuarto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${groupKeys
            .map(
              (groupName) => `
            <tr class="dashboard-group-header" data-group="${groupName}">
              <td colspan="7">
                <button class="dashboard-group-toggle" type="button" data-toggle-group="${groupName}" aria-expanded="true">
                  <span class="dashboard-group-arrow">▼</span>
                  <strong>${groupName}</strong>
                  <span class="dashboard-group-count">${grouped[groupName].length} invitados</span>
                </button>
              </td>
            </tr>
            ${grouped[groupName]
              .map(
                (guest) => `
            <tr class="dashboard-guest-row" data-group="${groupName}">
              <td><code>${guest.id}</code></td>
              <td>
                <input class="dashboard-inline-input" type="text" value="${guest.firstName} ${guest.lastName}"
                  data-inline-field="name" data-guest-id="${guest.id}" title="Editar nombre" />
              </td>
              <td>
                <select class="dashboard-inline-select" data-inline-field="group" data-guest-id="${guest.id}">
                  ${getUniqueGuestGroups()
                    .map(
                      (g) =>
                        `<option value="${g}" ${guest.group === g ? "selected" : ""}>${g}</option>`,
                    )
                    .join("")}
                  <option value="__create_group__" style="color:#a0352c;font-weight:600;">＋ Crear nuevo grupo…</option>
                </select>
              </td>
              <td>
                <select class="dashboard-inline-select" data-inline-field="unit" data-guest-id="${guest.id}">
                  <option value="">— Sin cabaña —</option>
                  ${getUniqueCabins()
                    .map(
                      (c) => {
                        const label = guest.unit === c ? (guest.cabinLabel || c) : c;
                        return `<option value="${c}" ${guest.unit === c ? "selected" : ""}>${label}</option>`;
                      },
                    )
                    .join("")}
                </select>
              </td>
              <td>
                <input class="dashboard-inline-input" type="text" value="${guest.room || ""}"
                  data-inline-field="room" data-guest-id="${guest.id}" placeholder="—" title="Editar cuarto" />
              </td>
              <td data-guest-status="${guest.id}"></td>
              <td>
                <button class="dashboard-link-btn" data-edit-guest="${guest.id}" title="Editar todo (modal)">✏️</button>
                <button class="dashboard-link-btn" data-copy-link="${guest.id}" title="Copiar enlace">🔗</button>
                <button class="dashboard-link-btn" data-preview-link="${guest.id}" title="Vista previa">👁️</button>
                <button class="dashboard-link-btn" data-delete-guest="${guest.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
              </td>
            </tr>`,
              )
              .join("")}
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  // Populate status badges
  filtered.forEach((guest) => {
    const cell = container.querySelector(`[data-guest-status="${guest.id}"]`);
    if (cell) cell.append(guestStatusBadge(guest));
  });

  // ── Filter events ──
  container.querySelector("[data-filter-group]")?.addEventListener("change", (e) => {
    const value = e.target.value;
    if (value === "__create_group__") {
      openCreateGroupModal((newGroupName) => {
        state.filterGroup = newGroupName;
        renderGuestManager();
      });
      // Reset the select to previous value
      e.target.value = state.filterGroup || "";
      return;
    }
    state.filterGroup = value;
    renderGuestManager();
  });
  container.querySelector("[data-filter-cabin]")?.addEventListener("change", (e) => {
    state.filterCabin = e.target.value;
    renderGuestManager();
  });
  container.querySelector("[data-filter-query]")?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    renderGuestManager();
  });
  container.querySelector("[data-filter-groupby]")?.addEventListener("change", (e) => {
    state.groupBy = e.target.value;
    renderGuestManager();
  });

  // ── Group toggle ──
  container.querySelectorAll("[data-toggle-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.toggleGroup;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", !expanded);
      btn.querySelector(".dashboard-group-arrow").textContent = expanded ? "▶" : "▼";
      container.querySelectorAll(`.dashboard-guest-row[data-group="${group}"]`).forEach((row) => {
        row.style.display = expanded ? "none" : "";
      });
    });
  });

  // ── Inline edit: name ──
  container.querySelectorAll("[data-inline-field='name']").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.guestId;
      const fullName = input.value.trim();
      const spaceIdx = fullName.indexOf(" ");
      const firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();
      const ok1 = await saveGuestInline(guestId, "firstName", firstName);
      const ok2 = await saveGuestInline(guestId, "lastName", lastName);
      if (ok1 && ok2) {
        input.style.borderColor = "#4caf50";
        setTimeout(() => (input.style.borderColor = ""), 1000);
      } else {
        input.style.borderColor = "#a0352c";
      }
    });
  });

  // ── Inline edit: group ──
  container.querySelectorAll("[data-inline-field='group']").forEach((select) => {
    select.addEventListener("change", async () => {
      const value = select.value;
      // If user selected the "create new group" option
      if (value === "__create_group__") {
        openCreateGroupModal((newGroupName) => {
          // After group is created, assign this guest to the new group
          const guestId = select.dataset.guestId;
          saveGuestInline(guestId, "group", newGroupName).then((ok) => {
            if (ok) {
              select.value = newGroupName;
              select.style.borderColor = "#4caf50";
              setTimeout(() => (select.style.borderColor = ""), 1000);
            }
          });
        });
        return;
      }
      const guestId = select.dataset.guestId;
      const ok = await saveGuestInline(guestId, "group", select.value);
      if (ok) {
        select.style.borderColor = "#4caf50";
        setTimeout(() => (select.style.borderColor = ""), 1000);
      } else {
        select.style.borderColor = "#a0352c";
      }
    });
  });

  // ── Inline edit: unit (cabin) ──
  container.querySelectorAll("[data-inline-field='unit']").forEach((select) => {
    select.addEventListener("change", async () => {
      const guestId = select.dataset.guestId;
      const hasCabin = select.value !== "";
      const updates = { hasCabin, unit: select.value || "" };
      if (!hasCabin) {
        updates.occupancy = "";
        updates.payment = "";
        updates.cabinLabel = "";
      }
      try {
        await setDoc(doc(db, "guests", guestId), updates, { merge: true });
        const guest = getGuest(guestId);
        if (guest) {
          guest.hasCabin = hasCabin;
          guest.unit = select.value || "";
          if (!hasCabin) {
            guest.occupancy = "";
            guest.payment = "";
            guest.cabinLabel = "";
          }
        }
        select.style.borderColor = "#4caf50";
        setTimeout(() => (select.style.borderColor = ""), 1000);
      } catch (err) {
        console.error("Failed to save cabin", err);
        select.style.borderColor = "#a0352c";
      }
    });
  });

  // ── Inline edit: room (cuarto) ──
  container.querySelectorAll("[data-inline-field='room']").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.guestId;
      const ok = await saveGuestInline(guestId, "room", input.value.trim());
      if (ok) {
        input.style.borderColor = "#4caf50";
        setTimeout(() => (input.style.borderColor = ""), 1000);
      } else {
        input.style.borderColor = "#a0352c";
      }
    });
  });

  // ── Edit guest (modal) ──
  container.querySelectorAll("[data-edit-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.editGuest;
      const guest = getGuest(guestId);
      if (guest) openGuestEditor(guest);
    });
  });

  // ── Copy link ──
  container.querySelectorAll("[data-copy-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.copyLink;
      const url = getInviteUrl(guestId);
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });

  // ── Preview link ──
  container.querySelectorAll("[data-preview-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.previewLink;
      const url = getInviteUrl(guestId);
      window.open(url, "_blank");
    });
  });

  // ── Delete guest ──
  container.querySelectorAll("[data-delete-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.deleteGuest;
      const guest = getGuest(guestId);
      if (guest) openDeleteConfirm(guest);
    });
  });
}

// ── Cabin Assignments ──────────────────────────────────────────────────

function renderCabinAssignments() {
  const container = document.querySelector("[data-cabin-assignments]");
  if (!container) return;

  const cabins = getUniqueCabins();

  container.innerHTML = `
    <div class="dashboard-cabin-grid">
      ${cabins
        .map((unit) => {
          const guests = getGuestsByUnit(unit);
          const cabinGuest = guests[0];
          const label = cabinGuest?.cabinLabel || unit;
          const occupancy = cabinGuest?.occupancy || "";
          const payment = cabinGuest?.payment || "";
          return `
            <div class="dashboard-cabin-card">
              <div class="dashboard-cabin-heading">
                <strong>${label}</strong>
                <span class="dashboard-cabin-meta">${occupancy === "privada" ? "Privada" : "Compartida"} · ${payment === "pagada" ? "Pagada" : "Por pagar"}</span>
              </div>
              <ul class="dashboard-cabin-guests">
                ${guests
                  .map(
                    (g) => `
                  <li>
                    <span>${g.firstName} ${g.lastName}</span>
                    <code class="dashboard-cabin-code">${g.id}</code>
                    <button class="dashboard-link-btn" data-copy-guest="${g.id}" title="Copiar enlace">🔗</button>
                  </li>
                `,
                  )
                  .join("")}
              </ul>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-copy-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.copyGuest;
      const url = getInviteUrl(guestId);
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });
}

// ── Table Assignments ──────────────────────────────────────────────────

function renderTableAssignments() {
  const container = document.querySelector("[data-table-assignments]");
  if (!container) return;

  // Get unique groups and their RSVP status
  const groups = getUniqueGuestGroups().map((group) => {
    const guests = getActiveGuests().filter((g) => g.group === group);
    const rsvps = guests.map((g) => getRsvpForGuest(g.id)).filter(Boolean);
    const confirmed = rsvps.filter((r) => r.attendance === "yes");
    const totalPeople = confirmed.reduce((sum, r) => sum + numeric(r.partySize), 0);
    return { name: group, guests, rsvps, confirmed: confirmed.length, totalPeople };
  });

  container.innerHTML = `
    <div class="dashboard-table-grid">
      ${groups
        .map(
          (group) => `
        <div class="dashboard-table-card">
          <div class="dashboard-table-heading">
            <strong>${group.name}</strong>
            <span class="dashboard-table-meta">${group.confirmed} confirmados · ${group.totalPeople} personas</span>
          </div>
          <ul class="dashboard-table-guests">
            ${group.guests
              .map(
                (g) => `
              <li>
                <span>${g.firstName} ${g.lastName}</span>
                <span class="dashboard-table-status">${getRsvpForGuest(g.id)?.attendance === "yes" ? "✅" : getRsvpForGuest(g.id)?.attendance === "no" ? "❌" : "⏳"}</span>
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

// ── Summary cards ──────────────────────────────────────────────────────

function summaryCard(label, value, detail) {
  const article = make("article", "dashboard-summary-card");
  article.append(
    make("span", "", label),
    make("strong", "", String(value)),
    make("small", "", detail),
  );
  return article;
}

// ── RSVP detail rows ───────────────────────────────────────────────────

function detailRow(label, value) {
  const row = make("div", "dashboard-detail-row");
  row.append(make("dt", "", label), make("dd", "", formatValue(value)));
  return row;
}

function recordCard(record, type) {
  const article = make("article", "dashboard-record");
  const heading = make("header", "dashboard-record-heading");
  const title =
    type === "rsvps"
      ? `${record.firstName || ""} ${record.lastName || ""}`.trim()
      : record.name;
  heading.append(
    make("h3", "", title || "Sin nombre"),
    make("time", "", submittedAt(record)),
  );

  const fields =
    type === "rsvps"
      ? [
          "invitationCode", "attendance", "partySize", "adults", "children",
          "groupName", "guests", "email", "whatsapp", "accommodation",
          "independentArrival", "sundayMorning", "travelStatus",
          "arrivalFrom", "arrivalTo", "arrivalDate", "arrivalTime",
          "arrivalAirline", "arrivalFlight", "departureFrom", "departureTo",
          "departureDate", "departureTime", "departureAirline",
          "departureFlight", "route", "notes",
        ]
      : type === "suggestions"
        ? [
            "invitationCode", "dessert", "foodSuggestion", "songTitle",
            "songArtist", "singInterest", "extra",
          ]
        : type === "petanque"
          ? [
              "invitationCode", "petanqueParticipation", "petanquePartySize",
              "petanqueNames", "petanqueOwnBoules",
            ]
          : [
              "invitationCode", "interest", "partySize", "nights", "destination",
              "style", "note",
            ];

  const details = make("dl", "dashboard-record-details");
  fields
    .filter(
      (field) =>
        record[field] !== undefined && record[field] !== "",
    )
    .forEach((field) => {
      details.append(detailRow(fieldLabels[field] || field, record[field]));
    });
  article.append(heading, details);
  return article;
}

function renderCollection(target, records, type, emptyMessage) {
  target.replaceChildren();
  if (!records.length) {
    target.append(make("p", "dashboard-empty", emptyMessage));
    return;
  }
  records.forEach((record) => target.append(recordCard(record, type)));
}

// ── CSV export ─────────────────────────────────────────────────────────

function csvCell(value) {
  const normalized = value?.toDate?.()?.toISOString?.() || value || "";
  return `"${String(normalized).replaceAll('"', '""')}"`;
}

function downloadCsv(type) {
  const records = state[type];
  if (!records.length) return;
  const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const csv = [
    keys.map(csvCell).join(","),
    ...records.map((record) =>
      keys.map((key) => csvCell(record[key])).join(","),
    ),
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boda-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Data loading ───────────────────────────────────────────────────────

function updateDashboardData() {
  const attending = state.rsvps.filter((record) => record.attendance === "yes");
  const attendees = attending.reduce(
    (total, record) => total + numeric(record.partySize),
    0,
  );
  const lodging = state.rsvps.filter(
    (record) =>
      record.attendance === "yes" &&
      record.accommodation === "onsite_two_nights",
  );
  const travelers = state.rsvps.filter((record) =>
    ["booked", "planning"].includes(record.travelStatus),
  );
  const petanque = state.petanque.filter(
    (record) => record.petanqueParticipation === "yes",
  );
  const petanquePeople = petanque.reduce(
    (total, record) => total + numeric(record.petanquePartySize),
    0,
  );

  const summary = document.querySelector("[data-dashboard-summary]");
  if (summary) {
    summary.replaceChildren(
      summaryCard(
        "Confirmaciones",
        state.rsvps.length,
        `${attending.length} respuestas afirmativas`,
      ),
      summaryCard("Personas", attendees, "En respuestas confirmadas"),
      summaryCard("Alojamiento", lodging.length, "Grupos interesados en cabañas"),
      summaryCard("Viajes", travelers.length, "Reservados o en preparación"),
      summaryCard("Petanca 🎱", petanque.length, `${petanquePeople} personas`),
    );
  }

  renderCollection(
    document.querySelector('[data-records="rsvps"]'),
    state.rsvps,
    "rsvps",
    "Todavía no hay respuestas RSVP.",
  );
  renderCollection(
    document.querySelector('[data-records="suggestions"]'),
    state.suggestions,
    "suggestions",
    "Todavía no hay sugerencias.",
  );
  renderCollection(
    document.querySelector('[data-records="coast"]'),
    state.coast,
    "coast",
    "Todavía no hay respuestas sobre la playa.",
  );
  renderCollection(
    document.querySelector('[data-records="petanque"]'),
    state.petanque,
    "petanque",
    "Todavía no hay respuestas de petanca.",
  );

  // Re-render guest manager if visible
  renderGuestManager();
  renderTableAssignments();
}

async function loadDashboardData() {
  showMessage("Actualizando respuestas…", "working");
  const entries = await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, collectionName]) => {
      const snapshot = await getDocs(collection(db, collectionName));
      const records = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));
      records.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      return [key, records];
    }),
  );
  entries.forEach(([key, records]) => {
    state[key] = records;
  });
  updateDashboardData();
  showMessage(`Actualizado a las ${new Date().toLocaleTimeString("es-MX")}`);
}

function showLoadError(error) {
  console.error("Dashboard data load failed", error);
  showMessage(
    "No pudimos cargar las respuestas. Verifica tu acceso y vuelve a intentar.",
    "error",
  );
}

// ── Tab Navigation ─────────────────────────────────────────────────────

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.classList.toggle("dashboard-tab-active", btn.dataset.dashboardTab === tab);
  });
  document.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
    panel.classList.toggle("dashboard-panel-active", panel.dataset.dashboardPanel === tab);
  });
}

function renderTabNavigation() {
  const tabs = [
    { id: "guests", label: "Invitados", icon: "👥" },
    { id: "groups", label: "Grupos", icon: "🏷️" },
    { id: "cabins", label: "Cabañas", icon: "🏠" },
    { id: "tables", label: "Mesas", icon: "🪑" },
    { id: "rsvps", label: "RSVP", icon: "📋" },
    { id: "suggestions", label: "Sugerencias", icon: "🎵" },
    { id: "coast", label: "Costa", icon: "🏖️" },
    { id: "petanque", label: "Petanca", icon: "🎱" },
  ];

  const nav = document.querySelector("[data-dashboard-tabs]");
  if (!nav) return;

  nav.innerHTML = tabs
    .map(
      (tab) => `
      <button
        class="dashboard-tab ${tab.id === state.activeTab ? "dashboard-tab-active" : ""}"
        data-dashboard-tab="${tab.id}"
        type="button"
      >
        <span class="dashboard-tab-icon">${tab.icon}</span>
        <span class="dashboard-tab-label">${tab.id === state.activeTab ? tab.label : ""}</span>
      </button>
    `,
    )
    .join("");

  nav.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.addEventListener("click", () => navigateToTab(btn.dataset.dashboardTab));
  });
}

// ── Main dashboard render ──────────────────────────────────────────────

function renderDashboard(app) {
  document.title = "Panel de los novios · David & Aydé";
  app.innerHTML = `
    <main class="dashboard">
      <header class="dashboard-header">
        <div>
          <p class="dashboard-eyebrow">David & Aydé · 20 febrero 2027</p>
          <h1>Panel de los novios</h1>
        </div>
        <div class="dashboard-header-actions">
          <a class="dashboard-link" href="/">Ver invitación</a>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-refresh>Actualizar</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-sign-out>Salir</button>
        </div>
      </header>

      <p class="dashboard-status" data-dashboard-status></p>

      <section class="dashboard-summary" data-dashboard-summary aria-label="Resumen"></section>

      <!-- ── Tab Navigation ── -->
      <nav class="dashboard-tabs" data-dashboard-tabs aria-label="Secciones del panel"></nav>

      <!-- ── Panel: Guests ── -->
      <section class="dashboard-panel" data-dashboard-panel="guests">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Gestión de invitados</p>
              <h2>Invitados</h2>
            </div>
          </div>
          <div data-guest-manager></div>
        </div>
      </section>

      <!-- ── Panel: Groups ── -->
      <section class="dashboard-panel" data-dashboard-panel="groups">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Contenido personalizado por grupo</p>
              <h2>Grupos de invitación</h2>
            </div>
          </div>
          <div data-groups-manager></div>
        </div>
      </section>

      <!-- ── Panel: Cabins ── -->
      <section class="dashboard-panel" data-dashboard-panel="cabins">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Asignación de cabañas</p>
              <h2>Cabañas</h2>
            </div>
          </div>
          <div data-cabin-assignments></div>
        </div>
      </section>

      <!-- ── Panel: Tables ── -->
      <section class="dashboard-panel" data-dashboard-panel="tables">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Distribución de mesas</p>
              <h2>Mesas</h2>
            </div>
          </div>
          <div data-table-assignments></div>
        </div>
      </section>

      <!-- ── Panel: RSVPs ── -->
      <section class="dashboard-panel" data-dashboard-panel="rsvps">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Invitados y logística</p>
              <h2>RSVP</h2>
            </div>
            <button class="dashboard-export" type="button" data-export="rsvps">Descargar CSV</button>
          </div>
          <div class="dashboard-records" data-records="rsvps"></div>
        </div>
      </section>

      <!-- ── Panel: Suggestions ── -->
      <section class="dashboard-panel" data-dashboard-panel="suggestions">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Comida, música y momentos</p>
              <h2>Sugerencias</h2>
            </div>
            <button class="dashboard-export" type="button" data-export="suggestions">Descargar CSV</button>
          </div>
          <div class="dashboard-records" data-records="suggestions"></div>
        </div>
      </section>

      <!-- ── Panel: Coast ── -->
      <section class="dashboard-panel" data-dashboard-panel="coast">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Después de la boda</p>
              <h2>Escapada a la costa</h2>
            </div>
            <button class="dashboard-export" type="button" data-export="coast">Descargar CSV</button>
          </div>
          <div class="dashboard-records" data-records="coast"></div>
        </div>
      </section>

      <!-- ── Panel: Petanque ── -->
      <section class="dashboard-panel" data-dashboard-panel="petanque">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Torneo de petanca</p>
              <h2>Petanca</h2>
            </div>
            <button class="dashboard-export" type="button" data-export="petanque">Descargar CSV</button>
          </div>
          <div class="dashboard-records" data-records="petanque"></div>
        </div>
      </section>
    </main>
  `;

  // ── Set initial tab from URL path ──
  const initialTab = getTabFromPath();
  state.activeTab = initialTab;
  // If at /dashboard (no sub-path), redirect to /dashboard/invitados
  const currentPath = window.location.pathname.replace(/\/+$/u, "");
  if (currentPath === "/dashboard") {
    const redirectPath = "/dashboard/invitados";
    window.history.replaceState({ tab: "guests" }, "", redirectPath);
  }
  // Activate the panel for the initial tab. Without this, the panel stays
  // hidden (display:none) until the user clicks a tab, which made the guest
  // table appear empty on first load.
  switchTab(initialTab);


  // ── Real-time listener for invitation_groups ──
  const groupsUnsub = onSnapshot(collection(db, "invitation_groups"), (snapshot) => {
    state.invitationGroups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Re-render guest manager and groups panel if they exist
    renderGuestManager();
    renderGroupsPanel();
  });

  renderTabNavigation();
  renderGuestManager();
  renderCabinAssignments();
  renderGroupsPanel();

  // ── Handle browser back/forward ──
  window.addEventListener("popstate", (event) => {
    const tab = getTabFromPath();
    state.activeTab = tab;
    switchTab(tab);
    renderTabNavigation();
  });

  document
    .querySelector("[data-refresh]")
    .addEventListener("click", () => loadDashboardData().catch(showLoadError));
  document.querySelector("[data-sign-out]").addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out error", err);
    }
    // Return to the invitation, which will show its own access gate.
    window.location.href = "/";
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => downloadCsv(button.dataset.export));
  });

  loadDashboardData().catch(showLoadError);

  // Store unsub for cleanup
  app._groupsUnsub = groupsUnsub;
}

export function startDashboard(app) {
  // There is no dedicated admin login. We reuse the current Firebase Auth
  // session (the same one used by the invitation) and only grant access to
  // guests who belong to the "Novios" group (David and Aydé). Everyone else
  // sees an access-denied screen.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // No active session: send them to the invitation to sign in first.
      window.location.href = "/";
      return;
    }
    const guest = getGuestByEmail(user.email);
    if (isNovioGuest(guest)) {
      renderDashboard(app);
    } else {
      renderAccessDenied(app);
    }
  });
}

