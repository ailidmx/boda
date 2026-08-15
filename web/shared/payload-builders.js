/**
 * Explicit, allowlisted payload builders for Firestore writes.
 *
 * These functions deliberately do NOT spread raw form values or React state
 * into Firestore. Each payload is built field-by-field so that only the fields
 * allowed by the Firestore Security Rules (see firebase/firestore.rules) are
 * ever written.
 *
 * This module is shared by BOTH the guest-facing invitation app and the
 * back-office dashboard. It is the canonical source for what fields may be
 * written to each collection.
 *
 * Usage:
 *   import { buildGuestContactPayload, buildAttendancePayload } from "../../shared/payload-builders.js";
 */

// NOTE: This module intentionally does NOT import from "firebase/firestore".
// It is shared by both the invitation and dashboard apps, which each have
// their own node_modules. Callers pass `timestamp` (e.g. serverTimestamp())
// as a parameter so this module stays framework-agnostic.

// ── Guests collection ──────────────────────────────────────────────────

function normalizeTitleCase(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("und")
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => {
      const [first = "", ...rest] = Array.from(word);
      return first.toLocaleUpperCase("und") + rest.join("");
    });
}

function normalizeDbPhone(value) {
  // DB contract: digits only, with country code prefixed (e.g. 523312345678).
  return String(value ?? "").replace(/\D/g, "").trim();
}


/**
 * Build a payload for updating a guest's name correction.
 * Only writes the fields allowed by the Firestore rules.
 *
 * @param {Object} input
 * @param {string} input.guestId  the guest document ID
 * @param {string} input.firstName
 * @param {string} input.middleName
 * @param {string} input.lastName
 * @param {string} input.maternalLastName
 * @param {string} input.editorGuestId  the signed-in guest performing the edit
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestNamePayload({ guestId, firstName, middleName, lastName, maternalLastName, phone, idCheckUser, editorGuestId, timestamp }) {
  const normalizedMaternalLastName = normalizeTitleCase(maternalLastName);
  const normalizedPhone = normalizeDbPhone(phone);
  const identity = {
    firstName: normalizeTitleCase(firstName),
    middleName: normalizeTitleCase(middleName),
    lastName: normalizeTitleCase(lastName),
    maternalLastName: normalizedMaternalLastName,
  };
  if (normalizedPhone) identity.phone = normalizedPhone;
  const payload = {
    guestId,
    identity,
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };

  if (typeof idCheckUser === "boolean") {
    payload.idCheckUser = idCheckUser;
  }

  return payload;
}



/**
 * Build a payload for updating a guest's avatar (Cloudinary public id).
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {string} input.cloudinaryId  Cloudinary public id (e.g. "v123/abc")
 * @param {string} input.invitationGroup
 * @param {string} input.editorGuestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestPhotoPayload({ guestId, cloudinaryId, invitationGroup, editorGuestId, timestamp }) {
  return {
    guestId,
    identity: {
      cloudinaryId: String(cloudinaryId ?? "").trim(),
    },
    cloudinaryId: String(cloudinaryId ?? "").trim(),
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


/**
 * Build a payload for updating a guest's contact details (phone).
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {string} input.phone
 * @param {string} input.invitationGroup
 * @param {string} input.editorGuestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestContactPayload({ guestId, phone, invitationGroup, editorGuestId, timestamp }) {
  const normalizedPhone = normalizeDbPhone(phone);
  return {
    guestId,
    identity: {
      phone: normalizedPhone,
    },
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


/**
 * Build a payload for updating a guest's message author.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {string} input.messageAuthor
 * @param {string} input.invitationGroup
 * @param {string} input.editorGuestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestMessageAuthorPayload({ guestId, messageAuthor, invitationGroup, editorGuestId, timestamp }) {
  return {
    guestId,
    messageAuthor: String(messageAuthor ?? "").trim(),
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


/**
 * Build a payload for recording the identity-check acknowledgement.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {boolean} input.passed  true when the guest clicked OK
 * @param {string} input.invitationGroup
 * @param {string} input.editorGuestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildIdentityCheckPayload({ guestId, passed, invitationGroup, editorGuestId, timestamp }) {
  return {
    guestId,
    idCheckUser: passed === true,
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


/**
 * Build a payload for marking a guest as deleted (soft delete).
 *
 * @param {string} guestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
 export function buildGuestDeletedPayload(guestId) {
   return {
     guestId,
     _deleted: true,
   };
 }

 /**
  * Build a payload for saving a guest's RSVP answers.
  *
  * Answers are stored on the `guests` collection document, inside the nested
  * `rsvp.answers` map (questionId → scale level, int 0–5). This keeps all live
  * guest data in one place (the `guests` collection) instead of a separate
  * `rsvp_responses` collection.
  *
  * @param {Object} input
  * @param {string} input.guestId
  * @param {Record<string, number>} input.answers  questionId → level (0–5)
  * @param {string} input.editorGuestId
  * @returns {Object} explicit payload for setDoc(..., { merge: true })
  */
 export function buildGuestRsvpPayload({ guestId, answers, editorGuestId, timestamp }) {
   const normalized = {};
   Object.entries(answers || {}).forEach(([questionId, level]) => {
     const n = Number(level);
     if (Number.isInteger(n) && n >= 0 && n <= 5) {
       normalized[String(questionId)] = n;
     }
   });
   return {
     guestId,
     rsvp: {
       answers: normalized,
     },
     updatedBy: String(editorGuestId ?? "").trim(),
     updatedAt: timestamp,
   };
 }

 // ── Attendance responses collection ────────────────────────────────────

