// guestService.js — Stateful guest derivation for the dashboard.
//
// This module holds the guest derivation functions that need LIVE data
// (the raw Firestore `guests` records and the Firebase Auth user map). Unlike
// `guestDomain.js` (pure, stateless), these functions receive their data as
// parameters via dependency injection instead of reading the dashboard's
// mutable `state` object. This keeps them unit-testable and decoupled from the
// dashboard god-file.
//
// The dashboard's `state.liveGuests` / `state.authUsers` are passed in by the
// thin adapter wrappers in `dashboard.js`. Nothing here touches the DOM or
// Firestore directly.

import {
  RSVP_ATTENDANCE_DAYS,
  RSVP_CONFIRMED_MIN_LEVEL,
  DEFAULT_AUTH_EMAIL_DOMAIN,
  guestFullName,
  guestIdentity,
  guestRoom,
  guestAvatarUrl,
  guestInitials,
} from "./guestDomain.js";



// Read the live RSVP answers for a guest from the raw Firestore record.
export function getLiveRsvpAnswers(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  return raw?.rsvp?.answers || guest?.rsvp?.answers || {};
}

// Merge a normalized guest with its raw live Firestore record. Live wins where
// both exist (identity names/photo, hosting incl. xtraCabin/xtraRoom, rsvp).
export function getMergedGuest(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  if (!raw) return guest;
  return {
    ...guest,
    ...raw,
    identity: { ...(guest.identity || {}), ...(raw.identity || {}) },
    hosting: { ...(guest.hosting || {}), ...(raw.hosting || {}) },
    rsvp: { ...(guest.rsvp || {}), ...(raw.rsvp || {}) },
  };
}

// Read the LIVE `hosting` map for a guest directly from the raw Firestore
// records (the source of truth). This is what the cabin-assignment panel uses
// to build the next `hosting` map so it preserves the other period's fields
// and the payment flags. Returns {} when the guest has no live record.
export function getLiveHosting(guestId, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guestId);
  return raw?.hosting || {};
}


// A guest "has a Firebase Auth account" when their RAW live record carries an
// explicit `firebaseEmail` (a real auth account was provisioned for them). The
// normalized `guest.firebaseEmail` always falls back to `id@domain`, so we must
// read the raw record, not the normalized one. Returns the auth email or "".
export function guestAuthEmail(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  return raw?.firebaseEmail || "";
}

// A guest can receive an invitation only if they have a Firebase Auth account
// (either present in the live auth list or carrying an explicit firebaseEmail).
export function guestHasAuth(guest, liveGuests, authUsers) {
  return Boolean(authUsers[guest.id]) || Boolean(guestAuthEmail(guest, liveGuests));
}

// The email we would send an invitation to. Priority: the raw record's
// `firebaseEmail`, then the LIVE Firebase Auth user's email (the same source the
// identity column uses via `authUsers`), then the identity/record email.
export function guestSendEmail(guest, liveGuests, authUsers) {
  return (
    guestAuthEmail(guest, liveGuests) ||
    authUsers[guest.id]?.email ||
    guest.identity?.email ||
    guest.email ||
    ""
  );
}

// The email channel is available whenever the guest has a real (non-default
// domain) email address. We intentionally do NOT require a Firebase Auth
// account here: the couple may want to send an invitation to a guest who has a
// real inbox but hasn't been provisioned an auth account yet.
export function guestCanEmail(guest, liveGuests, authUsers) {
  const email = guestSendEmail(guest, liveGuests, authUsers);
  return Boolean(email) && !email.endsWith(`@${DEFAULT_AUTH_EMAIL_DOMAIN}`);
}

// The WhatsApp channel is available only when the guest is auth'd AND has a
// phone number.
export function guestCanWhatsapp(guest, liveGuests, authUsers) {
  const phone = guest.identity?.phone || guest.phone || "";
  return guestHasAuth(guest, liveGuests, authUsers) && Boolean(phone);
}

