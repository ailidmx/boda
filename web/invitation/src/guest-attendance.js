/**
 * Save-the-date attendance responses.
 *
 * Each guest (or a member of their invitation group) can indicate, for each
 * member of the group, whether they plan to join on Friday, Saturday and
 * Sunday. Responses live in Firestore under `attendance_responses/{guestId}`
 * and are merged over the static guest registry at runtime.
 *
 * Firestore rules allow any authenticated guest to create/update the
 * attendance response of themselves and of the other members of their
 * invitation group (see firebase/firestore.rules).
 */

import { collection, doc, getDocs, query, setDoc, serverTimestamp, where } from "firebase/firestore";

import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";
import { buildAttendancePayload } from "../../shared/payload-builders.js";
import { validateAttendancePayload } from "../../shared/validation.js";
import { resolveGuestInvitationGroup } from "./guest-profiles.js";



/** @type {Map<string, Object>} */
const attendanceCache = new Map();

function logDb(event, detail) {
  console.log(`[db][guest-attendance][${event}]`, detail);
}

/**
 * Load the attendance responses for the signed-in guest's OWN invitation group
 * from Firestore into the cache. Call once at startup alongside
 * loadGuestProfiles().
 *
 * The query is scoped by `invitationGroup` to match the Firestore rules, which
 * only allow a guest to read responses belonging to their own invitation group.
 * This prevents a guest from receiving other groups' attendance data.
 *
 * @param {string} invitationGroup  the signed-in guest's invitation group
 * @returns {Promise<void>}
 */
export async function loadAttendanceResponses(invitationGroup) {
  try {
    if (!invitationGroup) {
      console.warn("[attendance] No invitationGroup provided; skipping load");
      return;
    }
    logDb("read:start", {
      collection: collections.attendanceResponses,
      op: "getDocs",
      where: { invitationGroup },
    });
    const q = query(
      collection(db, collections.attendanceResponses),
      where("invitationGroup", "==", invitationGroup),
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      attendanceCache.set(docSnap.id, docSnap.data());
    });
    logDb("read:success", {
      collection: collections.attendanceResponses,
      op: "getDocs",
      where: { invitationGroup },
      size: snapshot.size,
    });
    if (!snapshot.empty) {
      console.log(`[attendance] Loaded ${snapshot.size} attendance responses for group "${invitationGroup}"`);
    }
  } catch (error) {
    logDb("read:error", {
      collection: collections.attendanceResponses,
      op: "getDocs",
      where: { invitationGroup },
      error: error.message,
    });
    console.warn("[attendance] Could not load attendance responses", error.message);
  }
}


/**
 * Get the cached attendance response for a guest id (or null).
 * @param {string} guestId
 * @returns {Object|null}
 */
export function getAttendanceResponse(guestId) {
  if (!guestId) return null;
  return attendanceCache.get(guestId) || null;
}

/**
 * Resolve the effective attendance for a guest. Returns an object with
 * `friday`, `saturday` and `sunday` keys, each "yes" | "no" | "maybe" | "".
 * @param {Object} guest  static guest from guests.js
 * @returns {{ friday: string, saturday: string, sunday: string }}
 */
export function resolveGuestAttendance(guest) {
  if (!guest) return { friday: "", saturday: "", sunday: "" };
  const record = attendanceCache.get(guest.id);
  return {
    friday: record?.friday || "",
    saturday: record?.saturday || "",
    sunday: record?.sunday || "",
  };
}

/**
 * Save an attendance response for a guest. The authenticated user must be the
 * guest themselves or a member of the same invitation group (enforced by
 * rules).
 *
 * @param {Object} guest  static guest from guests.js
 * @param {{ friday?: string, saturday?: string, sunday?: string }} attendance
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @param {string} language  "es" | "fr" | "en"
 * @returns {Promise<void>}
 */
export async function saveGuestAttendance(guest, attendance, editorGuestId, language = "es") {
  if (!guest?.id) throw new Error("No guest id");
  const ref = doc(db, collections.attendanceResponses, guest.id);
  const existing = attendanceCache.get(guest.id) || {};
  const invitationGroup = resolveGuestInvitationGroup(guest);
  if (!invitationGroup) {
    logDb("write:blocked", {
      collection: collections.attendanceResponses,
      docId: guest.id,
      reason: "missing-invitation-group",
    });
    throw new Error("Guest invitation group is missing in Firestore.");
  }
  const next = buildAttendancePayload({
    guestId: guest.id,
    attendance,
    invitationGroup,
    editorGuestId,
    language,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidAttendanceFields).
  const result = validateAttendancePayload(next);
  if (!result.valid) {
    throw new Error(`Invalid attendance payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.attendanceResponses, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    attendanceCache.set(guest.id, { ...existing, ...next });
    logDb("write:success", { collection: collections.attendanceResponses, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.attendanceResponses, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }

}

