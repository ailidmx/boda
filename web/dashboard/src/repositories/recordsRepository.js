/**
 * recordsRepository — generic WRITE path for the dashboard's flat record
 * collections (budget, card_votes, guiso_rankings, song_requests).
 *
 * The dashboard shows these as inline-editable AG Grid tables. Editing a cell
 * writes ONLY that field back to Firestore via a `setDoc` merge (never replacing
 * the whole doc, and never from inside a renderer). Collection names come from
 * the shared `collections` contract — no hardcoded names here.
 *
 * This module contains NO UI behavior and NO business rules. It only owns the
 * Firestore write. The live reads (onSnapshot) remain subscription concerns
 * owned by the dashboard bootstrap.
 */

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Merge-write a single field onto an existing document in a given collection.
 *
 * @param {string} collectionName — Firestore collection name (from `collections.*`).
 * @param {string} docId — document id.
 * @param {string} field — the field to update.
 * @param {*} value — the new value (string, number, boolean, or null).
 * @returns {Promise<void>}
 */
export async function updateRecordField(collectionName, docId, field, value) {
  await setDoc(doc(db, collectionName, docId), { [field]: value }, { merge: true });
}

export default { updateRecordField };