// RSVP scale dropdown for a single attendance day. The stored value stays an
// int 0–5 (0 = no answer). The select shows the current level and lets the
// admin pick any level directly (no click-to-cycle). The select's background
// reflects the level: gray = 0 (no answer), amber = 1–3, green = 4–5.
export function rsvpLevelChip(guest, day, liveGuests) {
  const level = getLiveRsvpAnswers(guest, liveGuests)[day];
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

// Read a boolean-map RSVP answer for a guest (e.g. `rsvp.answers.petanqueParticipation[guest.id]`).
// These questions store a per-guest map of `{ guestId → level }` where level is
// 1 (yes) or 2 (no). Returns 0 when the guest has no answer.
export function getRsvpBooleanAnswer(guest, questionId, liveGuests) {
  const answers = getLiveRsvpAnswers(guest, liveGuests);
  const map = answers[questionId] || {};
  const level = Number(map[guest.id]);
  return level === 1 || level === 2 ? level : 0;
}

// Badge chip for a boolean-map RSVP answer (Sí / No / —). Mirrors the scale
// chip styling but for the yes/no questions (accommodationConfirm, petanque,
// playa, rocaAzul).
export function rsvpBooleanChip(guest, questionId, liveGuests) {
  const level = getRsvpBooleanAnswer(guest, questionId, liveGuests);
  if (level === 1) return '<span class="dashboard-badge dashboard-badge-yes">Sí</span>';
  if (level === 2) return '<span class="dashboard-badge dashboard-badge-no">No</span>';
  return '<span class="dashboard-badge dashboard-badge-muted">—</span>';
}

// Badge chip for the `travelsByPlane` boolean (true = flies in). Shows
// "Sí" / "No" / "—" (unknown).
export function travelsByPlaneChip(guest) {
  const v = guest?.travelsByPlane;
  if (v === true) return '<span class="dashboard-badge dashboard-badge-yes">Sí</span>';
  if (v === false) return '<span class="dashboard-badge dashboard-badge-no">No</span>';
  return '<span class="dashboard-badge dashboard-badge-muted">—</span>';
}

// Aggregate confirmed counts per attendance day from the live guests.
export function computeDayConfirmations(activeGuests, liveGuests) {

  const counts = { friday: 0, saturday: 0, sunday: 0 };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      if ((answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL) counts[day] += 1;
    });
  });
  return counts;
}

// Invitation-send stats for the summary card. `total` = all active guests,
// `sent` = those with `invitationSent === true`, `pct` = rounded percentage.
export function computeInvitationStats(activeGuests) {
  const total = activeGuests.length;
  const sent = activeGuests.filter((g) => g.invitationSent === true).length;
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  return { total, sent, pct };
}

// Per-day distribution of the RSVP scale levels (0–5). Returns an object keyed
// by attendance day, each holding an array of 6 counts indexed by level
// (index 0 = no answer, 5 = fully confirmed). Used to render the small
// segmented distribution bar inside each day summary card.
export function computeDayDistributions(activeGuests, liveGuests) {
  const dist = { friday: [0, 0, 0, 0, 0, 0], saturday: [0, 0, 0, 0, 0, 0], sunday: [0, 0, 0, 0, 0, 0] };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      const level = Number(answers[day]) || 0;
      const idx = Math.min(Math.max(level, 0), 5);
      dist[day][idx] += 1;
    });
  });
  return dist;
}

// Per-day list of CONFIRMED guests (RSVP level ≥ RSVP_CONFIRMED_MIN_LEVEL).
// Returns an object keyed by attendance day, each holding an array of guest
// summaries `{ id, name, group, avatar, initials, level }` used to render the
// clickable stacked-avatar strip on each day card and the full-screen modal
// that lists the confirmed guests grouped by group tag. `level` is the guest's
// RSVP scale answer (0–5) for that specific day, so the modal can show exactly
// how strongly each guest confirmed.
export function computeDayConfirmedGuests(activeGuests, liveGuests) {
  const byDay = { friday: [], saturday: [], sunday: [] };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      const level = Number(answers[day]) || 0;
      if (level >= RSVP_CONFIRMED_MIN_LEVEL) {
        byDay[day].push({
          id: guest.id,
          name: guestFullName(guest),
          group: guest.group || "Sin grupo",
          avatar: guestAvatarUrl(guest),
          initials: guestInitials(guest),
          level,
        });
      }
    });
  });
  return byDay;
}




