/**
 * Guest registry — sources guest data from the LIVE Firestore `guests`
 * collection (the source of truth). There is no static guest registry anymore:
 * every guest-facing list (THANKS, GUEST CLOUD, group members, cabin
 * occupancy, etc.) reads the in-memory Firestore cache populated by
 * `loadAllGuests()` / `loadGuestProfiles()` in guest-profiles.js.
 *
 * Login is a normal Firebase Auth email/password login. The only FE helper is
 * that if a guest types a bare username (no "@"), we silently append the
 * default auth domain to build a valid email — no username lookup needed.
 */
import { getGuestsCache, getGuestRecord } from "./guest-profiles.js";

/** Domain used to build the Firebase auth email from a bare username. */
export const AUTH_EMAIL_DOMAIN = "boda-david-y-ayde.web.app";

/**
 * All active guests from the live Firestore cache.
 * @returns {Object[]}
 */
export function getActiveGuests() {
  return getGuestsCache();
}

/**
 * A single guest by id from the live Firestore cache.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getGuest(id) {
  return getGuestRecord(id);
}

/**
 * Guests assigned to a given cabin unit. Guests store a `cabin` (or
 * `xtraCabin`) reference on their Firestore `hosting` map that points to the
 * matching document in the `cabins` collection.
 * @param {string} unit
 * @returns {Object[]}
 */
export function getGuestsByUnit(unit) {
  return getActiveGuests().filter(
    (g) => g.hosting?.cabin === unit || g.cabin === unit,
  );
}
