import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, onSnapshot, limit, query, serverTimestamp } from "firebase/firestore";



import { db } from "./firebase.js";
import {
  getActiveGuests,
  getGuestsByUnit,
  getGuest,
  setLiveGuests,
} from "./guests.js";
import { loadRooms, getRoomsByCabin, getRoomOccupancy, getCabinDisplayName, getRoomDescription } from "./rooms.js";
import { loadCabins, getCabinPhotos } from "./cabins.js";


import { collections } from "../../shared/firestore-paths.js";
import {
  buildDashboardGuestEditPayload,
  buildDashboardGuestInlinePayload,
} from "../../shared/payload-builders.js";

import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";


const COLLECTIONS = {
  thanks: collections.thanks,
};


const state = {
  thanks: [],
  liveGuests: [], // live `guests` collection (source of truth for RSVP answers)

  filterGroup: "",

  filterCabin: "",
  filterQuery: "",
  activeTab: "guests",
  // Hosting period for the cabins panel: "primary" (Viernes → Domingo) or
  // "extra" (Domingo → Martes, coast escape).
  cabinPeriod: "primary",
  // Sort state for the INVITADOS table. `key` is one of "name" | "group" |
  // "cabin" | "room" | "xtraCabin" | "xtraRoom" | "friday" | "saturday" |
  // "sunday" | "status"; `dir` is "asc" | "desc".
  guestSort: { key: "name", dir: "asc" },

  // Sort state for the thanks (agradecimientos) table. `key` is one of
  // "guest" | "es" | "fr" | "en"; `dir` is "asc" | "desc".
  thanksSort: { key: "guest", dir: "asc" },
};


// ── Sub-page routing ─────────────────────────────────────────────────────

/**
 * Map URL path segments to internal tab IDs.
 */
const PATH_TO_TAB = {
  invitados: "guests",
  cabins: "cabins",
  agradecimientos: "thanks",
};

/**
 * Map internal tab IDs to URL path segments.
 */
