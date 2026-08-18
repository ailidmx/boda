/**
 * groupRepository — the ONLY module that touches the Firestore
 * `invitation_groups` collection for the dashboard.
 *
 * Responsibilities (per the architecture contract):
 *   - collection paths (via `collections.invitationGroups` from the shared
 *     contract)
 *   - Firestore queries / document refs
 *   - create / read / update / delete operations
 *   - Firestore-specific errors
 *
 * It contains NO UI behavior and NO business rules. The dashboard's live
 * `onSnapshot` listener for groups is a subscription concern owned by the
 * dashboard bootstrap; this repository owns the WRITE path so presentation
 * code never calls `setDoc`/`deleteDoc` directly.
 */

import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Create a new invitation group with default tag + empty custom content.
 * @param {string} name — the group id / display name.
 * @returns {Promise<void>}
 */
export async function createGroup(name) {
  await setDoc(doc(db, collections.invitationGroups, name), {
    tag: { color: "#55452d", textColor: "#ffffff", label: name },
    customContent: { greeting: "", message: "", section: "", hideSections: [] },
  });
}

/**
 * Merge-write a single field onto an invitation group doc. `field` may be a
 * dotted path (e.g. "tag.color") or a custom-content key (e.g. "greeting").
 * @param {string} groupId
 * @param {string} field — dotted path to write (e.g. "tag.color").
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function updateGroupField(groupId, field, value) {
  await setDoc(
    doc(db, collections.invitationGroups, groupId),
    { [field]: value },
    { merge: true },
  );
}

/**
 * Delete an invitation group document.
 * @param {string} groupId
 * @returns {Promise<void>}
 */
export async function deleteGroup(groupId) {
  await deleteDoc(doc(db, collections.invitationGroups, groupId));
}
