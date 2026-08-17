/**
 * Guest profile data access + public API.
 *
 * The `guests` Firestore collection is the source of truth for guest records:
 * identity (names, avatar `cloudinaryId`, group, cabin refs) and live,
 * user-editable data (contact details, identity-check acknowledgement). There
 * is no static guest registry anymore — the in-memory `guestsCache` below is
 * populated from Firestore by `loadGuestProfiles()` / `loadAllGuests()` and is
 * what the guest registry (`guests.js`) reads.
 *
 * Email is intentionally NOT stored in Firestore; it is only used transiently
 * for authentication (see `resolveGuestEmail`).
 *
 * Firestore rules allow any authenticated guest to update the contact details
 * (phone) and the identity-check flag of themselves and of the other
 * members of their invitation group on the `guests` collection (see
 * firebase/firestore.rules).
 *
 * This module owns the Firestore cache + reads/writes. The pure domain helpers
 * (name/photo/phone/group resolution, normalization, merging) live in
 * `guest-profiles/domain.js` and are re-exported here as thin wrappers that
 * wire the live cache record in. Components and services import from this
 * module (the public API) and never touch Firestore directly.
 */

import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, serverTimestamp, where } from "firebase/firestore";

import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";
import {
  buildGuestNamePayload,
  buildGuestPhotoPayload,
  buildGuestContactPayload,
  buildGuestMessageAuthorPayload,
  buildIdentityCheckPayload,
} from "../../shared/payload-builders.js";
import { validateGuestContactPayload } from "../../shared/validation.js";
import {
  normalizeGuestRecord,
  mergeGuestRecord,
  resolveGuestName as resolveGuestNameDomain,
  guestTravelsByPlane as guestTravelsByPlaneDomain,
  resolveGuestPhoto as resolveGuestPhotoDomain,
  resolveGuestPhone as resolveGuestPhoneDomain,
  resolveGuestEmail as resolveGuestEmailDomain,
  resolveGuestMessageAuthor as resolveGuestMessageAuthorDomain,
  resolveIdentityCheckPassed as resolveIdentityCheckPassedDomain,
  resolveGuestInvitationGroup as resolveGuestInvitationGroupDomain,
  getGroupMembers as getGroupMembersDomain,
  resolveLiveGuest as resolveLiveGuestDomain,
} from "./guest-profiles/domain.js";

/**
 * Cache of the Firestore `guests` collection (the source of truth for live
 * guest records). Contact details such as `phone` and the identity-check flag
 * `idCheckUser` live here, keyed by guest id.
 * @type {Map<string, Object>}
 */
const guestsCache = new Map();

// Subscribers notified whenever the live `guests` cache is updated (e.g. after
// the onSnapshot listener in loadGuestProfiles() applies a batch of changes).
// This lets consumers that read the cache reactively (like RsvpContext, which
// hydrates the RSVP answers from `rsvp.answers`) re-read it once the live
// records are actually available — the snapshot callback is asynchronous, so
// reading the cache immediately after sign-in can miss the data.
const guestsCacheListeners = new Set();

/**
 * Subscribe to live `guests` cache updates. Returns an unsubscribe function.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeGuestsCache(listener) {
  guestsCacheListeners.add(listener);
  return () => guestsCacheListeners.delete(listener);
}

function notifyGuestsCacheChanged() {
  guestsCacheListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[guest-profiles] guests cache listener error", error);
    }
  });
}

/**
 * Read-only access to the live Firestore `guests` cache. Returns a snapshot
 * array of the normalized guest records currently loaded (keyed by guest id).
 *
 * This lets the guest registry (`guests.js`) source its data from Firestore
 * (the source of truth) instead of the static sheet snapshot, so the
 * guest-facing lists (THANKS, GUEST CLOUD, group members, etc.) reflect live
 * names, photos, and hosting data.
 *
 * @returns {Object[]}
 */
export function getGuestsCache() {
  return Array.from(guestsCache.values());
}

/**
 * Read a single normalized guest record from the live Firestore cache.
 * @param {string} guestId
 * @returns {Object|undefined}
 */
export function getGuestRecord(guestId) {
  if (!guestId) return undefined;
  return guestsCache.get(guestId);
}

function logDb(event, detail) {
  console.log(`[db][guest-profiles][${event}]`, detail);
}

