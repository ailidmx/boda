/**
 * Guest registry — sources guest data from the LIVE Firestore `guests`
 * collection (the source of truth), falling back to the static sheet snapshot
 * (`web/shared/guests.js`) for anything not yet loaded and for pre-auth
 * lookups (login + invitation links).
 *
 * The static registry is still used as the pre-auth fallback because login
 * (`getGuestByUsername`) and invitation-link resolution (`getGuest`) run
 * BEFORE the Firestore cache is populated. Once the cache is loaded (via
 * `loadAllGuests()` / `loadGuestProfiles()` in guest-profiles.js), the live
 * records take precedence so guest-facing lists (THANKS, GUEST CLOUD, group
 * members, etc.) reflect live names, photos, and hosting data.
 */
import { getGuestsCache, getGuestRecord } from "./guest-profiles.js";
import staticGuestsDefault, {
  AUTH_EMAIL_DOMAIN,
  SHARED_PASSWORD,
  getGuestByUsername as staticGetGuestByUsername,
  getGuestByEmail as staticGetGuestByEmail,
  getGuest as staticGetGuest,
  getActiveGuests as staticGetActiveGuests,
  getGuestsByUnit as staticGetGuestsByUnit,
} from "../../shared/guests.js";


/**
 * Merge a live Firestore record over its static fallback so every field the
 * app reads is present even before the cache is populated. Live values win;
 * static values fill any gaps (e.g. `unit`, `occupancy`, `payment`,
 * `cabinLabel` which are not stored on the Firestore doc).
 * @param {Object} staticGuest
 * @param {Object|undefined} liveRecord
 * @returns {Object}
 */
function mergeLive(staticGuest, liveRecord) {
  if (!liveRecord) return staticGuest;
  return {
    ...staticGuest,
    ...Object.fromEntries(
      Object.entries(liveRecord).filter(([, v]) => v !== undefined),
    ),
  };
}

/**
 * All active guests. Prefers the live Firestore cache; falls back to the
 * static registry when the cache is empty (e.g. pre-auth) or for guests not
 * yet loaded.
 * @returns {Object[]}
 */
export function getActiveGuests() {
  const live = getGuestsCache();
  if (live.length === 0) return staticGetActiveGuests();

  const staticGuests = staticGetActiveGuests();
  const byId = new Map(staticGuests.map((g) => [g.id, g]));
  const liveIds = new Set(live.map((g) => g.id));

  const merged = live.map((rec) => mergeLive(byId.get(rec.id) || {}, rec));
  // Append static guests not yet present in the live cache so nothing is lost.
  staticGuests.forEach((g) => {
    if (!liveIds.has(g.id)) merged.push(g);
  });
  return merged;
}

/**
 * A single guest by id. Prefers the live Firestore record; falls back to the
 * static registry (used pre-auth for invitation-link resolution).
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getGuest(id) {
  const live = getGuestRecord(id);
  if (live) return mergeLive(staticGetGuest(id) || {}, live);
  return staticGetGuest(id);
}

/**
 * Lookup by username. Usernames are only used for login (pre-auth), so this
 * always reads the static registry.
 * @param {string} username
 * @returns {Object|undefined}
 */
export function getGuestByUsername(username) {
  return staticGetGuestByUsername(username);
}

/**
 * Lookup by email. Emails are only used for login (pre-auth), so this always
 * reads the static registry.
 * @param {string} email
 * @returns {Object|undefined}
 */
export function getGuestByEmail(email) {
  return staticGetGuestByEmail(email);
}

/**
 * All active guests assigned to a cabin unit.
 * @param {string} unit
 * @returns {Object[]}
 */
export function getGuestsByUnit(unit) {
  return getActiveGuests().filter((g) => g.hasCabin && g.unit === unit);
}

export { AUTH_EMAIL_DOMAIN, SHARED_PASSWORD };
// Default export is the static registry array (used by tests and any legacy
// consumer that expects the raw list). App components should use the named
// `getActiveGuests()` / `getGuest()` helpers, which source live Firestore data.
export default staticGuestsDefault;