/**
 * Build a payload for saving an attendance response.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {{ friday?: string, saturday?: string, sunday?: string }} input.attendance
 * @param {string} input.invitationGroup
 * @param {string} input.editorGuestId
 * @param {string} input.language  "es" | "fr" | "en"
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildAttendancePayload({ guestId, attendance, invitationGroup, editorGuestId, language = "es", timestamp }) {
  const { friday, saturday, sunday } = attendance || {};
  return {
    guestId,
    friday: friday !== undefined ? String(friday || "") : "",
    saturday: saturday !== undefined ? String(saturday || "") : "",
    sunday: sunday !== undefined ? String(sunday || "") : "",
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: String(editorGuestId ?? "").trim(),
    language,
    schemaVersion: 1,
    updatedAt: timestamp,
  };
}


// ── Card votes collection ──────────────────────────────────────────────

/**
 * Build a payload for saving a star rating on an experience card (a food
 * flavour or a music act).
 *
 * One document per (card, guest) pair. The document ID is
 * `${cardType}_${cardKey}_${guestId}`, which the Firestore rules enforce so a
 * guest can only ever create/update their own single vote for a given card.
 *
 * @param {Object} input
 * @param {string} input.cardType  "food" | "music"
 * @param {string} input.cardKey   the flavour key (e.g. "carnitas") or act name
 * @param {string} input.guestId   the voting guest's id (== auth uid)
 * @param {number} input.rating    integer 1–5
 * @param {*} input.timestamp      e.g. serverTimestamp()
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildCardVotePayload({ cardType, cardKey, guestId, rating, timestamp }) {
  return {
    cardType: String(cardType ?? "").trim(),
    cardKey: String(cardKey ?? "").trim(),
    guestId: String(guestId ?? "").trim(),
    rating: Number(rating),
    updatedBy: String(guestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


// ── Guiso rankings collection ──────────────────────────────────────────

/**
 * Build a payload for saving a guest's ranked ordering of the guisos dishes.
 *
 * One document per guest, stored under `guiso_rankings/{guestId}`. The
 * `ranking` array holds the dish names in the guest's preferred order (1st
 * element = favourite, last = least favourite). The `selected` array holds the
 * dish names the guest marked as "in the menu" (the top 9). Both arrays are
 * validated to contain only known dish names and to have no duplicates.
 *
 * @param {Object} input
 * @param {string} input.guestId   the ranking guest's id (== auth uid)
 * @param {string[]} input.ranking  dish names in order 1..N (all 20 dishes)
 * @param {string[]} input.selected dish names marked as in the menu (top 9)
 * @param {*} input.timestamp       e.g. serverTimestamp()
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuisoRankingPayload({ guestId, ranking, selected, timestamp }) {
  return {
    guestId: String(guestId ?? "").trim(),
    ranking: Array.isArray(ranking) ? ranking.map((d) => String(d).trim()) : [],
    selected: Array.isArray(selected) ? selected.map((d) => String(d).trim()) : [],
    updatedBy: String(guestId ?? "").trim(),
    updatedAt: timestamp,
  };
}


// ── Song requests collection ────────────────────────────────────────────

/**
 * Build a payload for saving a guest's song request.
 *
 * One document per request, stored under `song_requests/{requestId}` (an
 * auto-generated id). The `song` field holds the requested title (and artist
 * if provided), and `intent` is one of the allowed intents (e.g. "hear",
 * "sing", "karaoke", "band"). The guest may only create their own requests.
 *
 * When the guest picks a song from the autocomplete, `songMeta` carries the
 * normalized song identity (title, artist, year, external id, source, isrc)
 * so the external source can be referenced later. Song identity is kept
 * separate from the event request (`intent`), so future event-specific
 * metadata (singer, key, notes…) can be added as sibling fields without
 * touching the song identity.
 *
 * @param {Object} input
 * @param {string} input.guestId   the requesting guest's id (== auth uid)
 * @param {string} input.song      the requested song title (and artist)
 * @param {string} input.intent    one of the allowed intents
 * @param {string} [input.bandType] which live band should play it, only when
 *                                  intent == "band" (marimba | mariachi |
 *                                  norteno | frenchBand). Optional.
 * @param {Object} [input.songMeta] normalized song identity (optional)
 * @param {*} input.timestamp      e.g. serverTimestamp()
 * @returns {Object} explicit payload for addDoc(...)
 */
