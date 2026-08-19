/**
 * guestRepository — the ONLY module that touches the Firestore `guests`
 * collection for the dashboard.
 *
 * Responsibilities (per the architecture contract):
 *   - collection paths (via `collections.guests` from the shared contract)
 *   - Firestore queries / document refs
 *   - create / read / update / delete operations
 *   - Firestore-specific errors
 *
 * It contains NO UI behavior and NO business rules. Payloads are built by the
 * shared payload-builders; validation lives in the shared validation module.
 *
 * The dashboard's live `onSnapshot` listener and the in-memory guest cache
 * (`guests.js`) are intentionally NOT moved here — the listener is a
 * subscription concern owned by the dashboard bootstrap, and the cache is a
 * read-side concern. This repository owns the WRITE path (and any one-off
 * reads) so presentation code never calls `setDoc`/`deleteDoc` directly.
 */

import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Create a NEW guest document. The doc id is the guest's login username AND the
 * Firebase Auth uid (auth uid IS the guest doc id), so it must be unique and
 * decided BEFORE any auth account is created. Uses `setDoc` WITHOUT merge so an
 * accidental duplicate id fails loudly instead of silently overwriting.
 *
 * @param {string} guestId — the new guest's id (slug from name, unique).
 * @param {object} payload — already built by a shared payload-builder.
 * @returns {Promise<void>}
 */
export async function createGuest(guestId, payload) {
  await setDoc(doc(db, collections.guests, guestId), payload);
}

/**
 * Merge-write a payload onto a guest document.
 * @param {string} guestId
 * @param {object} payload — already built by a shared payload-builder.
 * @returns {Promise<void>}
 */
export async function updateGuest(guestId, payload) {
  await setDoc(doc(db, collections.guests, guestId), payload, { merge: true });
}


/**
 * Soft-delete a guest by setting `_deleted: true` (merge). The doc is kept so
 * the couple can recover it; the invitation app filters `_deleted` guests out.
 * @param {string} guestId
 * @returns {Promise<void>}
 */
export async function softDeleteGuest(guestId) {
  await setDoc(
    doc(db, collections.guests, guestId),
    { _deleted: true },
    { merge: true },
  );
}

/**
 * Hard-delete a guest document. Prefer `softDeleteGuest` unless a hard delete
 * is explicitly required.
 * @param {string} guestId
 * @returns {Promise<void>}
 */
export async function deleteGuest(guestId) {
  await deleteDoc(doc(db, collections.guests, guestId));
}
