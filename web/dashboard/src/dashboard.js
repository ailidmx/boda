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
  getCabinUnitCode,
  getRoomsByCabin,
  getRoomOccupancy,
  getRoomDescription,
  getCabinNames,
} from "./rooms.js";
import { getCabinPhotos, getCabinByDisplayName, cabinPhotoUrl, loadCabins, getAllCabinNames } from "./cabins.js";
import { loadTables } from "./tables.js";
import { renderSpatialEditor, getSeatingAssignments, subscribeSeating } from "./spatialEditor.js";
import { computeSeatingIntegrity } from "./spatial/integrity.js";
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
  rsvpScaleChip as serviceRsvpScaleChip,
  getRsvpBooleanAnswer as serviceGetRsvpBooleanAnswer,
  getRsvpScaleAnswer as serviceGetRsvpScaleAnswer,

  paymentConfirmedChip as servicePaymentConfirmedChip,
  paymentConfirmedIcon as servicePaymentConfirmedIcon,
  computeDayConfirmations as serviceComputeDayConfirmations,
  computeInvitationStats as serviceComputeInvitationStats,
  computeDayDistributions as serviceComputeDayDistributions,
  computeDayConfirmedGuests as serviceComputeDayConfirmedGuests,
  computeDayLevelGuests as serviceComputeDayLevelGuests,



  guestStatusBadge as serviceGuestStatusBadge,

  getUniqueGuestGroups as serviceGetUniqueGuestGroups,
  getGroupAttendanceCounts as serviceGetGroupAttendanceCounts,
  getGroupInvitationBreakdown as serviceGetGroupInvitationBreakdown,
  getUniqueCabins as serviceGetUniqueCabins,

  getFilteredGuests as serviceGetFilteredGuests,
  guestSortValue as serviceGuestSortValue,
  guestAgeGroup as serviceGuestAgeGroup,
  guestHasPhone as serviceGuestHasPhone,
  guestHasPhoto as serviceGuestHasPhoto,
  computeReadiness as serviceComputeReadiness,
} from "./guestService.js";





import { renderGuestManager as renderGuestManagerTable } from "./guestTable.js";
import { openGuestEditor as openGuestEditorModal, openCreateGuestModal as openCreateGuestModalModule } from "./guestFormModal.js";
import { openDeleteConfirm as openDeleteConfirmModule, openSendInviteModal as openSendInviteModalModule } from "./guestModals.js";

import { renderSummary } from "./summary.js";
import { renderCabinAssignments as renderCabinAssignmentsPanel } from "./cabinsPanel.js";
import { renderThanksPanel as renderThanksPanelModule } from "./thanksPanel.js";
import { renderChartsPanel as renderChartsPanelModule } from "./chartsPanel.js";
import { renderProvidersPanel as renderProvidersPanelModule } from "./providersPanel.js";
import { renderTimelinePanel as renderTimelinePanelModule } from "./timelinePanel.js";

import {
  getTabFromPath,
  getActiveTab,
  navigateToTab,
  switchTab,
  renderTabNavigation,
} from "./tabNav.js";

import { updateGuest, softDeleteGuest, createGuest } from "./repositories/guestRepository.js";
import { saveProvider, saveOffer, deleteProvider, deleteOffer } from "./repositories/providerRepository.js";
import { saveLayer as saveLayerRepo, saveSlot as saveSlotRepo, deleteLayer as deleteLayerRepo, deleteSlot as deleteSlotRepo } from "./repositories/timelineRepository.js";

import { createThanks, updateThanks, deleteThanks } from "./repositories/thanksRepository.js";
import { updateRecordField } from "./repositories/recordsRepository.js";
import { renderDataPanel } from "./dataPanel.js";
import { renderCardVotesPanel as renderCardVotesPanelModule } from "./cardVotesPanel.js";

import {
  buildDashboardGuestInlinePayload,
  buildGuestRsvpPayload,
  buildDashboardGuestHostingPayload,
  buildGuestCreatePayload,
  buildGuestFlightInfoPayload,
  buildTimelineLayerPayload,
  buildTimelineSlotPayload,
} from "../../shared/payload-builders.js";

import {
  validateTimelineLayerPayload,
  validateTimelineSlotPayload,
} from "../../shared/validation.js";



import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";


const state = {
  liveGuests: [], // raw Firestore `guests` records (source of truth)
  authUsers: {}, // uid → { email } LIVE Firebase Auth user list (via listAuthUsers callable)
  thanks: [], // from Firestore collection "thanks" (guest + es/fr/en)
  budget: [], // from Firestore collection "budget"
  cardVotes: [], // from Firestore collection "card_votes"
  guisoRankings: [], // from Firestore collection "guiso_rankings"
  songRequests: [], // from Firestore collection "song_requests"
  providers: [], // from Firestore collection "providers"
  offers: [], // from Firestore collection "provider_offers"
  timelineLayers: [], // from Firestore collection "timeline_layers"
  timelineSlots: [], // from Firestore collection "timeline_slots"
  pageViews: [], // from Firestore collection "page_views"
  activityEvents: [], // from Firestore collection "activity_events"
  loginEvents: [], // from Firestore collection "login_events"
  analyticsBreakdown: "pageViews", // which analytics table the sub-nav shows
  filterGroup: "",
  filterQuery: "",
  filterAgeGroup: "",
  filterPhone: "", // "" = all, "with" = has phone, "without" = no phone
  filterEmail: "", // "" = all, "with" = real email, "without" = no real email
  filterPhoto: "", // "" = all, "with" = has photo, "without" = no photo
  filterName: "", // "" = all, "complete" = complete name, "incomplete" = incomplete name
  filterContact: "", // "" = all, "without" = auth user without email/phone
  filterSent: "", // "" = all, "notSent" = invitation has NOT been sent yet
  // Contextual filters shown only while their column group is active
  // (Presencia · Alojamiento / Pétanque / Playa).
  filterAccommodation: "", // "" = all, "yes" = alojamiento confirmado
  filterWaitingList: "", // "" = all, "yes" = en lista de espera
  filterNoCabin: "", // "" = all, "without" = sin cabaña asignada
  filterPayment: "", // "" = all, "yes" = pago confirmado
  filterPetanque: "", // "" = all, "yes" = juega pétanque
  filterBoules: "", // "" = all, "yes" = tiene boules propias
  filterPlaya: "", // "" = all, "yes" = confirmado para la playa (≥4)
  filterTravelsByPlane: "", // "" = all, "yes" = viaja en avión (Vuelos group)
  filterHasFlight: "", // "" = all, "with"/"without" = con/sin datos de vuelo
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
  return serviceGetFilteredGuests(
    getActiveGuests(),
    {
      filterGroup: state.filterGroup,
      filterQuery: state.filterQuery,
      filterAgeGroup: state.filterAgeGroup,
      filterPhone: state.filterPhone,
      filterEmail: state.filterEmail,
      filterPhoto: state.filterPhoto,
      filterName: state.filterName,
      filterContact: state.filterContact,
      filterSent: state.filterSent,
      filterAccommodation: state.filterAccommodation,
      filterWaitingList: state.filterWaitingList,
      filterNoCabin: state.filterNoCabin,
      filterPayment: state.filterPayment,
      filterPetanque: state.filterPetanque,
      filterBoules: state.filterBoules,
      filterPlaya: state.filterPlaya,
      filterTravelsByPlane: state.filterTravelsByPlane,
      filterHasFlight: state.filterHasFlight,
    },
    state.liveGuests,
    state.authUsers,
  );
}




