/**
 * Thanks / greetings — sourced from the Firestore `thanks` collection.
 *
 * The `thanks` collection is the source of truth for which guests appear in
 * the cinematic "MERCI" credits roll and the crossed avatar marquee. Each
 * document is keyed by an auto id and carries a `guest` field (the guest ID)
 * plus localized thank-you messages (`es`, `fr`, `en`).
 *
 * Only guests with a `thanks` entry are shown in the credits/avatars, so the
 * section reflects the people who actually contributed a greeting rather than
 * the full guest list.
 *
 * Firestore rules: `thanks` is readable by any signed-in guest
 * (`allow read: if true`); writes are admin-only.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";

/** @type {Set<string>} guest IDs that have a `thanks` entry. */
let thanksGuestIds = new Set();

/** @type {boolean} */
let thanksLoaded = false;

function logDb(event, detail) {
  console.log(`[db][thanks][${event}]`, detail);
}

/**
 * Load the `thanks` collection from Firestore and cache the set of guest IDs
 * that have a thank-you entry. Safe to call multiple times (idempotent).
 * @returns {Promise<Set<string>>}
 */
export async function loadThanks() {
  if (thanksLoaded) return thanksGuestIds;
  try {
    logDb("read:start", { collection: collections.thanks, op: "getDocs" });
    const snapshot = await getDocs(collection(db, collections.thanks));

    const ids = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const guestId = String(data.guest || "").trim();
      if (guestId) ids.add(guestId);
    });
    thanksGuestIds = ids;
    thanksLoaded = true;
    logDb("read:success", {
      collection: collections.thanks,
      op: "getDocs",
      size: ids.size,
    });
    console.log(`[thanks] Loaded ${ids.size} thanks entries from Firestore`);
  } catch (error) {
    logDb("read:error", {
      collection: collections.thanks,
      op: "getDocs",
      error: error.message,
    });
    console.warn("[thanks] Could not load thanks collection", error.message);
  }
  return thanksGuestIds;
}

/**
 * Whether a guest has a thank-you entry in the `thanks` collection.
 * @param {string} guestId
 * @returns {boolean}
 */
export function hasThanksEntry(guestId) {
  return thanksGuestIds.has(String(guestId || "").trim());
}

/**
 * The set of guest IDs that have a thank-you entry.
 * @returns {Set<string>}
 */
export function getThanksGuestIds() {
  return thanksGuestIds;
}
