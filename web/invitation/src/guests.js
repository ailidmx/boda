/**
 * Guest registry — LIVE Firestore source of truth.
 *
 * There is NO static guest registry anymore. The `guests` Firestore collection
 * is the single source of truth for guest records (identity names/photo,
 * `hosting` cabin/room, `invitationGroup`, contact details, etc.). The live
 * records are loaded into the in-memory `guestsCache` by
 * `loadGuestProfiles()` / `loadAllGuests()` (see `guest-profiles.js`), which
 * run at app startup (AppContext).
 *
 * This module re-exposes the same lookup API that used to read the generated
 * `web/shared/guests.js` snapshot, but now reads from that live cache, so the
 * guest-facing lists (identity modal group members, THANKS, GUEST CLOUD, cabin
 * occupancy, etc.) always reflect what is actually in Firestore — never a stale
 * sheet snapshot.
 *
 * NOTE: `AUTH_EMAIL_DOMAIN` and `SHARED_PASSWORD` are static constants (not
 * guest data) and are still imported from the shared module.
 */

import {
  AUTH_EMAIL_DOMAIN,
  SHARED_PASSWORD,
  normalizePhoneToE164,
} from "../../shared/guests.js";
import { getGuestsCache, getGuestRecord } from "./guest-profiles.js";

/**
 * Look up a guest by username (case-insensitive).
 * @param {string} username
 * @returns {Object|undefined}
 */
export function getGuestByUsername(username) {
  if (!username) return undefined;
  const u = String(username).trim().toLowerCase();
  return getGuestsCache().find((g) => g.username && g.username.toLowerCase() === u);
}

/**
 * Look up a guest by their Firebase auth email (case-insensitive).
 * This is the canonical link between an auth account and a guest.
 * @param {string} email
 * @returns {Object|undefined}
 */
export function getGuestByEmail(email) {
  if (!email) return undefined;
  const e = String(email).trim().toLowerCase();
  return getGuestsCache().find((g) => g.firebaseEmail && g.firebaseEmail.toLowerCase() === e);
}

/**
 * Look up a guest by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getGuest(id) {
  return getGuestRecord(id);
}

/**
 * All guests that are not marked deleted.
 * @returns {Object[]}
 */
export function getActiveGuests() {
  return getGuestsCache().filter((g) => !g._deleted);
}

/**
 * Guests assigned to a given cabin unit.
 * @param {string} unit
 * @returns {Object[]}
 */
export function getGuestsByUnit(unit) {
  return getGuestsCache().filter((g) => g.hasCabin && g.unit === unit);
}

/**
 * Find a guest by their phone number. The phone is stored on the guest record
 * as `phone` (and may also live under `identity.phone` on the live Firestore
 * record). We compare against the E.164-normalized form so "523332017504",
 * "+52 333 201 7504" and "52-333-201-7504" all match the same guest.
 * @param {string} phone
 * @returns {Object|undefined}
 */
export function getGuestByPhone(phone) {
  const target = normalizePhoneToE164(phone);
  if (!target) return undefined;
  return getGuestsCache().find((g) => {
    const stored = g?.identity?.phone || g?.phone;
    return stored && normalizePhoneToE164(stored) === target;
  });
}

/**
 * Resolve a guest from a Firebase Auth uid. Normally the uid IS the guest
 * document id (e.g. "david_aïli"). When a guest signs in via SMS, Firebase
 * creates a user whose uid is the phone number (e.g. "+523332017504"), so we
 * fall back to a phone lookup. This keeps the rest of the app (which resolves
 * the signed-in guest by uid) working for both login methods.
 * @param {string} uid
 * @returns {Object|undefined}
 */
export function getGuestByAuthUid(uid) {
  if (!uid) return undefined;
  return getGuest(uid) || getGuestByPhone(uid);
}

export { AUTH_EMAIL_DOMAIN, SHARED_PASSWORD, normalizePhoneToE164 };
