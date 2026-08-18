/**
 * tableRepository — the ONLY module that touches the Firestore `tables`
 * collection for the dashboard.
 *
 * Responsibilities (per the architecture contract):
 *   - collection paths (via `collections.tables` from the shared contract)
 *   - Firestore queries / document refs
 *   - create / read / update / delete operations
 *   - Firestore-specific errors
 *
 * It contains NO UI behavior and NO business rules. The dashboard's live
 * `onSnapshot` listener for tables is a subscription concern owned by the
 * dashboard bootstrap; this repository owns the WRITE path so presentation
 * code never calls `setDoc`/`deleteDoc` directly.
 */

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Merge-write a table's layout (x/y/shape) onto its document.
 * @param {string} tableId
 * @param {object} payload — layout fields (x, y, shape, updatedAt).
 * @returns {Promise<void>}
 */
export async function updateTableLayout(tableId, payload) {
  await setDoc(doc(db, collections.tables, tableId), payload, { merge: true });
}

/**
 * Merge-write the `guestIds` array onto a table document.
 * @param {string} tableId
 * @param {string[]} guestIds — the table's new ordered guest list.
 * @returns {Promise<void>}
 */
export async function updateTableGuests(tableId, guestIds) {
  await setDoc(doc(db, collections.tables, tableId), { guestIds }, { merge: true });
}
