import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, limit, query } from "firebase/firestore";


import { db } from "./firebase.js";
import {
  getActiveGuests,
  getGuestsByUnit,
  getGuest,
  getGuestByEmail,
  setLiveGuests,
} from "./guests.js";


import { loadRooms } from "./rooms.js";
import { loadTables, renderTablesManager } from "./tables.js";
import { collections } from "../../shared/firestore-paths.js";
import {
  buildDashboardGuestEditPayload,
  buildDashboardGuestInlinePayload,
} from "../../shared/payload-builders.js";

import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { createMatrixLoader } from "./matrixLoader.js";


// Collections fetched via `loadDashboardData` and reported to the matrix
// loader. The legacy RSVP/suggestions/coast/petanque collections are no longer
// written by the app (answers live in the `guests` collection), so they are
// intentionally NOT loaded here. `guests`, `rooms` and `tables` are loaded by
// their own dedicated loaders/listeners and reported separately.
const COLLECTIONS = {
  activity_events: collections.activityEvents,
  budget: collections.budget,
  cabins: collections.cabins,
  card_votes: collections.cardVotes,
  genre_ratings: collections.genreRatings,
  guiso_rankings: collections.guisoRankings,
  login_events: collections.loginEvents,
  page_views: collections.pageViews,
  song_requests: collections.songRequests,
  thanks: collections.thanks,
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
  sortKey: "name",
  sortDir: "asc",
};

// ── Matrix-style loading overlay ───────────────────────────────────────
// A cinematic full-screen loading overlay shown while the dashboard boots and
// loads its data. It reports REAL loading metrics (chunk sizes, getDocs
// figures, data size, record counts) per data source. See matrixLoader.js.
//
// The `sources` list must match EXACTLY the names we report via `reportSource`
// below. `guests`, `rooms` and `tables` are reported by their own loaders /
// listeners; the rest are reported by `loadDashboardData` (see `COLLECTIONS`).
// The loader's `finish()` only completes once EVERY source reports done, so any
// source listed here but never reported would keep the overlay up forever.
const matrixLoader = createMatrixLoader({
  sources: [
    { name: "guests", label: "Invitados" },
    { name: "rooms", label: "Cuartos" },
    { name: "tables", label: "Mesas" },
    { name: "cabins", label: "Cabañas" },
    { name: "thanks", label: "Gracias" },
    { name: "activity_events", label: "Actividad" },
    { name: "budget", label: "Presupuesto" },
    { name: "card_votes", label: "Votos" },
    { name: "genre_ratings", label: "Géneros" },
    { name: "guiso_rankings", label: "Guisos" },
    { name: "login_events", label: "Accesos" },
    { name: "page_views", label: "Visitas" },
    { name: "song_requests", label: "Canciones" },
  ],
});


// Estimate the byte size of a collection's records by serializing them to JSON
// and measuring the string length. Firestore doesn't report wire sizes, so this
// is a close approximation of the data transferred.
function estimateBytes(records) {
  try {
    return new TextEncoder().encode(JSON.stringify(records)).length;
  } catch {
    return JSON.stringify(records).length;
  }
}

// Report a data source's loading status to the matrix loader.
function reportSource(name, records, done = true) {
  matrixLoader.reportSource({
    name,
    records: Array.isArray(records) ? records.length : 0,
    bytes: estimateBytes(records),
    done,
  });
}


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

function guestIdentity(guest) {
  return guest?.identity || {};
}

function guestHosting(guest) {
  return guest?.hosting || {};
}

function guestFullName(guest) {
  const identity = guestIdentity(guest);
  return [
    identity.firstName || guest.firstName,
    identity.middleName || guest.middleName,
    identity.lastName || guest.lastName,
    identity.maternalLastName || guest.maternalLastName,
  ].filter(Boolean).join(" ");
}

function guestRoom(guest) {
  return guestHosting(guest).room || guest.room || "";
}

// Build a Cloudinary avatar URL from a guest's photo id. The id is stored
// relative to the `boda/` prefix (e.g. `cabin/casona/foo`), so we render it as
// `boda/<id>`. Returns "" when the guest has no photo.
function guestAvatarUrl(guest) {
  const id = guestIdentity(guest).cloudinaryId || guest.cloudinaryId || "";
  if (!id) return "";
  return `https://res.cloudinary.com/k2ajcgxv/image/upload/w_256,h_256,c_fill,g_auto/boda/${id}`;
}

