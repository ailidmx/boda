/**
 * Guest registry — LIVE-ONLY cache backed by the Firestore `guests` collection.
 *
 * The dashboard reads ONLY the live Firestore `guests` collection. There is
 * NO static registry and NO fallback: the live collection is the single source
 * of truth for everything (identity names/photo, hosting cabin/room incl.
 * xtraCabin/xtraRoom, tagGroup, rsvp.answers, etc.).
 *
 * The `onSnapshot` listener in dashboard.js calls `setLiveGuests(...)` with the
 * raw Firestore records; this module normalizes them into the shape the rest of
 * the dashboard expects (flat name fields, `group` from `tagGroup`, `unit` from
 * `hosting.cabin`, `isNovio`, `firebaseEmail`, ...) and serves them through the
 * same accessor functions the dashboard already uses.
 */

/** @type {object[]} */
let LIVE_GUESTS = [];

/**
 * Normalize a raw Firestore guest record into the dashboard's guest shape.
 *
 * Everything comes from the LIVE Firestore record only. The primary-period
 * (Viernes → Domingo) cabin assignment lives in `hosting.cabin`; the coast
 * (Domingo → Martes) assignment lives in `hosting.xtraCabin`. The primary
 * cabin is exposed as BOTH `unit` (the dashboard's historical field, used by
 * the INVITADOS table) and `cabin` (the field the invitation front-end reads,
 * used by the cabins panel). Both resolve the same way: `hosting.cabin` first,
 * then the live record's own top-level `cabin`/`unit` fields. This mirrors the
 * invitation's `normalizeGuestRecord` (`cabin: hosting.cabin ?? data.cabin`)
 * so the dashboard and the invitation agree on assignments.
 *
 * @param {object} g — raw Firestore doc data (with `id`).
 * @returns {object} normalized guest
 */
function normalizeGuest(g) {
  const identity = g.identity || {};
  const hosting = g.hosting || {};
  const group = g.tagGroup || g.group || "";
  return {
    ...g,
    // Flat name fields (from `identity`).
    firstName: identity.firstName ?? g.firstName ?? "",
    middleName: identity.middleName ?? g.middleName ?? "",
    lastName: identity.lastName ?? g.lastName ?? "",
    maternalLastName: identity.maternalLastName ?? g.maternalLastName ?? "",
    cloudinaryId: identity.cloudinaryId ?? g.cloudinaryId ?? "",
    // Phone: live `identity.phone` wins, then the live record's own `phone`.
    phone: identity.phone ?? g.phone ?? "",

    // Group: live guests store it in `tagGroup` (e.g. "PetanclubGDL").
    group,
    // Cabin/room: live `hosting` wins, then the live record's own fields.
    unit: hosting.cabin || g.cabin || g.unit || "",
    cabin: hosting.cabin || g.cabin || g.unit || "",
    room: hosting.room || g.room || "",
    cabinLabel: hosting.cabin || g.cabinLabel || "",
    xtraCabin: hosting.xtraCabin || g.xtraCabin || "",
    xtraRoom: hosting.xtraRoom || g.xtraRoom || "",
    hasCabin: Boolean(hosting.cabin || g.cabin || g.unit),

    occupancy: g.occupancy || "",
    payment: g.payment || "",
    // The couple (David & Aydé) are flagged as admins / "Novios".
    isNovio: Boolean(g.isAdmin || group === "Novios"),
    // Auth email: prefer the explicit `firebaseEmail` field on the live
    // record (the couple's real emails, e.g. david.aili.mx@gmail.com). Only
    // fall back to deriving `id@domain` when the field is absent.
    firebaseEmail: g.firebaseEmail || (g.id ? `${g.id}@${AUTH_EMAIL_DOMAIN}` : ""),
  };
}

// Auth email domain used to derive a guest's email from their id when the
// live record has no explicit `firebaseEmail`. Kept local to this module.
const AUTH_EMAIL_DOMAIN = "boda-david-y-ayde.web.app";


/**
 * Replace the live guest cache with the latest Firestore records.
 * @param {object[]} guests — raw Firestore guest records (each with `id`).
 */
export function setLiveGuests(guests) {
  LIVE_GUESTS = (guests || []).map(normalizeGuest);
}

/**
 * Look up a guest by username (case-insensitive).
 * @param {string} username
 * @returns {object|undefined}
 */
export function getGuestByUsername(username) {
  if (!username) return undefined;
  const u = String(username).trim().toLowerCase();
  return LIVE_GUESTS.find((g) => g.id && g.id.toLowerCase() === u);
}

/**
 * Look up a guest by their Firebase auth email (case-insensitive).
 * @param {string} email
 * @returns {object|undefined}
 */
export function getGuestByEmail(email) {
  if (!email) return undefined;
  const e = String(email).trim().toLowerCase();
  return LIVE_GUESTS.find(
    (g) => g.firebaseEmail && g.firebaseEmail.toLowerCase() === e,
  );
}

/**
 * Look up a guest by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getGuest(id) {
  return LIVE_GUESTS.find((g) => g.id === id);
}

/**
 * All guests in the live cache.
 * @returns {object[]}
 */
export function getActiveGuests() {
  return LIVE_GUESTS;
}

/**
 * Guests assigned to a given cabin unit (display name, e.g. "VILLA DALIA").
 * @param {string} unit
 * @returns {object[]}
 */
export function getGuestsByUnit(unit) {
  return LIVE_GUESTS.filter((g) => g.hasCabin && g.unit === unit);
}

export default LIVE_GUESTS;
