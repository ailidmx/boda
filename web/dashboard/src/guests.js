/**
 * Guest registry — LIVE-FIRST cache backed by the Firestore `guests` collection.
 *
 * The dashboard no longer reads the static snapshot in web/shared/guests.js.
 * The live Firestore `guests` collection is the single source of truth: it
 * carries the real `identity` (names/photo), `hosting` (cabin/room incl.
 * xtraCabin/xtraRoom), `tagGroup`, `rsvp.answers`, etc. — everything the
 * dashboard needs.
 *
 * The `onSnapshot` listener in dashboard.js calls `setLiveGuests(...)` with the
 * raw Firestore records; this module normalizes them into the shape the rest of
 * the dashboard expects (flat name fields, `group` from `tagGroup`, `unit` from
 * `hosting.cabin`, `isNovio`, `firebaseEmail`, ...) and serves them through the
 * same accessor functions the dashboard already uses.
 */

import {
  AUTH_EMAIL_DOMAIN,
  SHARED_PASSWORD,
  getGuest as getStaticGuest,
} from "../../shared/guests.js";

/** @type {import("../../shared/guests.js").GuestProfile[]} */
let LIVE_GUESTS = [];

/**
 * Normalize a raw Firestore guest record into the dashboard's guest shape.
 *
 * Cabin/room fields are LIVE-first but fall back to the static registry
 * (`web/shared/guests.js`), mirroring the invitation's `resolveLiveGuest`
 * logic. The primary-period (Viernes → Domingo) cabin assignments live in the
 * static sheet (`unit`/`cabinLabel`/`room`), NOT in the live `hosting.cabin`
 * map, so without this fallback the "Asignación de cabañas" panel would show
 * 0 cabins / 0 guests / 0 capacity. Live `hosting.cabin`/`hosting.room`
 * (reassignments made in the dashboard) still win when present.
 *
 * @param {object} g — raw Firestore doc data (with `id`).
 * @returns {object} normalized guest
 */
function normalizeGuest(g) {
  const identity = g.identity || {};
  const hosting = g.hosting || {};
  const group = g.tagGroup || g.group || "";
  // Static registry record (may be undefined for guests added only in
  // Firestore via the dashboard's "+ Agregar" flow).
  const staticGuest = getStaticGuest(g.id) || {};
  return {
    ...g,
    // Flat name fields (from `identity`).
    firstName: identity.firstName ?? g.firstName ?? staticGuest.firstName ?? "",
    middleName: identity.middleName ?? g.middleName ?? staticGuest.middleName ?? "",
    lastName: identity.lastName ?? g.lastName ?? staticGuest.lastName ?? "",
    maternalLastName: identity.maternalLastName ?? g.maternalLastName ?? staticGuest.maternalLastName ?? "",
    cloudinaryId: identity.cloudinaryId ?? g.cloudinaryId ?? staticGuest.cloudinaryId ?? "",
    // Group: live guests store it in `tagGroup` (e.g. "PetanclubGDL").
    group,
    // Cabin/room: live `hosting` wins, then the live record's own fields,
    // then the static registry (the source of the primary-period assignment).
    //
    // The primary-period cabin is exposed as BOTH `unit` (the dashboard's
    // historical field, used by the INVITADOS table via getMergedGuest) and
    // `cabin` (the field the invitation front-end reads, used by the cabins
    // panel). Both resolve the same way: `hosting.cabin` first, then the
    // top-level `cabin`/`unit` fields on the live record, then the static
    // registry. This mirrors the invitation's `normalizeGuestRecord`
    // (`cabin: hosting.cabin ?? data.cabin`) so the dashboard and the
    // invitation agree on assignments.
    unit: hosting.cabin || g.cabin || g.unit || staticGuest.unit || "",
    cabin: hosting.cabin || g.cabin || g.unit || staticGuest.unit || "",
    room: hosting.room || g.room || staticGuest.room || "",
    cabinLabel: hosting.cabin || g.cabinLabel || staticGuest.cabinLabel || "",
    xtraCabin: hosting.xtraCabin || g.xtraCabin || staticGuest.xtraCabin || "",
    xtraRoom: hosting.xtraRoom || g.xtraRoom || staticGuest.xtraRoom || "",
    hasCabin: Boolean(hosting.cabin || g.cabin || g.unit || staticGuest.unit),

    occupancy: g.occupancy || staticGuest.occupancy || "",
    payment: g.payment || staticGuest.payment || "",
    // The couple (David & Aydé) are flagged as admins / "Novios".
    isNovio: Boolean(g.isAdmin || group === "Novios" || staticGuest.isNovio),
    // Auth email: prefer the explicit `firebaseEmail` field on the live
    // record (the couple's real emails, e.g. david.aili.mx@gmail.com). Only
    // fall back to deriving `id@domain` when the field is absent.
    firebaseEmail:
      g.firebaseEmail || staticGuest.firebaseEmail || (g.id ? `${g.id}@${AUTH_EMAIL_DOMAIN}` : ""),
  };
}


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

export { AUTH_EMAIL_DOMAIN, SHARED_PASSWORD };
export default LIVE_GUESTS;
