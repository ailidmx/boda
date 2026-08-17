import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, limit, query, serverTimestamp } from "firebase/firestore";



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
import { buildInvitationUrl } from "./invitation-profile.js";
import { collections } from "../../shared/firestore-paths.js";
import { updateGuest, softDeleteGuest } from "./repositories/guestRepository.js";
import { createGroup, updateGroupField, deleteGroup } from "./repositories/groupRepository.js";

import {
  buildDashboardGuestEditPayload,
  buildDashboardGuestInlinePayload,
  buildGuestRsvpPayload,
} from "../../shared/payload-builders.js";


import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";


const COLLECTIONS = {
  rsvps: collections.rsvpSubmissions,
  suggestions: collections.experienceSuggestions,
  coast: collections.coastInterest,
  petanque: collections.petanqueParticipation,
};


const state = {
  rsvps: [],
  suggestions: [],
  coast: [],
  petanque: [],
  invitationGroups: [], // from Firestore collection "invitation_groups"
  liveGuests: [], // raw Firestore `guests` records (source of truth)
  authUsers: {}, // uid → { email } LIVE Firebase Auth user list (via listAuthUsers callable)
  filterGroup: "",
  filterQuery: "",
  activeTab: "guests",
  sortKey: "name",
  sortDir: "asc",
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

// Build a Cloudinary avatar URL from a guest's photo id. The id is the full
// public id (e.g. `gimena_k9swal`), so we render it directly without any
// `boda/` prefix. Returns "" when the guest has no photo.
function guestAvatarUrl(guest) {
  const id = guestIdentity(guest).cloudinaryId || guest.cloudinaryId || "";
  if (!id) return "";
  return `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${id}`;
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
// used by `guestSortValue`. "avatar" is intentionally NOT sortable. The ID and
// phone are NOT standalone columns — they live inside the "Identidad" column.
const GUEST_SORT_COLUMNS = [
  "name", "invitationGroup", "idCheck", "hasAuth", "group", "lang", "cabin", "room", "xtraCabin", "xtraRoom",
  "status",
];


// Extract the sortable value for a guest given a column key.
function guestSortValue(guest, key) {
  switch (key) {
    case "name":
      return guestFullName(guest).toLowerCase();
    case "invitationGroup":
      return (guest.invitationGroup || "").toLowerCase();
    case "idCheck":
      return guest.idCheckUser ? 1 : 0;

    case "hasAuth":
      return state.authUsers[guest.id] ? 1 : 0;



    case "group":
      return (guest.group || "").toLowerCase();
    case "lang":
      return (guest.identity?.lang || guest.lang || "").toLowerCase();
    case "cabin":
      return (guest.cabinLabel || guest.unit || "").toLowerCase();
    case "room":
      return guestRoom(guest).toLowerCase();
    case "xtraCabin":
      return (guest.xtraCabinLabel || guest.xtraCabin || "").toLowerCase();
    case "xtraRoom":
      return (guest.xtraRoom || "").toLowerCase();
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

// Per-group attendance summary for the group nav chips. For each group returns
// `{ confirmedSaturday, size }`:
//   - `confirmedSaturday` = guests in the group whose SATURDAY RSVP level is
//     ≥ RSVP_CONFIRMED_MIN_LEVEL (4) — i.e. confirmed for Saturday.
//   - `size` = total guests in the group.
// Rendered as "X/Y" on each chip (X = confirmed Saturday, Y = group size).
function getGroupAttendanceCounts() {
  const counts = {};
  getActiveGuests().forEach((guest) => {
    const group = guest.group || "Sin grupo";
    if (!counts[group]) counts[group] = { confirmedSaturday: 0, size: 0 };
    counts[group].size += 1;
    const saturday = getLiveRsvpAnswers(guest).saturday || 0;
    if (saturday >= RSVP_CONFIRMED_MIN_LEVEL) counts[group].confirmedSaturday += 1;
  });
  return counts;
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
  if (state.filterQuery) {
    const q = state.filterQuery.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        guestFullName(g).toLowerCase().includes(q) ||
        String(guestIdentity(g).firstName || g.firstName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).middleName || g.middleName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).lastName || g.lastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).maternalLastName || g.maternalLastName || "").toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q),
    );
  }

  return filtered;
}


// The production invitation origin. Invitation links sent to guests (email
// body, WhatsApp, and the modal preview) MUST always point here — never to a
// local dev server — so the guest always lands on the real site.
const INVITATION_ORIGIN = "https://boda-david-y-ayde.web.app";

function getInviteUrl(guestId) {
  return buildInvitationUrl(INVITATION_ORIGIN, guestId);
}



function getRsvpForGuest(guestId) {
  return state.rsvps.find((r) => r.invitationCode === guestId);
}

// ── Live RSVP scale (source of truth: guest's `rsvp.answers`) ──────────

