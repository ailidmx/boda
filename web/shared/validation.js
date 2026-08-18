/**
 * Lightweight runtime validators for guest-facing Firestore payloads.
 *
 * These validators mirror the Firestore Security Rules (see
 * firebase/firestore.rules) so that invalid payloads are caught in the client
 * BEFORE they reach Firestore. They are NOT a security boundary — the Rules
 * remain the authoritative enforcement — but they provide:
 *
 *   1. Early feedback to the user (before a round-trip to Firestore).
 *   2. A single place to reason about what fields are allowed per operation.
 *   3. A testable contract that mirrors the Rules.
 *
 * This module is shared by BOTH the guest-facing invitation app and the
 * back-office dashboard. It is framework-agnostic (no React, no Firebase).
 *
 * Usage:
 *   import { validateGuestContactPayload, validateAttendancePayload } from "../../shared/validation.js";
 *
 *   const result = validateGuestContactPayload(payload);
 *   if (!result.valid) {
 *     console.warn("Invalid payload:", result.errors);
 *     return;
 *   }
 */

// ── Helpers ─────────────────────────────────────────────────────────────

/** @param {*} value @returns {boolean} */
function isString(value) {
  return typeof value === "string";
}

/** @param {*} value @param {number} max @returns {boolean} */
function isShortText(value, max) {
  return isString(value) && value.length <= max;
}

/** @param {*} value @returns {boolean} */
function isNonEmptyString(value) {
  return isString(value) && value.length > 0;
}

/** @param {*} value @returns {boolean} */
function isBoolean(value) {
  return typeof value === "boolean";
}

/** @param {*} value @returns {boolean} */
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {*} value @returns {boolean} */
function isMap(value) {
  return isObject(value);
}