function requireLiveGuestWriteContext(guest) {
  if (!guest?.id) {
    throw new Error("No guest id");
  }

  const record = guestsCache.get(guest.id);
  const invitationGroup = String(record?.invitationGroup || guest.invitationGroup || "").trim();

  if (!record) {
    logDb("write:blocked", {
      collection: collections.guests,
      docId: guest.id,
      reason: "missing-live-guest-record",
    });
    throw new Error("Guest Firestore profile is not loaded yet.");
  }

  if (!invitationGroup) {
    logDb("write:blocked", {
      collection: collections.guests,
      docId: guest.id,
      reason: "missing-invitation-group",
      record,
    });
    throw new Error("Guest invitation group is missing in Firestore.");
  }

  return { invitationGroup, record };
}

export async function loadOwnGuestProfile(guestId) {
  if (!guestId) return null;
  logDb("read:start", { collection: collections.guests, docId: guestId, op: "getDoc" });
  const snapshot = await getDoc(doc(db, collections.guests, guestId));
  if (!snapshot.exists()) {
    logDb("read:empty", { collection: collections.guests, docId: guestId, op: "getDoc" });
    return null;
  }
  const data = normalizeGuestRecord(snapshot.data());
  guestsCache.set(guestId, data);
  logDb("read:success", { collection: collections.guests, docId: guestId, op: "getDoc", data });
  return data;
}

/**
 * Load the LIVE `hosting` + identity data for ALL guests into the cache.
 *
 * The extra-cabin occupancy (in the "Et après ?" section) needs to know every
 * guest who shares the same `xtraCabin`, including guests from OTHER invitation
 * groups. The group-scoped `loadGuestProfiles()` only loads the signed-in
 * guest's own group, so it cannot see other groups' `xtraCabin` assignments.
 *
 * The Firestore rules now allow any authenticated guest to read the whole
 * `guests` collection (`allow read: if request.auth != null`), so we can fetch
 * all records here. We only merge the fields needed for occupancy/identity so
 * we don't clobber the group-scoped live data with stale values.
 *
 * Call once at startup alongside loadGuestProfiles().
 * @returns {Promise<void>}
 */
export async function loadAllGuests() {
  try {
    logDb("read:start", {
      collection: collections.guests,
      op: "getDocs",
      scope: "all",
    });
    const snapshot = await getDocs(collection(db, collections.guests));
    snapshot.forEach((docSnap) => {
      const data = normalizeGuestRecord(docSnap.data());
      const existing = guestsCache.get(docSnap.id) || {};
      // Merge only the fields needed for occupancy/identity so we don't
      // overwrite fresher group-scoped live data (e.g. rsvp answers).
      guestsCache.set(docSnap.id, {
        ...existing,
        ...data,
        identity: { ...(existing.identity || {}), ...(data.identity || {}) },
        hosting: { ...(existing.hosting || {}), ...(data.hosting || {}) },
      });
    });
    logDb("read:success", {
      collection: collections.guests,
      op: "getDocs",
      scope: "all",
      size: snapshot.size,
    });
    console.log(`[guest-profiles] Loaded ${snapshot.size} guest records (all groups)`);
    notifyGuestsCacheChanged();
  } catch (error) {
    logDb("read:error", {
      collection: collections.guests,
      op: "getDocs",
      scope: "all",
      error: error.message,
    });
    console.warn("[guest-profiles] Could not load all guests", error.message);
  }
}

/**
 * Subscribe to the Firestore `guests` collection and keep the in-memory cache
 * in sync with live changes. Uses the native `onSnapshot` listener so any
 * update made by another guest (or by the sync pipeline) is reflected
 * automatically — no manual re-fetch needed.
 *
 * SECURITY: The read is scoped to the signed-in guest's OWN invitation group
 * (matching the Firestore rules' `guests` read rule). A guest must never
 * receive other groups' phone, cabin, room, table, payment, or admin data.
 * The couple (David & Aydé) pass their own group and read only their group's
 * records here; the dashboard reads the full collection separately.
 *
 * Call once at startup alongside loadGroupCustomContent(). Returns an
 * unsubscribe function for cleanup.
 * @param {string} invitationGroup  the signed-in guest's invitation group
 * @returns {() => void}
 */
