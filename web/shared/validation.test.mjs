/**
 * Unit tests for web/shared/validation.js
 *
 * These tests verify that the runtime validators correctly mirror the
 * Firestore Security Rules. They are framework-agnostic (no React, no
 * Firebase) and run with Node's built-in test runner.
 *
 * Run: node --test web/shared/validation.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGuestContactPayload,
  validateAttendancePayload,
  validateRsvpPayload,
  validatePetanquePayload,
  validateCoastPayload,
} from "./validation.js";

// ── validateGuestContactPayload ─────────────────────────────────────────

test("validateGuestContactPayload: accepts a valid contact update", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    identity: { phone: "+33 6 12 34 56 78" },
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateGuestContactPayload: rejects missing required fields", () => {
  const result = validateGuestContactPayload({
    identity: { phone: "+33 6 12 34 56 78" },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("missing required fields")));
});

test("validateGuestContactPayload: rejects sheet-synced fields being modified", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    isAdmin: true, // sheet-synced, not writable
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("sheet-synced")));
});

test("validateGuestContactPayload: rejects unknown fields", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    email: "catherine@example.com", // not in the allowed schema
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

test("validateGuestContactPayload: rejects non-boolean idCheckUser", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    idCheckUser: "yes", // should be boolean
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("idCheckUser")));
});

test("validateGuestContactPayload: rejects unsupported identity fields", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    identity: { nickname: "Kiki" },
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("identity contains unsupported fields")));
});

test("validateGuestContactPayload: rejects non-object payload", () => {
  const result = validateGuestContactPayload("not-an-object");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("must be an object")));
});

test("validateGuestContactPayload: accepts _deleted boolean", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    _deleted: true,
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
});

test("validateGuestContactPayload: rejects _deleted non-boolean", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    _deleted: "yes", // should be boolean
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("_deleted")));
});

// ── validateAttendancePayload ───────────────────────────────────────────

test("validateAttendancePayload: accepts a valid attendance response", () => {
  const result = validateAttendancePayload({
    guestId: "catherine",
    friday: "yes",
    saturday: "no",
    sunday: "maybe",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    language: "es",
    schemaVersion: 1,
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateAttendancePayload: rejects invalid attendance value", () => {
  const result = validateAttendancePayload({
    guestId: "catherine",
    friday: "definitely", // not in ["yes", "no", "maybe", ""]
    saturday: "no",
    sunday: "maybe",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    language: "es",
    schemaVersion: 1,
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("friday")));
});

test("validateAttendancePayload: rejects wrong schemaVersion", () => {
  const result = validateAttendancePayload({
    guestId: "catherine",
    friday: "yes",
    saturday: "no",
    sunday: "maybe",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    language: "es",
    schemaVersion: 2, // should be 1
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

test("validateAttendancePayload: rejects invalid language", () => {
  const result = validateAttendancePayload({
    guestId: "catherine",
    friday: "yes",
    saturday: "no",
    sunday: "maybe",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    language: "de", // not in ["es", "fr", "en"]
    schemaVersion: 1,
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("language")));
});

test("validateAttendancePayload: rejects unknown fields", () => {
  const result = validateAttendancePayload({
    guestId: "catherine",
    friday: "yes",
    saturday: "no",
    sunday: "maybe",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    language: "es",
    schemaVersion: 1,
    updatedAt: "2026-08-04T00:00:00Z",
    extraField: "not allowed",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

// ── validateRsvpPayload ─────────────────────────────────────────────────

const validRsvp = {
  firstName: "Camille",
  lastName: "Martin",
  email: "camille@example.com",
  whatsapp: "+33 6 00 00 00 00",
  attendance: "yes",
  groupMode: "solo",
  groupName: "",
  partySize: "1",
  adults: "1",
  children: "0",
  guests: "",
  accommodation: "independent",
  independentArrival: "friday",
  sundayMorning: "yes",
  travelStatus: "booked",
  arrivalFrom: "Madrid",
  arrivalTo: "GDL",
  arrivalDate: "2027-02-19",
  arrivalTime: "18:30",
  arrivalAirline: "Aeroméxico",
  arrivalFlight: "AM39",
  departureFrom: "GDL",
  departureTo: "Madrid",
  departureDate: "2027-02-22",
  departureTime: "12:00",
  departureAirline: "Aeroméxico",
  departureFlight: "AM36",
  route: "Málaga — Madrid — Guadalajara",
  notes: "",
  language: "fr",
  schemaVersion: 3,
  createdAt: "2026-08-04T00:00:00Z",
};

test("validateRsvpPayload: accepts a valid RSVP submission", () => {
  const result = validateRsvpPayload(validRsvp);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateRsvpPayload: rejects missing required fields", () => {
  const { firstName, ...missing } = validRsvp;
  const result = validateRsvpPayload(missing);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("missing required fields")));
});

test("validateRsvpPayload: rejects wrong schemaVersion", () => {
  const result = validateRsvpPayload({ ...validRsvp, schemaVersion: 1 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

test("validateRsvpPayload: rejects unknown fields", () => {
  const result = validateRsvpPayload({ ...validRsvp, contact: "not allowed" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

test("validateRsvpPayload: rejects empty firstName", () => {
  const result = validateRsvpPayload({ ...validRsvp, firstName: "" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("firstName")));
});

test("validateRsvpPayload: rejects non-string email", () => {
  const result = validateRsvpPayload({ ...validRsvp, email: 12345 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("email")));
});

// ── validatePetanquePayload ─────────────────────────────────────────────

test("validatePetanquePayload: accepts a valid petanque submission", () => {
  const result = validatePetanquePayload({
    petanqueParticipation: "yes",
    petanquePartySize: "2",
    petanqueNames: "Camille, David",
    petanqueOwnBoules: "no",
    language: "fr",
    schemaVersion: 1,
    createdAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validatePetanquePayload: rejects unknown fields", () => {
  const result = validatePetanquePayload({
    petanqueParticipation: "yes",
    petanquePartySize: "2",
    petanqueNames: "Camille, David",
    petanqueOwnBoules: "no",
    language: "fr",
    schemaVersion: 1,
    createdAt: "2026-08-04T00:00:00Z",
    extra: "not allowed",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

test("validatePetanquePayload: rejects wrong schemaVersion", () => {
  const result = validatePetanquePayload({
    petanqueParticipation: "yes",
    petanquePartySize: "2",
    petanqueNames: "Camille, David",
    petanqueOwnBoules: "no",
    language: "fr",
    schemaVersion: 2,
    createdAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

// ── validateCoastPayload ────────────────────────────────────────────────

test("validateCoastPayload: accepts a valid coast submission", () => {
  const result = validateCoastPayload({
    name: "Camille Martin",
    interest: "yes",
    partySize: "1",
    nights: "2",
    destination: "barra",
    style: "hotel",
    note: "",
    language: "fr",
    schemaVersion: 1,
    createdAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateCoastPayload: rejects empty name", () => {
  const result = validateCoastPayload({
    name: "",
    interest: "yes",
    partySize: "1",
    nights: "2",
    destination: "barra",
    style: "hotel",
    note: "",
    language: "fr",
    schemaVersion: 1,
    createdAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("name")));
});

test("validateCoastPayload: rejects unknown fields", () => {
  const result = validateCoastPayload({
    name: "Camille Martin",
    interest: "yes",
    partySize: "1",
    nights: "2",
    destination: "barra",
    style: "hotel",
    note: "",
    language: "fr",
    schemaVersion: 1,
    createdAt: "2026-08-04T00:00:00Z",
    extra: "not allowed",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});
