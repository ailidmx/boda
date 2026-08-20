import { collection, onSnapshot, limit, query, serverTimestamp } from "firebase/firestore";




import { db } from "./firebase.js";
import {
  getActiveGuests,
  getGuest,
  getGuestByEmail,
  setLiveGuests,
} from "./guests.js";


import {
  loadRooms,
  getCabinDisplayName,
  getRoomsByCabin,
  getRoomOccupancy,
  getRoomDescription,
} from "./rooms.js";
import { getCabinPhotos, cabinPhotoUrl } from "./cabins.js";
import { loadTables, renderTablesManager } from "./tables.js";
import { createMatrixLoader } from "./matrixLoader.js";
import { collections } from "../../shared/firestore-paths.js";
import {
  RSVP_CONFIRMED_MIN_LEVEL,
  DEFAULT_AUTH_EMAIL_DOMAIN,
  GUEST_SORT_COLUMNS,

  guestIdentity,
  guestHosting,
  guestFullName,
  guestRoom,
  guestAvatarUrl,
  guestInitials,
  isAdminGuest,
  getInviteUrl,
  badgeStyle,
  badgeHtml,
  buildGuestId,
  uniqueGuestId,
} from "./guestDomain.js";


import {
  getLiveRsvpAnswers as serviceGetLiveRsvpAnswers,
  getMergedGuest as serviceGetMergedGuest,
  getLiveHosting as serviceGetLiveHosting,
  guestAuthEmail as serviceGuestAuthEmail,
  guestHasAuth as serviceGuestHasAuth,
  guestSendEmail as serviceGuestSendEmail,
  guestCanEmail as serviceGuestCanEmail,
  guestCanWhatsapp as serviceGuestCanWhatsapp,
  rsvpLevelChip as serviceRsvpLevelChip,
  rsvpBooleanChip as serviceRsvpBooleanChip,
  computeDayConfirmations as serviceComputeDayConfirmations,

  computeInvitationStats as serviceComputeInvitationStats,
  computeDayDistributions as serviceComputeDayDistributions,
  computeDayConfirmedGuests as serviceComputeDayConfirmedGuests,
  computeDayLevelGuests as serviceComputeDayLevelGuests,



  guestStatusBadge as serviceGuestStatusBadge,

  getUniqueGuestGroups as serviceGetUniqueGuestGroups,
  getGroupAttendanceCounts as serviceGetGroupAttendanceCounts,
  getUniqueCabins as serviceGetUniqueCabins,
  getFilteredGuests as serviceGetFilteredGuests,
  guestSortValue as serviceGuestSortValue,
  guestAgeGroup as serviceGuestAgeGroup,
} from "./guestService.js";




import { renderGuestManager as renderGuestManagerTable } from "./guestTable.js";
import { openGuestEditor as openGuestEditorModal } from "./guestEditorModal.js";
import { openDeleteConfirm as openDeleteConfirmModule, openSendInviteModal as openSendInviteModalModule } from "./guestModals.js";
import { openCreateGuestModal as openCreateGuestModalModule } from "./guestCreateModal.js";

import { renderSummary } from "./summary.js";
import { renderCabinAssignments as renderCabinAssignmentsPanel } from "./cabinsPanel.js";
import { renderThanksPanel as renderThanksPanelModule } from "./thanksPanel.js";
import {
  getTabFromPath,
  navigateToTab,
  switchTab,
  renderTabNavigation,
} from "./tabNav.js";

import { updateGuest, softDeleteGuest, createGuest } from "./repositories/guestRepository.js";

import { createThanks, updateThanks, deleteThanks } from "./repositories/thanksRepository.js";

import {
  buildDashboardGuestEditPayload,
  buildDashboardGuestInlinePayload,
  buildGuestRsvpPayload,
  buildDashboardGuestHostingPayload,
  buildGuestCreatePayload,
} from "../../shared/payload-builders.js";



import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";