/** @param {Object} obj @param {string[]} keys @returns {boolean} */
function hasAllKeys(obj, keys) {
  return keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/** @param {Object} obj @param {string[]} keys @returns {boolean} */
function hasOnlyKeys(obj, keys) {
  const allowed = new Set(keys);
  return Object.keys(obj).every((k) => allowed.has(k));
}

/** @param {Object} obj @param {string[]} keys @returns {boolean} */
function hasAnyKey(obj, keys) {
  return keys.some((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/** @param {*} value @param {string[]} allowed @returns {boolean} */
function isOneOf(value, allowed) {
  return allowed.includes(value);
}

/**
 * Validate a payload and return { valid, errors }.
 * @param {Object} payload
 * @param {Array<{ check: boolean, message: string }>} checks
 * @returns {{ valid: boolean, errors: string[] }}
 */
function runChecks(payload, checks) {
  const errors = [];
  for (const { check, message } of checks) {
    if (!check) errors.push(message);
  }
  return { valid: errors.length === 0, errors };
}

// ── Guests collection validators ────────────────────────────────────────
// Mirrors `hasValidGuestContactFields()` in firebase/firestore.rules.

// All fields that may exist in a `guests` document (both client-writable and
// sheet-synced read-only). Mirrors the `hasOnly()` list in the rules.
const GUEST_ALLOWED_FIELDS = [
  "guestId", "identity", "hosting", "idCheckUser", "cloudinaryId", "messageAuthor",
  "invitationGroup", "updatedBy", "updatedAt", "_deleted", "rsvp", "flightInfo",
];

const GUEST_IDENTITY_FIELDS = [
  "age", "cloudinaryId", "firstName", "gender", "middleName", "lastName", "maternalLastName", "lang", "phone",
];

// Fields that clients may MODIFY (mirrors the `affectedKeys().hasOnly()` list).
const GUEST_WRITABLE_FIELDS = [
  "guestId", "identity", "idCheckUser", "cloudinaryId", "messageAuthor",
  "invitationGroup", "updatedBy", "updatedAt", "_deleted", "rsvp", "flightInfo",
];

// ── flightInfo (guest flight details for the Travel section) ────────────
// Mirrors `hasValidFlightInfo()` in firebase/firestore.rules.

const FLIGHT_INFO_FIELDS = [
  "origin", "connections", "destination", "legs", "arrivalDate", "arrivalTime", "finalFlightNumber",
  "departure",
];

const DEPARTURE_FIELDS = [
  "origin", "connections", "destination", "legs", "departureDate", "departureTime", "finalFlightNumber",
];

const AIRPORT_FIELDS = [
  "iata", "icao", "name", "city", "country", "countryCode", "latitude", "longitude",
];

const LEG_FIELDS = ["from", "to", "flightNumber"];

/** @param {*} value @returns {boolean} */
function isValidAirport(value) {
  if (!isObject(value)) return false;
  if (!hasOnlyKeys(value, AIRPORT_FIELDS)) return false;
  if (!isShortText(value.iata, 3) || !isNonEmptyString(value.iata)) return false;
  if (value.icao !== undefined && !isShortText(value.icao, 4)) return false;
  if (!isShortText(value.name, 200) || !isNonEmptyString(value.name)) return false;
  if (value.city !== undefined && !isShortText(value.city, 150)) return false;
  if (value.country !== undefined && !isShortText(value.country, 100)) return false;
  if (!isShortText(value.countryCode, 2) || !isNonEmptyString(value.countryCode)) return false;
  if (value.latitude !== undefined && !Number.isFinite(value.latitude)) return false;
  if (value.longitude !== undefined && !Number.isFinite(value.longitude)) return false;
  return true;
}

/** @param {*} value @returns {boolean} */
function isValidLeg(value) {
  if (!isObject(value)) return false;
  if (!hasOnlyKeys(value, LEG_FIELDS)) return false;
  if (!isShortText(value.from, 3) || !isNonEmptyString(value.from)) return false;
  if (!isShortText(value.to, 3) || !isNonEmptyString(value.to)) return false;
  if (value.flightNumber !== undefined && !isShortText(value.flightNumber, 30)) return false;
  return true;
}

/** @param {*} value @returns {boolean} */
function isDateString(value) {
  return isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** @param {*} value @returns {boolean} */
function isTimeString(value) {
  return isString(value) && /^\d{2}:\d{2}$/.test(value);
}

/**
 * Validate the return-trip (departure) details inside `flightInfo`.
 * Mirrors `hasValidDeparture()` in firebase/firestore.rules.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isValidDeparture(value) {
  if (!isObject(value)) return false;
  if (!hasOnlyKeys(value, DEPARTURE_FIELDS)) return false;
  if (value.origin !== undefined && !isValidAirport(value.origin)) return false;
  if (value.destination !== undefined && !isValidAirport(value.destination)) return false;
  if (value.connections !== undefined && !(Array.isArray(value.connections) && value.connections.length <= 3 && value.connections.every(isValidAirport))) return false;
  if (value.legs !== undefined && !(Array.isArray(value.legs) && value.legs.length <= 4 && value.legs.every(isValidLeg))) return false;
  if (value.departureDate !== undefined && !isDateString(value.departureDate)) return false;
  if (value.departureTime !== undefined && !isTimeString(value.departureTime)) return false;
  if (value.finalFlightNumber !== undefined && !isShortText(value.finalFlightNumber, 30)) return false;
  return true;
}



/**
 * Validate a payload intended for the `guests` collection.
 * Mirrors `hasValidGuestContactFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before setDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGuestContactPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, ["guestId", "updatedBy", "updatedAt"]), message: "missing required fields: guestId, updatedBy, updatedAt" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, GUEST_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !GUEST_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Writable fields only (no sheet-synced fields being modified)
    { check: hasOnlyKeys(payload, GUEST_WRITABLE_FIELDS), message: `payload attempts to modify sheet-synced fields: ${Object.keys(payload).filter((k) => !GUEST_WRITABLE_FIELDS.includes(k)).join(", ")}` },
    // Field types and lengths
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["invitationGroup"]) || isShortText(payload.invitationGroup, 150), message: "invitationGroup must be a string ≤ 150 chars" },
    { check: isShortText(payload.updatedBy, 100), message: "updatedBy must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || isObject(payload.identity), message: "identity must be an object" },
    { check: !hasAnyKey(payload, ["identity"]) || hasOnlyKeys(payload.identity, GUEST_IDENTITY_FIELDS), message: `identity contains unsupported fields: ${Object.keys(payload.identity || {}).filter((k) => !GUEST_IDENTITY_FIELDS.includes(k)).join(", ")}` },
    // Optional fields
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["firstName"]) || isShortText(payload.identity.firstName, 100), message: "identity.firstName must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["middleName"]) || isShortText(payload.identity.middleName, 100), message: "identity.middleName must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["lastName"]) || isShortText(payload.identity.lastName, 100), message: "identity.lastName must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["maternalLastName"]) || isShortText(payload.identity.maternalLastName, 100), message: "identity.maternalLastName must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["gender"]) || isShortText(payload.identity.gender, 30), message: "identity.gender must be a string ≤ 30 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["cloudinaryId"]) || isShortText(payload.identity.cloudinaryId, 200), message: "identity.cloudinaryId must be a string ≤ 200 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["phone"]) || isShortText(payload.identity.phone, 50), message: "identity.phone must be a string ≤ 50 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["lang"]) || isShortText(payload.identity.lang, 20), message: "identity.lang must be a string ≤ 20 chars" },
    { check: !hasAnyKey(payload, ["identity"]) || !hasAnyKey(payload.identity, ["age"]) || isShortText(payload.identity.age, 50), message: "identity.age must be a string ≤ 50 chars" },
    { check: !hasAnyKey(payload, ["idCheckUser"]) || isBoolean(payload.idCheckUser), message: "idCheckUser must be a boolean" },
    { check: !hasAnyKey(payload, ["cloudinaryId"]) || (isString(payload.cloudinaryId) && payload.cloudinaryId.length <= 200), message: "cloudinaryId must be a string ≤ 200 chars" },
    { check: !hasAnyKey(payload, ["messageAuthor"]) || isShortText(payload.messageAuthor, 200), message: "messageAuthor must be a string ≤ 200 chars" },
    { check: !hasAnyKey(payload, ["_deleted"]) || isBoolean(payload._deleted), message: "_deleted must be a boolean" },
    // rsvp.answers map (questionId → int 0–5)
    { check: !hasAnyKey(payload, ["rsvp"]) || isObject(payload.rsvp), message: "rsvp must be an object" },
    { check: !hasAnyKey(payload, ["rsvp"]) || hasOnlyKeys(payload.rsvp, ["answers"]), message: `rsvp contains unsupported fields: ${Object.keys(payload.rsvp || {}).filter((k) => k !== "answers").join(", ")}` },
    { check: !hasAnyKey(payload, ["rsvp"]) || !hasAnyKey(payload.rsvp, ["answers"]) || isObject(payload.rsvp.answers), message: "rsvp.answers must be an object" },
    { check: !hasAnyKey(payload, ["rsvp"]) || !hasAnyKey(payload.rsvp, ["answers"]) || Object.keys(payload.rsvp.answers).length <= 100, message: "rsvp.answers must have ≤ 100 entries" },
    { check: !hasAnyKey(payload, ["rsvp"]) || !hasAnyKey(payload.rsvp, ["answers"]) || Object.values(payload.rsvp.answers).every((v) => Number.isInteger(v) && v >= 0 && v <= 5), message: "rsvp.answers values must be integers 0–5" },
    // flightInfo (guest flight details for the Travel section)
    { check: !hasAnyKey(payload, ["flightInfo"]) || isObject(payload.flightInfo), message: "flightInfo must be an object" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || hasOnlyKeys(payload.flightInfo, FLIGHT_INFO_FIELDS), message: `flightInfo contains unsupported fields: ${Object.keys(payload.flightInfo || {}).filter((k) => !FLIGHT_INFO_FIELDS.includes(k)).join(", ")}` },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["origin"]) || isValidAirport(payload.flightInfo.origin), message: "flightInfo.origin must be a valid airport object" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["destination"]) || isValidAirport(payload.flightInfo.destination), message: "flightInfo.destination must be a valid airport object" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["connections"]) || (Array.isArray(payload.flightInfo.connections) && payload.flightInfo.connections.length <= 3 && payload.flightInfo.connections.every(isValidAirport)), message: "flightInfo.connections must be an array of ≤ 3 valid airports" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["legs"]) || (Array.isArray(payload.flightInfo.legs) && payload.flightInfo.legs.length <= 4 && payload.flightInfo.legs.every(isValidLeg)), message: "flightInfo.legs must be an array of ≤ 4 valid legs" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["arrivalDate"]) || isDateString(payload.flightInfo.arrivalDate), message: "flightInfo.arrivalDate must be a YYYY-MM-DD date" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["arrivalTime"]) || isTimeString(payload.flightInfo.arrivalTime), message: "flightInfo.arrivalTime must be a HH:MM time" },
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["finalFlightNumber"]) || isShortText(payload.flightInfo.finalFlightNumber, 30), message: "flightInfo.finalFlightNumber must be a string ≤ 30 chars" },
    // flightInfo.departure (return-trip details for the Travel section)
    { check: !hasAnyKey(payload, ["flightInfo"]) || !hasAnyKey(payload.flightInfo, ["departure"]) || isValidDeparture(payload.flightInfo.departure), message: "flightInfo.departure must be a valid departure object" },
  ];

  return runChecks(payload, checks);
}



// ── Attendance responses validators ─────────────────────────────────────
// Mirrors `hasValidAttendanceFields()` in firebase/firestore.rules.

const ATTENDANCE_ALLOWED_FIELDS = [
  "guestId", "friday", "saturday", "sunday", "invitationGroup",
  "updatedBy", "language", "schemaVersion", "updatedAt",
];

const ATTENDANCE_VALUES = ["yes", "no", "maybe", ""];

/**
 * Validate a payload intended for the `attendance_responses` collection.
 * Mirrors `hasValidAttendanceFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before setDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAttendancePayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, ["guestId", "friday", "saturday", "sunday", "invitationGroup", "updatedBy", "language", "schemaVersion", "updatedAt"]), message: "missing required fields" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, ATTENDANCE_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !ATTENDANCE_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and values
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: isOneOf(payload.friday, ATTENDANCE_VALUES), message: "friday must be one of: yes, no, maybe, ''" },
    { check: isOneOf(payload.saturday, ATTENDANCE_VALUES), message: "saturday must be one of: yes, no, maybe, ''" },
    { check: isOneOf(payload.sunday, ATTENDANCE_VALUES), message: "sunday must be one of: yes, no, maybe, ''" },
    { check: isShortText(payload.invitationGroup, 150), message: "invitationGroup must be a string ≤ 150 chars" },
    { check: isShortText(payload.updatedBy, 100), message: "updatedBy must be a string ≤ 100 chars" },
    { check: isOneOf(payload.language, ["es", "fr", "en"]), message: "language must be one of: es, fr, en" },
    { check: payload.schemaVersion === 1, message: "schemaVersion must be 1" },
  ];

  return runChecks(payload, checks);
}

// ── Card votes validators ───────────────────────────────────────────────
// Mirrors `hasValidCardVoteFields()` in firebase/firestore.rules.

const CARD_VOTE_ALLOWED_FIELDS = [
  "cardType", "cardKey", "guestId", "rating", "updatedBy", "updatedAt",
];

/**
 * Validate a payload intended for the `card_votes` collection.
 * Mirrors `hasValidCardVoteFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before setDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCardVotePayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, CARD_VOTE_ALLOWED_FIELDS), message: "missing required fields: cardType, cardKey, guestId, rating, updatedBy, updatedAt" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, CARD_VOTE_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !CARD_VOTE_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and values
    { check: isOneOf(payload.cardType, ["food", "music", "guiso"]), message: "cardType must be one of: food, music, guiso" },
    { check: isShortText(payload.cardKey, 100) && isNonEmptyString(payload.cardKey), message: "cardKey must be a non-empty string ≤ 100 chars" },
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: Number.isInteger(payload.rating) && payload.rating >= 1 && payload.rating <= 5, message: "rating must be an integer 1–5" },
    { check: isShortText(payload.updatedBy, 100) && isNonEmptyString(payload.updatedBy), message: "updatedBy must be a non-empty string ≤ 100 chars" },
  ];

  return runChecks(payload, checks);
}

// ── Genre ratings validators ────────────────────────────────────────────
// Mirrors `hasValidGenreRatingFields()` in firebase/firestore.rules.

const GENRE_RATING_ALLOWED_FIELDS = [
  "genreId", "genreName", "guestId", "rating", "updatedBy", "updatedAt",
];

/**
 * Validate a payload intended for the `genre_ratings` collection.
 * Mirrors `hasValidGenreRatingFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before setDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGenreRatingPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, GENRE_RATING_ALLOWED_FIELDS), message: "missing required fields: genreId, genreName, guestId, rating, updatedBy, updatedAt" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, GENRE_RATING_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !GENRE_RATING_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and values
    { check: isShortText(payload.genreId, 100) && isNonEmptyString(payload.genreId), message: "genreId must be a non-empty string ≤ 100 chars" },
    { check: isShortText(payload.genreName, 200) && isNonEmptyString(payload.genreName), message: "genreName must be a non-empty string ≤ 200 chars" },
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: Number.isInteger(payload.rating) && payload.rating >= 1 && payload.rating <= 5, message: "rating must be an integer 1–5" },
    { check: isShortText(payload.updatedBy, 100) && isNonEmptyString(payload.updatedBy), message: "updatedBy must be a non-empty string ≤ 100 chars" },
  ];

  return runChecks(payload, checks);
}

// ── Guiso rankings validators ───────────────────────────────────────────
// Mirrors `hasValidGuisoRankingFields()` in firebase/firestore.rules.

const GUISO_RANKING_ALLOWED_FIELDS = [
  "guestId", "ranking", "selected", "updatedBy", "updatedAt",
];

/**
 * Validate a payload intended for the `guiso_rankings` collection.
 * Mirrors `hasValidGuisoRankingFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before setDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGuisoRankingPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const ranking = Array.isArray(payload.ranking) ? payload.ranking : [];
  const selected = Array.isArray(payload.selected) ? payload.selected : [];
  const rankingUnique = new Set(ranking).size === ranking.length;
  const selectedUnique = new Set(selected).size === selected.length;
  const selectedInRanking = selected.every((d) => ranking.includes(d));

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, GUISO_RANKING_ALLOWED_FIELDS), message: "missing required fields: guestId, ranking, selected, updatedBy, updatedAt" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, GUISO_RANKING_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !GUISO_RANKING_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and values
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: Array.isArray(payload.ranking), message: "ranking must be an array" },
    { check: ranking.length >= 1 && ranking.length <= 20, message: "ranking must contain between 1 and 20 dishes" },
    { check: ranking.every((d) => isShortText(d, 100) && isNonEmptyString(d)), message: "ranking entries must be non-empty strings ≤ 100 chars" },
    { check: rankingUnique, message: "ranking must not contain duplicate dishes" },
    { check: Array.isArray(payload.selected), message: "selected must be an array" },
    { check: selected.length <= 9, message: "selected must contain at most 9 dishes" },
    { check: selected.every((d) => isShortText(d, 100) && isNonEmptyString(d)), message: "selected entries must be non-empty strings ≤ 100 chars" },
    { check: selectedUnique, message: "selected must not contain duplicate dishes" },
    { check: selectedInRanking, message: "selected dishes must be present in ranking" },
    { check: isShortText(payload.updatedBy, 100) && isNonEmptyString(payload.updatedBy), message: "updatedBy must be a non-empty string ≤ 100 chars" },
  ];

  return runChecks(payload, checks);
}

// ── Song requests validators ────────────────────────────────────────────
// Mirrors `hasValidSongRequestFields()` in firebase/firestore.rules.

const SONG_REQUEST_ALLOWED_FIELDS = [
  "guestId", "song", "intent", "bandType", "songMeta", "updatedBy", "updatedAt",
];
const SONG_REQUEST_INTENTS = ["hear", "sing", "karaoke", "band"];

// Allowed live-band types, only meaningful when intent == "band".
const SONG_REQUEST_BAND_TYPES = ["marimba", "mariachi", "norteno", "frenchBand"];

// Allowed keys inside the optional `songMeta` map (normalized song identity).

const SONG_META_ALLOWED_FIELDS = [
  "title", "artist", "year", "externalId", "source", "isrc",
];

/**
 * Validate a payload intended for the `song_requests` collection.
 * Mirrors `hasValidSongRequestFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before addDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSongRequestPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, SONG_REQUEST_ALLOWED_FIELDS), message: "missing required fields: guestId, song, intent, updatedBy, updatedAt" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, SONG_REQUEST_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !SONG_REQUEST_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and values
    { check: isShortText(payload.guestId, 100) && isNonEmptyString(payload.guestId), message: "guestId must be a non-empty string ≤ 100 chars" },
    { check: isShortText(payload.song, 200) && isNonEmptyString(payload.song), message: "song must be a non-empty string ≤ 200 chars" },
    { check: isOneOf(payload.intent, SONG_REQUEST_INTENTS), message: "intent must be one of: hear, sing, karaoke, band" },
    // Optional bandType, only meaningful when intent == "band"
    { check: !hasAnyKey(payload, ["bandType"]) || isOneOf(payload.bandType, SONG_REQUEST_BAND_TYPES), message: "bandType must be one of: marimba, mariachi, norteno, frenchBand" },
    { check: isShortText(payload.updatedBy, 100) && isNonEmptyString(payload.updatedBy), message: "updatedBy must be a non-empty string ≤ 100 chars" },
    // Optional songMeta map (normalized song identity)

    { check: !hasAnyKey(payload, ["songMeta"]) || isObject(payload.songMeta), message: "songMeta must be an object" },
    { check: !hasAnyKey(payload, ["songMeta"]) || hasOnlyKeys(payload.songMeta, SONG_META_ALLOWED_FIELDS), message: `songMeta contains unsupported fields: ${Object.keys(payload.songMeta || {}).filter((k) => !SONG_META_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["title"]) || isShortText(payload.songMeta.title, 200), message: "songMeta.title must be a string ≤ 200 chars" },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["artist"]) || isShortText(payload.songMeta.artist, 200), message: "songMeta.artist must be a string ≤ 200 chars" },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["year"]) || (Number.isInteger(payload.songMeta.year) && payload.songMeta.year >= 1000 && payload.songMeta.year <= 2100), message: "songMeta.year must be an integer year" },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["externalId"]) || isShortText(payload.songMeta.externalId, 100), message: "songMeta.externalId must be a string ≤ 100 chars" },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["source"]) || isShortText(payload.songMeta.source, 50), message: "songMeta.source must be a string ≤ 50 chars" },
    { check: !hasAnyKey(payload, ["songMeta"]) || !hasAnyKey(payload.songMeta, ["isrc"]) || isShortText(payload.songMeta.isrc, 50), message: "songMeta.isrc must be a string ≤ 50 chars" },
  ];

  return runChecks(payload, checks);
}



// ── RSVP submissions validators ─────────────────────────────────────────

// Mirrors `hasValidRsvpFields()` in firebase/firestore.rules.

const RSVP_REQUIRED_FIELDS = [
  "firstName", "lastName", "email", "whatsapp", "attendance",
  "groupMode", "groupName", "partySize", "adults", "children",
  "guests", "accommodation", "travelStatus", "arrivalFrom",
  "arrivalTo", "arrivalDate", "arrivalTime", "arrivalAirline",
  "arrivalFlight", "departureFrom", "departureTo", "departureDate",
  "departureTime", "departureAirline", "departureFlight", "route",
  "notes", "language", "schemaVersion", "createdAt",
];

const RSVP_ALLOWED_FIELDS = [
  ...RSVP_REQUIRED_FIELDS,
  "independentArrival", "sundayMorning", "invitationCode",
];

/**
 * Validate a payload intended for the `rsvp_submissions` collection.
 * Mirrors `hasValidRsvpFields()` in the rules.
 *
 * @param {Object} payload  the payload to validate (before addDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRsvpPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Required fields
    { check: hasAllKeys(payload, RSVP_REQUIRED_FIELDS), message: "missing required fields" },
    // Allowed fields only
    { check: hasOnlyKeys(payload, RSVP_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !RSVP_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and lengths
    { check: isShortText(payload.firstName, 100) && isNonEmptyString(payload.firstName), message: "firstName must be a non-empty string ≤ 100 chars" },
    { check: isShortText(payload.lastName, 100) && isNonEmptyString(payload.lastName), message: "lastName must be a non-empty string ≤ 100 chars" },
    { check: isShortText(payload.email, 254) && isNonEmptyString(payload.email), message: "email must be a non-empty string ≤ 254 chars" },
    { check: isShortText(payload.whatsapp, 50) && isNonEmptyString(payload.whatsapp), message: "whatsapp must be a non-empty string ≤ 50 chars" },
    { check: isShortText(payload.attendance, 30), message: "attendance must be a string ≤ 30 chars" },
    { check: isShortText(payload.groupMode, 30), message: "groupMode must be a string ≤ 30 chars" },
    { check: isShortText(payload.groupName, 150), message: "groupName must be a string ≤ 150 chars" },
    { check: isShortText(payload.partySize, 2), message: "partySize must be a string ≤ 2 chars" },
    { check: isShortText(payload.adults, 2), message: "adults must be a string ≤ 2 chars" },
    { check: isShortText(payload.children, 2), message: "children must be a string ≤ 2 chars" },
    { check: isShortText(payload.guests, 1000), message: "guests must be a string ≤ 1000 chars" },
    { check: isShortText(payload.accommodation, 30), message: "accommodation must be a string ≤ 30 chars" },
    { check: !hasAnyKey(payload, ["independentArrival"]) || isShortText(payload.independentArrival, 30), message: "independentArrival must be a string ≤ 30 chars" },
    { check: !hasAnyKey(payload, ["sundayMorning"]) || isShortText(payload.sundayMorning, 30), message: "sundayMorning must be a string ≤ 30 chars" },
    { check: isShortText(payload.travelStatus, 30), message: "travelStatus must be a string ≤ 30 chars" },
    { check: isShortText(payload.arrivalFrom, 150), message: "arrivalFrom must be a string ≤ 150 chars" },
    { check: isShortText(payload.arrivalTo, 150), message: "arrivalTo must be a string ≤ 150 chars" },
    { check: isShortText(payload.arrivalDate, 10), message: "arrivalDate must be a string ≤ 10 chars" },
    { check: isShortText(payload.arrivalTime, 5), message: "arrivalTime must be a string ≤ 5 chars" },
    { check: isShortText(payload.arrivalAirline, 100), message: "arrivalAirline must be a string ≤ 100 chars" },
    { check: isShortText(payload.arrivalFlight, 30), message: "arrivalFlight must be a string ≤ 30 chars" },
    { check: isShortText(payload.departureFrom, 150), message: "departureFrom must be a string ≤ 150 chars" },
    { check: isShortText(payload.departureTo, 150), message: "departureTo must be a string ≤ 150 chars" },
    { check: isShortText(payload.departureDate, 10), message: "departureDate must be a string ≤ 10 chars" },
    { check: isShortText(payload.departureTime, 5), message: "departureTime must be a string ≤ 5 chars" },
    { check: isShortText(payload.departureAirline, 100), message: "departureAirline must be a string ≤ 100 chars" },
    { check: isShortText(payload.departureFlight, 30), message: "departureFlight must be a string ≤ 30 chars" },
    { check: isShortText(payload.route, 500), message: "route must be a string ≤ 500 chars" },
    { check: isShortText(payload.notes, 2000), message: "notes must be a string ≤ 2000 chars" },
    { check: isOneOf(payload.language, ["es", "fr", "en"]), message: "language must be one of: es, fr, en" },
    { check: payload.schemaVersion === 3, message: "schemaVersion must be 3" },
  ];

  return runChecks(payload, checks);
}

// ── Petanque submissions validators ─────────────────────────────────────
// Mirrors the petanque rules in firebase/firestore.rules.

const PETANQUE_ALLOWED_FIELDS = [
  "petanqueParticipation", "petanquePartySize", "petanqueNames",
  "petanqueOwnBoules", "invitationCode", "language",
  "schemaVersion", "createdAt",
];

/**
 * Validate a payload intended for the `petanque_participation` collection.
 * Mirrors the petanque rules in firebase/firestore.rules.
 *
 * @param {Object} payload  the payload to validate (before addDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePetanquePayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Allowed fields only
    { check: hasOnlyKeys(payload, PETANQUE_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !PETANQUE_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and lengths
    { check: isShortText(payload.petanqueParticipation, 30), message: "petanqueParticipation must be a string ≤ 30 chars" },
    { check: isShortText(payload.petanquePartySize, 2), message: "petanquePartySize must be a string ≤ 2 chars" },
    { check: isShortText(payload.petanqueNames, 500), message: "petanqueNames must be a string ≤ 500 chars" },
    { check: isShortText(payload.petanqueOwnBoules, 30), message: "petanqueOwnBoules must be a string ≤ 30 chars" },
    { check: isOneOf(payload.language, ["es", "fr", "en"]), message: "language must be one of: es, fr, en" },
    { check: payload.schemaVersion === 1, message: "schemaVersion must be 1" },
  ];

  return runChecks(payload, checks);
}

// ── Coast submissions validators ────────────────────────────────────────
// Mirrors the coast rules in firebase/firestore.rules.

const COAST_ALLOWED_FIELDS = [
  "name", "interest", "partySize", "nights", "destination", "style",
  "note", "invitationCode", "language", "schemaVersion", "createdAt",
];

/**
 * Validate a payload intended for the `coast_interest` collection.
 * Mirrors the coast rules in firebase/firestore.rules.
 *
 * @param {Object} payload  the payload to validate (before addDoc)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCoastPayload(payload) {
  if (!isObject(payload)) {
    return { valid: false, errors: ["payload must be an object"] };
  }

  const checks = [
    // Allowed fields only
    { check: hasOnlyKeys(payload, COAST_ALLOWED_FIELDS), message: `payload contains fields not in the allowed schema: ${Object.keys(payload).filter((k) => !COAST_ALLOWED_FIELDS.includes(k)).join(", ")}` },
    // Field types and lengths
    { check: isShortText(payload.name, 150) && isNonEmptyString(payload.name), message: "name must be a non-empty string ≤ 150 chars" },
    { check: isShortText(payload.interest, 50), message: "interest must be a string ≤ 50 chars" },
    { check: isShortText(payload.partySize, 2), message: "partySize must be a string ≤ 2 chars" },
    { check: isShortText(payload.nights, 1), message: "nights must be a string ≤ 1 char" },
    { check: isShortText(payload.destination, 100), message: "destination must be a string ≤ 100 chars" },
    { check: isShortText(payload.style, 100), message: "style must be a string ≤ 100 chars" },
    { check: isShortText(payload.note, 2000), message: "note must be a string ≤ 2000 chars" },
    { check: isOneOf(payload.language, ["es", "fr", "en"]), message: "language must be one of: es, fr, en" },
    { check: payload.schemaVersion === 1, message: "schemaVersion must be 1" },
  ];

  return runChecks(payload, checks);
}

// ── Invitation code validation ──────────────────────────────────────────
// Mirrors `hasValidInvitationCode()` in firebase/firestore.rules.

const VALID_INVITATION_CODES = [
  "hortencia_privada_pagada",
  "cabaña_33_privada_porpagar",
  "azalea_compartida_porpagar",
  "sin_cabaña",
  "cabaña_5_privada_porpagar",
  "cabaña_34_privada_pagada",
  "cabaña_4_compartida_pagada",
  "lavanda_compartida_porpagar",
  "casona_compartida_pagada",
  "margarita_compartida_porpagar",
  "cabaña_6_privada_porpagar",
  "dalia_compartida_porpagar",
  "cabaña_31_privada_porpagar",
  "cabaña_32_privada_porpagar",
];

/**
 * Validate an invitation code against the known list.
 * Mirrors `hasValidInvitationCode()` in the rules.
 *
 * @param {string|undefined} code  the invitation code (optional)
 * @returns {boolean} true if the code is absent or valid
 */
export function isValidInvitationCode(code) {
  if (code === undefined || code === null || code === "") return true;
  return VALID_INVITATION_CODES.includes(code);
}