// Readiness breakdown for the summary card (per-group counts of guests missing
// each identity piece). The derivation lives in `guestService.js`; this thin
// adapter binds the dashboard.s live guest cache + auth user map.
function computeReadiness() {
  return serviceComputeReadiness(getActiveGuests(), state.liveGuests, state.authUsers);
}



// ── Live RSVP scale (source of truth: guest.s `rsvp.answers`) ──────────

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

// Badge chip for a boolean RSVP answer (Sí / No / —) — e.g.
// accommodationConfirm, cabinWaitingList, petanqueParticipation,
// petanqueOwnBoules. Reads the guest's `rsvp.answers.<questionId>` (a plain
// 1/2 number) from the live record.
function rsvpBooleanChip(guest, questionId) {
  return serviceRsvpBooleanChip(guest, questionId, state.liveGuests);
}

// Badge chip for a SCALE RSVP answer (0–5) — used for the coast plans
// (`playa`, `rocaAzul`), which are 0–5 likelihood questions, NOT yes/no.
function rsvpScaleChip(guest, questionId) {
  return serviceRsvpScaleChip(guest, questionId, state.liveGuests);
}

// Raw numeric value of a boolean RSVP answer (1 = Sí, 2 = No, 0 = none) read
// from the live record. Used by the inline editable selects in the INVITADOS
// table so the current value is pre-selected.
function rsvpBooleanValue(guest, questionId) {
  return serviceGetRsvpBooleanAnswer(guest, questionId, state.liveGuests);
}

// Raw numeric value of a SCALE RSVP answer (0–5) read from the live record.
// Used by the inline editable selects in the INVITADOS table.
function rsvpScaleValue(guest, questionId) {
  return serviceGetRsvpScaleAnswer(guest, questionId, state.liveGuests);
}



// Badge chip for the top-level `paymentConfirmed` boolean on the guest doc
// (Sí / No / —).
function paymentConfirmedChip(guest) {
  return servicePaymentConfirmedChip(guest);
}

// Compact money-icon badge (💰 / 🚫 / 💸) for the cabin-assignment guest rows.
// Unlike the text "Sí/No/—" chip used in the INVITADOS table, the cabins panel
// uses an explicit emoji so the admin can scan payment status at a glance.
function paymentConfirmedIcon(guest) {
  return servicePaymentConfirmedIcon(guest);
}


// The active guests filtered by the GLOBAL group filter (state.filterGroup).
// The group filter lives in the dashboard header and applies to BOTH the
// attendance summary cards and the INVITADOS table, so every consumer derives
// its guest list from this single filtered source.
function getFilteredActiveGuests() {
  const all = getActiveGuests();
  if (!state.filterGroup) return all;
  return all.filter((g) => g.group === state.filterGroup);
}

// Aggregate confirmed counts per attendance day from the live guests.

function computeDayConfirmations() {
  return serviceComputeDayConfirmations(getFilteredActiveGuests(), state.liveGuests);
}

// Invitation-send stats (sent / total / percentage) for the summary card.
function computeInvitationStats() {
  return serviceComputeInvitationStats(getFilteredActiveGuests());
}

// Seating summary (Mesas tab): seated vs confirmed-Saturday, plus the three
// seating-integrity signals (duplicates + RSVP↔seat mismatches), each with the
// guest list + RSVP-level distribution for the cards.
function guestSummaryForSeating(guestId) {
  const guest = getGuest(guestId);
  if (!guest) return null;
  const level = Number(serviceGetRsvpScaleAnswer(guest, "saturday", state.liveGuests)) || 0;
  return {
    id: guestId,
    name: guestFullName(guest),
    group: guest.group || "Sin grupo",
    avatar: guestAvatarUrl(guest),
    initials: guestInitials(guest),
    level,
  };
}

function seatingCardData(guestIds, label, hint) {
  const guests = guestIds.map(guestSummaryForSeating).filter(Boolean);
  const distribution = [0, 0, 0, 0, 0, 0];
  const levelGuests = [[], [], [], [], [], []];
  for (const g of guests) {
    const lvl = Math.max(0, Math.min(5, g.level));
    distribution[lvl] += 1;
    levelGuests[lvl].push(g);
  }
  return { label, hint, count: guests.length, guests, distribution, levelGuests };
}

function computeSeatingStats() {
  const guests = getActiveGuests();
  const integrity = computeSeatingIntegrity({
    guestAssignments: getSeatingAssignments(),
    allGuests: guests,
    getSaturdayLevel: (g) => serviceGetRsvpScaleAnswer(g, "saturday", state.liveGuests),
  });
  return {
    seated: integrity.seatedCount,
    confirmedSaturday: computeDayConfirmations().saturday,
    cards: [
      seatingCardData(integrity.satYesNoSeat, "Confirmados sin asiento", "Confirmaron el sábado (≥ 4) pero no tienen mesa"),
      seatingCardData(integrity.satNoWithSeat, "Asientos sin confirmar", "Tienen mesa pero no confirmaron el sábado"),
      seatingCardData(integrity.duplicated.map((d) => d.guestId), "Duplicados", "Invitados sentados en más de una mesa"),
    ],
  };
}

// Render the summary cards for the ACTIVE tab: the Mesas editor shows seating
// stats; every other tab shows the default invitations + day cards.
function renderSummaryForTab() {
  if (getActiveTab() === "tables") {
    renderSummary({ seating: computeSeatingStats() });
    return;
  }
  renderSummary({
    computeDayConfirmations,
    computeInvitationStats,
    computeDayDistributions,
    computeDayConfirmedGuests,
    computeDayLevelGuests,
  });
}

// Per-day RSVP scale distribution (0–5) for the summary cards.
function computeDayDistributions() {
  return serviceComputeDayDistributions(getFilteredActiveGuests(), state.liveGuests);
}

// Per-day list of CONFIRMED guests (RSVP level ≥ 4) for the clickable stacked
// avatars + full-screen modal on each day summary card.
function computeDayConfirmedGuests() {
  return serviceComputeDayConfirmedGuests(getFilteredActiveGuests(), state.liveGuests);
}