const state = {
  liveGuests: [], // raw Firestore `guests` records (source of truth)
  authUsers: {}, // uid → { email } LIVE Firebase Auth user list (via listAuthUsers callable)
  thanks: [], // from Firestore collection "thanks" (guest + es/fr/en)
  filterGroup: "",
  filterQuery: "",
  filterAgeGroup: "",
  columnGroup: "identity", // which column group is visible in the INVITADOS table
  sortKey: "name",
  sortDir: "asc",
};

// ── Matrix-style loading overlay ───────────────────────────────────────
// A cinematic full-screen loader (RED rain + HUD with real metrics) shown while
// the dashboard boots. Each data source reports its real record count + byte
// size as it resolves; the overlay fades out once every source has reported.
// The controller lives in `matrixLoader.js` (vanilla JS, no Firestore access).
const matrixLoader = createMatrixLoader();

// Rough byte estimate for a Firestore record (JSON.stringify of the data).
function estimateBytes(records) {
  if (!Array.isArray(records)) return 0;
  return records.reduce((sum, r) => {
    try {
      return sum + JSON.stringify(r).length;
    } catch {
      return sum;
    }
  }, 0);
}

// Report a data source to the matrix loader (records + bytes + done).
function reportSource(name, records) {
  matrixLoader.reportSource({
    name,
    records: Array.isArray(records) ? records.length : 0,
    bytes: estimateBytes(records),
    done: true,
  });
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

// The current admin's uid (used as the `editorGuestId` on guest writes). Falls
// back to "dashboard" when no auth session is present (e.g. during local dev).
function getCurrentUserId() {
  return auth.currentUser?.uid || "dashboard";
}

// Analytics trace helper. The dashboard does not wire Firebase Analytics, so
// this is a lightweight no-op that logs to the console for debugging. Kept as
// an injectable dependency so the cabins panel stays presentation-only.
function traceFirebase(event, data = {}) {
  if (typeof console !== "undefined") {
    console.debug(`[dashboard:trace] ${event}`, data);
  }
}

// App-wide toast notification, mounted on <body> (see `_toast.scss`). Used for
// transient feedback (errors, confirmations) that should not depend on a
// specific view being mounted. Auto-dismisses after a few seconds.
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
  const icon = type === "error" ? "✕" : type === "success" ? "✓" : "ℹ";
  toast.innerHTML = `
    <span class="dashboard-toast-icon" aria-hidden="true">${icon}</span>
    <span>${message}</span>
    <button class="dashboard-toast-close" type="button" aria-label="Cerrar">✕</button>
  `;
  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector(".dashboard-toast-close").addEventListener("click", dismiss);
  setTimeout(dismiss, 4000);
}

// Extract the sortable value for a guest given a column key. The derivation
// lives in `guestService.js` (pure, dependency-injected); this thin adapter
// binds the dashboard's mutable `state.authUsers` so the rest of the file keeps
// calling the same short signature.
function guestSortValue(guest, key) {
  return serviceGuestSortValue(guest, key, state.authUsers, state.liveGuests);
}





// ── Access control ─────────────────────────────────────────────────────

// There is no dedicated admin login. The dashboard reuses the same Firebase
// Auth session as the invitation. Access is granted ONLY to guests whose
// Firestore `guests` doc has `isAdmin: true` (David and Aydé). Everyone else
// sees an access-denied screen and is redirected back to the invitation.
//
// The signed-in user is resolved by their Firebase auth email via
// `getGuestByEmail()` (the guest's `firebaseEmail` field), then we check
// `isAdmin` (imported from guestDomain.js).

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


// The group / cabin / filter derivations live in `guestService.js` (pure,
// dependency-injected). These thin adapters bind the dashboard's mutable
// `state` (filterGroup / filterQuery) and the live guest cache so the rest of
// the file can keep calling the same short signatures.

function getUniqueGuestGroups() {
  return serviceGetUniqueGuestGroups(getActiveGuests());
}