// Initials fallback for guests without a photo (e.g. "David Aïli" → "DA").
function guestInitials(guest) {
  const name = guestFullName(guest);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Sortable column keys for the INVITADOS table. Each maps to a value extractor
// used by `guestSortValue`. "avatar" is intentionally NOT sortable.
const GUEST_SORT_COLUMNS = ["id", "name", "group", "cabin", "room", "status"];

// Extract the sortable value for a guest given a column key.
function guestSortValue(guest, key) {
  switch (key) {
    case "id":
      return guest.id || "";
    case "name":
      return guestFullName(guest).toLowerCase();
    case "group":
      return (guest.group || "").toLowerCase();
    case "cabin":
      return (guest.cabinLabel || guest.unit || "").toLowerCase();
    case "room":
      return guestRoom(guest).toLowerCase();
    case "status": {
      const rsvp = getRsvpForGuest(guest.id);
      if (!rsvp) return 0;
      if (rsvp.attendance === "yes") return 2;
      if (rsvp.attendance === "no") return 1;
      return 0;
    }
    default:
      return "";
  }
}

// ── Access control ─────────────────────────────────────────────────────

// There is no dedicated admin login. The dashboard reuses the same Firebase
// Auth session as the invitation. Access is granted ONLY to guests whose
// Firestore `guests` doc has `isAdmin: true` (David and Aydé). Everyone else
// sees an access-denied screen and is redirected back to the invitation.
//
// The signed-in user is resolved by their Firebase auth email via
// `getGuestByEmail()` (the guest's `firebaseEmail` field), then we check
// `isAdmin`.
function isAdminGuest(guest) {
  return Boolean(guest && guest.isAdmin === true);
}



function invitationHref() {
  // In dev, the dashboard runs on port 5174 while the invitation runs on
  // port 5173. Link back to the invitation's origin so the user can sign in.
  return window.location.port === "5174"
    ? "http://localhost:5173/"
    : "/";
}

function renderAccessDenied(app) {
  document.title = "Acceso restringido · David & Aydé";
  const backHref = invitationHref();
  app.innerHTML = `
    <main class="dashboard-login">
      <section class="dashboard-login-card">
        <a class="dashboard-back" href="${backHref}">← Volver a la invitación</a>
        <div class="dashboard-login-icon" aria-hidden="true">◆</div>
        <p class="dashboard-eyebrow">Zona privada</p>
        <h1>Panel de los novios</h1>
        <p class="dashboard-login-desc">
          Este panel está reservado a David y Aydé. Si crees que deberías tener
          acceso, escríbenos directamente.
        </p>
        <a class="dashboard-button" href="${backHref}">Volver a la invitación</a>
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
        String(guestIdentity(g).firstName || g.firstName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).middleName || g.middleName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).lastName || g.lastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).maternalLastName || g.maternalLastName || "").toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q),
    );
  }

  return filtered;
}

// Build an invitation URL for a guest. The per-guest invitation-code system was
// removed (login is now email/password), so the invitation is served at the
// base origin; the guest id is kept as a query param for analytics/tracking
// only. Inlined here (mirrors `guestDomain.js`) so the dashboard doesn't depend
// on the removed `invitation-profile.js` module.
function buildInvitationUrl(origin, guestId) {
  const base = (origin || "").replace(/\/+$/, "");
  const params = new URLSearchParams();
  if (guestId) params.set("guest", guestId);
  const qs = params.toString();
  return qs ? `${base}/?${qs}` : `${base}/`;
}

function getInviteUrl(guestId) {
  // In dev, the dashboard runs on port 5174 while the invitation runs on
  // port 5173. Build invitation links against the invitation's origin.
  const origin =
    window.location.port === "5174"
      ? "http://localhost:5173"
      : window.location.origin;
  return buildInvitationUrl(origin, guestId);
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
          <input id="edit-firstName" name="firstName" value="${guest.identity?.firstName || guest.firstName || ""}" required />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-middleName">Nombre 2</label>
          <input id="edit-middleName" name="middleName" value="${guest.identity?.middleName || guest.middleName || guest.nombre2 || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-lastName">Apellido</label>
          <input id="edit-lastName" name="lastName" value="${guest.identity?.lastName || guest.lastName || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-maternalLastName">Apellido 2</label>
          <input id="edit-maternalLastName" name="maternalLastName" value="${guest.identity?.maternalLastName || guest.maternalLastName || guest.apellido2 || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-gender">Género</label>
          <input id="edit-gender" name="gender" value="${guest.identity?.gender || guest.gender || ""}" placeholder="Ej: H, M" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-identityCloudinaryId">Foto de perfil (identity.cloudinaryId)</label>
          <input id="edit-identityCloudinaryId" name="identityCloudinaryId" value="${guest.identity?.cloudinaryId || guest.cloudinaryId || ""}"
            placeholder="Ej: v1785544747/IMG_3496_qzt2un.heic" />
        </div>


        <div class="dashboard-modal-field">
          <label for="edit-invitationGroup">Grupo de invitación</label>
          <input id="edit-invitationGroup" name="invitationGroup" value="${guest.invitationGroup || ""}"
            placeholder="Ej: Familia Rako, Sebastian, Mónica, Iyali y Amélie…" />
          <small style="color:#8a7a5f;display:block;margin-top:0.25rem;">
            Grupo visible en la invitación. El grupo interno (${guest.group || "—"}) se edita en la hoja de cálculo.
          </small>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-phone">Teléfono</label>
          <input id="edit-phone" name="phone" value="${guest.identity?.phone || guest.phone || ""}" placeholder="Ej: +52 1 55 1234 5678" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-idCheckUser">Verificación de identidad</label>
          <select id="edit-idCheckUser" name="idCheckUser">
            <option value="true" ${guest.idCheckUser ? "selected" : ""}>Sí</option>
            <option value="false" ${!guest.idCheckUser ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-cloudinaryId">Foto de perfil (Cloudinary ID)</label>
          <input id="edit-cloudinaryId" name="cloudinaryId" value="${guest.cloudinaryId || ""}"
            placeholder="Ej: v1785544747/IMG_3496_qzt2un.heic" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-messageAuthor">Autor del mensaje</label>
          <input id="edit-messageAuthor" name="messageAuthor" value="${guest.messageAuthor || ""}"
            placeholder="Ej: David y Aydé" />
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

  // Close handlers
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Submit handler — only writes AGREED SCHEMA fields to `guests`
  const form = overlay.querySelector("[data-guest-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const status = overlay.querySelector("[data-guest-editor-status]");
    status.textContent = "Guardando…";
    status.dataset.state = "working";

    const guestId = data.get("id");
    const updated = buildDashboardGuestEditPayload({
      guestId,
      firstName: data.get("firstName"),
      middleName: data.get("middleName") || "",
      lastName: data.get("lastName") || "",
      maternalLastName: data.get("maternalLastName") || "",
      gender: data.get("gender") || "",
      invitationGroup: data.get("invitationGroup") || "",
      phone: data.get("phone") || "",
      idCheckUser: data.get("idCheckUser") === "true",
      cloudinaryId: data.get("identityCloudinaryId") || data.get("cloudinaryId") || "",
      messageAuthor: data.get("messageAuthor") || "",
      timestamp: new Date(),
    });

    try {
      await setDoc(doc(db, collections.guests, guestId), updated, { merge: true });


      // Update in-memory guest
      const g = getGuest(guestId);
      if (g) {
        g.identity = {
          ...(g.identity || {}),
          ...(updated.identity || {}),
        };
        g.firstName = updated.identity?.firstName || g.firstName;
        g.middleName = updated.identity?.middleName || g.middleName;
        g.lastName = updated.identity?.lastName || g.lastName;
        g.maternalLastName = updated.identity?.maternalLastName || g.maternalLastName;
        g.gender = updated.identity?.gender || g.gender;
        g.identity.cloudinaryId = updated.identity?.cloudinaryId || g.identity.cloudinaryId;
        g.invitationGroup = updated.invitationGroup;
        g.phone = updated.identity?.phone || g.phone;
        g.idCheckUser = updated.idCheckUser;
        g.cloudinaryId = updated.identity?.cloudinaryId || updated.cloudinaryId;
        g.messageAuthor = updated.messageAuthor;
      }


      status.textContent = "✅ Guardado.";
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

// AGREED SCHEMA: Only these fields may be written to the `guests` collection
// from the client. Everything else (group, hasCabin, unit, occupancy, payment,
// cabinLabel, room, customContent) is static data from the sheet and must be
// edited there, not in Firestore.
const GUEST_WRITABLE_FIELDS = new Set([
  "firstName", "middleName", "lastName", "maternalLastName", "phone", "idCheckUser", "cloudinaryId",
  "messageAuthor", "invitationGroup", "_deleted",
]);


async function saveGuestInline(guestId, field, value) {
  // Reject writes to fields outside the agreed schema
  if (!GUEST_WRITABLE_FIELDS.has(field)) {
    console.warn(`[schema] Field "${field}" is not in the agreed guests schema. Skipping write.`);
    return false;
  }
  try {
    const guest = getGuest(guestId);
    const invitationGroup = guest?.invitationGroup || "";
    const payload = buildDashboardGuestInlinePayload(
      guestId,
      field,
      value,
      invitationGroup,
      new Date(),
    );
    if (!payload) return false;
    await setDoc(
      doc(db, collections.guests, guestId),
      payload,
      { merge: true },
    );

    // Also update the in-memory guest
    if (guest) {
      if (["firstName", "middleName", "lastName", "maternalLastName", "phone"].includes(field)) {
        guest.identity = { ...(guest.identity || {}), [field]: value };
      }
      guest[field] = value;
    }
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
      await setDoc(doc(db, collections.guests, guest.id), { _deleted: true }, { merge: true });

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
      await setDoc(doc(db, collections.invitationGroups, name), {

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
          doc(db, collections.invitationGroups, groupId),
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
        deleteDoc(doc(db, collections.invitationGroups, groupId)).catch((err) => {

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

  let filtered = getFilteredGuests();

  // ── Sort by the active column ──
  // Sort the filtered list by `state.sortKey` in `state.sortDir`. The sort
  // happens BEFORE grouping so each group's rows are internally ordered too.
  const sortKey = GUEST_SORT_COLUMNS.includes(state.sortKey) ? state.sortKey : "name";
  const dir = state.sortDir === "desc" ? -1 : 1;
  filtered = [...filtered].sort((a, b) => {
    const av = guestSortValue(a, sortKey);
    const bv = guestSortValue(b, sortKey);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  // Group by the selected dimension (group / cabin / room)
  const groupKeyOf = (g) => {
    if (state.groupBy === "cabin") return g.hasCabin && g.unit ? g.cabinLabel || g.unit : "Sin cabaña";
    if (state.groupBy === "room") return guestRoom(g) || "Sin cuarto";
    return g.group || "Sin grupo";
  };

  const grouped = {};
  filtered.forEach((g) => {
    const key = groupKeyOf(g);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  const groupKeys = Object.keys(grouped).sort();

  // ── Sortable header helper ──
  // Renders a `<th>` that toggles the sort when clicked. Shows ▲/▼ on the
  // active column. `data-sort-key` drives the click handler below.
  const sortTh = (key, label) => {
    const active = state.sortKey === key;
    const arrow = active ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
    return `<th class="dashboard-sortable ${active ? "dashboard-sort-active" : ""}" data-sort-key="${key}" title="Ordenar por ${label}">${label}${arrow}</th>`;
  };

  // ── Avatar cell helper ──
  // Shows the guest's photo when available, otherwise their initials.
  const avatarCell = (guest) => {
    const url = guestAvatarUrl(guest);
    const initials = guestInitials(guest);
    return url
      ? `<img class="dashboard-avatar" src="${url}" alt="${guestFullName(guest)}" loading="lazy" />`
      : `<span class="dashboard-avatar dashboard-avatar-initials">${initials}</span>`;
  };

  // ── Name cell helper ──
  // NOMBRE is READ-ONLY by default. Clicking it reveals 4 separate inputs
  // (firstName, middleName, lastName, maternalLastName) that save individually.
  const nameCell = (guest) => {
    const identity = guestIdentity(guest);
    const f = identity.firstName || guest.firstName || "";
    const m = identity.middleName || guest.middleName || "";
    const l = identity.lastName || guest.lastName || "";
    const ml = identity.maternalLastName || guest.maternalLastName || "";
    return `
      <div class="dashboard-name-cell" data-name-cell="${guest.id}">
        <button type="button" class="dashboard-name-display" data-name-display="${guest.id}" title="Editar nombre">
          ${guestFullName(guest) || "—"}
        </button>
        <div class="dashboard-name-editor" data-name-editor="${guest.id}" hidden>
          <input class="dashboard-inline-input" type="text" value="${f}" data-name-field="firstName" data-guest-id="${guest.id}" placeholder="Nombre" />
          <input class="dashboard-inline-input" type="text" value="${m}" data-name-field="middleName" data-guest-id="${guest.id}" placeholder="Nombre 2" />
          <input class="dashboard-inline-input" type="text" value="${l}" data-name-field="lastName" data-guest-id="${guest.id}" placeholder="Apellido" />
          <input class="dashboard-inline-input" type="text" value="${ml}" data-name-field="maternalLastName" data-guest-id="${guest.id}" placeholder="Apellido 2" />
          <button type="button" class="dashboard-link-btn" data-name-done="${guest.id}" title="Listo">✓</button>
        </div>
      </div>`;
  };


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
            <th class="dashboard-avatar-th" title="Foto de perfil">Foto</th>
            ${sortTh("id", "ID")}
            ${sortTh("name", "Nombre")}
            ${sortTh("group", "Grupo")}
            ${sortTh("cabin", "Cabaña")}
            ${sortTh("room", "Cuarto")}
            ${sortTh("status", "Estado")}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${groupKeys
            .map(
              (groupName) => `
            <tr class="dashboard-group-header" data-group="${groupName}">
              <td colspan="8">
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
              <td class="dashboard-avatar-cell">${avatarCell(guest)}</td>
              <td><code>${guest.id}</code></td>
              <td>${nameCell(guest)}</td>
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
                <input class="dashboard-inline-input" type="text" value="${guestRoom(guest)}"
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

  // ── Sortable headers ──
  // Clicking a sortable `<th>` toggles the sort: same column flips direction,
  // a new column starts ascending. Re-renders the table with the new order.
  container.querySelectorAll("[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      renderGuestManager();
    });
  });

  // ── Name editor: reveal on click ──
  // NOMBRE is read-only by default. Clicking the display button reveals the
  // 4 separate inputs (firstName, middleName, lastName, maternalLastName).
  container.querySelectorAll("[data-name-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.nameDisplay;
      const editor = container.querySelector(`[data-name-editor="${guestId}"]`);
      if (!editor) return;
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        const first = editor.querySelector('[data-name-field="firstName"]');
        if (first) first.focus();
      }
    });
  });

  // ── Name editor: save each field on change ──
  // Each of the 4 inputs saves its own field individually via saveGuestInline.
  container.querySelectorAll("[data-name-field]").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.guestId;
      const field = input.dataset.nameField;
      const ok = await saveGuestInline(guestId, field, input.value.trim());
      input.style.borderColor = ok ? "#4caf50" : "#a0352c";
      setTimeout(() => (input.style.borderColor = ""), 1000);
    });
  });

  // ── Name editor: done button ──
  // Closes the editor and refreshes the display name from the saved values.
  container.querySelectorAll("[data-name-done]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.nameDone;
      const editor = container.querySelector(`[data-name-editor="${guestId}"]`);
      const display = container.querySelector(`[data-name-display="${guestId}"]`);
      if (editor) editor.hidden = true;
      if (display) {
        const guest = getGuest(guestId);
        if (guest) display.textContent = guestFullName(guest) || "—";
      }
    });
  });



  // ── Inline edit: group (invitationGroup) ──
  // NOTE: The internal `group` field is static data from the sheet and cannot
  // be edited from the dashboard. This select edits `invitationGroup` (the
  // display group shown on the invitation), which IS in the agreed schema.
  container.querySelectorAll("[data-inline-field='group']").forEach((select) => {
    select.addEventListener("change", async () => {
      const value = select.value;
      // If user selected the "create new group" option
      if (value === "__create_group__") {
        openCreateGroupModal((newGroupName) => {
          // After group is created, assign this guest to the new invitation group
          const guestId = select.dataset.guestId;
          saveGuestInline(guestId, "invitationGroup", newGroupName).then((ok) => {
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
      const ok = await saveGuestInline(guestId, "invitationGroup", select.value);
      if (ok) {
        select.style.borderColor = "#4caf50";
        setTimeout(() => (select.style.borderColor = ""), 1000);
      } else {
        select.style.borderColor = "#a0352c";
      }
    });
  });

  // ── Inline edit: unit (cabin) — READ-ONLY ──
  // Cabin assignment is static data from the sheet. It cannot be edited from
  // the dashboard to keep the schema clean. Use the Google Sheet instead.
  container.querySelectorAll("[data-inline-field='unit']").forEach((select) => {
    select.addEventListener("change", () => {
      // Revert the change — cabin is static data from the sheet
      const guest = getGuest(select.dataset.guestId);
      if (guest) select.value = guest.unit || "";
      select.style.borderColor = "#a0352c";
      setTimeout(() => (select.style.borderColor = ""), 1500);
      alert("La asignación de cabaña se edita en la hoja de cálculo, no aquí.");
    });
  });

  // ── Inline edit: room (cuarto) — READ-ONLY ──
  // Room assignment is static data from the sheet. It cannot be edited from
  // the dashboard to keep the schema clean. Use the Google Sheet instead.
  container.querySelectorAll("[data-inline-field='room']").forEach((input) => {
    input.addEventListener("change", () => {
      // Revert the change — room is static data from the sheet
      const guest = getGuest(input.dataset.guestId);
      if (guest) input.value = guest.room || "";
      input.style.borderColor = "#a0352c";
      setTimeout(() => (input.style.borderColor = ""), 1500);
      alert("El cuarto se edita en la hoja de cálculo, no aquí.");
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
                    <span>${[g.firstName, g.middleName, g.lastName, g.maternalLastName].filter(Boolean).join(" ")}</span>
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

// ── Table Assignments (real-life 30m × 6m canvas) ──────────────────────

function renderTableAssignments() {
  const container = document.querySelector("[data-table-assignments]");
  if (!container) return;
  renderTablesManager(container);
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

// Bounded query limit for dashboard collections. Prevents unbounded reads
// that would grow with the number of submissions. For a wedding (~100-200
// guests) 1000 is generous; it also protects against runaway growth.
const DASHBOARD_QUERY_LIMIT = 1000;

async function loadDashboardData() {
  showMessage("Actualizando respuestas…", "working");
  // Fetch each collection independently and report its real metrics to the
  // matrix loader. A single collection failing (e.g. `budget` has no Firestore
  // read rule yet) must NOT break the whole load — we catch per-collection and
  // report 0 records so the loader still completes.
  const entries = await Promise.all(
    Object.entries(COLLECTIONS)
      .filter(([, collectionName]) => Boolean(collectionName))
      .map(async ([key, collectionName]) => {
        try {
          const snapshot = await getDocs(
            query(collection(db, collectionName), limit(DASHBOARD_QUERY_LIMIT)),
          );
          const records = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          records.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });
          // Report this collection's real loading metrics to the matrix loader.
          reportSource(key, records);
          return [key, records];
        } catch (err) {
          // Collection is not readable (no rule / permission denied). Report it
          // as done with 0 records so the loader doesn't hang, and keep going.
          console.warn(`[dashboard:load] Skipping unreadable collection "${key}"`, err);
          reportSource(key, []);
          return [key, []];
        }
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
          <a class="dashboard-link" href="${invitationHref()}">Ver invitación</a>
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


  // ── Mount the matrix-style loading overlay ──
  // Shows a cinematic full-screen loader while the dashboard boots and loads
  // its data. Each data source reports its real metrics (records + bytes) as
  // it resolves; the overlay fades out once every source has reported.
  matrixLoader.mount();
  // Kick off the finish sequence. `finish()` retries every 150ms until EVERY
  // source has reported done (or the minimum display time has elapsed), then
  // runs the reveal animation and hides the overlay.
  matrixLoader.finish();

  // ── Real-time listener for invitation_groups ──
  const groupsUnsub = onSnapshot(
    query(collection(db, collections.invitationGroups), limit(DASHBOARD_QUERY_LIMIT)),
    (snapshot) => {


    state.invitationGroups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Re-render guest manager and groups panel if they exist
    renderGuestManager();
    renderGroupsPanel();

  });

  renderTabNavigation();
  renderGuestManager();
  renderCabinAssignments();
  renderGroupsPanel();

  // ── Load rooms from Firestore (source of truth) ──
  loadRooms().then((rooms) => {
    // Report the rooms inventory to the matrix loader.
    reportSource("rooms", rooms || []);
    // Re-render cabin assignments now that room data is available
    renderCabinAssignments();
  });

  // ── Load tables from Firestore (source of truth for the seating canvas) ──
  // `loadTables` uses an internal `onSnapshot` listener and reports the tables
  // via the `onLoad` callback (it does not resolve with the array), so we pass
  // the callback here to report the real table count to the matrix loader.
  loadTables((tables) => {
    reportSource("tables", tables || []);
    renderTableAssignments();
  });


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
    window.location.href = invitationHref();
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
  // guests whose Firestore `guests` doc has `isAdmin: true` (David and Aydé).
  // Everyone else sees an access-denied screen.
  //
  // IMPORTANT: The access check depends on the LIVE `guests` collection. The
  // signed-in user is resolved by their Firebase auth email via
  // `getGuestByEmail()` (the guest's `firebaseEmail` field), then we check
  // `isAdmin`. We must populate the live guest cache BEFORE deciding access,
  // otherwise `getGuestByEmail()` returns undefined and everyone is denied.
  // `onSnapshot` fires immediately with the current data, so we drive the
  // access decision from inside its callback (which has the guests loaded)
  // rather than from `onAuthStateChanged` alone.

  let decided = false;
  let currentUser = null;

  const decideAccess = () => {
    // Never decide before we have a signed-in user AND the live guest cache is
    // populated. If the cache is empty, return WITHOUT locking `decided` so we
    // can retry once the `onSnapshot` listener fires with the guests.
    if (decided || !currentUser) return;
    if (getActiveGuests().length === 0) {
      console.log("[dashboard:auth] decideAccess deferred — live guest cache not populated yet");
      return;
    }
    // The auth user's `uid` IS the guest doc id in the `guests` collection
    // (e.g. `david_aïli`). Email is intentionally NOT stored in Firestore, so
    // we resolve the guest by uid first, then fall back to the email helper
    // (which matches the guest's `firebaseEmail` field when present).
    const guest = getGuest(currentUser.uid) || getGuestByEmail(currentUser.email);
    const isAdmin = isAdminGuest(guest);
    console.log("[dashboard:auth] decideAccess", {
      email: currentUser.email,
      uid: currentUser.uid,
      guestFound: Boolean(guest),
      guestId: guest?.id,
      guestGroup: guest?.group,
      guestIsAdmin: guest?.isAdmin,
      isAdmin,
      liveGuestCount: getActiveGuests().length,
    });


    if (isAdmin) {
      decided = true;
      renderDashboard(app);
    } else {
      decided = true;
      renderAccessDenied(app);
    }
  };


  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // No active session: send them to the invitation to sign in first.
      // In dev, the dashboard runs on port 5174 while the invitation runs on
      // port 5173. Redirect to the invitation's origin so the user can sign in.
      const invitationOrigin =
        window.location.port === "5174"
          ? "http://localhost:5173"
          : window.location.origin;
      console.log("[dashboard:auth] no session, redirecting to", invitationOrigin);
      window.location.href = `${invitationOrigin}/`;
      return;
    }
    console.log("[dashboard:auth] onAuthStateChanged", {
      email: user.email,
      uid: user.uid,
    });
    currentUser = user;
    // NOTE: do NOT call decideAccess() here — the live guest cache is not
    // populated yet (the onSnapshot listener below hasn't fired). The access
    // decision is driven from inside the listener callback, which fires
    // immediately with the current guests.
  });

  // Live listener on the `guests` collection — the single source of truth for
  // the dashboard. Populates the live guest cache (via `setLiveGuests`) and
  // re-renders the guest manager / cabins panel whenever guests change.
  onSnapshot(
    query(collection(db, collections.guests), limit(DASHBOARD_QUERY_LIMIT)),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLiveGuests(records);
      // Report the live guests to the matrix loader.
      reportSource("guests", records);
      console.log("[dashboard:auth] guests listener fired", {
        count: records.length,
        sample: records.slice(0, 3).map((r) => ({
          id: r.id,
          firebaseEmail: r.firebaseEmail,
          isAdmin: r.isAdmin,
          tagGroup: r.tagGroup,
        })),
      });
      // Decide access now that the guest cache is populated.
      decideAccess();
      // Re-render live-dependent panels if the dashboard is already shown.
      renderGuestManager();
      renderCabinAssignments();
    },
    (error) => {
      console.error("[dashboard:auth] Failed to load live guests", error);
      // If we can't read guests, we can't verify the couple's identity.
      if (currentUser) renderAccessDenied(app);
    },
  );
}



