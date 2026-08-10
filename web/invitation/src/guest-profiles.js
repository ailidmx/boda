/**
 * Guest profile helpers.
 *
 * The Google Sheet (via the generated `guests.js` registry) is the source of
 * truth for identity (names, avatar `cloudinaryId`, group, cabin). The
 * `guests` Firestore collection is the source of truth for live, user-editable
 * data: contact details (phone) and the identity-check acknowledgement
 * (`idCheckUser`). Email is intentionally NOT stored in Firestore; it is only
 * used transiently for authentication (see `resolveGuestEmail`).
 *
 * The legacy `guest_profiles` collection has been removed. All guest data now
 * flows from the sheet → `guests.js` (static) + `guests` (Firestore).
 *
 * Firestore rules allow any authenticated guest to update the contact details
 * (phone) and the identity-check flag of themselves and of the other
 * members of their invitation group on the `guests` collection (see
 * firebase/firestore.rules).
 */


import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, serverTimestamp, where } from "firebase/firestore";


import { db } from "./firebase.js";
import { cloudinaryImage } from "./cloudinary.js";
import { collections } from "../../shared/firestore-paths.js";
import {
  buildGuestNamePayload,
  buildGuestPhotoPayload,
  buildGuestContactPayload,
  buildGuestMessageAuthorPayload,
  buildIdentityCheckPayload,
} from "../../shared/payload-builders.js";
import { validateGuestContactPayload } from "../../shared/validation.js";





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

function logDb(event, detail) {
  console.log(`[db][guest-profiles][${event}]`, detail);
}

function normalizeGuestRecord(data = {}) {
  const identity = data.identity || {};
  const hosting = data.hosting || {};
  const maternalLastName = identity.maternalLastName ?? data.maternalLastName;
  return {
    ...data,
    identity,
    hosting,
    firstName: identity.firstName ?? data.firstName,
    middleName: identity.middleName ?? data.middleName,
    lastName: identity.lastName ?? data.lastName,
    maternalLastName,
    gender: identity.gender ?? data.gender,
    cloudinaryId: identity.cloudinaryId ?? data.cloudinaryId,
    lang: identity.lang ?? data.lang,
    age: identity.age ?? data.age,
    phone: identity.phone ?? data.phone,
    cabin: hosting.cabin ?? data.cabin,
    room: hosting.room ?? data.room,
    xtraCabin: hosting.xtraCabin ?? data.xtraCabin,
    xtraRoom: hosting.xtraRoom ?? data.xtraRoom,
    isCabinPaidByNovios: hosting.isCabinPaidByNovios ?? data.isCabinPaidByNovios,
    isCabinPaid: hosting.isCabinPaid ?? data.isCabinPaid,
    isXtraCabinPaidByNovios: hosting.isXtraCabinPaidByNovios ?? data.isXtraCabinPaidByNovios,
    isXtraCabinPaid: hosting.isXtraCabinPaid ?? data.isXtraCabinPaid,
  };
}

