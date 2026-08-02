/**
 * Guest profile overrides (names + avatar photos) and contact details.
 *
 * The static guest registry (guests.js) is the source of truth for identity,
 * but guests may correct a misspelled name or upload a close-up avatar photo
 * before the wedding. Those corrections live in Firestore under
 * `guest_profiles/{guestId}` and are merged over the static registry at
 * runtime.
 *
 * Contact details (phone / email) live on the `guests` collection, which is
 * the source of truth for guest records. The legacy `guest_profiles` override
 * is still read as a fallback so previously saved numbers are not lost.
 *
 * Firestore rules allow any authenticated guest to update the name/photo of
 * themselves and of the other members of their invitation group, and to update
 * the contact details (phone / email) of those same group members on the
 * `guests` collection (see firebase/firestore.rules).
 */


import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

/** @type {Map<string, Object>} */
const profileCache = new Map();

/**
 * Cache of the Firestore `guests` collection (the source of truth for guest
 * records). Contact details such as `phone` live here, keyed by guest id.
 * @type {Map<string, Object>}
 */
const guestsCache = new Map();

/**
 * Load all guest profile overrides from Firestore into the cache.
 * Call once at startup alongside loadGroupCustomContent().
 * @returns {Promise<void>}
 */
export async function loadGuestProfiles() {
  try {
    const snapshot = await getDocs(collection(db, "guest_profiles"));
    snapshot.forEach((docSnap) => {
      profileCache.set(docSnap.id, docSnap.data());
    });
    if (!snapshot.empty) {
      console.log(`[guest-profiles] Loaded ${snapshot.size} profile overrides`);
    }
  } catch (error) {
    console.warn("[guest-profiles] Could not load profile overrides", error.message);
  }

  // The `guests` collection is the source of truth for contact details
  // (phone / email). Load it so the UI can show the current values.
  try {
    const snapshot = await getDocs(collection(db, "guests"));
    snapshot.forEach((docSnap) => {
      guestsCache.set(docSnap.id, docSnap.data());
    });
    if (!snapshot.empty) {
      console.log(`[guest-profiles] Loaded ${snapshot.size} guest records`);
    }
  } catch (error) {
    console.warn("[guest-profiles] Could not load guest records", error.message);
  }
}


/**
 * Get the cached override for a guest id (or null).
 * @param {string} guestId
 * @returns {Object|null}
 */
export function getGuestProfileOverride(guestId) {
  if (!guestId) return null;
  return profileCache.get(guestId) || null;
}

/**
 * Resolve the effective display name for a guest, preferring the Firestore
 * override over the static registry.
 * @param {Object} guest  static guest from guests.js
 * @returns {{ firstName: string, lastName: string }}
 */
export function resolveGuestName(guest) {
  if (!guest) return { firstName: "", lastName: "" };
  const override = profileCache.get(guest.id);
  return {
    firstName: override?.firstName || guest.firstName || "",
    lastName: override?.lastName || guest.lastName || "",
  };
}

/**
 * Resolve the effective avatar photo URL for a guest, preferring the Firestore
 * override over any static default.
 * @param {Object} guest  static guest from guests.js
 * @returns {string|null}
 */
export function resolveGuestPhoto(guest) {
  if (!guest) return null;
  const override = profileCache.get(guest.id);
  return override?.photoUrl || null;
}

/**
 * Save a name correction for a guest. The authenticated user must be the guest
 * themselves or a member of the same invitation group (enforced by rules).
 *
 * @param {Object} guest  static guest from guests.js
 * @param {{ firstName: string, lastName: string }} name
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveGuestName(guest, name, editorGuestId) {
  if (!guest?.id) throw new Error("No guest id");
  const ref = doc(db, "guest_profiles", guest.id);
  const existing = profileCache.get(guest.id) || {};
  const next = {
    ...existing,
    guestId: guest.id,
    firstName: String(name.firstName || "").trim(),
    lastName: String(name.lastName || "").trim(),
    invitationGroup: guest.invitacionGroup || guest.group || "",
    updatedBy: editorGuestId || "",
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, next, { merge: true });
  // Update local cache immediately so the UI reflects the change.
  profileCache.set(guest.id, { ...existing, ...next });
}

/**
 * Save an avatar photo URL for a guest.
 * @param {Object} guest  static guest from guests.js
 * @param {string} photoUrl  Cloudinary delivery URL
 * @param {string} editorGuestId
 * @returns {Promise<void>}
 */
export async function saveGuestPhoto(guest, photoUrl, editorGuestId) {
  if (!guest?.id) throw new Error("No guest id");
  const ref = doc(db, "guest_profiles", guest.id);
  const existing = profileCache.get(guest.id) || {};
  const next = {
    ...existing,
    guestId: guest.id,
    photoUrl,
    invitationGroup: guest.invitacionGroup || guest.group || "",
    updatedBy: editorGuestId || "",
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, next, { merge: true });
  profileCache.set(guest.id, { ...existing, ...next });
}

/**
 * Resolve the effective phone number for a guest. The `guests` collection is
 * the source of truth for contact details; the legacy `guest_profiles`
 * override is used as a fallback so previously saved numbers are not lost.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestPhone(guest) {
  if (!guest) return "";
  const record = guestsCache.get(guest.id);
  if (record?.phone) return record.phone;
  const override = profileCache.get(guest.id);
  return override?.phone || "";
}

/**
 * Resolve the effective email address for a guest. The `guests` collection is
 * the source of truth for contact details; the legacy `guest_profiles`
 * override is used as a fallback so previously saved emails are not lost.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestEmail(guest) {
  if (!guest) return "";
  const record = guestsCache.get(guest.id);
  if (record?.email) return record.email;
  const override = profileCache.get(guest.id);
  return override?.email || "";
}


/**
 * Save contact details (phone / email) for a guest. The authenticated user
 * must be the guest themselves or a member of the same invitation group
 * (enforced by rules). Contact details are stored on the `guests` collection
 * (the source of truth for guest records).
 *
 * @param {Object} guest  static guest from guests.js
 * @param {{ phone?: string, email?: string }} contact
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveGuestContact(guest, contact, editorGuestId) {
  if (!guest?.id) throw new Error("No guest id");
  const ref = doc(db, "guests", guest.id);
  const existing = guestsCache.get(guest.id) || {};
  const next = {
    ...existing,
    guestId: guest.id,
    phone: contact.phone !== undefined ? String(contact.phone || "").trim() : existing.phone,
    email: contact.email !== undefined ? String(contact.email || "").trim() : existing.email,
    invitationGroup: guest.invitacionGroup || guest.group || "",
    updatedBy: editorGuestId || "",
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, next, { merge: true });
  guestsCache.set(guest.id, { ...existing, ...next });
}



/**
 * All guests that share an invitation group with the given guest.
 * The signed-in guest is listed first, then the rest of the group.
 * @param {Object} guest  static guest from guests.js
 * @param {Object[]} allGuests  full guest registry
 * @returns {Object[]}
 */
export function getGroupMembers(guest, allGuests) {
  if (!guest) return [];
  const group = guest.invitacionGroup || guest.group;
  if (!group) return [guest];
  const members = allGuests.filter(
    (g) => (g.invitacionGroup || g.group) === group && !g._deleted,
  );
  // Signed-in guest first, then the rest in registry order.
  const self = members.find((g) => g.id === guest.id);
  const others = members.filter((g) => g.id !== guest.id);
  return [self || guest, ...others];
}