// Status badge derived from the LIVE `rsvp.answers` (confirmed = any day ≥ 4,
// partial = answered but not confirmed, pending = no answers). Returns a plain
// `{ className, text }` descriptor so the caller can wrap it in a DOM element
// (keeps this module DOM-free).
export function guestStatusBadge(guest, liveGuests) {
  const answers = getLiveRsvpAnswers(guest, liveGuests);
  const hasAny = RSVP_ATTENDANCE_DAYS.some((day) => (answers[day] || 0) > 0);
  const confirmed = RSVP_ATTENDANCE_DAYS.some(
    (day) => (answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL,
  );
  if (confirmed) return { className: "dashboard-badge dashboard-badge-yes", text: "✅ Confirmado" };
  if (hasAny) return { className: "dashboard-badge dashboard-badge-maybe", text: "🟡 Parcial" };
  return { className: "dashboard-badge dashboard-badge-pending", text: "Pendiente" };
}

// ── Group / cabin / filter derivations ──────────────────────────────────────
// These were previously inline in `dashboard.js` reading the mutable `state`
// object. They are now dependency-injected pure functions so they can be unit
// tested and stay decoupled from the dashboard god-file.

// Unique invitation groups across the active guests, sorted A→Z.
export function getUniqueGuestGroups(activeGuests) {
  const groups = new Set(activeGuests.map((g) => g.group || "Sin grupo"));
  return [...groups].sort();
}

// Per-group attendance summary for the group nav chips. For each group returns
// `{ confirmedSaturday, size }`:
//   - `confirmedSaturday` = guests in the group whose SATURDAY RSVP level is
//     ≥ RSVP_CONFIRMED_MIN_LEVEL (4) — i.e. confirmed for Saturday.
//   - `size` = total guests in the group.
// Rendered as "X/Y" on each chip (X = confirmed Saturday, Y = group size).
export function getGroupAttendanceCounts(activeGuests, liveGuests) {
  const counts = {};
  activeGuests.forEach((guest) => {
    const group = guest.group || "Sin grupo";
    if (!counts[group]) counts[group] = { confirmedSaturday: 0, size: 0 };
    counts[group].size += 1;
    const saturday = getLiveRsvpAnswers(guest, liveGuests).saturday || 0;
    if (saturday >= RSVP_CONFIRMED_MIN_LEVEL) counts[group].confirmedSaturday += 1;
  });
  return counts;
}

// Unique cabin units among active guests that have a cabin assigned, sorted.
export function getUniqueCabins(activeGuests) {
  const cabins = [
    ...new Set(
      activeGuests
        .filter((g) => g.hasCabin && g.unit)
        .map((g) => g.unit),
    ),
  ];
  return cabins.sort();
}

// Age-group buckets used by the NINO/ADULTO filter. A guest is a "NINO" when
// their `identity.age` parses to a number < 18; "ADULTO" otherwise (18+ or
// unknown). The filter is a simple three-state toggle: "" (all), "nino", "adulto".
export function guestAgeGroup(guest) {
  const age = Number.parseInt(String(guestIdentity(guest).age || guest.age || ""), 10);
  if (Number.isNaN(age)) return "adulto"; // unknown age → treat as adult
  return age < 18 ? "nino" : "adulto";
}

// Filter the active guests by the current group + free-text query + age group.
// The filter state is passed in as a plain
// `{ filterGroup, filterQuery, filterAgeGroup }` object.
export function getFilteredGuests(activeGuests, { filterGroup, filterQuery, filterAgeGroup }) {
  let filtered = activeGuests;

  if (filterGroup) {
    filtered = filtered.filter((g) => g.group === filterGroup);
  }
  if (filterAgeGroup) {
    filtered = filtered.filter((g) => guestAgeGroup(g) === filterAgeGroup);
  }
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        guestFullName(g).toLowerCase().includes(q) ||
        String(guestIdentity(g).firstName || g.firstName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).middleName || g.middleName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).lastName || g.lastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).maternalLastName || g.maternalLastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).gender || g.gender || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).age || g.age || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).messageAuthor || g.messageAuthor || "").toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q),
    );
  }

  return filtered;
}


// Extract the sortable value for a guest given a column key. The Firebase Auth
// user map is injected (dependency injection) so this stays a pure function
// decoupled from the dashboard's mutable `state`. Returns a lowercase string
// (or a number for boolean-ish columns) so the caller can sort directly.
export function guestSortValue(guest, key, authUsers = {}, liveGuests = []) {
  switch (key) {

    case "name":
      return guestFullName(guest).toLowerCase();
    case "invitationGroup":
      return (guest.invitationGroup || "").toLowerCase();
    case "idCheck":
      return guest.idCheckUser ? 1 : 0;
    case "hasAuth":
      return authUsers[guest.id] ? 1 : 0;
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
    case "gender":
      return (guestIdentity(guest).gender || guest.gender || "").toLowerCase();
    case "age":
      return Number.parseInt(String(guestIdentity(guest).age || guest.age || ""), 10) || 0;
    case "message":
      return (guestIdentity(guest).messageAuthor || guest.messageAuthor || "").toLowerCase();
    case "accommodationConfirm":
    case "petanqueParticipation":
    case "petanqueOwnBoules":
    case "playa":
    case "rocaAzul":
      return getRsvpBooleanAnswer(guest, key, liveGuests);
    case "travelsByPlane":
      return guest?.travelsByPlane === true ? 1 : 0;
    case "status":
      return 0;

    default:
      return "";
  }
}