// Attendance days tracked in the RSVP scale. Each guest's `rsvp.answers` map
// holds a scale level (int 0–5) per day; a guest counts as "confirmed" when
// the level is ≥ RSVP_CONFIRMED_MIN_LEVEL.
const RSVP_ATTENDANCE_DAYS = ["friday", "saturday", "sunday"];
const RSVP_CONFIRMED_MIN_LEVEL = 4;

// Read the live RSVP answers for a guest from the raw Firestore record.
function getLiveRsvpAnswers(guest) {
  const raw = state.liveGuests.find((r) => r.id === guest.id);
  return raw?.rsvp?.answers || guest?.rsvp?.answers || {};
}

// Merge a normalized guest with its raw live Firestore record. Live wins where
// both exist (identity names/photo, hosting incl. xtraCabin/xtraRoom, rsvp).
function getMergedGuest(guest) {
  const raw = state.liveGuests.find((r) => r.id === guest.id);
  if (!raw) return guest;
  return {
    ...guest,
    ...raw,
    identity: { ...(guest.identity || {}), ...(raw.identity || {}) },
    hosting: { ...(guest.hosting || {}), ...(raw.hosting || {}) },
    rsvp: { ...(guest.rsvp || {}), ...(raw.rsvp || {}) },
  };
}

// A guest "has a Firebase Auth account" when their RAW live record carries an
// explicit `firebaseEmail` (a real auth account was provisioned for them). The
// normalized `guest.firebaseEmail` always falls back to `id@domain`, so we must
// read the raw record, not the normalized one. Returns the auth email or "".
function guestAuthEmail(guest) {
  const raw = state.liveGuests.find((r) => r.id === guest.id);
  return raw?.firebaseEmail || "";
}

// The default auth domain the invitation app appends to bare usernames. Emails
// on this domain are NOT real inboxes, so we must never send an invitation to
// them.
const DEFAULT_AUTH_EMAIL_DOMAIN = "boda-david-y-ayde.web.app";

// A guest can receive an invitation only if they have a Firebase Auth account
// (either present in the live auth list or carrying an explicit firebaseEmail).
function guestHasAuth(guest) {
  return Boolean(state.authUsers[guest.id]) || Boolean(guestAuthEmail(guest));
}

// The email we would send an invitation to. Priority: the raw record's
// `firebaseEmail`, then the LIVE Firebase Auth user's email (the same source the
// identity column uses via `state.authUsers`), then the identity/record email.
function guestSendEmail(guest) {
  return (
    guestAuthEmail(guest) ||
    state.authUsers[guest.id]?.email ||
    guest.identity?.email ||
    guest.email ||
    ""
  );
}

// The email channel is available whenever the guest has a real (non-default
// domain) email address. We intentionally do NOT require a Firebase Auth
// account here: the couple may want to send an invitation to a guest who has a
// real inbox but hasn't been provisioned an auth account yet.
function guestCanEmail(guest) {
  const email = guestSendEmail(guest);
  return Boolean(email) && !email.endsWith(`@${DEFAULT_AUTH_EMAIL_DOMAIN}`);
}

// The WhatsApp channel is available only when the guest is auth'd AND has a
// phone number.
function guestCanWhatsapp(guest) {
  const phone = guest.identity?.phone || guest.phone || "";
  return guestHasAuth(guest) && Boolean(phone);
}


