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


/**
 * Build a payload for confirming that a guest has paid their accommodation
 * contribution. Stored as a top-level boolean `paymentConfirmed` on the
 * `guests` document.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {boolean} input.confirmed  true = payment done
 * @param {string} input.editorGuestId
 * @param {*} input.timestamp
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestPaymentConfirmedPayload({ guestId, confirmed, editorGuestId, timestamp }) {
  return {
    guestId,
    paymentConfirmed: confirmed === true,
    updatedBy: String(editorGuestId ?? "").trim(),
    updatedAt: timestamp,
  };
}



/**
 * Normalize the return-trip (departure) details to the compact persisted shape.
 * @param {Object} departure
 * @returns {Object|null}
 */
function normalizeDeparture(departure) {
  if (!departure || typeof departure !== "object") return null;
  const out = {};

  if (departure.origin) out.origin = normalizeAirport(departure.origin);
  if (departure.destination) out.destination = normalizeAirport(departure.destination);

  const normalizedConnections = (departure.connections || [])
    .map(normalizeAirport)
    .filter(Boolean)
    .slice(0, 3);
  if (normalizedConnections.length > 0) out.connections = normalizedConnections;

  const normalizedLegs = (departure.legs || [])
    .map(normalizeLeg)
    .filter(Boolean)
    .slice(0, 4);
  if (normalizedLegs.length > 0) out.legs = normalizedLegs;

  if (departure.departureDate) out.departureDate = String(departure.departureDate).trim();
  if (departure.departureTime) out.departureTime = String(departure.departureTime).trim();
  if (departure.finalFlightNumber) out.finalFlightNumber = String(departure.finalFlightNumber).trim().slice(0, 30);

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Normalize an airport object to the compact persisted shape.
 * @param {Object} airport
 * @returns {Object|null}
 */
function normalizeAirport(airport) {
  if (!airport || typeof airport !== "object") return null;
  const iata = String(airport.iata || "").trim().toUpperCase();
  if (!iata) return null;
  const out = {
    iata,
    name: String(airport.name || "").trim().slice(0, 200),
    countryCode: String(airport.countryCode || "").trim().slice(0, 2),
  };
  if (airport.icao) out.icao = String(airport.icao).trim().toUpperCase().slice(0, 4);
  if (airport.city) out.city = String(airport.city).trim().slice(0, 150);
  if (airport.country) out.country = String(airport.country).trim().slice(0, 100);
  if (Number.isFinite(airport.latitude)) out.latitude = airport.latitude;
  if (Number.isFinite(airport.longitude)) out.longitude = airport.longitude;
  return out;
}

/**
 * Normalize a flight leg to the compact persisted shape.
 * @param {Object} leg
 * @returns {Object|null}
 */
function normalizeLeg(leg) {
  if (!leg || typeof leg !== "object") return null;
  const from = String(leg.from || "").trim().toUpperCase();
  const to = String(leg.to || "").trim().toUpperCase();
  if (!from || !to) return null;
  const out = { from, to };
  if (leg.flightNumber) out.flightNumber = String(leg.flightNumber).trim().slice(0, 30);
  return out;
}

/**
 * Build a payload for saving a guest's flight information (Travel section).
 *
 * Flight details are stored on the `guests` collection document, inside the
 * nested `flightInfo` map. This keeps all live guest data in one place (the
 * `guests` collection) instead of a separate collection.
 *
 * The payload is explicit and allowlisted: only the fields the guest can
 * actually edit are included, and each is normalized (trimmed, bounded) so it
 * passes the runtime validator and the Firestore rules.
 *
 * @param {Object} input
 * @param {string} input.guestId
 * @param {Object|null} input.origin        departure airport (normalized)
 * @param {Object|null} input.destination   arrival airport (normalized)
 * @param {Array<Object>} [input.connections]  connecting airports (0–3)
 * @param {Array<Object>} [input.legs]      flight legs (0–4)
 * @param {string} [input.arrivalDate]      YYYY-MM-DD
 * @param {string} [input.arrivalTime]      HH:MM
 * @param {string} [input.finalFlightNumber]
 * @param {Object|null} [input.departure]   return-trip details (normalized)
 * @param {string} input.editorGuestId
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGuestFlightInfoPayload({
  guestId,
  origin,
  destination,
  connections = [],
  legs = [],
  arrivalDate,
  arrivalTime,
  finalFlightNumber,
  departure,
  editorGuestId,
  timestamp,
}) {
  const flightInfo = {};

  if (origin) flightInfo.origin = normalizeAirport(origin);
  if (destination) flightInfo.destination = normalizeAirport(destination);

  const normalizedConnections = (connections || [])
    .map(normalizeAirport)
    .filter(Boolean)
    .slice(0, 3);
  if (normalizedConnections.length > 0) flightInfo.connections = normalizedConnections;

  const normalizedLegs = (legs || [])
    .map(normalizeLeg)
    .filter(Boolean)
    .slice(0, 4);
  if (normalizedLegs.length > 0) flightInfo.legs = normalizedLegs;

  if (arrivalDate) flightInfo.arrivalDate = String(arrivalDate).trim();
  if (arrivalTime) flightInfo.arrivalTime = String(arrivalTime).trim();
  if (finalFlightNumber) flightInfo.finalFlightNumber = String(finalFlightNumber).trim().slice(0, 30);

  // Return-trip details (the "Dis-nous comment tu repars" section). Mirrors
  // the arrival fields but grouped under a `departure` map so the two trips
  // stay clearly separated in the guest document.
  const normalizedDeparture = normalizeDeparture(departure);
  if (normalizedDeparture) flightInfo.departure = normalizedDeparture;

  return {
    guestId,
    flightInfo,
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


// ── Genre ratings collection ───────────────────────────────────────────

/**
 * Build a payload for saving a guest's 1–5 star rating for a music genre
 * (the genre survey).
 *
 * One document per (genre, guest) pair. The document ID is
 * `${genreId}_${guestId}`, which the Firestore rules enforce so a guest can
 * only ever create/update their own single rating for a given genre.
 *
 * A parent genre and its subgenres are rated independently — rating a parent
 * never overwrites a child's rating (each has its own document).
 *
 * @param {Object} input
 * @param {string} input.genreId  the stable curated genre id (e.g. "mx-norteno")
 * @param {string} input.genreName the human-readable genre name (for display)
 * @param {string} input.guestId  the rating guest's id (== auth uid)
 * @param {number} input.rating   integer 1–5
 * @param {*} input.timestamp     e.g. serverTimestamp()
 * @returns {Object} explicit payload for setDoc(..., { merge: true })
 */
export function buildGenreRatingPayload({ genreId, genreName, guestId, rating, timestamp }) {
  return {
    genreId: String(genreId ?? "").trim(),
    genreName: String(genreName ?? "").trim(),
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
 * @param {string} [input.assignedGuestId] the guest the song is FOR (defaults
 *                                  to the requesting guest). Lets a guest
 *                                  request a song on behalf of a group member.
 * @param {*} input.timestamp      e.g. serverTimestamp()
 * @returns {Object} explicit payload for addDoc(...)
 */
export function buildSongRequestPayload({ guestId, song, intent, bandType, songMeta, assignedGuestId, timestamp }) {
  const payload = {
    guestId: String(guestId ?? "").trim(),
    song: String(song ?? "").trim(),
    intent: String(intent ?? "").trim(),
    updatedBy: String(guestId ?? "").trim(),
    updatedAt: timestamp,
  };

  // The guest the song is FOR. Defaults to the requesting guest so existing
  // requests (and callers that don't pass it) keep working unchanged.
  payload.assignedGuestId = String(assignedGuestId ?? guestId ?? "").trim();


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
  age,
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
      age: Number.parseInt(String(age ?? ""), 10) || undefined,
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
    "firstName", "middleName", "lastName", "maternalLastName", "gender", "age", "cloudinaryId", "phone", "idCheckUser",
    "messageAuthor", "invitationGroup", "invitationSent", "_deleted",
  ]);


  if (!GUEST_WRITABLE_FIELDS.has(field)) return null;

  const payload = {
    guestId,
    invitationGroup: String(invitationGroup ?? "").trim(),
    updatedBy: guestId,
    updatedAt: timestamp,
  };

  if (["firstName", "middleName", "lastName", "maternalLastName", "gender", "age", "cloudinaryId", "phone"].includes(field)) {
    const normalizedValue = ["firstName", "middleName", "lastName", "maternalLastName"].includes(field)
      ? normalizeTitleCase(value)
      : field === "age"
        ? Number.parseInt(String(value ?? ""), 10) || undefined
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

/**
 * Build a payload for the dashboard's cabin-assignment writes (drag-and-drop,
 * remove, and "+ Agregar"). The `hosting` map is the ONLY domain field written
 * here — it carries the active period's cabin/room (or xtraCabin/xtraRoom for
 * the coast period) plus the other period's fields and the payment flags, which
 * the caller preserves from the LIVE record. `updatedBy`/`updatedAt` are the
 * standard audit fields.
 *
 * @param {Object} params
 * @param {string} params.guestId
 * @param {Object} params.hosting — the full `hosting` map to persist (merge).
 * @param {string} params.editorGuestId — the admin's uid (or "dashboard").
 * @param {*} params.timestamp — a Firestore serverTimestamp() sentinel.
 * @returns {Object} explicit payload for the `guests` doc.
 */
export function buildDashboardGuestHostingPayload({ guestId, hosting, editorGuestId, timestamp }) {
  return {
    guestId,
    hosting: hosting || {},
    updatedBy: editorGuestId || "dashboard",
    updatedAt: timestamp,
  };
}


