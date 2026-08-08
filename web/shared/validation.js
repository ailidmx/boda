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
  "invitationGroup", "updatedBy", "updatedAt", "_deleted", "rsvp",
];

const GUEST_IDENTITY_FIELDS = [
  "age", "cloudinaryId", "firstName", "gender", "middleName", "lastName", "maternalLastName", "lang", "phone",
];

// Fields that clients may MODIFY (mirrors the `affectedKeys().hasOnly()` list).
const GUEST_WRITABLE_FIELDS = [
  "guestId", "identity", "idCheckUser", "cloudinaryId", "messageAuthor",
  "invitationGroup", "updatedBy", "updatedAt", "_deleted", "rsvp",
];



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
