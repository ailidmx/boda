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

import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

/** @type {Map<string, Object>} */
const attendanceCache = new Map();

/**
 * Load all attendance responses from Firestore into the cache.
 * Call once at startup alongside loadGuestProfiles().
 * @returns {Promise<void>}
 */
export async function loadAttendanceResponses() {
  try {
    const snapshot = await getDocs(collection(db, "attendance_responses"));
    snapshot.forEach((docSnap) => {
      attendanceCache.set(docSnap.id, docSnap.data());
    });
    if (!snapshot.empty) {
      console.log(`[attendance] Loaded ${snapshot.size} attendance responses`);
    }
  } catch (error) {
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
  const ref = doc(db, "attendance_responses", guest.id);
  const existing = attendanceCache.get(guest.id) || {};
  const next = {
    ...existing,
    guestId: guest.id,
    friday: attendance.friday !== undefined ? String(attendance.friday || "") : existing.friday || "",
    saturday: attendance.saturday !== undefined ? String(attendance.saturday || "") : existing.saturday || "",
    sunday: attendance.sunday !== undefined ? String(attendance.sunday || "") : existing.sunday || "",
    invitationGroup: guest.invitacionGroup || guest.group || "",
    updatedBy: editorGuestId || "",
    language,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, next, { merge: true });
  attendanceCache.set(guest.id, { ...existing, ...next });
}