function mergeGuestRecord(existing = {}, patch = {}) {
  return normalizeGuestRecord({
    ...existing,
    ...patch,
    identity: {
      ...(existing.identity || {}),
      ...(patch.identity || {}),
    },
    hosting: {
      ...(existing.hosting || {}),
      ...(patch.hosting || {}),
    },
  });
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

export function resolveGuestInvitationGroup(guest) {
  if (!guest?.id) return "";
  const record = guestsCache.get(guest.id);
  return String(record?.invitationGroup || guest.invitationGroup || "").trim();
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



/**
 * Resolve the effective display name for a guest. Names come from the sheet
 * (via the static registry) as four separate fields: nombre, nombre2,
 * apellido, apellido2. The combined firstName/lastName are kept for
 * backward compatibility.
 *
 * When a name correction has been saved to the `guests` Firestore collection
 * (via saveGuestName), the Firestore values take precedence over the static
 * registry. The Firestore schema uses English field names: firstName,
 * middleName, lastName, maternalLastName.
 *
 * @param {Object} guest  static guest from guests.js
 * @returns {{ nombre: string, nombre2: string, apellido: string, apellido2: string, firstName: string, lastName: string }}
 */
export function resolveGuestName(guest) {
  if (!guest) {
    return {
      firstName: "",
      middleName: "",
      lastName: "",
      maternalLastName: "",
      fullName: "",
    };
  }
  // Firestore name override (from saveGuestName) takes precedence.
  const record = guestsCache.get(guest.id);
  const firstName = record?.identity?.firstName ?? record?.firstName ?? guest.nombre ?? guest.firstName ?? "";
  const middleName = record?.identity?.middleName ?? record?.middleName ?? guest.nombre2 ?? guest.middleName ?? "";
  const lastName = record?.identity?.lastName ?? record?.lastName ?? guest.apellido ?? guest.lastName ?? "";
  const maternalLastName =
    record?.identity?.maternalLastName ??
    record?.maternalLastName ??
    guest.apellido2 ??
    guest.maternalLastName ??
    "";
  return {
    firstName,
    middleName,
    lastName,
    maternalLastName,
    gender: record?.identity?.gender ?? record?.gender ?? guest.gender ?? "",
    cloudinaryId: record?.identity?.cloudinaryId ?? record?.cloudinaryId ?? guest.cloudinaryId ?? "",
    fullName: [firstName, middleName, lastName, maternalLastName].filter(Boolean).join(" "),
  };
}



/**
 * Resolve the effective avatar photo URL for a guest from their Cloudinary
 * public id (`cloudinaryId`). The id comes from the sheet (via the static
 * registry or the `guests` Firestore record). Returns null when absent.
 * @param {Object} guest  static guest from guests.js
 * @returns {string|null}
 */
export function resolveGuestPhoto(guest) {
  if (!guest) return null;
  const record = guestsCache.get(guest.id);
  const publicId = record?.identity?.cloudinaryId || record?.cloudinaryId || guest.identity?.cloudinaryId || guest.cloudinaryId;
  if (!publicId) return null;
  try {
    // Force a small square crop server-side. Both width AND height are given,
    // so Cloudinary produces a valid `c_fill,g_auto,h_256,w_256` transform
    // (the earlier 404 was caused by passing `crop: "fill"` with only a width,
    // which emitted an empty `h_`). The square is small (256px) for avatars.
    return cloudinaryImage(publicId, { width: 256, height: 256, crop: "fill" });

  } catch {
    return null;
  }
}


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
 * Resolve the effective phone number for a guest. The `guests` collection is
 * the source of truth for live contact details (a guest may correct their own
 * number). When no Firestore override exists, we fall back to the sheet's
 * `Celular` column (via the static registry `phone` field), so the phone is
 * always linked to the real schema.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestPhone(guest) {
  if (!guest) return "";
  const record = guestsCache.get(guest.id);
  return record?.identity?.phone || record?.phone || guest.phone || "";
}



/**
 * Resolve the effective email address for a guest. The email is NOT stored in
 * the `guests` collection — it lives in Firebase Auth (the real login
 * credential). This helper is kept for backward compatibility but always
 * returns an empty string; callers should read the email from the signed-in
 * user's auth profile (`profile.email`) instead.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestEmail(guest) {
  return "";
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
 * Resolve the author of the guest's message. Stored on the `guests` collection
 * as `messageAuthor` (the source of truth for guest records). Empty string
 * when not yet set.
 * @param {Object} guest  static guest from guests.js
 * @returns {string}
 */
export function resolveGuestMessageAuthor(guest) {
  if (!guest) return "";
  const record = guestsCache.get(guest.id);
  return record?.messageAuthor || "";
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
 * Resolve whether the guest has acknowledged the identity check (clicked OK on
 * the identity modal). Stored on the `guests` collection as `idCheckUser`
 * (the source of truth for guest records). Absent/false means the modal should
 * still be shown.
 * @param {Object} guest  static guest from guests.js
 * @returns {boolean}
 */
export function resolveIdentityCheckPassed(guest) {

  if (!guest) return false;
  const record = guestsCache.get(guest.id);
  return record?.idCheckUser === true;
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



/**
 * All guests that share an invitation group with the given guest.
 * The signed-in guest is listed first, then the rest of the group.
 * @param {Object} guest  static guest from guests.js
 * @param {Object[]} allGuests  full guest registry
 * @returns {Object[]}
 */
export function getGroupMembers(guest, allGuests) {
  if (!guest) return [];
  const group = resolveGuestInvitationGroup(guest);
  if (!group) return [guest];
  const members = allGuests.filter(
    (g) => resolveGuestInvitationGroup(g) === group && !g._deleted,
  );
  // Signed-in guest first, then the rest in registry order.
  const self = members.find((g) => g.id === guest.id);
  const others = members.filter((g) => g.id !== guest.id);
  return [self || guest, ...others];
}

/**
 * Merge a static guest record with its live Firestore record (if loaded).
 * Live fields (hosting, identity, contact, rsvp, etc.) override the static
 * data, so callers can read the effective cabin, room, and payment flags.
 * @param {Object} guest  static guest from guests.js
 * @returns {Object}
 */
export function resolveLiveGuest(guest) {
  if (!guest) return null;
  const record = guestsCache.get(guest.id);
  if (!record) return guest;
  return {
    ...guest,
    ...Object.fromEntries(
      Object.entries(record).filter(([, v]) => v !== undefined),
    ),
  };
}