const TAB_TO_PATH = {
  guests: "invitados",
  cabins: "cabins",
  thanks: "agradecimientos",
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

// ── Helpers ────────────────────────────────────────────────────────────

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

// ── Toast notifications ─────────────────────────────────────────────────
// App-wide transient feedback (errors, confirmations). Mounts a toast
// container on <body> so it works on ANY view (the legacy `showMessage`
// writes to a `[data-dashboard-status]` element that only exists on the
// login screen, so it silently did nothing once logged in).
const TOAST_ICONS = { error: "⚠️", success: "✅", info: "ℹ️" };
const TOAST_DURATION = 4000;

function showToast(message, type = "info") {
  let container = document.querySelector(".dashboard-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "dashboard-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "dashboard-toast";
  toast.dataset.toastType = type;

  const icon = document.createElement("span");
  icon.className = "dashboard-toast-icon";
  icon.textContent = TOAST_ICONS[type] || TOAST_ICONS.info;

  const text = document.createElement("span");
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "dashboard-toast-close";
  close.setAttribute("aria-label", "Cerrar");
  close.textContent = "✕";

  toast.append(icon, text, close);
  container.appendChild(toast);

  const dismiss = () => {
    if (toast.classList.contains("is-leaving")) return;
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 250);
  };

  close.addEventListener("click", dismiss);
  setTimeout(dismiss, TOAST_DURATION);
}

// ── Firebase trace logging ─────────────────────────────────────────────
// Lightweight console tracing for every Firestore read/write the dashboard
// performs. Helps debug permission errors and data-loading issues. Toggle
// `TRACE_FIREBASE` to false to silence the logs.
const TRACE_FIREBASE = true;

function traceFirebase(op, detail) {
  if (!TRACE_FIREBASE) return;
  const ts = new Date().toLocaleTimeString("es-MX");
  console.log(`[firebase:${op}] ${ts}`, detail ?? "");
}


function guestIdentity(guest) {
  return guest?.identity || {};
}

function guestHosting(guest) {
  return guest?.hosting || {};
}

/**
 * Resolve the CURRENT `hosting` map for a guest from the LIVE Firestore
 * record (state.liveGuests). This is the source of truth for cabin/room
 * assignments — the static registry (web/shared/guests.js) has no `hosting`
 * data, so reading it there would wipe the live assignment. Falls back to the
 * static guest's hosting only when there is no live record yet.
 */
function getLiveHosting(guestId) {
  const live = state.liveGuests.find((g) => g.id === guestId);
  if (live?.hosting) return { ...live.hosting };
  const staticGuest = getGuest(guestId);
  return staticGuest?.hosting ? { ...staticGuest.hosting } : {};
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

// ── Guest table helpers (INVITADOS) ────────────────────────────────────

// Cloudinary cloud name (public — safe to embed in delivery URLs).
const CLOUDINARY_BASE = "https://res.cloudinary.com/k2ajcgxv/image/upload";

/**
 * Merge a static guest (from web/shared/guests.js) with its LIVE Firestore
 * record (state.liveGuests). The live record carries the real `identity`,
 * `hosting` (incl. xtraCabin/xtraRoom) and `rsvp.answers`; the static record
 * carries the sheet-derived group/cabin labels. Live wins where both exist.
 */
function getMergedGuest(guest) {
  const live = state.liveGuests.find((g) => g.id === guest.id) || {};
  const identity = live.identity || {};
  const hosting = live.hosting || {};
  return {
    ...guest,
    ...live,
    identity,
    hosting,
    firstName: identity.firstName ?? guest.firstName,
    middleName: identity.middleName ?? guest.middleName,
    lastName: identity.lastName ?? guest.lastName,
    maternalLastName: identity.maternalLastName ?? guest.maternalLastName,
    cloudinaryId: identity.cloudinaryId ?? guest.cloudinaryId,
    unit: hosting.cabin ?? guest.unit,
    room: hosting.room ?? guest.room,
    xtraCabin: hosting.xtraCabin ?? guest.xtraCabin,
    xtraRoom: hosting.xtraRoom ?? guest.xtraRoom,
  };
}

/**
 * Build a small square avatar URL from a guest's Cloudinary public id.
 * Returns null when the guest has no photo.
 */
function guestAvatarUrl(guest) {
  const publicId = guest?.cloudinaryId;
  if (!publicId) return null;
  return `${CLOUDINARY_BASE}/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${publicId}`;
}

/**
 * Build a cabin showcase photo URL from a Cloudinary public id. Cabin photos
 * are stored relative to the `boda/` prefix (same convention as the
 * invitation), so the id is prefixed with `boda/`.
 */
function cabinPhotoUrl(publicId) {
  if (!publicId) return null;
  return `${CLOUDINARY_BASE}/q_auto,f_auto,w_1200/boda/${publicId}`;
}


/**
 * Deterministic pastel badge colors from a string (group, cabin, room…).
 * Same input always yields the same color so related rows look consistent.
 */
function badgeStyle(text) {
  let hash = 0;
  const seed = String(text || "");
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return {
    background: `hsl(${hue}, 55%, 92%)`,
    color: `hsl(${hue}, 55%, 28%)`,
    border: `1px solid hsl(${hue}, 45%, 78%)`,
  };
}

/**
 * Render a colored badge (used for grupo / cabaña / cuarto / xtra).
 * Returns an empty string when there is no value.
 */
function badgeHtml(text, title = "") {
  if (!text) return "";
  const style = badgeStyle(text);
  const titleAttr = title ? ` title="${title}"` : "";
  return `<span class="dashboard-badge-chip" style="background:${style.background};color:${style.color};border:${style.border};"${titleAttr}>${text}</span>`;
}

/**
 * Render the RSVP attendance response for a day as a small colored chip.
 * Level 0 = no answer (gray), 1–3 = partial (amber), 4–5 = confirmed (green).
 */
function rsvpLevelChip(level) {
  const n = Number(level);
  if (!Number.isInteger(n) || n <= 0) {
    return '<span class="dashboard-rsvp-chip is-none" title="Sin respuesta">—</span>';
  }
  if (n >= 4) {
    return `<span class="dashboard-rsvp-chip is-yes" title="Confirmado (${n}/5)">${n}</span>`;
  }
  return `<span class="dashboard-rsvp-chip is-maybe" title="Parcial (${n}/5)">${n}</span>`;
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
  // The live-normalized guest exposes the primary cabin as `cabin` (from
  // `hosting.cabin`), NOT `unit`/`hasCabin` (those are static-registry-only
  // fields the live normalizer never produces). Read `cabin` so the filter
  // dropdown reflects real assignments.
  const cabins = [
    ...new Set(
      getActiveGuests()
        .map((g) => g.cabin)
        .filter(Boolean),
    ),
  ];
  return cabins.sort();
}


/**
 * Build the guest list the dashboard renders from. The LIVE Firestore
 * `guests` collection is the single source of truth — there is NO static
 * registry anymore. `getActiveGuests()` returns the normalized live cache
 * (populated by `setLiveGuests` from the `onSnapshot` listener), which
 * carries the real `identity` names/photo, `hosting` (cabin/room incl.
 * xtraCabin/xtraRoom), `tagGroup` and `rsvp.answers`.
 */
function getAllDashboardGuests() {
  return getActiveGuests();
}

function getFilteredGuests() {
  let filtered = getAllDashboardGuests();

  if (state.filterGroup) {
    filtered = filtered.filter((g) => g.group === state.filterGroup);
  }
  if (state.filterCabin) {
    // The live-normalized guest exposes the primary cabin as `cabin` (from
    // `hosting.cabin`), matching the values produced by getUniqueCabins().
    filtered = filtered.filter((g) => g.cabin === state.filterCabin);
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
        String(g.group || "").toLowerCase().includes(q),
    );
  }

  return filtered;
}

function getInviteUrl() {
  // In dev, the dashboard runs on port 5174 while the invitation runs on
  // port 5173. Link to the invitation's origin. Per-guest invitation links
  // were removed (login is now email/password), so this is just the plain
  // invitation URL with no code parameter.
  return window.location.port === "5174"
    ? "http://localhost:5173/"
    : "/";
}


function guestStatusBadge(guest) {

  // Status is derived from the LIVE RSVP answers (guests.rsvp.answers), not
  // the legacy rsvp_submissions collection. A guest is "Confirmado" when they
  // confirmed at least one attendance day (scale level ≥ 4); "Parcial" when
  // they answered but confirmed nothing; "Pendiente" when they have no answers.
  const answers = guest?.rsvp?.answers || {};
  const levels = RSVP_ATTENDANCE_DAYS.map((day) => Number(answers[day]));
  const answered = levels.some((n) => Number.isInteger(n) && n > 0);
  const confirmed = levels.some((n) => Number.isInteger(n) && n >= RSVP_CONFIRMED_MIN_LEVEL);
  if (confirmed) return make("span", "dashboard-badge dashboard-badge-yes", "✅ Confirmado");
  if (answered) return make("span", "dashboard-badge dashboard-badge-maybe", "🤷 Parcial");
  return make("span", "dashboard-badge dashboard-badge-pending", "Pendiente");
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
      // Use the inline save helper so the payload includes the required
      // guestId / updatedBy / updatedAt fields (the Firestore rules reject a
      // bare { _deleted: true } write).
      await saveGuestInline(guest.id, "_deleted", true);

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

// ── Guest Manager (flat, sortable, inline editable) ────────────────────


// Sortable column definitions for the INVITADOS table. `key` maps to a
// computed value on the merged guest; `label` is the header text.
const GUEST_COLUMNS = [
  { key: "name", label: "Nombre" },
  { key: "group", label: "Grupo" },
  { key: "cabin", label: "Cabaña" },
  { key: "room", label: "Cuarto" },
  { key: "xtraCabin", label: "Cabaña extra" },
  { key: "xtraRoom", label: "Cuarto extra" },
  { key: "friday", label: "Vie" },
  { key: "saturday", label: "Sáb" },
  { key: "sunday", label: "Dom" },
  { key: "status", label: "Estado" },
];

// Resolve the sortable value for a merged guest given a column key.
function guestSortValue(merged, key) {
  switch (key) {
    case "name":
      return guestFullName(merged).toLowerCase();
    case "group":
      return (merged.group || "Sin grupo").toLowerCase();
    case "cabin":
      return (merged.cabinLabel || merged.unit || "").toLowerCase();
    case "room":
      return guestRoom(merged).toLowerCase();
    case "xtraCabin":
      return (merged.xtraCabin || "").toLowerCase();
    case "xtraRoom":
      return (merged.xtraRoom || "").toLowerCase();
    case "friday":
    case "saturday":
    case "sunday":
      return Number(merged?.rsvp?.answers?.[key]) || 0;
    case "status": {
      const answers = merged?.rsvp?.answers || {};
      const levels = RSVP_ATTENDANCE_DAYS.map((day) => Number(answers[day]));
      const answered = levels.some((n) => Number.isInteger(n) && n > 0);
      const confirmed = levels.some((n) => Number.isInteger(n) && n >= RSVP_CONFIRMED_MIN_LEVEL);
      return confirmed ? 2 : answered ? 1 : 0;
    }
    default:
      return "";
  }
}

function renderGuestManager() {
  const container = document.querySelector("[data-guest-manager]");
  if (!container) return;

  const filtered = getFilteredGuests();

  // Sort the filtered guests by the active column/direction.
  const { key, dir } = state.guestSort;
  const sorted = [...filtered].sort((a, b) => {
    const aVal = guestSortValue(getMergedGuest(a), key);
    const bVal = guestSortValue(getMergedGuest(b), key);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // Build the sortable header cells. The active column shows ▲/▼.
  const headerCells = GUEST_COLUMNS.map((col) => {
    const active = col.key === key;
    const arrow = active ? (dir === "asc" ? " ▲" : " ▼") : "";
    const dayClass = ["friday", "saturday", "sunday"].includes(col.key)
      ? ' class="dashboard-th-day"'
      : "";
    return `<th${dayClass}><button type="button" class="dashboard-th-sort${active ? " is-active" : ""}" data-sort-guest="${col.key}" title="Ordenar por ${col.label}">${col.label}${arrow}</button></th>`;
  }).join("");

  // Group filter navigation bar: one button badge per group with its count.
  const groupButtons = getUniqueGuestGroups()
    .map((group) => {
      const count = getActiveGuests().filter((g) => g.group === group).length;
      const active = state.filterGroup === group;
      return `<button type="button" class="dashboard-group-filter-btn${active ? " is-active" : ""}" data-filter-group-btn="${group}">${group} <span class="dashboard-group-filter-count">${count}</span></button>`;
    })
    .join("");

  container.innerHTML = `
    <div class="dashboard-guest-filters">
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
      <div class="dashboard-filter-count">
        <strong>${filtered.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
    </div>
    <div class="dashboard-group-filter-bar" data-group-filter-bar>
      <button type="button" class="dashboard-group-filter-btn${!state.filterGroup ? " is-active" : ""}" data-filter-group-btn="">Todos <span class="dashboard-group-filter-count">${getActiveGuests().length}</span></button>
      ${groupButtons}
    </div>
    <div class="dashboard-guest-table-wrap">
      <table class="dashboard-guest-table">
        <thead>
          <tr>
            <th class="dashboard-th-avatar">Foto</th>
            ${headerCells}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map((guest) => {
              const merged = getMergedGuest(guest);
              const avatarUrl = guestAvatarUrl(merged);
              const avatarHtml = avatarUrl
                ? `<img class="dashboard-avatar" src="${avatarUrl}" alt="" loading="lazy" />`
                : '<span class="dashboard-avatar dashboard-avatar-fallback" aria-hidden="true">👤</span>';
              const answers = merged?.rsvp?.answers || {};
              const cabinLabel = merged.cabinLabel || merged.unit || "";
              const xtraCabinLabel = merged.xtraCabin || "";
              const xtraRoomLabel = merged.xtraRoom || "";
              return `
            <tr class="dashboard-guest-row">
              <td class="dashboard-td-avatar">${avatarHtml}</td>
              <td>
                <div class="dashboard-name-fields">
                  <input class="dashboard-inline-input" type="text" value="${merged.firstName || ""}"
                    data-inline-field="firstName" data-guest-id="${merged.id}" placeholder="Nombre" title="Nombre" />
                  <input class="dashboard-inline-input" type="text" value="${merged.middleName || ""}"
                    data-inline-field="middleName" data-guest-id="${merged.id}" placeholder="2º nombre" title="2º nombre" />
                  <input class="dashboard-inline-input" type="text" value="${merged.lastName || ""}"
                    data-inline-field="lastName" data-guest-id="${merged.id}" placeholder="Apellido" title="Apellido" />
                  <input class="dashboard-inline-input" type="text" value="${merged.maternalLastName || ""}"
                    data-inline-field="maternalLastName" data-guest-id="${merged.id}" placeholder="Apellido materno" title="Apellido materno" />
                </div>
                <code class="dashboard-guest-id" title="ID: ${merged.id}">${merged.id}</code>
              </td>
              <td>${badgeHtml(merged.group || "Sin grupo")}</td>
              <td>${badgeHtml(cabinLabel)}</td>
              <td>${badgeHtml(guestRoom(merged))}</td>
              <td>${badgeHtml(xtraCabinLabel)}</td>
              <td>${badgeHtml(xtraRoomLabel)}</td>
              <td class="dashboard-td-day">${rsvpLevelChip(answers.friday)}</td>
              <td class="dashboard-td-day">${rsvpLevelChip(answers.saturday)}</td>
              <td class="dashboard-td-day">${rsvpLevelChip(answers.sunday)}</td>
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
  sorted.forEach((guest) => {
    const cell = container.querySelector(`[data-guest-status="${guest.id}"]`);
    if (cell) cell.append(guestStatusBadge(guest));
  });

  // ── Filter events ──
  container.querySelector("[data-filter-cabin]")?.addEventListener("change", (e) => {
    state.filterCabin = e.target.value;
    renderGuestManager();
  });
  container.querySelector("[data-filter-query]")?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    renderGuestManager();
  });

  // ── Group filter bar ──
  container.querySelectorAll("[data-filter-group-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filterGroup = btn.dataset.filterGroupBtn;
      renderGuestManager();
    });
  });

  // ── Sortable column headers ──
  container.querySelectorAll("[data-sort-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const colKey = btn.dataset.sortGuest;
      if (state.guestSort.key === colKey) {
        // Toggle direction when re-clicking the active column.
        state.guestSort.dir = state.guestSort.dir === "asc" ? "desc" : "asc";
      } else {
        state.guestSort.key = colKey;
        state.guestSort.dir = "asc";
      }
      renderGuestManager();
    });
  });

  // ── Inline edit: name (4 separate fields) ──
  // Each name part (firstName, middleName, lastName, maternalLastName) is its
  // own input and saves independently to the agreed schema.
  ["firstName", "middleName", "lastName", "maternalLastName"].forEach((field) => {
    container.querySelectorAll(`[data-inline-field='${field}']`).forEach((input) => {
      input.addEventListener("change", async () => {
        const guestId = input.dataset.guestId;
        const ok = await saveGuestInline(guestId, field, input.value.trim());
        if (ok) {
          input.style.borderColor = "#4caf50";
          setTimeout(() => (input.style.borderColor = ""), 1000);
        } else {
          input.style.borderColor = "#a0352c";
        }
      });
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
      const url = getInviteUrl();
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });

  // ── Preview link ──
  container.querySelectorAll("[data-preview-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = getInviteUrl();
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

// Hosting period for the cabins panel. "primary" = the main wedding weekend
// (Viernes → Domingo, hosting.cabin/room). "extra" = the coast escape
// (Domingo → Martes, hosting.xtraCabin/xtraRoom).
const CABIN_PERIODS = [
  { id: "primary", label: "Viernes → Domingo", sub: "Cabañas principales" },
  { id: "extra", label: "Domingo → Martes", sub: "Cabañas extra (costa)" },
];

function renderCabinAssignments() {
  const container = document.querySelector("[data-cabin-assignments]");
  if (!container) return;

  const period = state.cabinPeriod || "primary";

  // The cabins panel mirrors the invitation front-end: it reads the LIVE
  // Firestore `guests` collection as the single source of truth. There is NO
  // static registry anymore — `getActiveGuests()` returns the normalized live
  // cache (populated by `setLiveGuests` from the `onSnapshot` listener). Each
  // guest's cabin lives on its `hosting` map (`hosting.cabin` for the primary
  // period, `hosting.xtraCabin` for the coast escape), which the normalizer
  // maps to the flat `unit` / `xtraCabin` fields.
  const allGuests = getActiveGuests();

  // Resolve the cabin/room fields for the active period. The dashboard's OWN
  // normalizer (`normalizeGuest` in web/dashboard/src/guests.js) exposes the
  // primary cabin as BOTH `unit` and `cabin` (from `hosting.cabin`) and the
  // coast cabin as `xtraCabin` (from `hosting.xtraCabin`). We read the SAME
  // flat field the invitation front-end uses (`cabin` / `xtraCabin`) so the
  // dashboard and the invitation agree on assignments.
  const cabinField = period === "extra" ? "xtraCabin" : "cabin";

  const roomField = period === "extra" ? "xtraRoom" : "room";


  // Group guests by the active period's cabin. Only guests with a cabin in
  // this period are included.
  const byCabin = new Map();
  for (const g of allGuests) {
    const unit = g[cabinField];
    if (!unit) continue;
    if (!byCabin.has(unit)) byCabin.set(unit, []);
    byCabin.get(unit).push(g);
  }


  const cabins = [...byCabin.keys()].sort();

  // Build a per-cabin summary: label, actual occupancy (guests assigned) and
  // calculated occupancy (sum of room capacities from the room inventory).
  const cabinStats = cabins.map((unit) => {
    const guests = byCabin.get(unit);
    const cabinGuest = guests[0];
    // The live-normalized guest has no `cabinLabel` (that's a static-registry
    // field), so fall back to the friendly display name from the unit code.
    const label = cabinGuest?.cabinLabel || getCabinDisplayName(unit);
    const displayName = getCabinDisplayName(unit);

    const rooms = getRoomsByCabin(displayName);
    const calculated = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    const actual = guests.length;
    return { unit, label, displayName, rooms, guests, actual, calculated };
  });

  const totalActual = cabinStats.reduce((sum, c) => sum + c.actual, 0);
  const totalCalculated = cabinStats.reduce((sum, c) => sum + c.calculated, 0);

  // ── Period tabs ──
  const periodTabs = `
    <div class="dashboard-cabin-period-tabs" data-cabin-period-tabs>
      ${CABIN_PERIODS.map(
        (p) => `
        <button type="button" class="dashboard-cabin-period-tab${p.id === period ? " is-active" : ""}" data-cabin-period="${p.id}">
          <span class="dashboard-cabin-period-label">${p.label}</span>
          <span class="dashboard-cabin-period-sub">${p.sub}</span>
        </button>`,
      ).join("")}
    </div>
  `;

  // ── Nav badge bar: one button per cabin showing actual/calculated ──
  const navBadges = cabinStats
    .map(
      (c) => `
      <button type="button" class="dashboard-cabin-nav-btn" data-cabin-nav="${c.unit}" title="Ir a ${c.label}">
        <span class="dashboard-cabin-nav-label">${c.label}</span>
        <span class="dashboard-cabin-nav-occ">${c.actual}/${c.calculated}</span>
      </button>`,
    )
    .join("");

  // ── Full-width summary card ──
  const summaryCard = `
    <div class="dashboard-cabin-summary">
      <div class="dashboard-cabin-summary-stat">
        <span>Invitados alojados</span>
        <strong>${totalActual}</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Capacidad total</span>
        <strong>${totalCalculated}</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Ocupación</span>
        <strong>${totalCalculated ? Math.round((totalActual / totalCalculated) * 100) : 0}%</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Cabañas</span>
        <strong>${cabins.length}</strong>
      </div>
    </div>
  `;

  // ── Cabin cards, each grouping guests by ROOM ──
  const cards = cabinStats
    .map((c) => {
      const occupancy = c.guests[0]?.occupancy || "";
      const payment = c.guests[0]?.payment || "";

      // Showcase photos for this cabin (from the Firestore `cabins`
      // collection, matched by display name). Rendered as a one-photo-per-slide
      // carousel at the top of the card.
      const photoIds = getCabinPhotos(c.displayName);
      const photoUrls = photoIds.map((id) => cabinPhotoUrl(id)).filter(Boolean);
      const photoCarousel = photoUrls.length
        ? `
          <div class="dashboard-cabin-carousel" data-cabin-carousel>
            <div class="dashboard-cabin-carousel-track" data-carousel-track>
              ${photoUrls
                .map(
                  (url, i) => `
                  <div class="dashboard-cabin-carousel-slide${i === 0 ? " is-active" : ""}" data-carousel-slide>
                    <img src="${url}" alt="${c.label} — foto ${i + 1}" loading="lazy" />
                  </div>`,
                )
                .join("")}
            </div>
            ${photoUrls.length > 1 ? `
              <button type="button" class="dashboard-cabin-carousel-arrow is-prev" data-carousel-prev aria-label="Foto anterior">‹</button>
              <button type="button" class="dashboard-cabin-carousel-arrow is-next" data-carousel-next aria-label="Foto siguiente">›</button>
              <div class="dashboard-cabin-carousel-dots" data-carousel-dots>
                ${photoUrls.map((_, i) => `<button type="button" class="dashboard-cabin-carousel-dot${i === 0 ? " is-active" : ""}" data-carousel-dot="${i}" aria-label="Foto ${i + 1}"></button>`).join("")}
              </div>
            ` : ""}
          </div>`
        : "";


      // Group the cabin's guests by room id, preserving the room inventory
      // order so empty rooms still show up. We pass the cabin's MERGED guests
      // (c.guests) so `getRoomOccupancy` sees the resolved `room` field
      // (hosting.room ?? guest.room) — raw live guests store their room on
      // `hosting.room`, not `room`, so passing the raw list would miss them.
      const roomBlocks = c.rooms
        .map((room) => {
          const occ = getRoomOccupancy(room.id, c.guests);
          const roomGuests = occ
            ? occ.guests
            : c.guests.filter((g) => g[roomField] === room.id);
          const capacity = occ ? occ.capacity : room.capacity || 0;
          const roomLabel = room.name || room.id;
          const roomDesc = getRoomDescription(room, "es");
          const roomMeta = `${roomGuests.length}/${capacity}`;
          const full = roomGuests.length >= capacity;
          return `
            <div class="dashboard-cabin-room" data-room-id="${room.id}" data-cabin-unit="${c.unit}">
              <div class="dashboard-cabin-room-heading">
                <strong>${roomLabel}</strong>
                <span class="dashboard-cabin-room-meta${full ? " is-full" : ""}">${roomMeta}</span>
              </div>
              ${roomDesc ? `<p class="dashboard-cabin-room-desc">${roomDesc}</p>` : ""}
              <ul class="dashboard-cabin-guests">
                ${roomGuests.length
                  ? roomGuests
                      .map(
                        (g) => {
                          const avatarUrl = guestAvatarUrl(g);
                          const avatarHtml = avatarUrl
                            ? `<img class="dashboard-avatar dashboard-avatar-sm" src="${avatarUrl}" alt="" loading="lazy" />`
                            : '<span class="dashboard-avatar dashboard-avatar-sm dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                          return `
                      <li class="dashboard-cabin-guest" draggable="true" data-guest-id="${g.id}">
                        ${avatarHtml}
                        <span>${guestFullName(g)}</span>
                        <button class="dashboard-link-btn" data-copy-guest="${g.id}" title="Copiar enlace">🔗</button>
                        <button class="dashboard-link-btn dashboard-cabin-remove" data-remove-guest="${g.id}" title="Quitar de esta cabaña">✕</button>
                      </li>`;
                        },
                      )
                      .join("")
                  : '<li class="dashboard-cabin-empty">—</li>'}
              </ul>
            </div>`;
        })
        .join("");


      return `
        <div class="dashboard-cabin-card" id="cabin-${c.unit}" data-cabin-card="${c.unit}">
          <div class="dashboard-cabin-heading">
            <strong>${c.label}</strong>
            <span class="dashboard-cabin-meta">${occupancy === "privada" ? "Privada" : "Compartida"} · ${payment === "pagada" ? "Pagada" : "Por pagar"} · ${c.actual}/${c.calculated}</span>
            <button type="button" class="dashboard-cabin-add-btn" data-add-guest="${c.unit}" title="Agregar invitado a ${c.label}">+ Agregar</button>
          </div>
          ${photoCarousel}
          ${roomBlocks}
        </div>`;

    })
    .join("");

  container.innerHTML = `
    ${periodTabs}
    <div class="dashboard-cabin-nav" data-cabin-nav-bar>
      ${navBadges}
    </div>
    ${summaryCard}
    <div class="dashboard-cabin-grid">
      ${cards}
    </div>
  `;

  // ── Period tab click → re-render with the selected period ──
  container.querySelectorAll("[data-cabin-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cabinPeriod = btn.dataset.cabinPeriod;
      renderCabinAssignments();
    });
  });

  // ── Nav badge click → scroll to the cabin card ──
  container.querySelectorAll("[data-cabin-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.cabinNav;
      const card = container.querySelector(`[data-cabin-card="${unit}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ── Copy guest link buttons ──
  container.querySelectorAll("[data-copy-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = getInviteUrl();
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });

  // ── Cabin photo carousel navigation ──
  // Each cabin card with photos gets a one-photo-per-slide carousel. The
  // prev/next arrows and the dots update the active slide. Only one slide is
  // visible at a time (see .dashboard-cabin-carousel-slide in _cabins.scss).
  container.querySelectorAll("[data-cabin-carousel]").forEach((carousel) => {
    const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
    const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
    if (slides.length === 0) return;

    const showSlide = (index) => {
      const next = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === next));
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === next));
    };

    carousel.querySelector("[data-carousel-prev]")?.addEventListener("click", () => {
      const current = slides.findIndex((s) => s.classList.contains("is-active"));
      showSlide(current - 1);
    });
    carousel.querySelector("[data-carousel-next]")?.addEventListener("click", () => {
      const current = slides.findIndex((s) => s.classList.contains("is-active"));
      showSlide(current + 1);
    });
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => showSlide(i));
    });
  });

  // ── Drag-and-drop reassignment ──

  // Each guest row is draggable; each room block is a drop target. Dropping a
  // guest onto a room persists the new cabin/room (or xtraCabin/xtraRoom for
  // the coast period) to the guest's `hosting` map in Firestore, then
  // re-renders so occupancy counts update.
  let draggedGuestId = null;

  container.querySelectorAll("[data-guest-id]").forEach((li) => {
    li.addEventListener("dragstart", (e) => {
      draggedGuestId = li.dataset.guestId;
      li.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggedGuestId);
    });
    li.addEventListener("dragend", () => {
      draggedGuestId = null;
      li.classList.remove("is-dragging");
      container.querySelectorAll(".dashboard-cabin-room").forEach((r) => r.classList.remove("is-drop-target"));
    });
  });

  container.querySelectorAll(".dashboard-cabin-room").forEach((roomEl) => {
    roomEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      roomEl.classList.add("is-drop-target");
    });
    roomEl.addEventListener("dragleave", () => {
      roomEl.classList.remove("is-drop-target");
    });
    roomEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      roomEl.classList.remove("is-drop-target");
      const guestId = draggedGuestId || e.dataTransfer.getData("text/plain");
      if (!guestId) return;

      const targetRoomId = roomEl.dataset.roomId;
      const targetUnit = roomEl.dataset.cabinUnit;
      if (!targetRoomId || !targetUnit) return;

      const guest = getGuest(guestId);

      // Resolve the hosting fields for the active period.
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const roomKey = isExtra ? "xtraRoom" : "room";

      // Build the new hosting map from the LIVE hosting (getLiveHosting) so we
      // preserve the other period's fields and the payment flags. The static
      // registry has no `hosting` data, so reading it there would wipe the
      // live assignment. Live-only guests (getGuest() === undefined) are fine.
      const currentHosting = getLiveHosting(guestId);
      const hosting = {
        ...currentHosting,
        [cabinKey]: targetUnit,
        [roomKey]: targetRoomId,
      };

      traceFirebase("cabin.assign.start", { guestId, cabinKey, targetUnit, roomKey, targetRoomId, currentHosting, nextHosting: hosting });

      const payload = {
        guestId,
        hosting,
        updatedBy: auth.currentUser?.uid || "dashboard",
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, collections.guests, guestId), payload, { merge: true });
        traceFirebase("cabin.assign.ok", { guestId, cabinKey, targetUnit, roomKey, targetRoomId, hosting });
        // Update the in-memory guest so the re-render reflects the change
        // immediately (the live onSnapshot listener will also refresh it).
        if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
        renderCabinAssignments();
      } catch (err) {
        console.error("Failed to reassign guest", err);
        traceFirebase("cabin.assign.error", { guestId, code: err?.code, message: err?.message });
        showToast("No se pudo reasignar. Revisa permisos.", "error");
      }
    });
  });

  // ── Remove guest from its assignment ──
  // Clears the active period's cabin+room (or xtraCabin+xtraRoom for the
  // coast period) from the guest's `hosting` map, preserving the other
  // period's fields and the payment flags.
  //
  // NOTE: We read the CURRENT hosting from the LIVE Firestore record
  // (getLiveHosting), NOT the static registry (getGuest). The static
  // web/shared/guests.js snapshot has no `hosting` data, so reading it there
  // would build an empty hosting map and wipe the live assignment. Also, some
  // guests only exist in Firestore (added via "+ Agregar"), so getGuest()
  // returns undefined for them — we must NOT bail out on that.
  container.querySelectorAll("[data-remove-guest]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.removeGuest;
      const guest = getGuest(guestId);

      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const roomKey = isExtra ? "xtraRoom" : "room";

      // Start from the LIVE hosting so we preserve the other period's fields
      // and the payment flags, then clear only the active period's keys by
      // setting them to null (keeping the keys present so the field exists).
      const currentHosting = getLiveHosting(guestId);
      const hosting = { ...currentHosting };
      hosting[cabinKey] = null;
      hosting[roomKey] = null;

      traceFirebase("cabin.remove.start", { guestId, cabinKey, roomKey, currentHosting, nextHosting: hosting });

      const payload = {
        guestId,
        hosting,
        updatedBy: auth.currentUser?.uid || "dashboard",
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, collections.guests, guestId), payload, { merge: true });
        traceFirebase("cabin.remove.ok", { guestId, cabinKey, roomKey, hosting });
        // Update the in-memory guest so the re-render reflects the change
        // immediately (the live onSnapshot listener will also refresh it).
        if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
        renderCabinAssignments();
        showToast("Invitado quitado de la cabaña.", "success");
      } catch (err) {
        console.error("Failed to remove guest from cabin", err);
        traceFirebase("cabin.remove.error", { guestId, code: err?.code, message: err?.message });
        showToast("No se pudo quitar al invitado. Revisa permisos.", "error");
      }
    });
  });

  // ── Add guest to a cabin (modal picker) ──
  // Each cabin card has a "+ Agregar" button. Clicking it opens a modal that
  // lists every guest WITHOUT a cabin in the active period (unassigned),
  // sorted A→Z by name with their avatar, so the admin can pick one to assign
  // to this cabin. The guest is assigned to the cabin's first room.
  container.querySelectorAll("[data-add-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetUnit = btn.dataset.addGuest;
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "unit";

      // Guests with no cabin in this period (unassigned), sorted A→Z by name.
      const unassigned = allGuests
        .map((g) => getMergedGuest(g))
        .filter((g) => !g[cabinKey])
        .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b)));

      const overlay = document.createElement("div");
      overlay.className = "dashboard-modal-overlay";
      overlay.innerHTML = `
        <div class="dashboard-modal dashboard-cabin-add-modal">
          <div class="dashboard-modal-heading">
            <h3>Agregar invitado</h3>
            <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
          </div>
          <div class="dashboard-modal-body">
            <p class="dashboard-cabin-add-hint">
              Invitados sin cabaña en este periodo (${unassigned.length}).
            </p>
            ${unassigned.length === 0
              ? '<p class="dashboard-cabin-empty">No hay invitados sin asignar en este periodo.</p>'
              : `<ul class="dashboard-cabin-add-list">
                  ${unassigned
                    .map((g) => {
                      const avatarUrl = guestAvatarUrl(g);
                      const avatarHtml = avatarUrl
                        ? `<img class="dashboard-avatar dashboard-avatar-sm" src="${avatarUrl}" alt="" loading="lazy" />`
                        : '<span class="dashboard-avatar dashboard-avatar-sm dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                      return `
                        <li>
                          <button type="button" class="dashboard-cabin-add-option" data-pick-guest="${g.id}">
                            ${avatarHtml}
                            <span>${guestFullName(g)}</span>
                            <code class="dashboard-cabin-code">${g.id}</code>
                          </button>
                        </li>`;
                    })
                    .join("")}
                </ul>`}
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelectorAll("[data-modal-close]").forEach((closeBtn) => {
        closeBtn.addEventListener("click", () => overlay.remove());
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });

      // Assign the picked guest to this cabin's first room.
      overlay.querySelectorAll("[data-pick-guest]").forEach((pickBtn) => {
        pickBtn.addEventListener("click", async () => {
          const guestId = pickBtn.dataset.pickGuest;
          const guest = getGuest(guestId);

          const displayName = getCabinDisplayName(targetUnit);
          const rooms = getRoomsByCabin(displayName);
          const targetRoomId = rooms[0]?.id || "";

          const hostingCabinKey = isExtra ? "xtraCabin" : "cabin";
          const hostingRoomKey = isExtra ? "xtraRoom" : "room";
          // Build from the LIVE hosting (getLiveHosting) so we preserve the
          // other period's fields and the payment flags. The static registry
          // has no `hosting` data, so reading it there would wipe the live
          // assignment. Live-only guests (getGuest() === undefined) are fine.
          const currentHosting = getLiveHosting(guestId);
          const hosting = {
            ...currentHosting,
            [hostingCabinKey]: targetUnit,
            [hostingRoomKey]: targetRoomId,
          };

          traceFirebase("cabin.add.start", { guestId, cabinKey: hostingCabinKey, targetUnit, roomKey: hostingRoomKey, targetRoomId, currentHosting, nextHosting: hosting });

          const payload = {
            guestId,
            hosting,
            updatedBy: auth.currentUser?.uid || "dashboard",
            updatedAt: serverTimestamp(),
          };

          try {
            await setDoc(doc(db, collections.guests, guestId), payload, { merge: true });
            traceFirebase("cabin.add.ok", { guestId, cabinKey: hostingCabinKey, targetUnit, roomKey: hostingRoomKey, targetRoomId, hosting });
            if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
            overlay.remove();
            renderCabinAssignments();
          } catch (err) {
            console.error("Failed to add guest to cabin", err);
            traceFirebase("cabin.add.error", { guestId, code: err?.code, message: err?.message });
            showToast("No se pudo agregar al invitado. Revisa permisos.", "error");
          }
        });
      });
    });
  });
}