// Per-group attendance summary for the group nav chips. For each group returns
// `{ confirmedSaturday, size }`:
//   - `confirmedSaturday` = guests in the group whose SATURDAY RSVP level is
//     ≥ RSVP_CONFIRMED_MIN_LEVEL (4) — i.e. confirmed for Saturday.
//   - `size` = total guests in the group.
// Rendered as "X/Y" on each chip (X = confirmed Saturday, Y = group size).
function getGroupAttendanceCounts() {
  return serviceGetGroupAttendanceCounts(getActiveGuests(), state.liveGuests);
}

function getUniqueCabins() {
  return serviceGetUniqueCabins(getActiveGuests());
}

function getFilteredGuests() {
  return serviceGetFilteredGuests(getActiveGuests(), {
    filterGroup: state.filterGroup,
    filterQuery: state.filterQuery,
    filterAgeGroup: state.filterAgeGroup,
  });
}



// ── Live RSVP scale (source of truth: guest's `rsvp.answers`) ──────────

// The derivation logic lives in `guestService.js` (pure, dependency-injected).
// These thin adapters bind the dashboard's mutable `state` (liveGuests /
// authUsers) and the live guest cache so the rest of the file can keep calling
// the same short signatures. `guestStatusBadge` wraps the service's plain
// descriptor in a DOM element via `make`.

// Read the live RSVP answers for a guest from the raw Firestore record.
function getLiveRsvpAnswers(guest) {
  return serviceGetLiveRsvpAnswers(guest, state.liveGuests);
}

// Merge a normalized guest with its raw live Firestore record. Live wins where
// both exist (identity names/photo, hosting incl. xtraCabin/xtraRoom, rsvp).
function getMergedGuest(guest) {
  return serviceGetMergedGuest(guest, state.liveGuests);
}

// Read the LIVE `hosting` map for a guest from the raw Firestore record. The
// cabins panel builds new assignments from this (preserving the other period's
// fields and the payment flags) rather than from the normalized guest, which
// has no `hosting` data.
function getLiveHosting(guestId) {
  return serviceGetLiveHosting(guestId, state.liveGuests);
}

// A guest "has a Firebase Auth account" when their RAW live record carries an
// explicit `firebaseEmail` (a real auth account was provisioned for them).
function guestAuthEmail(guest) {
  return serviceGuestAuthEmail(guest, state.liveGuests);
}

// A guest can receive an invitation only if they have a Firebase Auth account
// (either present in the live auth list or carrying an explicit firebaseEmail).
function guestHasAuth(guest) {
  return serviceGuestHasAuth(guest, state.liveGuests, state.authUsers);
}

// The email we would send an invitation to.
function guestSendEmail(guest) {
  return serviceGuestSendEmail(guest, state.liveGuests, state.authUsers);
}

// The email channel is available whenever the guest has a real (non-default
// domain) email address.
function guestCanEmail(guest) {
  return serviceGuestCanEmail(guest, state.liveGuests, state.authUsers);
}

// The WhatsApp channel is available only when the guest is auth'd AND has a
// phone number.
function guestCanWhatsapp(guest) {
  return serviceGuestCanWhatsapp(guest, state.liveGuests, state.authUsers);
}

// RSVP scale dropdown for a single attendance day.
function rsvpLevelChip(guest, day) {
  return serviceRsvpLevelChip(guest, day, state.liveGuests);
}

// Badge chip for a boolean-map RSVP answer (Sí / No / —) — e.g.
// accommodationConfirm, petanqueParticipation, petanqueOwnBoules, playa,
// rocaAzul. Reads the guest's `rsvp.answers.<questionId>[guest.id]` from the
// live record.
function rsvpBooleanChip(guest, questionId) {
  return serviceRsvpBooleanChip(guest, questionId, state.liveGuests);
}

// Aggregate confirmed counts per attendance day from the live guests.

function computeDayConfirmations() {
  return serviceComputeDayConfirmations(getActiveGuests(), state.liveGuests);
}

// Invitation-send stats (sent / total / percentage) for the summary card.
function computeInvitationStats() {
  return serviceComputeInvitationStats(getActiveGuests());
}

