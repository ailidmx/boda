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