// ── Thanks Manager (CRUD) ──────────────────────────────────────────────


// The `thanks` collection is the source of truth for the "MERCI" credits roll
// on the invitation. Each document carries a `guest` ID plus localized text
// (`fr`, `es`, `en`). Firestore rules restrict writes to admins (isAdmin()).
function thanksGuestName(record) {
  const guest = getGuest(record.guest);
  if (guest) return guestFullName(guest);
  return record.guest || "—";
}

// Sortable column definitions for the thanks table. `key` maps to the record
// field (or a computed value for the guest name); `label` is the header text.
const THANKS_COLUMNS = [
  { key: "guest", label: "Invitado" },
  { key: "es", label: "ES" },
  { key: "fr", label: "FR" },
  { key: "en", label: "EN" },
];

// Resolve the sortable value for a thanks record given a column key.
function thanksSortValue(record, key) {
  if (key === "guest") return thanksGuestName(record).toLowerCase();
  return (record[key] || "").toLowerCase();
}

function renderThanksManager() {
  const container = document.querySelector("[data-thanks-manager]");
  if (!container) return;

  const { key, dir } = state.thanksSort;
  const records = [...state.thanks].sort((a, b) => {
    const aVal = thanksSortValue(a, key);
    const bVal = thanksSortValue(b, key);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  // Build the sortable header cells. The active column shows ▲/▼.
  const headerCells = THANKS_COLUMNS.map((col) => {
    const active = col.key === key;
    const arrow = active ? (dir === "asc" ? " ▲" : " ▼") : "";
    return `<th><button type="button" class="dashboard-th-sort${active ? " is-active" : ""}" data-sort-thanks="${col.key}" title="Ordenar por ${col.label}">${col.label}${arrow}</button></th>`;
  }).join("");

  container.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="dashboard-button" type="button" data-create-thanks>+ Nuevo agradecimiento</button>
    </div>
    ${records.length === 0
      ? '<p class="dashboard-empty">No hay agradecimientos todavía. Crea uno para que aparezca en los créditos de la invitación.</p>'
      : `<div class="dashboard-guest-table-wrap">
          <table class="dashboard-guest-table">
            <thead>
              <tr>
                <th class="dashboard-th-avatar">Foto</th>
                ${headerCells}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${records
                .map(
                  (record) => {
                    const guest = getGuest(record.guest);
                    const merged = guest ? getMergedGuest(guest) : null;
                    const avatarUrl = merged ? guestAvatarUrl(merged) : null;
                    const avatarHtml = avatarUrl
                      ? `<img class="dashboard-avatar" src="${avatarUrl}" alt="" loading="lazy" />`
                      : '<span class="dashboard-avatar dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                    return `
                <tr>
                  <td class="dashboard-td-avatar">${avatarHtml}</td>
                  <td><strong>${thanksGuestName(record)}</strong><br /><code>${record.guest}</code></td>
                  <td>${record.es || "—"}</td>
                  <td>${record.fr || "—"}</td>
                  <td>${record.en || "—"}</td>
                  <td>
                    <button class="dashboard-link-btn" data-edit-thanks="${record.id}" title="Editar">✏️</button>
                    <button class="dashboard-link-btn" data-delete-thanks="${record.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
                  </td>
                </tr>`;
                  },
                )
                .join("")}
            </tbody>
          </table>
        </div>`
    }
  `;

  container.querySelector("[data-create-thanks]")?.addEventListener("click", () => {
    openThanksEditor(null);
  });

  // ── Sortable column headers ──
  container.querySelectorAll("[data-sort-thanks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const colKey = btn.dataset.sortThanks;
      if (state.thanksSort.key === colKey) {
        // Toggle direction when re-clicking the active column.
        state.thanksSort.dir = state.thanksSort.dir === "asc" ? "desc" : "asc";
      } else {
        state.thanksSort.key = colKey;
        state.thanksSort.dir = "asc";
      }
      renderThanksManager();
    });
  });


  container.querySelectorAll("[data-edit-thanks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const record = state.thanks.find((r) => r.id === btn.dataset.editThanks);
      if (record) openThanksEditor(record);
    });
  });

  container.querySelectorAll("[data-delete-thanks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const record = state.thanks.find((r) => r.id === btn.dataset.deleteThanks);
      if (record) openThanksDelete(record);
    });
  });
}

function openThanksEditor(record) {
  const isEdit = Boolean(record);
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal">
      <div class="dashboard-modal-heading">
        <h3>${isEdit ? "Editar agradecimiento" : "Nuevo agradecimiento"}</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-thanks-form>
        <div class="dashboard-modal-field">
          <label for="thanks-guest">Invitado</label>
          <div class="dashboard-thanks-guest-row">
            <select id="thanks-guest" name="guest" required>
              <option value="">— Selecciona un invitado —</option>
              ${getActiveGuests()
                .map(
                  (g) =>
                    `<option value="${g.id}" ${record && record.guest === g.id ? "selected" : ""}>${guestFullName(g)} (${g.id})</option>`,
                )
                .join("")}
            </select>
            <span class="dashboard-thanks-avatar" data-thanks-avatar aria-hidden="true">👤</span>
          </div>
        </div>
        <div class="dashboard-modal-field">
          <label for="thanks-es">Texto en español</label>
          <textarea id="thanks-es" name="es" rows="2" placeholder="Ej: Wedding planner">${record?.es || ""}</textarea>
        </div>
        <div class="dashboard-modal-field">
          <label for="thanks-fr">Texto en francés</label>
          <textarea id="thanks-fr" name="fr" rows="2" placeholder="Ej: Wedding planner">${record?.fr || ""}</textarea>
        </div>
        <div class="dashboard-modal-field">
          <label for="thanks-en">Texto en inglés</label>
          <textarea id="thanks-en" name="en" rows="2" placeholder="Ej: Wedding planner">${record?.en || ""}</textarea>
        </div>
        <small style="color:#8a7a5f;display:block;">
          Puedes rellenar solo un idioma; el script de traducción completará los demás.
        </small>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="submit">${isEdit ? "Guardar cambios" : "Crear"}</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-thanks-status></small>
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

  // ── Live avatar preview for the selected guest ──
  const avatarEl = overlay.querySelector("[data-thanks-avatar]");
  const guestSelect = overlay.querySelector("#thanks-guest");
  const updateAvatar = () => {
    const guest = getGuest(guestSelect.value);
    const merged = guest ? getMergedGuest(guest) : null;
    const url = merged ? guestAvatarUrl(merged) : null;
    if (url) {
      avatarEl.innerHTML = `<img class="dashboard-avatar" src="${url}" alt="" loading="lazy" />`;
    } else {
      avatarEl.innerHTML = "👤";
    }
  };
  guestSelect.addEventListener("change", updateAvatar);
  // Initialize the preview for the pre-selected guest (edit mode).
  updateAvatar();

  const form = overlay.querySelector("[data-thanks-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const guest = data.get("guest")?.trim();
    const es = data.get("es")?.trim();
    const fr = data.get("fr")?.trim();
    const en = data.get("en")?.trim();

    // At least one language must be filled. The translation script fills the
    // missing ones, so we don't require all three here.
    if (!guest || (!es && !fr && !en)) return;

    const status = overlay.querySelector("[data-thanks-status]");
    status.textContent = "Guardando…";
    status.dataset.state = "working";

    // Only the agreed schema fields are written (guest, fr, es, en, createdAt).
    // Empty languages are omitted so the translation script can fill them
    // later. The Firestore rules (hasValidThanksFields) reject any extra keys.
    const payload = { guest };
    if (es) payload.es = es;
    if (fr) payload.fr = fr;
    if (en) payload.en = en;
    // New records get a server timestamp so the dashboard can sort them by
    // creation time (newest first) instead of falling back to document-ID
    // (alphabetical) order. Existing records keep their original createdAt.
    if (!isEdit) payload.createdAt = serverTimestamp();

    traceFirebase(isEdit ? "thanks.update" : "thanks.create", {
      guest,
      hasEs: Boolean(es),
      hasFr: Boolean(fr),
      hasEn: Boolean(en),
      hasCreatedAt: !isEdit,
    });

    try {
      if (isEdit) {
        await setDoc(doc(db, collections.thanks, record.id), payload, { merge: true });
        traceFirebase("thanks.update.ok", { id: record.id });
      } else {
        await addDoc(collection(db, collections.thanks), payload);
        traceFirebase("thanks.create.ok", { guest });
      }

      status.textContent = "✅ Guardado.";
      status.dataset.state = "success";
      setTimeout(() => overlay.remove(), 1200);
      // Refresh the list so the new/edited entry shows up.
      loadDashboardData().catch(showLoadError);
    } catch (err) {
      console.error("Failed to save thanks", err);
      traceFirebase(isEdit ? "thanks.update.error" : "thanks.create.error", {
        code: err?.code,
        message: err?.message,
      });
      status.textContent = "❌ Error al guardar. Intenta de nuevo.";
      status.dataset.state = "error";
    }

  });

  setTimeout(() => overlay.querySelector("#thanks-guest")?.focus(), 100);
}

function openThanksDelete(record) {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 28rem;">
      <div class="dashboard-modal-heading">
        <h3>Eliminar agradecimiento</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="dashboard-modal-form">
        <p style="line-height:1.6;color:#55452d;">
          ¿Eliminar el agradecimiento de <strong>${thanksGuestName(record)}</strong>?
        </p>
        <p style="font-size:0.85rem;color:#a0352c;">
          Esta acción quitará el crédito de la sección de agradecimientos de la invitación.
        </p>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" style="background:#a0352c;" type="button" data-confirm-delete>
            Eliminar
          </button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>
            Cancelar
          </button>
        </div>
        <small data-thanks-status></small>
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
    const status = overlay.querySelector("[data-thanks-status]");
    status.textContent = "Eliminando…";
    status.dataset.state = "working";
    traceFirebase("thanks.delete", { id: record.id });
    try {
      await deleteDoc(doc(db, collections.thanks, record.id));
      traceFirebase("thanks.delete.ok", { id: record.id });
      status.textContent = "✅ Eliminado.";
      status.dataset.state = "success";
      setTimeout(() => overlay.remove(), 1200);
      loadDashboardData().catch(showLoadError);
    } catch (err) {
      console.error("Failed to delete thanks", err);
      traceFirebase("thanks.delete.error", { id: record.id, code: err?.code, message: err?.message });
      status.textContent = "❌ Error al eliminar.";
      status.dataset.state = "error";
    }
  });

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

// ── Data loading ───────────────────────────────────────────────────────


// RSVP attendance question ids (stored in each guest's `rsvp.answers` map as
// questionId → scale level, int 0–5). Level 0 = unanswered; 4–5 = "very
// likely / yes". These mirror the RSVP scale questions in the invitation.
const RSVP_ATTENDANCE_DAYS = ["friday", "saturday", "sunday"];

// A guest counts as "confirmed" for a day when their scale level is 4 or 5
// ("Très probablement" / "Oui, je viens !"). Levels 1–3 are not counted as
// confirmations.
const RSVP_CONFIRMED_MIN_LEVEL = 4;

/**
 * Compute per-day confirmation counts from the live `guests` collection.
 * Each guest's `rsvp.answers` holds a scale level (0–5) per attendance day.
 * Returns a map of day → { confirmed, answered }.
 */
function computeDayConfirmations() {
  const counts = {
    friday: { confirmed: 0, answered: 0 },
    saturday: { confirmed: 0, answered: 0 },
    sunday: { confirmed: 0, answered: 0 },
  };
  for (const guest of state.liveGuests) {
    const answers = guest?.rsvp?.answers || {};
    for (const day of RSVP_ATTENDANCE_DAYS) {
      const level = Number(answers[day]);
      if (Number.isInteger(level) && level > 0) {
        counts[day].answered++;
        if (level >= RSVP_CONFIRMED_MIN_LEVEL) counts[day].confirmed++;
      }
    }
  }
  return counts;
}

function updateDashboardData() {
  // Per-day attendance confirmations come from the live `guests` collection
  // (each guest's `rsvp.answers` map), not the legacy rsvp_submissions.
  const dayConfirmations = computeDayConfirmations();


  // Invitations sent: count guests whose live Firestore record has
  // `invitationSent === true`.
  const invitationSentCount = state.liveGuests.filter(
    (g) => g.invitationSent === true,
  ).length;

  const summary = document.querySelector("[data-dashboard-summary]");
  if (summary) {
    summary.replaceChildren(
      summaryCard(
        "Viernes 19",
        dayConfirmations.friday.confirmed,
        `${dayConfirmations.friday.answered} respuestas`,
      ),
      summaryCard(
        "Sábado 20",
        dayConfirmations.saturday.confirmed,
        `${dayConfirmations.saturday.answered} respuestas`,
      ),
      summaryCard(
        "Domingo 21",
        dayConfirmations.sunday.confirmed,
        `${dayConfirmations.sunday.answered} respuestas`,
      ),
      summaryCard(
        "Invitación enviada",
        invitationSentCount,
        `${state.liveGuests.length} invitados`,
      ),
    );
  }



  // Re-render guest manager if visible
  renderGuestManager();
  renderThanksManager();
}


// Bounded query limit for dashboard collections. Prevents unbounded reads
// that would grow with the number of submissions. For a wedding (~100-200
// guests) 1000 is generous; it also protects against runaway growth.
const DASHBOARD_QUERY_LIMIT = 1000;

async function loadDashboardData() {
  showMessage("Actualizando respuestas…", "working");
  traceFirebase("load.start", { collections: Object.keys(COLLECTIONS) });
  const entries = await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, collectionName]) => {
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
      traceFirebase("load.collection", { collection: collectionName, count: records.length });
      return [key, records];
    }),
  );
  entries.forEach(([key, records]) => {
    state[key] = records;
  });
  updateDashboardData();
  traceFirebase("load.done", { counts: Object.fromEntries(entries.map(([k, r]) => [k, r.length])) });
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
    { id: "cabins", label: "Cabañas", icon: "🏠" },
    { id: "thanks", label: "Agradecimientos", icon: "🙏" },
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

      <!-- ── Panel: Thanks ── -->

      <section class="dashboard-panel" data-dashboard-panel="thanks">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Créditos de agradecimiento</p>
              <h2>Agradecimientos</h2>
            </div>
          </div>
          <div data-thanks-manager></div>
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


  // NOTE: The live `guests` onSnapshot listener is set up in startDashboard
  // (before the auth check) so the normalized cache is populated before we
  // decide access. It keeps state.liveGuests + the guests.js cache in sync and
  // calls updateDashboardData() on every change, so there is no need for a
  // second listener here.

  renderTabNavigation();

  renderGuestManager();
  renderCabinAssignments();
  renderThanksManager();

  // ── Load rooms + cabins from Firestore (source of truth) ──
  // Rooms drive the occupancy counts; cabins provide the showcase photos for
  // each cabin card. Both are loaded before re-rendering the cabins panel.
  Promise.all([loadRooms(), loadCabins()]).then(() => {
    renderCabinAssignments();
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

  loadDashboardData().catch(showLoadError);
}

// The guest cache (guests.js) is populated asynchronously by the live
// `guests` onSnapshot listener. The auth check in startDashboard needs the
// cache to be ready before it can resolve the signed-in user's guest record,
// so we gate access on the first snapshot arriving. The listener is set up
// here (before the auth check) so the cache is populated before we decide
// whether to render the dashboard.
let guestsReadyResolve;
const guestsReady = new Promise((resolve) => {
  guestsReadyResolve = resolve;
});

export function startDashboard(app) {
  // There is no dedicated admin login. We reuse the current Firebase Auth
  // session (the same one used by the invitation) and only grant access to
  // guests who belong to the "Novios" group (David and Aydé). Everyone else
  // sees an access-denied screen.
  //
  // The live `guests` listener is set up FIRST so the normalized cache
  // (guests.js) is populated before the auth check runs. Without this,
  // getGuestByEmail would return undefined (the cache is empty at auth time)
  // and even the couple would be denied access.
  const guestsUnsub = onSnapshot(
    query(collection(db, collections.guests), limit(DASHBOARD_QUERY_LIMIT)),
    (snapshot) => {
      state.liveGuests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLiveGuests(state.liveGuests);
      traceFirebase("guests.snapshot", { count: state.liveGuests.length });
      // Resolve the gate so the auth check can proceed once the cache is ready.
      if (guestsReadyResolve) {
        guestsReadyResolve();
        guestsReadyResolve = null;
      }
      updateDashboardData();
    },
  );

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // No active session: send them to the invitation to sign in first.
      // In dev, the dashboard runs on port 5174 while the invitation runs on
      // port 5173. Redirect to the invitation's origin so the user can sign in.
      const invitationOrigin =
        window.location.port === "5174"
          ? "http://localhost:5173"
          : window.location.origin;
      window.location.href = `${invitationOrigin}/`;
      return;
    }

    // Wait for the live `guests` snapshot to populate the cache before
    // resolving the user's guest record.
    await guestsReady;

    // Resolve the signed-in guest by UID, exactly like the invitation does
    // (AppContext.jsx): Firebase Auth UIDs are set to the guest ID (from the
    // Google Sheet `ID` column), so `user.uid` === the guest id. We must NOT
    // resolve by email — the couple's auth emails (e.g. david.aili.mx@gmail.com)
    // are not derivable from their guest ids, so getGuestByEmail would return
    // undefined and deny them access.
    const guest = getGuest(user.uid);
    if (isNovioGuest(guest)) {
      renderDashboard(app);
    } else {
      renderAccessDenied(app);
    }
  });

  // Keep the listener alive for the lifetime of the app.
  app._guestsUnsub = guestsUnsub;
}