// Per-day RSVP scale distribution (0–5) for the summary cards.
function computeDayDistributions() {
  return serviceComputeDayDistributions(getActiveGuests(), state.liveGuests);
}

// Per-day list of CONFIRMED guests (RSVP level ≥ 4) for the clickable stacked
// avatars + full-screen modal on each day summary card.
function computeDayConfirmedGuests() {
  return serviceComputeDayConfirmedGuests(getActiveGuests(), state.liveGuests);
}

// Per-day, per-level list of guests for EVERY RSVP level (0–5). Used to make
// each segment of the distribution bar clickable so the admin can open a modal
// listing exactly who answered 0, 1, 2, 3, 4 or 5 for that day.
function computeDayLevelGuests() {
  return serviceComputeDayLevelGuests(getActiveGuests(), state.liveGuests);
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
// partial = answered but not confirmed, pending = no answers). The derivation
// lives in `guestService.js`; this adapter wraps its plain descriptor in a DOM
// element via `make`.
function guestStatusBadge(guest) {
  const { className, text } = serviceGuestStatusBadge(guest, state.liveGuests);
  return make("span", className, text);
}



// ── Guest Editor Modal ─────────────────────────────────────────────────

// The "✏️ Editar" modal (form rendering, Cloudinary avatar upload, and the
// guest save) lives in `guestEditorModal.js`. This thin adapter injects the
// dashboard's module-scope dependencies so the modal stays a pure presentation
// module that never touches Firestore directly.
function openGuestEditor(guest) {
  openGuestEditorModal(guest, {
    guestAvatarUrl,
    guestInitials,
    buildDashboardGuestEditPayload,
    updateGuest,
    getGuest,
  });
}


// ── Inline save helper ─────────────────────────────────────────────────

// AGREED SCHEMA: Only these fields may be written to the `guests` collection
// from the client. Everything else (group, hasCabin, unit, occupancy, payment,
// cabinLabel, room, customContent) is static data from the sheet and must be
// edited there, not in Firestore.
const GUEST_WRITABLE_FIELDS = new Set([
  "firstName", "middleName", "lastName", "maternalLastName", "phone", "idCheckUser", "cloudinaryId",
  "gender", "age", "messageAuthor", "invitationGroup", "invitationSent", "_deleted", "travelsByPlane",
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
      if (["firstName", "middleName", "lastName", "maternalLastName", "phone", "gender", "age"].includes(field)) {
        guest.identity = { ...(guest.identity || {}), [field]: value };
      }
      // `travelsByPlane` is a top-level boolean; the inline editor sends
      // "true" / "false" / "" (empty = unknown). Normalize to a real boolean
      // (or undefined when empty) so the in-memory guest matches Firestore.
      if (field === "travelsByPlane") {
        if (value === true || value === "true") guest.travelsByPlane = true;
        else if (value === false || value === "false") guest.travelsByPlane = false;
        else guest.travelsByPlane = undefined;
      } else {
        guest[field] = value;
      }
    }


    return true;
  } catch (err) {
    console.error("Failed to save guest inline", err);
    return false;
  }
}

// Update a guest's Firebase Auth login email (their "identifier") via the
// `updateGuestEmail` Cloud Function. The function updates the Firebase Auth
// user's email AND the guest's `firebaseEmail` field in Firestore, then
// notifies the couple on Telegram. On success we refresh the live auth list so
// the identity column shows the new email immediately.
async function saveGuestEmail(guestId, email) {
  const functions = getFunctions();
  const updateGuestEmail = httpsCallable(functions, "updateGuestEmail");
  try {
    await updateGuestEmail({ guestId, email });
    // Refresh the live auth list so the new email shows in the identity column.
    const listAuthUsers = httpsCallable(functions, "listAuthUsers");
    const result = await listAuthUsers();
    const users = result.data?.users || [];
    state.authUsers = Object.fromEntries(
      users.map((u) => [u.uid, { id: u.uid, email: u.email }]),
    );
    return true;
  } catch (err) {
    console.error("Failed to update guest email", err);
    return false;
  }
}


