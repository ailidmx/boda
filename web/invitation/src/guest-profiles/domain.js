/**
 * Pure guest-profile domain helpers.
 *
 * These functions contain NO Firestore access and NO module-level cache. They
 * are pure functions of their inputs, so they are trivially unit-testable.
 *
 * The live Firestore record for a guest is passed in explicitly as the
 * `record` argument (the data-access layer in `guest-profiles.js` looks it up
 * from the cache and passes it in). When `record` is absent, the helpers fall
 * back to the static guest fields, preserving the historical behavior.
 *
 * @module guest-profiles/domain
 */

import { cloudinaryImage } from "../cloudinary.js";

/**
 * Normalize a raw Firestore `guests` record into the app's guest shape,
 * flattening the nested `identity` and `hosting` maps onto the top level while
 * keeping the nested maps intact. This is the single normalizer for guest
 * records in the invitation.
 * @param {Object} [data={}]  raw Firestore record
 * @returns {Object}
 */
export function normalizeGuestRecord(data = {}) {
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

/**
 * Merge an existing normalized record with a patch, re-normalizing the result.
 * @param {Object} [existing={}]
 * @param {Object} [patch={}]
 * @returns {Object}
 */
export function mergeGuestRecord(existing = {}, patch = {}) {
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
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {{ firstName: string, middleName: string, lastName: string, maternalLastName: string, gender: string, cloudinaryId: string, fullName: string }}
 */
export function resolveGuestName(guest, record) {
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
 * Whether a guest travels by plane. The FLIGHTS ("Je viens de loin") section
 * is only shown to guests who fly in, so this drives section visibility, the
 * nav link, and the "next section" bottom links.
 *
 * The source of truth is the boolean `travelsByPlane` on the guest's Firestore
 * record (true = flies in). For backward compatibility we also accept the
 * older `travelStatus` string ("booked" | "planning" = flies in, "local" = no).
 *
 * @param {Object} guest  the signed-in guest profile (profile.guest)
 * @returns {boolean}
 */
export function guestTravelsByPlane(guest) {
  if (!guest) return false;
  // Boolean flag (current schema) takes precedence.
  if (typeof guest.travelsByPlane === "boolean") return guest.travelsByPlane;
  // Legacy string fallback.
  if (typeof guest.travelStatus === "string") {
    return ["booked", "planning"].includes(guest.travelStatus);
  }
  return false;
}

/**
 * Resolve the effective avatar photo URL for a guest from their Cloudinary
 * public id (`cloudinaryId`). The id comes from the sheet (via the static
 * registry or the `guests` Firestore record). Returns null when absent.
 * @param {Object} guest  static guest from guests.js
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {string|null}
 */
export function resolveGuestPhoto(guest, record) {
  if (!guest) return null;
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
 * Resolve the effective phone number for a guest. The `guests` collection is
 * the source of truth for live contact details (a guest may correct their own
 * number). When no Firestore override exists, we fall back to the sheet's
 * `Celular` column (via the static registry `phone` field), so the phone is
 * always linked to the real schema.
 * @param {Object} guest  static guest from guests.js
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {string}
 */
export function resolveGuestPhone(guest, record) {
  if (!guest) return "";
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
 * Resolve the author of the guest's message. Stored on the `guests` collection
 * as `messageAuthor` (the source of truth for guest records). Empty string
 * when not yet set.
 * @param {Object} guest  static guest from guests.js
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {string}
 */
export function resolveGuestMessageAuthor(guest, record) {
  if (!guest) return "";
  return record?.messageAuthor || "";
}

/**
 * Resolve whether the guest has acknowledged the identity check (clicked OK on
 * the identity modal). Stored on the `guests` collection as `idCheckUser`
 * (the source of truth for guest records). Absent/false means the modal should
 * still be shown.
 * @param {Object} guest  static guest from guests.js
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {boolean}
 */
export function resolveIdentityCheckPassed(guest, record) {
  if (!guest) return false;
  return record?.idCheckUser === true;
}

/**
 * Resolve the invitation group for a guest. The live Firestore record is the
 * source of truth; falls back to the static guest's `invitationGroup`.
 * @param {Object} guest  static guest from guests.js
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {string}
 */
export function resolveGuestInvitationGroup(guest, record) {
  if (!guest?.id) return "";
  return String(record?.invitationGroup || guest.invitationGroup || "").trim();
}

/**
 * All guests that share an invitation group with the given guest.
 * The signed-in guest is listed first, then the rest of the group.
 *
 * Pure: the group for each guest is resolved via the injected `resolveGroup`
 * callback (the data-access layer supplies one that reads the live cache).
 *
 * @param {Object} guest  static guest from guests.js
 * @param {Object[]} allGuests  full guest registry
 * @param {(g: Object) => string} resolveGroup  resolves a guest's invitation group
 * @returns {Object[]}
 */
export function getGroupMembers(guest, allGuests, resolveGroup) {
  if (!guest) return [];
  const group = resolveGroup(guest);
  if (!group) return [guest];
  const members = allGuests.filter(
    (g) => resolveGroup(g) === group && !g._deleted,
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
 * @param {Object} [record]  live Firestore record for the guest (from the cache)
 * @returns {Object}
 */
export function resolveLiveGuest(guest, record) {
  if (!guest) return null;
  if (!record) return guest;
  return {
    ...guest,
    ...Object.fromEntries(
      Object.entries(record).filter(([, v]) => v !== undefined),
    ),
  };
}