export function buildSongRequestPayload({ guestId, song, intent, bandType, songMeta, timestamp }) {
  const payload = {
    guestId: String(guestId ?? "").trim(),
    song: String(song ?? "").trim(),
    intent: String(intent ?? "").trim(),
    updatedBy: String(guestId ?? "").trim(),
    updatedAt: timestamp,
  };

  // Optional band type, only meaningful when the guest wants a live band.
  if (bandType) {
    payload.bandType = String(bandType).trim();
  }


  if (songMeta && typeof songMeta === "object") {
    const meta = {};
    if (songMeta.title) meta.title = String(songMeta.title).trim();
    if (songMeta.artist) meta.artist = String(songMeta.artist).trim();
    if (songMeta.year) meta.year = Number(songMeta.year);
    if (songMeta.externalId) meta.externalId = String(songMeta.externalId).trim();
    if (songMeta.source) meta.source = String(songMeta.source).trim();
    if (songMeta.isrc) meta.isrc = String(songMeta.isrc).trim();
    if (Object.keys(meta).length > 0) payload.songMeta = meta;
  }

  return payload;
}




// ── Invitation groups collection ───────────────────────────────────────


/**
 * Build a payload for creating a new invitation group.
 *
 * @param {string} groupName
 * @returns {Object} explicit payload for setDoc(doc(db, "invitation_groups", groupName))
 */
export function buildCreateGroupPayload(groupName) {
  return {
    tag: { color: "#55452d", textColor: "#ffffff", label: groupName },
    customContent: { greeting: "", message: "", section: "", hideSections: [] },
  };
}

// ── Dashboard guest edit payload ───────────────────────────────────────

/**
 * Build a payload for the dashboard's guest editor form.
 * Only AGREED SCHEMA fields are included.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {string} input.firstName
 * @param {string} input.lastName
 * @param {string} input.invitationGroup
 * @param {string} input.phone
 * @param {boolean} input.idCheckUser
 * @param {string} input.cloudinaryId
 * @param {string} input.messageAuthor
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildDashboardGuestEditPayload({
  guestId,
  firstName,
  middleName,
  lastName,
  maternalLastName,
  gender,
  invitationGroup,
  phone,
  idCheckUser,
  cloudinaryId,
  messageAuthor,
  timestamp,
}) {
  const normalizedMaternalLastName = normalizeTitleCase(maternalLastName);
  const normalizedPhone = normalizeDbPhone(phone);
  return {
    identity: {
      firstName: normalizeTitleCase(firstName),
      middleName: normalizeTitleCase(middleName),
      lastName: normalizeTitleCase(lastName),
      maternalLastName: normalizedMaternalLastName,
      gender: String(gender ?? "").trim(),
      cloudinaryId: String(cloudinaryId ?? "").trim(),
      phone: normalizedPhone,
    },
    invitationGroup: String(invitationGroup ?? "").trim(),
    idCheckUser: idCheckUser === true,
    cloudinaryId: String(cloudinaryId ?? "").trim(),
    messageAuthor: String(messageAuthor ?? "").trim(),
    guestId,
    updatedBy: guestId,
    updatedAt: timestamp,
  };
}



/**
 * Build a payload for the dashboard's inline guest field save.
 * Only AGREED SCHEMA fields are allowed.
 *
 * @param {string} guestId
 * @param {string} field  one of the GUEST_WRITABLE_FIELDS
 * @param {*} value
 * @param {string} invitationGroup
 * @returns {Object|null} explicit payload, or null if the field is not allowed
 */
export function buildDashboardGuestInlinePayload(guestId, field, value, invitationGroup, timestamp) {
  const GUEST_WRITABLE_FIELDS = new Set([
    "firstName", "middleName", "lastName", "maternalLastName", "gender", "cloudinaryId", "phone", "idCheckUser",
    "messageAuthor", "invitationGroup", "_deleted",
  ]);

  if (!GUEST_WRITABLE_FIELDS.has(field)) return null;

  const payload = {
    guestId,
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: guestId,
    updatedAt: timestamp,
  };

  if (["firstName", "middleName", "lastName", "maternalLastName", "gender", "cloudinaryId", "phone"].includes(field)) {
    const normalizedValue = ["firstName", "middleName", "lastName", "maternalLastName"].includes(field)
      ? normalizeTitleCase(value)
      : String(value ?? "").trim();

    payload.identity = {
      [field]: normalizedValue,
    };
    return payload;
  }

  payload[field] = value;
  return {
    ...payload,
  };
}