// ── Invitation group column (rename + pick another group) ──────────────


// Sorted set of existing invitation group names: every distinct
// `invitationGroup` value currently used by guests. Used to populate the "pick
// another group" dropdown. (The legacy `invitation_groups` collection was
// removed — the guests' own `invitationGroup` values are the source of truth.)
function getInvitationGroupOptions() {
  const names = new Set();
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

// The "Eliminar invitado" and "Enviar invitación" modals live in
// `guestModals.js`. These thin adapters inject the dashboard's module-scope
// dependencies so the modals stay pure presentation modules that never touch
// Firestore directly.
function openDeleteConfirm(guest) {
  openDeleteConfirmModule(guest, {
    guestFullName,
    softDeleteGuest,
  });
}

// ── Send Invite Modal ─────────────────────────────────────────────────

// Opens a modal to send a guest their invitation link via WhatsApp and/or
// email. The actual sending is delegated to the `sendInvitation` Cloud
// Function (Gmail API + WhatsApp deep link), which is admin-only.
function openSendInviteModal(guest, channel = null) {
  openSendInviteModalModule(guest, channel, {
    guestFullName,
    guestCanWhatsapp,
    guestCanEmail,
    guestHasAuth,
    guestSendEmail,
    getInviteUrl,
    saveGuestInline,
    renderGuestManager,
    DEFAULT_AUTH_EMAIL_DOMAIN,
  });
}

// ── Create Guest Modal ─────────────────────────────────────────────────

// The "Agregar invitado" modal (form rendering + create flow) lives in
// `guestCreateModal.js`. This thin adapter injects the dashboard's module-scope
// dependencies (repository + payload-builder + id helpers + live cache) so the
// modal stays a pure presentation module that never touches Firestore directly.
function openCreateGuestModal() {
  openCreateGuestModalModule({
    createGuest,
    buildGuestCreatePayload,
    buildGuestId,
    uniqueGuestId,
    getActiveGuests,
    renderGuestManager,
  });
}

// ── Thanks Panel ────────────────────────────────────────────────────────

// The "Gracias" CRUD panel (table + searchable guest selector + create/edit
// modal) lives in `thanksPanel.js`. This thin adapter injects the dashboard's
// module-scope dependencies (live guest cache + thanks repository functions) so
// the panel stays a pure presentation module that never touches Firestore
// directly.
function renderThanksPanel() {
  const container = document.querySelector("[data-thanks-manager]");
  if (!container) return;
  renderThanksPanelModule({
    container,
    thanks: state.thanks,
    guests: getActiveGuests(),
    guestFullName,
    guestAvatarUrl,
    guestInitials,
    createThanks,
    updateThanks,
    deleteThanks,
  });
}

// ── Guest Manager (flat, live, inline editable) ────────────────────────

function renderGuestManager() {
  const container = document.querySelector("[data-guest-manager]");
  if (!container) return;
  renderGuestManagerTable({
    container,
    state,
    getActiveGuests,
    getGuest,
    getFilteredGuests,
    getUniqueGuestGroups,
    getGroupAttendanceCounts,
    getMergedGuest,
    guestStatusBadge,
    rsvpLevelChip,
    rsvpBooleanChip,
    guestSortValue,
    GUEST_SORT_COLUMNS,


    saveGuestInline,
    saveGuestEmail,
    saveGuestRsvpAnswer,
    openGuestEditor,

    openCreateGuestModal,
    openSendInviteModal,
    openDeleteConfirm,

    applyInvitationGroupChange,
    getInvitationGroupOptions,
    invitationGroupCell,
    guestAvatarUrl,
    guestInitials,
    guestFullName,
    guestIdentity,
    guestRoom,
    badgeHtml,
    badgeStyle,
    getInviteUrl,
    DEFAULT_AUTH_EMAIL_DOMAIN,
    guestCanWhatsapp,
    guestCanEmail,
    guestHasAuth,
    guestSendEmail,
    guestAgeGroup: serviceGuestAgeGroup,
  });
}



// ── Cabin Assignments ──────────────────────────────────────────────────

// The cabin-assignment cards are rendered by the extracted presentation module
// `cabinsPanel.js`. This thin adapter binds the dashboard's live guest cache and
// invite-URL helper so the rest of the file keeps calling the same short
// signature. The renderer itself contains no Firestore access and no business
// rules.
function renderCabinAssignments() {
  renderCabinAssignmentsPanel({
    container: document.querySelector("[data-cabin-assignments]"),
    getActiveGuests,
    getGuest,
    getMergedGuest,
    getLiveHosting,
    getCabinDisplayName,
    getRoomsByCabin,
    getRoomOccupancy,
    getRoomDescription,
    getCabinPhotos,
    cabinPhotoUrl,
    guestAvatarUrl,
    guestFullName,
    getInviteUrl,
    buildHostingPayload: buildDashboardGuestHostingPayload,
    updateGuest,
    getCurrentUserId,
    serverTimestamp,
    traceFirebase,
    showToast,
  });
}

// ── Table Assignments (real-life 30m × 6m canvas) ──────────────────────

function renderTableAssignments() {
  const container = document.querySelector("[data-table-assignments]");
  if (!container) return;
  renderTablesManager(container);
}

// ── Data loading ───────────────────────────────────────────────────────

// The dashboard is LIVE-ONLY: the `guests` collection (via the `onSnapshot`
// listener in `startDashboard`) is the single source of truth. The legacy
// `rsvp_submissions` / `experience_suggestions` / `coast_interest` /
// `petanque_participation` collections are no longer written by the app
// (answers live on the `guests` doc), so there is no batch `loadDashboardData`
// step anymore. The attendance summary cards are rendered live from
// `computeDayConfirmations()` via `renderSummary` (see `summary.js`).

// Bounded query limit for dashboard collections. Prevents unbounded reads
// that would grow with the number of submissions. For a wedding (~100-200
// guests) 1000 is generous; it also protects against runaway growth.
const DASHBOARD_QUERY_LIMIT = 1000;

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

      <!-- ── Panel: Thanks ── -->
      <section class="dashboard-panel" data-dashboard-panel="thanks">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Agradecimientos personalizados</p>
              <h2>Gracias</h2>
            </div>
          </div>
          <div data-thanks-manager></div>
        </div>
      </section>

    </main>
  `;

  // ── Set initial tab from URL path ──
  const initialTab = getTabFromPath();
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

  // ── Real-time listener for thanks ──
  const thanksUnsub = onSnapshot(
    query(collection(db, collections.thanks), limit(DASHBOARD_QUERY_LIMIT)),
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      state.thanks = records;
      // Report the thanks to the matrix loader.
      reportSource("thanks", records);
      renderThanksPanel();
    },
    (error) => {
      console.error("[dashboard:thanks] Failed to load thanks", error);
    },
  );

  renderTabNavigation();
  renderGuestManager();
  renderCabinAssignments();
  renderThanksPanel();

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
    switchTab(tab);
    renderTabNavigation();
  });

  document.querySelector("[data-sign-out]").addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out error", err);
    }
    // Return to the invitation, which will show its own access gate.
    window.location.href = invitationHref();
  });

  // Store unsubs for cleanup
  app._thanksUnsub = thanksUnsub;
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
      // Re-render the attendance summary cards from the live guests.
      renderSummary({
        computeDayConfirmations,
        computeInvitationStats,
        computeDayDistributions,
        computeDayConfirmedGuests,
        computeDayLevelGuests,
      });



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
      // Report the live Firebase Auth user list to the matrix loader.
      reportSource("auth_users", users);
      console.log("[dashboard:auth] listAuthUsers loaded", { count: users.length });
      renderGuestManager();
    })
    .catch((error) => {
      console.error("[dashboard:auth] listAuthUsers failed", error);
    });


}