export function loadGuestProfiles(invitationGroup) {
  const group = String(invitationGroup || "").trim();
  if (!group) {
    console.warn("[guest-profiles] No invitation group; skipping guests sync");
    return () => {};
  }
  logDb("read:start", {
    collection: collections.guests,
    op: "onSnapshot",
    where: { invitationGroup: group },
  });
  const q = query(
    collection(db, collections.guests),
    where("invitationGroup", "==", group),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === "removed") {
          guestsCache.delete(change.doc.id);
        } else {
          guestsCache.set(change.doc.id, normalizeGuestRecord(data));
        }
      });
      if (snapshot.metadata.hasPendingWrites) return;
      logDb("read:success", {
        collection: collections.guests,
        op: "onSnapshot",
        where: { invitationGroup: group },
        size: snapshot.size,
      });
      console.log(`[guest-profiles] Live sync — ${snapshot.size} guest records (group: ${group})`);
      // Notify subscribers (e.g. RsvpContext) that the live cache has been
      // updated so they can re-read `rsvp.answers` now that it is available.
      notifyGuestsCacheChanged();
    },
    (error) => {
      logDb("read:error", {
        collection: collections.guests,
        op: "onSnapshot",
        where: { invitationGroup: group },
        error: error.message,
      });
      console.warn("[guest-profiles] Live sync failed", error.message);
    },
  );
}

// ---------------------------------------------------------------------------
// Public domain helpers (thin wrappers that wire the live cache record in).
// The pure logic lives in guest-profiles/domain.js.
// ---------------------------------------------------------------------------

/**
 * Resolve the effective display name for a guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {{ firstName: string, middleName: string, lastName: string, maternalLastName: string, gender: string, cloudinaryId: string, fullName: string }}
 */
export function resolveGuestName(guest) {
  return resolveGuestNameDomain(guest, guestsCache.get(guest?.id));
}

/**
 * Whether a guest travels by plane. See domain.js.
 * @param {Object} guest  the signed-in guest profile (profile.guest)
 * @returns {boolean}
 */
export function guestTravelsByPlane(guest) {
  return guestTravelsByPlaneDomain(guest);
}

/**
 * Resolve the effective avatar photo URL for a guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {string|null}
 */
export function resolveGuestPhoto(guest) {
  return resolveGuestPhotoDomain(guest, guestsCache.get(guest?.id));
}

/**
 * Resolve the effective phone number for a guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestPhone(guest) {
  return resolveGuestPhoneDomain(guest, guestsCache.get(guest?.id));
}

/**
 * Resolve the effective email address for a guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestEmail(guest) {
  return resolveGuestEmailDomain(guest);
}

/**
 * Resolve the author of the guest's message. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestMessageAuthor(guest) {
  return resolveGuestMessageAuthorDomain(guest, guestsCache.get(guest?.id));
}

/**
 * Resolve whether the guest has acknowledged the identity check. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {boolean}
 */
export function resolveIdentityCheckPassed(guest) {
  return resolveIdentityCheckPassedDomain(guest, guestsCache.get(guest?.id));
}

/**
 * Resolve the invitation group for a guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestInvitationGroup(guest) {
  return resolveGuestInvitationGroupDomain(guest, guestsCache.get(guest?.id));
}

/**
 * All guests that share an invitation group with the given guest. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @param {Object[]} allGuests  full guest registry
 * @returns {Object[]}
 */
export function getGroupMembers(guest, allGuests) {
  return getGroupMembersDomain(guest, allGuests, (g) =>
    resolveGuestInvitationGroupDomain(g, guestsCache.get(g?.id)),
  );
}

/**
 * Merge a static guest record with its live Firestore record. See domain.js.
 * @param {Object} guest  static guest from guests.js
 * @returns {Object}
 */
export function resolveLiveGuest(guest) {
  return resolveLiveGuestDomain(guest, guestsCache.get(guest?.id));
}

// ---------------------------------------------------------------------------
// Writes (Firestore data access).
// ---------------------------------------------------------------------------

/**
 * Save a name correction for a guest. The authenticated user must be the guest
 * themselves or a member of the same invitation group (enforced by rules).
 * Stored on the `guests` collection as a display-name override using the
 * agreed English schema: `firstName`, `middleName`, `lastName`,
 * `maternalLastName` (mapped from the sheet's Nombre, Nombre 2, Apellido,
 * Apellido 2 columns).
 *
 * @param {Object} guest  static guest from guests.js
 * @param {{ firstName: string, middleName: string, lastName: string, maternalLastName: string, phone?: string, idCheckUser?: boolean }} name
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveGuestName(guest, name, editorGuestId) {
  requireLiveGuestWriteContext(guest);
  const ref = doc(db, collections.guests, guest.id);
  const existing = guestsCache.get(guest.id) || {};
  // NOTE: we deliberately do NOT spread `...existing` here. The `guests`
  // documents carry many sheet-synced fields (phone, cabin, room, table,
  // rsvp*, etc.) that are NOT allowed by the Firestore rules' `hasOnly` list.
  // Writing only the fields we intend to change keeps the write within the
  // allowed keys (and avoids echoing sensitive data).
  const next = buildGuestNamePayload({
    guestId: guest.id,
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
    maternalLastName: name.maternalLastName,
    phone: name.phone,
    idCheckUser: name.idCheckUser,
    editorGuestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid guest name payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    guestsCache.set(guest.id, mergeGuestRecord(existing, next));
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}

/**
 * Save an avatar for a guest. The authenticated user must be the guest
 * themselves or a member of the same invitation group (enforced by rules).
 * We store the Cloudinary public id (`cloudinaryId`), not the delivery URL.
 *
 * @param {Object} guest  static guest from guests.js
 * @param {string} cloudinaryId  Cloudinary public id (e.g. "v123/abc")
 * @param {string} editorGuestId
 * @returns {Promise<void>}
 */