// Per-day, per-level list of guests for EVERY RSVP level (0–5). Used to make
// each segment of the distribution bar clickable so the admin can open a modal
// listing exactly who answered 0, 1, 2, 3, 4 or 5 for that day.
function computeDayLevelGuests() {
  return serviceComputeDayLevelGuests(getFilteredActiveGuests(), state.liveGuests);
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

// Persist a guest's cabin/room assignment for one period via the shared
// hosting payload builder (writes `hosting.cabin`/`hosting.room` for the
// primary period, or `hosting.xtraCabin`/`hosting.xtraRoom` for the extra
// coast period). Reads the CURRENT hosting from the LIVE record so the other
// period's fields and the payment flags are preserved. `cabinUnit` is the
// internal unit code (e.g. "madera_33"); `roomId` is the room id (e.g.
// "CABAÑA 3-1"). Passing an empty string clears that field (sets it to null).
async function saveGuestHosting(guestId, period, cabinUnit, roomId) {
  try {
    const isExtra = period === "extra";
    const cabinKey = isExtra ? "xtraCabin" : "cabin";
    const roomKey = isExtra ? "xtraRoom" : "room";
    const currentHosting = getLiveHosting(guestId);
    const hosting = {
      ...currentHosting,
      [cabinKey]: cabinUnit || null,
      [roomKey]: roomId || null,
    };
    const payload = buildDashboardGuestHostingPayload({
      guestId,
      hosting,
      editorGuestId: getCurrentUserId(),
      timestamp: serverTimestamp(),
    });
    await updateGuest(guestId, payload);
    // Update the in-memory guest so the re-render reflects the change
    // immediately (the live onSnapshot listener will also refresh it).
    const guest = getGuest(guestId);
    if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
    return true;
  } catch (err) {
    console.error("Failed to save guest hosting", err);
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

// The "✏️ Editar" modal (tabbed form) lives in `guestFormModal.js`. This thin
// adapter injects the dashboard's module-scope save functions so the modal stays
// a pure presentation module that never touches Firestore directly.
function openGuestEditor(guest) {
  openGuestEditorModal(guest, {
    getGuest,
    getActiveGuests,
    guestAvatarUrl,
    guestInitials,
    getAuthEmail,
    saveGuestInline,
    saveGuestEmail,
    saveGuestRsvpAnswer,
    saveGuestHosting,
    saveGuestFlightInfo,
    getCabinNames,
    getCabinDisplayName,
    getCabinUnitCode,
    getRoomsByCabin,
    getInvitationGroupOptions,
    getGroupOptions,
    renderGuestManager,
  });
}


// ── Inline save helper ─────────────────────────────────────────────────

// AGREED SCHEMA: Only these fields may be written to the `guests` collection
// from the client. Everything else (group, hasCabin, unit, occupancy, payment,
// cabinLabel, room, customContent) is static data from the sheet and must be
// edited there, not in Firestore.
const GUEST_WRITABLE_FIELDS = new Set([
  "firstName", "middleName", "lastName", "maternalLastName", "phone", "idCheckUser", "cloudinaryId",
  "gender", "age", "message", "invitationGroup", "invitationSent", "_deleted", "travelsByPlane",
  "group", "tagGroup", "lang", "paymentConfirmed",
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
      if (["firstName", "middleName", "lastName", "maternalLastName", "phone", "gender", "age", "message", "lang"].includes(field)) {
        guest.identity = { ...(guest.identity || {}), [field]: value };
      }

      // `travelsByPlane` is a top-level boolean; the inline editor sends
      // "true" / "false" / "" (empty = unknown). Normalize to a real boolean
      // (or undefined when empty) so the in-memory guest matches Firestore.
      if (field === "travelsByPlane") {
        if (value === true || value === "true") guest.travelsByPlane = true;
        else if (value === false || value === "false") guest.travelsByPlane = false;
        else guest.travelsByPlane = undefined;
      } else if (field === "paymentConfirmed") {
        // `paymentConfirmed` is a top-level boolean. Normalize the inline
        // editor's "true"/"false"/"" to a real boolean (or undefined when
        // empty) so the in-memory guest matches Firestore.
        if (value === true || value === "true") guest.paymentConfirmed = true;
        else if (value === false || value === "false") guest.paymentConfirmed = false;
        else guest.paymentConfirmed = undefined;
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

// The guest's Firebase Auth login email (used to pre-fill the editor's "Correo
// de acceso" field). Mirrors the identity column, which shows the auth email.
function getAuthEmail(guestId) {
  return state.authUsers[guestId]?.email || "";
}

// Persist a guest's flight info (the Vuelos column group). Builds the full
// `flightInfo` map directly (NOT via `buildGuestFlightInfoPayload`, which
// OMITS empty fields and therefore can't clear a previously-set value). An
// unchanged IATA code reuses the existing airport object so name/city/country
// survive; a newly-typed code builds a minimal `{ iata, name, countryCode }`.
async function saveGuestFlightInfo(guestId, raw) {
  const guest = getGuest(guestId);
  const existing = guest?.flightInfo || {};
  const existingDep = existing.departure || {};

  const str = (v) => String(v || "").trim();
  const airport = (iata, prev) => {
    const code = String(iata || "").trim().toUpperCase();
    if (!code) return null;
    if (prev && String(prev.iata || "").toUpperCase() === code) return prev;
    return { iata: code, name: code, countryCode: "" };
  };
  const connections = (list, prevList) =>
    String(list || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      .map((code) => (prevList || []).find((p) => String(p.iata || "").toUpperCase() === code) || { iata: code, name: code, countryCode: "" });

  const dep = {
    origin: airport(raw.depOriginIata, existingDep.origin),
    destination: airport(raw.depDestinationIata, existingDep.destination),
    connections: connections(raw.depConnections, existingDep.connections),
    departureDate: str(raw.departureDate) || null,
    departureTime: str(raw.departureTime) || null,
    finalFlightNumber: str(raw.depFlightNumber) || null,
  };
  const hasDep = Object.values(dep).some((x) => (Array.isArray(x) ? x.length > 0 : Boolean(x)));

  const flightInfo = {
    origin: airport(raw.originIata, existing.origin),
    destination: airport(raw.destinationIata, existing.destination),
    connections: connections(raw.connections, existing.connections),
    arrivalDate: str(raw.arrivalDate) || null,
    arrivalTime: str(raw.arrivalTime) || null,
    finalFlightNumber: str(raw.finalFlightNumber) || null,
    departure: hasDep ? dep : null,
  };

  await updateGuest(guestId, {
    guestId,
    flightInfo,
    updatedBy: getCurrentUserId(),
    updatedAt: serverTimestamp(),
  });
  return true;
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

// Deterministic pastel color for a group badge. Hashes the group name so the
// same group always gets the same soft background + readable dark text.
function groupBadgeStyle(name) {
  const key = String(name || "").toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `background: hsl(${hue} 55% 88%); color: hsl(${hue} 45% 22%); border-color: hsl(${hue} 45% 72%);`;
}

// Shared markup for a group tag cell: a colored badge showing the current value
// plus a compact dropdown to change it. The dropdown lists every existing group
// plus a "＋ Nuevo grupo…" option that reveals a small free-text input to create
// a brand-new group. `data-*` attributes are keyed by guest id so the event
// handlers in `guestTable.js` can wire them up.
function groupTagCell(guest, { current, options, badgeAttr, selectAttr, newAttr, cellAttr, title }) {
  const selectOptions = [
    `<option value="">— Sin grupo —</option>`,
    ...options.map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`),
    `<option value="__new__">＋ Nuevo grupo…</option>`,
  ].join("");
  return `
    <div class="dashboard-group-cell" data-${cellAttr}="${guest.id}">
      <button type="button" class="dashboard-group-badge" data-${badgeAttr}="${guest.id}" style="${groupBadgeStyle(current)}" title="${title}">${current || "—"}</button>
      <span class="dashboard-group-editor" data-${selectAttr}-editor="${guest.id}" hidden>
        <select class="dashboard-group-inline-select" data-${selectAttr}="${guest.id}" title="${title}">
          ${selectOptions}
        </select>
        <button type="button" class="dashboard-inline-btn dashboard-inline-btn--confirm" data-${selectAttr}-confirm="${guest.id}" title="Guardar">✓</button>
        <button type="button" class="dashboard-inline-btn dashboard-inline-btn--cancel" data-${selectAttr}-cancel="${guest.id}" title="Cancelar">✕</button>
        <input class="dashboard-group-new" data-${newAttr}="${guest.id}" type="text" placeholder="Nuevo grupo…" hidden />
      </span>
    </div>`;
}

// Cell for the "Invitación" column: a colored badge + dropdown to change the
// guest's invitation group (rename or pick another existing group).
const invitationGroupCell = (guest) => {
  const current = guest.invitationGroup || "";
  return groupTagCell(guest, {
    current,
    options: getInvitationGroupOptions(),
    badgeAttr: "invgroup-badge",
    selectAttr: "invgroup-select",
    newAttr: "invgroup-new",
    cellAttr: "invgroup-cell",
    title: "Cambiar grupo de invitación",
  });
};


// ── GRUPO column (internal group / tagGroup) ──────────────────────────

// Distinct internal group values currently used by guests (the source of truth
// for the GRUPO column dropdown). Mirrors `getInvitationGroupOptions`.
function getGroupOptions() {
  const names = new Set();
  getActiveGuests().forEach((g) => {
    if (g.group) names.add(g.group);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

// Change a guest's internal group (`tagGroup`). Saves the new value to this
// guest first, then — if the old group was shared by other guests — asks
// whether to apply the same change to all of them. Mirrors
// `applyInvitationGroupChange`.
async function applyGroupChange(guestId, oldName, newName) {
  const trimmedOld = String(oldName || "").trim();
  const trimmedNew = String(newName || "").trim();
  if (!trimmedNew || trimmedOld === trimmedNew) return;

  const ok = await saveGuestInline(guestId, "tagGroup", trimmedNew);
  if (!ok) return;

  const affected = getActiveGuests().filter(
    (g) => g.id !== guestId && (g.group || "").trim() === trimmedOld,
  );

  if (trimmedOld && affected.length > 0) {
    openConfirmModal({
      title: "Aplicar a todo el grupo",
      message: `¿Quieres actualizar también a los <strong>${affected.length}</strong> invitados que tenían el grupo "<strong>${trimmedOld}</strong>"?`,
      confirmLabel: "Sí, actualizar todos",
      cancelLabel: "Solo este invitado",
      onConfirm: async () => {
        for (const g of affected) {
          await saveGuestInline(g.id, "tagGroup", trimmedNew);
        }
        renderGuestManager();
      },
    });
  }
  renderGuestManager();
}

// Cell for the "GRUPO" column: a colored badge + dropdown to change the guest's
// internal group (`tagGroup`). Mirrors `invitationGroupCell`.
const groupCell = (guest) => {
  const current = guest.group || "";
  return groupTagCell(guest, {
    current,
    options: getGroupOptions(),
    badgeAttr: "group-badge",
    selectAttr: "group-select",
    newAttr: "group-new",
    cellAttr: "group-cell",
    title: "Cambiar grupo",
  });
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

// The "Agregar invitado" modal (tabbed form) lives in `guestFormModal.js`. This
// thin adapter injects the dashboard's module-scope dependencies (repository +
// payload-builder + id helpers + live cache) so the modal stays a pure
// presentation module that never touches Firestore directly.
function openCreateGuestModal() {
  openCreateGuestModalModule({
    createGuest,
    buildGuestCreatePayload,
    buildGuestId,
    uniqueGuestId,
    getActiveGuests,
    getInvitationGroupOptions,
    getGroupOptions,
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

// ── Charts Panel ───────────────────────────────────────────────────────

// The "Gráficas" panel (ECharts visualizations of attendance, RSVP levels,
// per-group confirmations, and identity readiness) lives in `chartsPanel.js`.
// This thin adapter injects the LIVE data derived from the guest cache so the
// panel stays a pure presentation module that never touches Firestore.
function renderChartsPanel() {
  const container = document.querySelector("[data-charts-panel]");
  if (!container) return;
  const readiness = computeReadiness();
  renderChartsPanelModule({
    groupInvitation: serviceGetGroupInvitationBreakdown(getActiveGuests(), state.liveGuests),
    dayConfirmations: computeDayConfirmations(),
    dayDistributions: computeDayDistributions(),
    readiness: readiness._all || readiness,
    groups: getUniqueGuestGroups(),
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
    rsvpScaleChip,
    rsvpBooleanValue,
    rsvpScaleValue,
    paymentConfirmedChip,
    guestSortValue,

    GUEST_SORT_COLUMNS,
    saveGuestInline,
    saveGuestEmail,
    saveGuestRsvpAnswer,
    saveGuestHosting,
    getCabinNames,
    getCabinDisplayName,
    getCabinUnitCode,
    getRoomsByCabin,
    openGuestEditor,

    openCreateGuestModal,
    openSendInviteModal,
    openDeleteConfirm,

    applyInvitationGroupChange,
    getInvitationGroupOptions,
    invitationGroupCell,
    applyGroupChange,
    getGroupOptions,
    groupCell,
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
    guestHasPhone: serviceGuestHasPhone,
    guestHasPhoto: serviceGuestHasPhoto,
    computeReadiness,
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
    getCabinByDisplayName,
    getAllCabinNames,
    cabinPhotoUrl,
    guestAvatarUrl,
    guestFullName,
    getInviteUrl,
    getRsvpAnswers: getLiveRsvpAnswers,
    BOOLEAN_YES: 1,
    BOOLEAN_NO: 2,
    RSVP_CONFIRMED_MIN_LEVEL,
    paymentConfirmedIcon,
    buildHostingPayload: buildDashboardGuestHostingPayload,
    updateGuest,
    getCurrentUserId,
    serverTimestamp,
    traceFirebase,
    showToast,
  });
}


// ── Spatial event-layout editor (zones, catalog, seating, connections) ──
function renderSpatialPlan() {
  const container = document.querySelector("[data-spatial-editor]");
  if (!container) return;
  renderSpatialEditor(container);
}

// ── Data record panels (budget / votes / rankings / song requests) ──────
// Each is a generic inline-editable AG Grid table over a flat Firestore
// collection. `updateRecordField` (recordsRepository) merges a single field
// back to Firestore on every cell edit. Timestamp + nested-map fields are
// flattened to readable strings so the generic panel never has to know about
// Firestore types.

const ts = (v) => {
  if (!v) return "";
  if (v && typeof v === "object" && "toDate" in v) return v.toDate().toLocaleString();
  if (v && typeof v === "object" && v.seconds != null) {
    return new Date(v.seconds * 1000).toLocaleString();
  }
  return String(v);
};
const meta = (rec, field, sub) => (rec?.[field] && typeof rec[field] === "object" ? rec[field][sub] : undefined);

function renderBudgetPanel() {
  renderDataPanel({
    container: document.querySelector("[data-budget-manager]"),
    collection: collections.budget,
    records: state.budget.map((r) => ({ ...r, paidDate: ts(r.paidDate) })),
    columns: [
      { field: "item", label: "Concepto" },
      { field: "totalMxn", label: "Total (MXN)", type: "number" },
      { field: "approxMxn", label: "Aprox (MXN)", type: "number" },
      { field: "paidMxn", label: "Pagado (MXN)", type: "number" },
      { field: "paidBy", label: "Pagado por" },
      { field: "paidDate", label: "Fecha pago" },
      { field: "estimatedCount", label: "Estimados", type: "number" },
      { field: "confirmedCount", label: "Confirmados", type: "number" },
      { field: "aydeAmount", label: "Aydé (MXN)", type: "number" },
      { field: "aydePct", label: "Aydé %", type: "number" },
      { field: "davidAmount", label: "David (MXN)", type: "number" },
      { field: "davidPct", label: "David %", type: "number" },
    ],
    updateField: updateRecordField,
    emptyText: "No hay partidas de presupuesto.",
    onAfterEdit: renderBudgetPanel,
  });
}

function renderCardVotesPanel() {
  const container = document.querySelector("[data-card-votes-manager]");
  if (!container) return;
  renderCardVotesPanelModule({
    container,
    votes: state.cardVotes,
    guests: getActiveGuests(),
    guestAvatarUrl,
    guestFullName,
    guestInitials,
  });
}

function renderProvidersPanel() {
  const container = document.querySelector("[data-providers-manager]");
  if (!container) return;
  renderProvidersPanelModule({
    container,
    providers: state.providers,
    offers: state.offers,
    saveProvider,
    saveOffer,
    deleteProvider,
    deleteOffer,
  });
}

// ── Timeline (layers + slots) ───────────────────────────────────────────
// The timeline panel is presentation-only. These wrappers build the payload via
// the shared payload-builders (with a server timestamp), validate it against
// the same rules the Firestore rules mirror, and persist through the repository.

function saveTimelineLayer(raw) {
  const payload = { id: raw.id, ...buildTimelineLayerPayload({ ...raw, timestamp: serverTimestamp() }) };
  const result = validateTimelineLayerPayload(payload);
  if (!result.valid) throw new Error(`Capa inválida: ${result.errors.join("; ")}`);
  return saveLayerRepo(payload);
}

function saveTimelineSlot(raw) {
  const payload = { id: raw.id, ...buildTimelineSlotPayload({ ...raw, timestamp: serverTimestamp() }) };
  const result = validateTimelineSlotPayload(payload);
  if (!result.valid) throw new Error(`Actividad inválida: ${result.errors.join("; ")}`);
  return saveSlotRepo(payload);
}

function renderTimelinePanel() {
  const container = document.querySelector("[data-timeline-manager]");
  if (!container) return;
  renderTimelinePanelModule({
    container,
    layers: state.timelineLayers,
    slots: state.timelineSlots,
    offers: state.offers,
    saveLayer: saveTimelineLayer,
    saveSlot: saveTimelineSlot,
    deleteLayer: deleteLayerRepo,
    deleteSlot: deleteSlotRepo,
  });
}

function renderGuisoRankingsPanel() {
  renderDataPanel({
    container: document.querySelector("[data-guiso-rankings-manager]"),
    collection: collections.guisoRankings,
    records: state.guisoRankings.map((r) => ({ ...r, updatedAt: ts(r.updatedAt) })),
    columns: [
      { field: "guestId", label: "Invitado" },
      { field: "selected", label: "Seleccionados (menú)", type: "array" },
      { field: "ranking", label: "Ranking completo", type: "array" },
    ],
    updateField: updateRecordField,
    emptyText: "No hay rankings de guisos.",
    onAfterEdit: renderGuisoRankingsPanel,
  });
}

function renderSongRequestsPanel() {
  renderDataPanel({
    container: document.querySelector("[data-song-requests-manager]"),
    collection: collections.songRequests,
    records: state.songRequests.map((r) => ({
      ...r,
      updatedAt: ts(r.updatedAt),
      title: meta(r, "songMeta", "title"),
      artist: meta(r, "songMeta", "artist"),
      year: meta(r, "songMeta", "year"),
    })),
    columns: [
      { field: "guestId", label: "Invitado" },
      { field: "song", label: "Canción" },
      { field: "title", label: "Título (meta)" },
      { field: "artist", label: "Artista (meta)" },
      { field: "intent", label: "Intención" },
      { field: "bandType", label: "Agrupación" },
      { field: "assignedGuestId", label: "Asignado a" },
    ],
    updateField: updateRecordField,
    emptyText: "No hay peticiones de canciones.",
    onAfterEdit: renderSongRequestsPanel,
  });
}

// ── Analytics record panels (page views / activity / login events) ─────
// One "Analítica" page with a button-group sub-nav switching between three
// generic inline-editable AG Grid tables over the three analytics collections.
// These are read-mostly (a row is an event), but the generic panel still allows
// inline edits via `updateRecordField` where sensible.

function renderPageViewsPanel() {
  renderDataPanel({
    container: document.querySelector("[data-analytics-pageviews]"),
    collection: collections.pageViews,
    records: state.pageViews.map((r) => ({ ...r, createdAt: ts(r.createdAt) })),
    columns: [
      { field: "guestId", label: "Invitado" },
      { field: "sectionId", label: "Sección" },
      { field: "navigationType", label: "Tipo navegación" },
      { field: "createdAt", label: "Momento" },
    ],
    updateField: updateRecordField,
    emptyText: "Aún no hay vistas de sección.",
    onAfterEdit: renderPageViewsPanel,
  });
}

function renderActivityEventsPanel() {
  renderDataPanel({
    container: document.querySelector("[data-analytics-activity]"),
    collection: collections.activityEvents,
    records: state.activityEvents.map((r) => ({ ...r, createdAt: ts(r.createdAt) })),
    columns: [
      { field: "guestId", label: "Invitado" },
      { field: "type", label: "Tipo" },
      { field: "idleSeconds", label: "Inactivo (s)", type: "number" },
      { field: "createdAt", label: "Momento" },
    ],
    updateField: updateRecordField,
    emptyText: "Aún no hay eventos de inactividad.",
    onAfterEdit: renderActivityEventsPanel,
  });
}

function renderLoginEventsPanel() {
  renderDataPanel({
    container: document.querySelector("[data-analytics-login]"),
    collection: collections.loginEvents,
    records: state.loginEvents.map((r) => ({ ...r, createdAt: ts(r.createdAt) })),
    columns: [
      { field: "guestId", label: "Invitado" },
      { field: "username", label: "Usuario" },
      { field: "source", label: "Canal" },
      { field: "medium", label: "Medio" },
      { field: "campaign", label: "Campaña" },
      { field: "timeToAnswer", label: "Respuesta (s)", type: "number" },
      { field: "createdAt", label: "Momento" },
    ],
    updateField: updateRecordField,
    emptyText: "Aún no hay inicios de sesión.",
    onAfterEdit: renderLoginEventsPanel,
  });
}

// Render the "Analítica" button-group sub-nav and toggle which table is visible.
function renderAnalyticsSubnav() {
  const nav = document.querySelector("[data-analytics-subnav]");
  if (!nav) return;
  const items = [
    { key: "pageViews", label: "Vistas de sección" },
    { key: "activityEvents", label: "Inactividad" },
    { key: "loginEvents", label: "Inicios de sesión" },
  ];
  const active = state.analyticsBreakdown || "pageViews";

  nav.innerHTML = items
    .map(
      ({ key, label }) => `
      <button
        class="dashboard-button ${key === active ? "dashboard-button" : "dashboard-button-secondary"}"
        type="button"
        data-analytics-tab="${key}"
        aria-pressed="${key === active}"
      >${label}</button>`,
    )
    .join("");

  // Toggle table visibility.
  const toggleTable = (sel, show) => {
    const wrap = document.querySelector(sel)?.closest(".dashboard-analytics-table");
    if (wrap) wrap.hidden = !show;
  };
  toggleTable("[data-analytics-pageviews]", active === "pageViews");
  toggleTable("[data-analytics-activity]", active === "activityEvents");
  toggleTable("[data-analytics-login]", active === "loginEvents");

  nav.querySelectorAll("[data-analytics-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.analyticsBreakdown = btn.dataset.analyticsTab;
      renderAnalyticsSubnav();
    });
  });
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

// ── Global group filter (header) ───────────────────────────────────────

// Render the group filter as a custom SELECT-style dropdown into the header's
// `[data-group-filter]` container. The filter is GLOBAL: it applies to BOTH the
// attendance summary cards and the INVITADOS table. The trigger shows the active
// group (or "Todos") with a caret; the opened menu lists every group with its
// confirmed-Saturday / size counts ("X/Y" via `getGroupAttendanceCounts`).
// Selecting an option sets `state.filterGroup` and dispatches
// `dashboard:groupchange` so the summary + guest manager re-render. A leading
// "Todos" option clears the filter.
function renderGroupFilter() {
  const container = document.querySelector("[data-group-filter]");
  if (!container) return;

  const groups = getUniqueGuestGroups();
  const counts = getGroupAttendanceCounts();
  const active = state.filterGroup;

  const activeLabel = active || "Todos";
  const activeStats = active && counts[active]
    ? `${counts[active].confirmedSaturday}/${counts[active].size}`
    : "";
  const activeBadgeStyle = active ? groupBadgeStyle(active) : "";

  container.innerHTML = `
    <div class="dashboard-group-select">
      <button
        class="dashboard-group-select-trigger"
        data-group-select-trigger
        type="button"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="dashboard-group-select-trigger-label ${activeBadgeStyle ? "dashboard-group-trigger-badge" : ""}" data-group-select-trigger-label style="${activeBadgeStyle}" title="${activeLabel}">${activeLabel}</span>
        <span class="dashboard-group-select-caret" aria-hidden="true">▾</span>
      </button>

      <div class="dashboard-group-select-menu" role="listbox" aria-label="Filtrar por grupo">
        <button
          class="dashboard-group-select-option ${active ? "" : "is-active"}"
          data-group-select-option=""
          role="option"
          aria-selected="${active ? "false" : "true"}"
          type="button"
        >
          <span class="dashboard-group-select-option-name">Todos</span>
          <span class="dashboard-group-select-option-stats"></span>
        </button>
        ${groups
          .map(
            (group) => `
          <button
            class="dashboard-group-select-option ${active === group ? "is-active" : ""}"
            data-group-select-option="${group}"
            role="option"
            aria-selected="${active === group ? "true" : "false"}"
            type="button"
          >
            <span class="dashboard-group-select-option-name">${group}</span>
            <span class="dashboard-group-select-option-stats">${counts[group] ? `${counts[group].confirmedSaturday}/${counts[group].size}` : ""}</span>
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  const select = container.querySelector(".dashboard-group-select");
  const trigger = container.querySelector("[data-group-select-trigger]");
  const menu = container.querySelector(".dashboard-group-select-menu");

  // Toggle the dropdown open/closed.
  const closeMenu = () => {
    select.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !select.classList.contains("is-open");
    select.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  // Close when clicking outside the dropdown.
  document.addEventListener("click", (e) => {
    if (select && !select.contains(e.target)) closeMenu();
  });

  // Close on Escape.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Selecting an option applies the filter and closes the menu.
  menu.querySelectorAll("[data-group-select-option]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filterGroup = btn.dataset.groupSelectOption || "";
      renderGroupFilter();
      window.dispatchEvent(new CustomEvent("dashboard:groupchange"));
    });
  });
}


// ── Main dashboard render ──────────────────────────────────────────────


function renderDashboard(app) {
  document.title = "Panel de los novios · David & Aydé";
  app.innerHTML = `
    <main class="dashboard">
      <header class="dashboard-header">
        <div class="dashboard-header-title">
          <h1>Panel de los novios</h1>
        </div>

        <!-- ── Nav (links) + global group filter on the same line ── -->
        <div class="dashboard-header-navrow">
          <nav class="dashboard-tabs" data-dashboard-tabs aria-label="Secciones del panel"></nav>
          <div class="dashboard-header-filter" data-group-filter aria-label="Filtrar por grupo"></div>
        </div>

        <!-- ── Account menu: Ver invitación + Salir ── -->
        <div class="dashboard-account-menu" data-account-menu>
          <button class="dashboard-account-trigger" type="button" data-account-trigger aria-haspopup="true" aria-expanded="false" title="Opciones de cuenta">
            <span class="dashboard-account-trigger-label">Cuenta</span>
            <span class="dashboard-account-caret">▾</span>
          </button>
          <div class="dashboard-account-menu-panel" data-account-menu-panel hidden>
            <a class="dashboard-account-item" href="${invitationHref()}">Ver invitación</a>
            <button class="dashboard-account-item" type="button" data-sign-out>Salir</button>
          </div>
        </div>

      </header>




      <p class="dashboard-status" data-dashboard-status></p>

      <section class="dashboard-summary" data-dashboard-summary aria-label="Resumen"></section>


      <!-- ── Panel: Guests ── -->
      <section class="dashboard-panel" data-dashboard-panel="guests">
        <div class="dashboard-section">
          <div class="dashboard-section-heading dashboard-section-heading--sticky">
            <div class="dashboard-section-heading-title">
              <p class="dashboard-eyebrow">Gestión de invitados</p>
              <h2>Invitados</h2>
            </div>
            <div class="dashboard-column-group-nav" data-column-group-nav></div>
          </div>
          <div data-guest-manager></div>
        </div>
      </section>

      <!-- ── Panel: Charts ── -->
      <section class="dashboard-panel" data-dashboard-panel="charts">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Visualización de datos</p>
              <h2>Gráficas</h2>
            </div>
          </div>
          <div data-charts-panel></div>
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
          <div data-spatial-editor></div>
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

      <!-- ── Panel: Budget ── -->
      <section class="dashboard-panel" data-dashboard-panel="budget">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Presupuesto del evento</p>
              <h2>Presupuesto</h2>
            </div>
          </div>
          <div data-budget-manager></div>
        </div>
      </section>

      <!-- ── Panel: Providers ── -->
      <section class="dashboard-panel" data-dashboard-panel="providers">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Proveedores y ofertas</p>
              <h2>Proveedores</h2>
            </div>
          </div>
          <div data-providers-manager></div>
        </div>
      </section>

      <!-- ── Panel: Timeline ── -->
      <section class="dashboard-panel" data-dashboard-panel="timeline">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Programa del evento por capas</p>
              <h2>Timeline</h2>
            </div>
          </div>
          <div data-timeline-manager></div>
        </div>
      </section>

      <!-- ── Panel: Card votes ── -->
      <section class="dashboard-panel" data-dashboard-panel="cardVotes">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Votos de tarjetas (comida / música)</p>
              <h2>Votos</h2>
            </div>
          </div>
          <div data-card-votes-manager></div>
        </div>
      </section>

      <!-- ── Panel: Guiso rankings ── -->
      <section class="dashboard-panel" data-dashboard-panel="guisoRankings">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Rankings de guisos</p>
              <h2>Guisos</h2>
            </div>
          </div>
          <div data-guiso-rankings-manager></div>
        </div>
      </section>

      <!-- ── Panel: Song requests ── -->
      <section class="dashboard-panel" data-dashboard-panel="songRequests">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Peticiones de canciones</p>
              <h2>Canciones</h2>
            </div>
          </div>
          <div data-song-requests-manager></div>
        </div>
      </section>

      <!-- ── Panel: Analytics ── -->
      <section class="dashboard-panel" data-dashboard-panel="analytics">
        <div class="dashboard-section">
          <div class="dashboard-section-heading">
            <div>
              <p class="dashboard-eyebrow">Analítica de uso</p>
              <h2>Analítica</h2>
            </div>
          </div>
          <div class="dashboard-analytics-subnav" data-analytics-subnav></div>
          <div class="dashboard-analytics-table" data-analytics-table="pageViews">
            <div data-analytics-pageviews></div>
          </div>
          <div class="dashboard-analytics-table" data-analytics-table="activityEvents" hidden>
            <div data-analytics-activity></div>
          </div>
          <div class="dashboard-analytics-table" data-analytics-table="loginEvents" hidden>
            <div data-analytics-login></div>
          </div>
        </div>
      </section>

    </main>
  `;

  // ── Sticky header: collapse to a thin bar on scroll ──
  // The "Panel de los novios" header is sticky (see `_layout.scss`). When the
  // user scrolls down we add `.is-scrolled`, which shrinks the hero band into a
  // slim bar (smaller title, hidden eyebrow, tighter padding + shadow). Scrolling
  // back to the top removes the class and restores the full hero.
  const headerEl = app.querySelector(".dashboard-header");
  const onScroll = () => {
    if (!headerEl) return;
    headerEl.classList.toggle("is-scrolled", window.scrollY > 10);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // set the correct initial state (e.g. on a deep-linked reload)
  app._onHeaderScroll = onScroll;

  // Expose the sticky header's height as a CSS variable so section-level
  // sticky toolbars (the column-group nav) can offset below it reliably
  // regardless of the thin/collapsed header state on scroll.
  const setHeaderH = () => {
    const h = headerEl ? headerEl.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--dashboard-header-h", `${Math.ceil(h)}px`);
  };
  setHeaderH();
  window.addEventListener("resize", setHeaderH);
  app._onHeaderResize = setHeaderH;

  // ── Account menu (Ver invitación + Salir) toggle ──
  // The "Cuenta" trigger in the header opens a small dropdown with the
  // "Ver invitación" link and the "Salir" button. Clicking the trigger toggles
  // it; clicking outside or pressing Escape closes it.
  const accountMenu = app.querySelector("[data-account-menu]");
  const accountTrigger = app.querySelector("[data-account-trigger]");
  const accountPanel = app.querySelector("[data-account-menu-panel]");
  // Show/hide the panel by toggling its `hidden` attribute (the panel's
  // visibility is driven by `hidden`, NOT the `is-open` class — there is no CSS
  // for `.is-open` on the panel). `is-open` is kept in sync only as a hook.
  const setAccountMenu = (open) => {
    accountMenu?.classList.toggle("is-open", open);
    if (accountPanel) accountPanel.hidden = !open;
    accountTrigger?.setAttribute("aria-expanded", String(open));
  };
  const closeAccountMenu = () => setAccountMenu(false);
  accountTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    setAccountMenu(!accountMenu.classList.contains("is-open"));
  });
  document.addEventListener("click", (e) => {
    if (accountMenu && !accountMenu.contains(e.target)) closeAccountMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAccountMenu();
  });


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

  // ── Real-time listeners for the record collections ──
  // Each is a flat Firestore collection shown as an inline-editable AG Grid
  // table. The onSnapshot populates `state.*` and re-renders its panel; a cell
  // edit writes a single field back via `updateRecordField` and the listener
  // refreshes the table.

  const subscribeCollection = (collectionName, stateKey, sourceName, renderFn) => {
    return onSnapshot(
      query(collection(db, collectionName), limit(DASHBOARD_QUERY_LIMIT)),
      (snapshot) => {
        const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        state[stateKey] = records;
        reportSource(sourceName, records);
        renderFn();
      },
      (error) => {
        // Still report the source as done (0 docs) so the matrix loader never
        // hangs on a collection whose read failed (e.g. a missing rules block).
        console.error(`[dashboard:${stateKey}] Failed to load ${collectionName}`, error);
        reportSource(sourceName, []);
      },
    );
  };

  const budgetUnsub = subscribeCollection(collections.budget, "budget", "budget", renderBudgetPanel);
  const cardVotesUnsub = subscribeCollection(collections.cardVotes, "cardVotes", "card_votes", renderCardVotesPanel);
  const guisoRankingsUnsub = subscribeCollection(collections.guisoRankings, "guisoRankings", "guiso_rankings", renderGuisoRankingsPanel);
  const songRequestsUnsub = subscribeCollection(collections.songRequests, "songRequests", "song_requests", renderSongRequestsPanel);
  const pageViewsUnsub = subscribeCollection(collections.pageViews, "pageViews", "page_views", renderPageViewsPanel);
  const activityEventsUnsub = subscribeCollection(collections.activityEvents, "activityEvents", "activity_events", renderActivityEventsPanel);
  const loginEventsUnsub = subscribeCollection(collections.loginEvents, "loginEvents", "login_events", renderLoginEventsPanel);
  const providersUnsub = subscribeCollection(collections.providers, "providers", "providers", renderProvidersPanel);
  const offersUnsub = subscribeCollection(collections.providerOffers, "offers", "provider_offers", renderProvidersPanel);
  const timelineLayersUnsub = subscribeCollection(collections.timelineLayers, "timelineLayers", "timeline_layers", renderTimelinePanel);
  const timelineSlotsUnsub = subscribeCollection(collections.timelineSlots, "timelineSlots", "timeline_slots", renderTimelinePanel);

  renderTabNavigation();
  renderGroupFilter();
  renderGuestManager();
  renderCabinAssignments();
  renderThanksPanel();
  renderChartsPanel();
  renderSpatialPlan();
  renderBudgetPanel();
  renderProvidersPanel();
  renderTimelinePanel();
  renderCardVotesPanel();
  renderGuisoRankingsPanel();
  renderSongRequestsPanel();
  renderPageViewsPanel();
  renderActivityEventsPanel();
  renderLoginEventsPanel();
  renderAnalyticsSubnav();


  // ── Re-render the charts panel when the "Gráficas" tab becomes visible ──
  // ECharts initializes with the container's current size. If the charts panel
  // is hidden (display:none) when `renderChartsPanel()` first runs (the default
  // tab is "guests"), the charts initialize at 0×0 and stay empty. Re-render
  // them whenever the charts tab is activated so they size to the now-visible
  // container. `switchTab` dispatches `dashboard:tabchange` on every tab switch.
  const onTabChange = (event) => {
    const tab = event.detail?.tab;
    // Reset the INVITADOS table filters (query / age / phone / email / photo /
    // name / contact / column group) when leaving the guests view. The GLOBAL
    // group filter (`state.filterGroup`) is intentionally NOT reset here — it
    // lives in the header and applies to BOTH the attendance summary cards and
    // the INVITADOS table, so it persists across tabs.
    if (tab && tab !== "guests") {
      state.filterQuery = "";
      state.filterAgeGroup = "";
      state.filterPhone = "";
      state.filterEmail = "";
      state.filterPhoto = "";
      state.filterName = "";
      state.filterContact = "";
      state.columnGroup = "identity";
      state.filterAccommodation = "";
      state.filterWaitingList = "";
      state.filterNoCabin = "";
      state.filterPayment = "";
      state.filterPetanque = "";
      state.filterBoules = "";
      state.filterPlaya = "";
      state.filterTravelsByPlane = "";
      state.filterHasFlight = "";
    }
    if (tab === "charts") renderChartsPanel();
    // The summary cards are contextual: re-render for the new active tab.
    renderSummaryForTab();
  };
  window.addEventListener("dashboard:tabchange", onTabChange);
  app._onTabChange = onTabChange;

  // ── Global group filter: re-render the summary + guest manager ──
  // The group filter chips live in the header and dispatch `dashboard:groupchange`
  // when clicked. Re-render the attendance summary cards (which now read the
  // filtered guest list via `getFilteredActiveGuests`) and the INVITADOS table
  // (which already filters by `state.filterGroup`).
  const onGroupChange = () => {
    renderSummaryForTab();
    renderGuestManager();
  };
  window.addEventListener("dashboard:groupchange", onGroupChange);
  app._onGroupChange = onGroupChange;

  // Seating changes in the Mesas editor re-render the summary (seating cards).
  subscribeSeating(() => {
    if (getActiveTab() === "tables") renderSummaryForTab();
  });




  // ── Load rooms from Firestore (source of truth) ──
  loadRooms().then((rooms) => {
    // Report the rooms inventory to the matrix loader.
    reportSource("rooms", rooms || []);
    // Re-render cabin assignments now that room data is available
    renderCabinAssignments();
  });

  // ── Load cabins from Firestore (source of truth for the showcase photos) ──
  // The cabin cards' photo gallery reads `getCabinPhotos()` from the `cabins`
  // collection. Without this call the `CABINS` cache stays empty and no photos
  // render, so we load them and re-render the cabin assignments once ready.
  loadCabins().then((cabins) => {
    reportSource("cabins", cabins || []);
    renderCabinAssignments();
  });

  // ── Load tables from Firestore (source of truth for the seating canvas) ──
  // `loadTables` uses an internal `onSnapshot` listener and reports the tables
  // via the `onLoad` callback (it does not resolve with the array), so we pass
  // the callback here to report the real table count to the matrix loader.
  loadTables((tables) => {
    reportSource("tables", tables || []);
    renderSpatialPlan();
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
  app._budgetUnsub = budgetUnsub;
  app._cardVotesUnsub = cardVotesUnsub;
  app._guisoRankingsUnsub = guisoRankingsUnsub;
  app._songRequestsUnsub = songRequestsUnsub;
  app._pageViewsUnsub = pageViewsUnsub;
  app._activityEventsUnsub = activityEventsUnsub;
  app._loginEventsUnsub = loginEventsUnsub;
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
      // Re-render the (contextual) summary cards from the live guests.
      renderSummaryForTab();



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