// Deterministic pastel background color for a badge label (stable per label).
function badgeStyle(text) {
  const palette = [
    "#e8dcc8", "#d9e4d2", "#d8e0ec", "#ecd9d9", "#e6d9ec",
    "#d9ecec", "#ece3d2", "#d2e6e6", "#e6d2d2", "#d2d9e6",
  ];
  let hash = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

// Colored badge span for a short label (grupo/cabaña/cuarto).
function badgeHtml(text) {
  const label = String(text || "").trim();
  if (!label) return '<span class="dashboard-badge dashboard-badge-muted">—</span>';
  return `<span class="dashboard-badge" style="background:${badgeStyle(label)};color:#3a2f1e;">${label}</span>`;
}

// RSVP scale dropdown for a single attendance day. The stored value stays an
// int 0–5 (0 = no answer). The select shows the current level and lets the
// admin pick any level directly (no click-to-cycle). The select's background
// reflects the level: gray = 0 (no answer), amber = 1–3, green = 4–5.
function rsvpLevelChip(guest, day) {
  const level = getLiveRsvpAnswers(guest)[day];
  const has = Number.isInteger(level) && level > 0;
  const cls = has
    ? level >= RSVP_CONFIRMED_MIN_LEVEL
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
    : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
  const current = has ? level : 0;
  const options = [0, 1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<option value="${n}" ${n === current ? "selected" : ""}>${n === 0 ? "—" : n}</option>`,
    )
    .join("");
  return `<select class="${cls}" data-rsvp-chip="${guest.id}" data-rsvp-day="${day}" title="Nivel de asistencia (0 = sin respuesta, 4–5 = confirmado)">${options}</select>`;
}


// Aggregate confirmed counts per attendance day from the live guests.
function computeDayConfirmations() {
  const counts = { friday: 0, saturday: 0, sunday: 0 };
  getActiveGuests().forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      if ((answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL) counts[day] += 1;
    });
  });
  return counts;
}

// Persist a guest's RSVP scale level for one attendance day via the shared
// payload builder (writes `rsvp.answers` on the `guests` doc).
async function saveGuestRsvpAnswer(guestId, day, level) {
  try {
    const guest = getGuest(guestId);
    const answers = { ...(guest?.rsvp?.answers || {}) };
    if (level > 0) answers[day] = level;
    else delete answers[day];
    const payload = buildGuestRsvpPayload({ guestId, answers, timestamp: new Date() });
    await updateGuest(guestId, payload);
    return true;


  } catch (err) {
    console.error("Failed to save RSVP answer", err);
    return false;
  }
}

// Status badge derived from the LIVE `rsvp.answers` (confirmed = any day ≥ 4,
// partial = answered but not confirmed, pending = no answers).
function guestStatusBadge(guest) {
  const answers = getLiveRsvpAnswers(guest);
  const hasAny = RSVP_ATTENDANCE_DAYS.some((day) => (answers[day] || 0) > 0);
  const confirmed = RSVP_ATTENDANCE_DAYS.some(
    (day) => (answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL,
  );
  if (confirmed) return make("span", "dashboard-badge dashboard-badge-yes", "✅ Confirmado");
  if (hasAny) return make("span", "dashboard-badge dashboard-badge-maybe", "🟡 Parcial");
  return make("span", "dashboard-badge dashboard-badge-pending", "Pendiente");
}


// ── Avatar upload (Cloudinary unsigned) ────────────────────────────────
// Mirrors the invitation's `uploadAvatar` helper so admins can pick an image
// in the edit modal and have it uploaded to the `boda/avatars` folder. The
// returned public id is stored on the guest's `identity.cloudinaryId` (and
// top-level `cloudinaryId`) — the same field the invitation reads.
const AVATAR_CLOUD_NAME = "k2ajcgxv";
const AVATAR_UPLOAD_PRESET =
  import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || "boda_avatars_unsigned";
const AVATAR_FOLDER = "boda/avatars";

async function uploadAvatarToCloudinary(file) {
  if (!file) throw new Error("No file selected");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large (max 8 MB)");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", AVATAR_UPLOAD_PRESET);
  formData.append("folder", AVATAR_FOLDER);

  const endpoint = `https://api.cloudinary.com/v1_1/${AVATAR_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed (${response.status}) ${text}`);
  }
  const data = await response.json();
  if (!data?.public_id) throw new Error("Upload failed: no public id returned");
  return data.public_id;
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
          <label>Foto de perfil</label>
          <div class="dashboard-avatar-upload">
            <span class="dashboard-avatar-upload-preview" data-avatar-preview>
              ${guestAvatarUrl(guest)
                ? `<img src="${guestAvatarUrl(guest)}" alt="Foto actual" />`
                : `<span class="dashboard-avatar-upload-placeholder">${guestInitials(guest)}</span>`}
            </span>
            <div class="dashboard-avatar-upload-controls">
              <label class="dashboard-button dashboard-button-secondary dashboard-avatar-upload-btn" for="edit-avatar-file">
                📷 Subir foto
              </label>
              <input id="edit-avatar-file" name="avatarFile" type="file" accept="image/*" hidden />
              <small data-avatar-upload-status style="color:#8a7a5f;display:block;margin-top:0.25rem;">
                Se subirá a Cloudinary (carpeta boda/avatars) y se guardará el ID.
              </small>
            </div>
          </div>
          <input id="edit-identityCloudinaryId" name="identityCloudinaryId" value="${guest.identity?.cloudinaryId || guest.cloudinaryId || ""}"
            placeholder="O pega un Cloudinary ID manualmente" style="margin-top:0.5rem;" />
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

  // ── Avatar file upload ──
  // When the admin picks an image, upload it to Cloudinary (boda/avatars),
  // then fill the hidden public-id input and refresh the preview thumbnail.
  const avatarFileInput = overlay.querySelector("#edit-avatar-file");
  const avatarIdInput = overlay.querySelector("#edit-identityCloudinaryId");
  const avatarPreview = overlay.querySelector("[data-avatar-preview]");
  const avatarStatus = overlay.querySelector("[data-avatar-upload-status]");
  avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files?.[0];
    if (!file) return;
    avatarStatus.textContent = "Subiendo…";
    avatarStatus.style.color = "#8a7a5f";
    try {
      const publicId = await uploadAvatarToCloudinary(file);
      avatarIdInput.value = publicId;
      avatarPreview.innerHTML = `<img src="https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${publicId}" alt="Nueva foto" />`;
      avatarStatus.textContent = `✅ Subida: ${publicId}`;
      avatarStatus.style.color = "#4caf50";
    } catch (err) {
      console.error("Avatar upload failed", err);
      avatarStatus.textContent = `❌ ${err.message || "Error al subir la foto"}`;
      avatarStatus.style.color = "#a0352c";
    }
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
      await updateGuest(guestId, updated);


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
  "messageAuthor", "invitationGroup", "invitationSent", "_deleted",
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
    await updateGuest(guestId, payload);

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


// ── Invitation group column (rename + pick another group) ──────────────

// Sorted set of existing invitation group names: the `invitation_groups`
// collection ids plus every distinct `invitationGroup` value currently used by
// guests. Used to populate the "pick another group" dropdown.
function getInvitationGroupOptions() {
  const names = new Set();
  state.invitationGroups.forEach((g) => {
    if (g.id) names.add(g.id);
  });
  getActiveGuests().forEach((g) => {
    if (g.invitationGroup) names.add(g.invitationGroup);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

// Reusable confirm modal. `onConfirm` may be async; the modal shows a working
// state and only closes on success.
function openConfirmModal({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 28rem;">
      <div class="dashboard-modal-heading">
        <h3>${title}</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="dashboard-modal-form">
        <p style="line-height:1.6;color:#55452d;">${message}</p>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="button" data-confirm>${confirmLabel}</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>${cancelLabel}</button>
        </div>
        <small data-confirm-status></small>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("[data-confirm]").addEventListener("click", async () => {
    const status = overlay.querySelector("[data-confirm-status]");
    const btn = overlay.querySelector("[data-confirm]");
    btn.disabled = true;
    status.textContent = "Actualizando…";
    status.dataset.state = "working";
    try {
      await onConfirm();
      close();
    } catch (err) {
      console.error("Confirm action failed", err);
      status.textContent = "❌ Error al actualizar.";
      status.dataset.state = "error";
      btn.disabled = false;
    }
  });
}

// Change a guest's `invitationGroup` (rename or pick another group). Saves the
// new value to this guest first, then — if the old group was shared by other
// guests — asks whether to apply the same change to all of them.
async function applyInvitationGroupChange(guestId, oldName, newName) {
  const trimmedOld = String(oldName || "").trim();
  const trimmedNew = String(newName || "").trim();
  if (!trimmedNew || trimmedOld === trimmedNew) return;

  const ok = await saveGuestInline(guestId, "invitationGroup", trimmedNew);
  if (!ok) return;

  const affected = getActiveGuests().filter(
    (g) => g.id !== guestId && (g.invitationGroup || "").trim() === trimmedOld,
  );

  if (trimmedOld && affected.length > 0) {
    openConfirmModal({
      title: "Aplicar a todo el grupo",
      message: `¿Quieres actualizar también a los <strong>${affected.length}</strong> invitados que tenían el grupo de invitación "<strong>${trimmedOld}</strong>"?`,
      confirmLabel: "Sí, actualizar todos",
      cancelLabel: "Solo este invitado",
      onConfirm: async () => {
        for (const g of affected) {
          await saveGuestInline(g.id, "invitationGroup", trimmedNew);
        }
        renderGuestManager();
      },
    });
  }
  renderGuestManager();
}

// Cell for the "Invitación" column: shows the guest's invitation group as a
// clickable display that reveals an inline editor with a rename input and a
// dropdown to pick another existing group.
const invitationGroupCell = (guest) => {
  const current = guest.invitationGroup || "";
  const options = getInvitationGroupOptions();
  const selectOptions = options
    .map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`)
    .join("");
  return `
    <div class="dashboard-invgroup-cell" data-invgroup-cell="${guest.id}">
      <button type="button" class="dashboard-invgroup-display" data-invgroup-display="${guest.id}" title="Editar grupo de invitación">
        ${current || "—"}
      </button>
      <div class="dashboard-invgroup-editor" data-invgroup-editor="${guest.id}" hidden>
        <input class="dashboard-inline-input" type="text" value="${current}" data-invgroup-rename="${guest.id}" placeholder="Renombrar grupo…" />
        <select class="dashboard-inline-select" data-invgroup-select="${guest.id}" title="Elegir otro grupo de invitación">
          <option value="">— Elegir grupo —</option>
          ${selectOptions}
        </select>
        <button type="button" class="dashboard-link-btn" data-invgroup-done="${guest.id}" title="Listo">✓</button>
      </div>
    </div>`;
};

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

// ── Send Invite Modal ─────────────────────────────────────────────────

// Opens a modal to send a guest their invitation link via WhatsApp and/or
// email. The actual sending is delegated to the `sendInvitation` Cloud
// Function (Gmail API + WhatsApp deep link), which is admin-only. The modal
// shows the guest's contact info and lets the admin pick the channel(s).
//
// `channel` (optional) pre-selects a channel and auto-triggers it. Each channel
// button is disabled when that channel is not available for this guest:
//   - No Firebase Auth account → both disabled (can't send anything).
//   - Auth but no real email (or only a default-domain email) → email disabled.
//   - Auth but no phone → WhatsApp disabled.
function openSendInviteModal(guest, channel = null) {
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
      status.textContent = `✅ ${result.data?.message || "Enviado."}`;
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
      await createGroup(name);
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
        await updateGroupField(groupId, docField, value);

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
        deleteGroup(groupId).catch((err) => {

          console.error("Failed to delete group", err);
          alert("Error al eliminar el grupo.");
        });
      }

    });
  });
}

// ── Guest Manager (flat, live, inline editable) ────────────────────────

function renderGuestManager() {
  const container = document.querySelector("[data-guest-manager]");
  if (!container) return;

  let filtered = getFilteredGuests();

  // ── Sort by the active column ──
  const sortKey = GUEST_SORT_COLUMNS.includes(state.sortKey) ? state.sortKey : "name";
  const dir = state.sortDir === "desc" ? -1 : 1;
  filtered = [...filtered].sort((a, b) => {
    const av = guestSortValue(a, sortKey);
    const bv = guestSortValue(b, sortKey);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  // ── Sortable header helper ──
  const sortTh = (key, label) => {
    const active = state.sortKey === key;
    const arrow = active ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
    return `<th class="dashboard-sortable ${active ? "dashboard-sort-active" : ""}" data-sort-key="${key}" title="Ordenar por ${label}">${label}${arrow}</th>`;
  };

  // ── Phone formatting: international flag + masked display ──
  // Accepts a raw phone string (e.g. "523312828872" or "+52 33 1282 8872") and
  // returns { flag, display, href }. The flag is derived from the leading
  // country code; the display is a human-friendly masked grouping.
  const COUNTRY_FLAGS = {
    "52": "🇲🇽", // Mexico
    "1": "🇺🇸", // US / Canada
    "33": "🇫🇷", // France
    "34": "🇪🇸", // Spain
    "49": "🇩🇪", // Germany
    "44": "🇬🇧", // UK
    "381": "🇷🇸", // Serbia
    "39": "🇮🇹", // Italy
    "351": "🇵🇹", // Portugal
    "31": "🇳🇱", // Netherlands
    "32": "🇧🇪", // Belgium
    "41": "🇨🇭", // Switzerland
    "43": "🇦🇹", // Austria
    "48": "🇵🇱", // Poland
    "55": "🇧🇷", // Brazil
    "54": "🇦🇷", // Argentina
    "56": "🇨🇱", // Chile
    "57": "🇨🇴", // Colombia
    "58": "🇻🇪", // Venezuela
    "51": "🇵🇪", // Peru
    "593": "🇪🇨", // Ecuador
    "502": "🇬🇹", // Guatemala
    "506": "🇨🇷", // Costa Rica
    "507": "🇵🇦", // Panama
    "53": "🇨🇺", // Cuba
    "1-809": "🇩🇴", // Dominican Republic
  };
  const formatPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return null;
    // Detect the country code by trying the longest known prefixes first.
    const codes = Object.keys(COUNTRY_FLAGS).sort((a, b) => b.length - a.length);
    const countryCode = codes.find((c) => digits.startsWith(c.replace(/\D/g, ""))) || "";
    const flag = COUNTRY_FLAGS[countryCode] || "🌐";
    // Masked grouping: +52 33 1282 8872 (Mexico) or +1 555 123 4567 (US).
    let display = digits;
    if (digits.startsWith("52") && digits.length === 12) {
      display = `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    } else if (digits.startsWith("1") && digits.length === 11) {
      display = `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else {
      display = `+${digits}`;
    }
    return { flag, display, href: `tel:${digits}` };
  };


  // ── Identity cell helper: avatar + name (inline editor) + ID + phone + auth ──
  const identityCell = (guest) => {
    const url = guestAvatarUrl(guest);
    const initials = guestInitials(guest);
    const hasAuth = Boolean(state.authUsers[guest.id]);
    const authEmail = state.authUsers[guest.id]?.email || "";

    const img = url
      ? `<img class="dashboard-avatar" src="${url}" alt="${guestFullName(guest)}" loading="lazy" />`
      : `<span class="dashboard-avatar dashboard-avatar-initials">${initials}</span>`;

    // Badges on the avatar corners:
    //  - top-left: ID check (🔒 LOCK when verified, empty hollow chip when not)
    //  - top-right: edit photo (opens the guest editor modal)
    //  - bottom-right: auth (🔑 login emoji when the guest has a Firebase Auth
    //    account, ❌ red cross when they don't)
    const idCheckBadge = guest.idCheckUser
      ? '<span class="dashboard-avatar-badge dashboard-avatar-badge--idcheck is-locked" title="Identidad verificada (ID Check)">🔒</span>'
      : '<span class="dashboard-avatar-badge dashboard-avatar-badge--idcheck is-unlocked" title="Identidad no verificada (ID Check)"></span>';


    const editPhotoBadge = `<button class="dashboard-avatar-badge dashboard-avatar-badge--edit" data-edit-photo="${guest.id}" title="Editar foto de perfil" type="button">📷</button>`;
    const authBadge = hasAuth
      ? '<span class="dashboard-avatar-badge dashboard-avatar-badge--auth is-auth" title="Tiene cuenta de Firebase Auth">🔑</span>'
      : '<span class="dashboard-avatar-badge dashboard-avatar-badge--auth is-noauth" title="Sin cuenta de Firebase Auth">❌</span>';

    const avatar = `<span class="dashboard-avatar-wrap">${img}${idCheckBadge}${editPhotoBadge}${authBadge}</span>`;


    const phone = guest.identity?.phone || guest.phone || "";
    const phoneInfo = formatPhone(phone);
    const phoneHtml = phoneInfo
      ? `<a class="dashboard-phone" href="${phoneInfo.href}" title="Llamar"><span class="dashboard-phone-flag">${phoneInfo.flag}</span><span class="dashboard-phone-number">${phoneInfo.display}</span></a>`
      : '<span class="dashboard-badge dashboard-badge-muted">—</span>';
    const authHtml = hasAuth && authEmail
      ? `<span class="dashboard-auth-email" title="Cuenta de Firebase Auth">${authEmail}</span>`
      : "";
    return `
      <div class="dashboard-identity-cell">
        ${avatar}
        <div class="dashboard-identity-info">
          ${nameCell(guest)}
          <div class="dashboard-identity-meta">${phoneHtml}</div>
          ${authHtml ? `<div class="dashboard-identity-meta">${authHtml}</div>` : ""}
          <div class="dashboard-identity-meta">
            <code title="${guest.id}">${guest.id}</code>
          </div>
        </div>
      </div>`;
  };




  // ── Send-invite cell helper (dedicated "Enviar" column) ──
  // Renders the WhatsApp + Email send buttons. Each is disabled when the
  // channel is not available for this guest:
  //   - No Firebase Auth account → both disabled (can't send anything).
  //   - Auth but no real email (or only a default-domain email) → email disabled.
  //   - Auth but no phone → WhatsApp disabled.
  const sendCell = (guest) => {
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

    return `
      <div class="dashboard-send-cell">
        <button class="dashboard-link-btn" data-send-whatsapp="${guest.id}" title="${waTitle}" ${canWhatsapp ? "" : "disabled"}>📱</button>
        <button class="dashboard-link-btn" data-send-email="${guest.id}" title="${emailTitle}" ${canEmail ? "" : "disabled"}>✉️</button>
      </div>`;
  };

  // ── Name cell helper ──
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

  // ── Group badge nav bar ──
  // Each chip shows the group name plus an "X/Y" attendance summary where
  // X = guests confirmed for SATURDAY (RSVP level ≥ 4) and Y = group size.
  const groups = getUniqueGuestGroups();
  const groupCounts = getGroupAttendanceCounts();
  const groupNav = `
    <div class="dashboard-group-nav">
      <button type="button" class="dashboard-group-nav-chip ${!state.filterGroup ? "dashboard-group-nav-chip-active" : ""}" data-group-nav="">
        Todos
      </button>
      ${groups
        .map(
          (g) => {
            const c = groupCounts[g] || { confirmedSaturday: 0, size: 0 };
            return `
        <button type="button" class="dashboard-group-nav-chip ${state.filterGroup === g ? "dashboard-group-nav-chip-active" : ""}" data-group-nav="${g}" style="background:${badgeStyle(g)};color:#3a2f1e;" title="${c.confirmedSaturday} de ${c.size} confirmados para el sábado">
          ${g}
          <span class="dashboard-group-nav-count">${c.confirmedSaturday}/${c.size}</span>
        </button>`;
          },
        )
        .join("")}
    </div>
  `;

  container.innerHTML = `
    ${groupNav}
    <div class="dashboard-guest-filters">
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
      <div class="dashboard-filter-count">
        <strong>${filtered.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
    </div>
    <div class="dashboard-rsvp-legend" title="Escala de asistencia por día">
      <span class="dashboard-rsvp-legend-title">Asistencia (Vie / Sáb / Dom):</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-empty">—</span> 0 · sin respuesta</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-partial">1–3</span> 1–3 · parcial</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-confirmed">4–5</span> 4–5 · confirmado</span>
    </div>
    <div class="dashboard-guest-table-wrap">

      <table class="dashboard-guest-table">
        <thead>
          <tr>
            ${sortTh("name", "Identidad")}
            <th title="Enviar invitación (WhatsApp / email)">Enviar</th>
            <th title="Invitación enviada (marcar manualmente o al enviar)">Enviada</th>
            ${sortTh("invitationGroup", "Invitación")}

            ${sortTh("group", "Grupo")}
            ${sortTh("lang", "Idioma")}


            ${sortTh("cabin", "Cabaña")}

            ${sortTh("room", "Cuarto")}
            ${sortTh("xtraCabin", "Cabaña extra")}
            ${sortTh("xtraRoom", "Cuarto extra")}
            <th>Vie</th>
            <th>Sáb</th>
            <th>Dom</th>
            ${sortTh("status", "Estado")}
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          ${filtered
            .map((guest) => {
              const merged = getMergedGuest(guest);
              const hosting = merged.hosting || {};
              const xtraCabin = hosting.xtraCabin || merged.xtraCabin || "";
              const xtraRoom = hosting.xtraRoom || merged.xtraRoom || "";
              return `
            <tr class="dashboard-guest-row">
              <td>${identityCell(merged)}</td>
              <td>${sendCell(merged)}</td>
              <td>
                <input type="checkbox" class="dashboard-invite-sent" data-invite-sent="${merged.id}"
                  ${merged.invitationSent ? "checked" : ""} title="Invitación enviada" />
              </td>
              <td>${invitationGroupCell(merged)}</td>

              <td>${badgeHtml(merged.group)}</td>
              <td>${badgeHtml(merged.identity?.lang || merged.lang || "")}</td>



              <td>${badgeHtml(merged.cabinLabel || merged.unit || "")}</td>
              <td>${badgeHtml(guestRoom(merged))}</td>
              <td>${badgeHtml(xtraCabin)}</td>
              <td>${badgeHtml(xtraRoom)}</td>
              <td>${rsvpLevelChip(merged, "friday")}</td>
              <td>${rsvpLevelChip(merged, "saturday")}</td>
              <td>${rsvpLevelChip(merged, "sunday")}</td>
              <td data-guest-status="${merged.id}"></td>
              <td>
                <button class="dashboard-link-btn" data-edit-guest="${merged.id}" title="Editar todo (modal)">✏️</button>
                <button class="dashboard-link-btn" data-copy-link="${merged.id}" title="Copiar enlace">🔗</button>
                <button class="dashboard-link-btn" data-preview-link="${merged.id}" title="Vista previa">👁️</button>
                <button class="dashboard-link-btn" data-delete-guest="${merged.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
              </td>
            </tr>`;
            })
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

  // ── Group nav filter ──
  container.querySelectorAll("[data-group-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filterGroup = btn.dataset.groupNav;
      renderGuestManager();
    });
  });

  // ── Filter events ──
  container.querySelector("[data-filter-query]")?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    renderGuestManager();
  });

  // ── Sortable headers ──
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

  // ── RSVP dropdown: save the selected level (0–5) on change ──
  container.querySelectorAll("[data-rsvp-chip]").forEach((chip) => {
    chip.addEventListener("change", async () => {
      const guestId = chip.dataset.rsvpChip;
      const day = chip.dataset.rsvpDay;
      const level = Number.parseInt(chip.value, 10);
      const ok = await saveGuestRsvpAnswer(guestId, day, level);
      if (ok) renderGuestManager();
    });
  });


  // ── Name editor: reveal on click ──
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

  // ── Invitation group editor: reveal on click ──
  container.querySelectorAll("[data-invgroup-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.invgroupDisplay;
      const editor = container.querySelector(`[data-invgroup-editor="${guestId}"]`);
      if (!editor) return;
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        const rename = editor.querySelector(`[data-invgroup-rename="${guestId}"]`);
        if (rename) rename.focus();
      }
    });
  });

  // ── Invitation group: rename (free text) ──
  container.querySelectorAll("[data-invgroup-rename]").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.invgroupRename;
      const oldName = getGuest(guestId)?.invitationGroup || "";
      const newName = input.value.trim();
      if (!newName || newName === oldName) return;
      await applyInvitationGroupChange(guestId, oldName, newName);
    });
  });

  // ── Invitation group: pick another existing group ──
  container.querySelectorAll("[data-invgroup-select]").forEach((select) => {
    select.addEventListener("change", async () => {
      const guestId = select.dataset.invgroupSelect;
      const oldName = getGuest(guestId)?.invitationGroup || "";
      const newName = select.value.trim();
      if (!newName || newName === oldName) return;
      await applyInvitationGroupChange(guestId, oldName, newName);
    });
  });

  // ── Invitation group: done button ──
  container.querySelectorAll("[data-invgroup-done]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.invgroupDone;
      const editor = container.querySelector(`[data-invgroup-editor="${guestId}"]`);
      const display = container.querySelector(`[data-invgroup-display="${guestId}"]`);
      if (editor) editor.hidden = true;
      if (display) {
        const guest = getGuest(guestId);
        if (guest) display.textContent = guest.invitationGroup || "—";
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

  // ── Send invite (dedicated "Enviar" column) ──
  // The WhatsApp / Email buttons in the dedicated column open the send modal
  // pre-targeted to that channel. Disabled buttons (no auth / no phone / no
  // real email) are skipped — the modal also enforces the same rules.
  container.querySelectorAll("[data-send-whatsapp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.sendWhatsapp;
      const guest = getGuest(guestId);
      if (guest && guestCanWhatsapp(guest)) openSendInviteModal(guest, "whatsapp");
    });
  });
  container.querySelectorAll("[data-send-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.sendEmail;
      const guest = getGuest(guestId);
      if (guest && guestCanEmail(guest)) openSendInviteModal(guest, "email");
    });
  });

  // ── "Invitación enviada" checkbox: toggle the flag on the guest doc ──
  // The checkbox is a manual toggle so the couple can mark a guest as invited
  // even if they sent the invitation outside the dashboard. It writes the
  // `invitationSent` boolean via the shared inline payload builder.
  container.querySelectorAll("[data-invite-sent]").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const guestId = checkbox.dataset.inviteSent;
      const ok = await saveGuestInline(guestId, "invitationSent", checkbox.checked);
      if (!ok) checkbox.checked = !checkbox.checked; // revert on failure
    });
  });

  // ── Edit photo (avatar badge) → opens the guest editor modal ──

  // The 📷 badge on the avatar corner opens the same editor modal, which
  // already contains the photo upload section (preview + "Subir foto" button).
  container.querySelectorAll("[data-edit-photo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.editPhoto;
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
    // FRIDAY / SATURDAY / SUNDAY attendance comes from the LIVE `guests`
    // collection (`rsvp.answers` scale ≥ RSVP_CONFIRMED_MIN_LEVEL), not the
    // legacy `rsvp_submissions` collection.
    const dayCounts = computeDayConfirmations();
    summary.replaceChildren(
      summaryCard("Viernes", dayCounts.friday, "Confirmados (nivel ≥ 4)"),
      summaryCard("Sábado", dayCounts.saturday, "Confirmados (nivel ≥ 4)"),
      summaryCard("Domingo", dayCounts.sunday, "Confirmados (nivel ≥ 4)"),
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
  // Only load collections that still exist in `firestore-paths.js`. The legacy
  // `rsvp_submissions` / `experience_suggestions` / `coast_interest` /
  // `petanque_participation` collections were removed from the app (answers now
  // live on the `guests` doc), so their path constants are undefined and must
  // be skipped — otherwise `collection(db, undefined)` throws and the whole
  // dashboard fails to load.
  const entries = await Promise.all(
    Object.entries(COLLECTIONS)
      .filter(([, collectionName]) => Boolean(collectionName))
      .map(async ([key, collectionName]) => {
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
  loadRooms().then(() => {
    // Re-render cabin assignments now that room data is available
    renderCabinAssignments();
  });

  // ── Load tables from Firestore (source of truth for the seating canvas) ──
  loadTables().then(() => {
    // Re-render the tables panel now that table data is available
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
      // Keep the raw records too — the INVITADOS table reads live `rsvp.answers`
      // and `hosting` (incl. xtraCabin/xtraRoom) straight from these.
      state.liveGuests = records;
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

  // ── LIVE Firebase Auth user list ──
  // Firebase Auth has NO client-side API to list all users — only the Admin SDK
  // can do that, and it runs server-side. Instead of keeping a stale `auth_users`
  // mirror collection (which required a manual sync script), we call the
  // `listAuthUsers` Cloud Function on demand to get the authoritative, always
  // current list of auth accounts (uid + email). No static config, no mirror,
  // no sync. The function is admin-only, so it only succeeds for David/Aydé.
  const functions = getFunctions();
  const listAuthUsers = httpsCallable(functions, "listAuthUsers");
  listAuthUsers()
    .then((result) => {
      const users = result.data?.users || [];
      state.authUsers = Object.fromEntries(
        users.map((u) => [u.uid, { id: u.uid, email: u.email }]),
      );
      console.log("[dashboard:auth] listAuthUsers loaded", { count: users.length });
      renderGuestManager();
    })
    .catch((error) => {
      console.error("[dashboard:auth] listAuthUsers failed", error);
    });


}