export async function saveGuestPhoto(guest, cloudinaryId, editorGuestId) {
  const { invitationGroup } = requireLiveGuestWriteContext(guest);
  const ref = doc(db, collections.guests, guest.id);
  const existing = guestsCache.get(guest.id) || {};
  // NOTE: no `...existing` spread — see saveGuestName for why.
  const next = buildGuestPhotoPayload({
    guestId: guest.id,
    cloudinaryId,
    invitationGroup,
    editorGuestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid guest photo payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    guestsCache.set(guest.id, mergeGuestRecord(existing, next));
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}

/**
 * Save contact details (phone) for a guest. The authenticated user must be the
 * guest themselves or a member of the same invitation group (enforced by
 * rules). Contact details are stored on the `guests` collection (the source of
 * truth for guest records).
 *
 * NOTE: email is intentionally NOT saved here. Changing a guest's email must go
 * through Firebase Auth (`updateEmail`), not the `guests` collection.
 *
 * @param {Object} guest  static guest from guests.js
 * @param {{ phone?: string }} contact
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveGuestContact(guest, contact, editorGuestId) {
  const { invitationGroup } = requireLiveGuestWriteContext(guest);
  const ref = doc(db, collections.guests, guest.id);
  const existing = guestsCache.get(guest.id) || {};
  // NOTE: no `...existing` spread — see saveGuestName for why.
  const next = buildGuestContactPayload({
    guestId: guest.id,
    phone: contact.phone !== undefined ? contact.phone : existing.phone,
    invitationGroup,
    editorGuestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid guest contact payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    guestsCache.set(guest.id, mergeGuestRecord(existing, next));
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}

/**
 * Save the author of the guest's message. The authenticated user must be the
 * guest themselves or a member of the same invitation group (enforced by
 * rules). Stored on the `guests` collection as `messageAuthor`.
 *
 * @param {Object} guest  static guest from guests.js
 * @param {string} messageAuthor  the author of the guest's message
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveGuestMessageAuthor(guest, messageAuthor, editorGuestId) {
  const { invitationGroup } = requireLiveGuestWriteContext(guest);
  const ref = doc(db, collections.guests, guest.id);
  const existing = guestsCache.get(guest.id) || {};
  // NOTE: no `...existing` spread — see saveGuestName for why.
  const next = buildGuestMessageAuthorPayload({
    guestId: guest.id,
    messageAuthor,
    invitationGroup,
    editorGuestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid guest message author payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    guestsCache.set(guest.id, mergeGuestRecord(existing, next));
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}

/**
 * Record that the guest has acknowledged the identity check (clicked OK on the
 * identity modal). The authenticated user must be the guest themselves or a
 * member of the same invitation group (enforced by rules). Stored on the
 * `guests` collection as `idCheckUser`.
 *
 * @param {Object} guest  static guest from guests.js
 * @param {boolean} passed  true when the guest clicked OK
 * @param {string} editorGuestId  the signed-in guest id performing the action
 * @returns {Promise<void>}
 */
export async function saveIdentityCheckPassed(guest, passed, editorGuestId) {
  const { invitationGroup } = requireLiveGuestWriteContext(guest);
  const ref = doc(db, collections.guests, guest.id);
  const existing = guestsCache.get(guest.id) || {};
  // NOTE: no `...existing` spread — see saveGuestName for why.
  const next = buildIdentityCheckPayload({
    guestId: guest.id,
    passed,
    invitationGroup,
    editorGuestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid identity check payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    guestsCache.set(guest.id, mergeGuestRecord(existing, next));
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}
