import assert from "node:assert/strict";
import test from "node:test";
import {
  validateGuestContactPayload,
  validateAttendancePayload,
  validateRsvpPayload,
  validatePetanquePayload,
  validateCoastPayload,
  isValidInvitationCode,
} from "../../shared/validation.js";

// ── Guest contact payload ──────────────────────────────────────────────

test("valid guest name payload passes", () => {
  const payload = {
    guestId: "guest-1",
    identity: {
      firstName: "Ana",
      middleName: "María",
      lastName: "García",
      maternalLastName: "López",
      gender: "M",
      cloudinaryId: "v123/abc",
    },
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("valid guest photo payload passes", () => {
  const payload = {
    guestId: "guest-1",
    cloudinaryId: "v123/abc",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("valid nested guest photo payload passes", () => {
  const payload = {
    guestId: "guest-1",
    identity: { cloudinaryId: "v123/abc" },
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("valid guest contact payload passes", () => {
  const payload = {
    guestId: "guest-1",
    identity: { phone: "+52 555 123 4567" },
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("valid identity check payload passes", () => {
  const payload = {
    guestId: "guest-1",
    idCheckUser: true,
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("missing required fields fails", () => {
  const payload = {
    identity: { firstName: "Ana" },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("missing required fields")));
});

test("sheet-synced fields are rejected", () => {
  const payload = {
    guestId: "guest-1",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
    hosting: { cabin: "Azalea" }, // sheet-synced, not client-writable
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("sheet-synced")));
});

test("unknown fields are rejected", () => {
  const payload = {
    guestId: "guest-1",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
    totallyUnknownField: "x", // not in the allowed schema
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});


test("idCheckUser must be a boolean", () => {
  const payload = {
    guestId: "guest-1",
    idCheckUser: "yes", // string, not boolean
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("idCheckUser")));
});

test("identity only allows agreed nested fields", () => {
  const payload = {
    guestId: "guest-1",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
    identity: { nickname: "Ani" },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("identity contains unsupported fields")));
});

test("identity maternalLastName is accepted", () => {
  const payload = {
    guestId: "guest-1",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
    identity: { firstName: "Ana", maternalLastName: "López" },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("guestId must be non-empty", () => {
  const payload = {
    guestId: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("guestId")));
});

test("non-object payload fails", () => {
  assert.equal(validateGuestContactPayload(null).valid, false);
  assert.equal(validateGuestContactPayload("string").valid, false);
  assert.equal(validateGuestContactPayload(42).valid, false);
});

// ── flightInfo payload (Travel section) ────────────────────────────────

function makeValidFlightInfoPayload() {
  return {
    guestId: "guest-1",
    flightInfo: {
      origin: {
        iata: "MAD",
        icao: "LEMD",
        name: "Adolfo Suárez Madrid–Barajas Airport",
        city: "Madrid",
        country: "Spain",
        countryCode: "ES",
        latitude: 40.4719,
        longitude: -3.5626,
      },
      destination: {
        iata: "GDL",
        icao: "MMGL",
        name: "Guadalajara International Airport",
        city: "Guadalajara",
        country: "Mexico",
        countryCode: "MX",
        latitude: 20.5218,
        longitude: -103.3112,
      },
      connections: [
        {
          iata: "CDG",
          icao: "LFPG",
          name: "Charles de Gaulle Airport",
          city: "Paris",
          country: "France",
          countryCode: "FR",
        },
      ],
      legs: [
        { from: "MAD", to: "CDG", flightNumber: "AF 1001" },
        { from: "CDG", to: "GDL", flightNumber: "AF 58" },
      ],
      arrivalDate: "2027-02-19",
      arrivalTime: "14:30",
      finalFlightNumber: "AF 58",
    },
    updatedBy: "guest-1",
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
}

test("valid flightInfo payload passes", () => {
  const result = validateGuestContactPayload(makeValidFlightInfoPayload());
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("flightInfo with only origin and destination passes", () => {
  const payload = makeValidFlightInfoPayload();
  delete payload.flightInfo.connections;
  delete payload.flightInfo.legs;
  delete payload.flightInfo.arrivalDate;
  delete payload.flightInfo.arrivalTime;
  delete payload.flightInfo.finalFlightNumber;
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("flightInfo with unsupported field fails", () => {
  const payload = makeValidFlightInfoPayload();
  payload.flightInfo.airline = "Aeroméxico"; // not in the allowed schema
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo contains unsupported fields")));
});

test("flightInfo with invalid airport (missing iata) fails", () => {
  const payload = makeValidFlightInfoPayload();
  delete payload.flightInfo.origin.iata;
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo.origin")));
});

test("flightInfo with too many connections fails", () => {
  const payload = makeValidFlightInfoPayload();
  payload.flightInfo.connections = [
    { iata: "CDG", name: "Paris", countryCode: "FR" },
    { iata: "AMS", name: "Amsterdam", countryCode: "NL" },
    { iata: "FRA", name: "Frankfurt", countryCode: "DE" },
    { iata: "LHR", name: "London", countryCode: "GB" }, // 4th → over the 3 limit
  ];
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo.connections")));
});

test("flightInfo with invalid arrival date fails", () => {
  const payload = makeValidFlightInfoPayload();
  payload.flightInfo.arrivalDate = "19/02/2027"; // not YYYY-MM-DD
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo.arrivalDate")));
});

test("flightInfo with invalid arrival time fails", () => {
  const payload = makeValidFlightInfoPayload();
  payload.flightInfo.arrivalTime = "2:30 PM"; // not HH:MM
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo.arrivalTime")));
});

test("flightInfo with invalid leg fails", () => {
  const payload = makeValidFlightInfoPayload();
  payload.flightInfo.legs = [{ from: "MAD" }]; // missing `to`
  const result = validateGuestContactPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("flightInfo.legs")));
});

// ── Attendance payload ─────────────────────────────────────────────────

test("valid attendance payload passes", () => {
  const payload = {
    guestId: "guest-1",
    friday: "yes",
    saturday: "maybe",
    sunday: "no",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "es",
    schemaVersion: 1,
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("empty attendance values pass", () => {
  const payload = {
    guestId: "guest-1",
    friday: "",
    saturday: "",
    sunday: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "es",
    schemaVersion: 1,
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("invalid attendance value fails", () => {
  const payload = {
    guestId: "guest-1",
    friday: "definitely", // not yes/no/maybe/''
    saturday: "no",
    sunday: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "es",
    schemaVersion: 1,
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("friday")));
});

test("invalid language fails", () => {
  const payload = {
    guestId: "guest-1",
    friday: "yes",
    saturday: "no",
    sunday: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "de", // not es/fr/en
    schemaVersion: 1,
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("language")));
});

test("wrong schemaVersion fails", () => {
  const payload = {
    guestId: "guest-1",
    friday: "yes",
    saturday: "no",
    sunday: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "es",
    schemaVersion: 2, // must be 1
    updatedAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

test("unknown fields in attendance fail", () => {
  const payload = {
    guestId: "guest-1",
    friday: "yes",
    saturday: "no",
    sunday: "",
    invitationGroup: "familia-garcia",
    updatedBy: "guest-1",
    language: "es",
    schemaVersion: 1,
    updatedAt: { seconds: 123, nanoseconds: 0 },
    isAdmin: true,
  };
  const result = validateAttendancePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

// ── RSVP payload ───────────────────────────────────────────────────────

function makeValidRsvpPayload() {
  return {
    firstName: "Ana",
    lastName: "García",
    email: "ana@example.com",
    whatsapp: "+52 555 123 4567",
    attendance: "yes",
    groupMode: "family",
    groupName: "Familia García",
    partySize: "2",
    adults: "2",
    children: "0",
    guests: "",
    accommodation: "cabin",
    travelStatus: "flying",
    arrivalFrom: "CDMX",
    arrivalTo: "Oaxaca",
    arrivalDate: "2026-08-14",
    arrivalTime: "10:30",
    arrivalAirline: "Aeroméxico",
    arrivalFlight: "AM123",
    departureFrom: "Oaxaca",
    departureTo: "CDMX",
    departureDate: "2026-08-17",
    departureTime: "18:00",
    departureAirline: "Aeroméxico",
    departureFlight: "AM456",
    route: "Direct",
    notes: "",
    language: "es",
    schemaVersion: 3,
    createdAt: { seconds: 123, nanoseconds: 0 },
  };
}

test("valid RSVP payload passes", () => {
  const result = validateRsvpPayload(makeValidRsvpPayload());
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("RSVP with optional fields passes", () => {
  const payload = {
    ...makeValidRsvpPayload(),
    independentArrival: "yes",
    sundayMorning: "no",
    invitationCode: "azalea_compartida_porpagar",
  };
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("RSVP missing required field fails", () => {
  const payload = makeValidRsvpPayload();
  delete payload.email;
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("missing required fields")));
});

test("RSVP with unknown field fails", () => {
  const payload = {
    ...makeValidRsvpPayload(),
    isAdmin: true,
  };
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

test("RSVP with wrong schemaVersion fails", () => {
  const payload = {
    ...makeValidRsvpPayload(),
    schemaVersion: 2,
  };
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

test("RSVP with invalid language fails", () => {
  const payload = {
    ...makeValidRsvpPayload(),
    language: "de",
  };
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("language")));
});

test("RSVP with empty firstName fails", () => {
  const payload = {
    ...makeValidRsvpPayload(),
    firstName: "",
  };
  const result = validateRsvpPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("firstName")));
});

// ── Petanque payload ───────────────────────────────────────────────────

test("valid petanque payload passes", () => {
  const payload = {
    petanqueParticipation: "yes",
    petanquePartySize: "4",
    petanqueNames: "Ana, Luis, María, Juan",
    petanqueOwnBoules: "yes",
    language: "es",
    schemaVersion: 1,
    createdAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validatePetanquePayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("petanque with unknown field fails", () => {
  const payload = {
    petanqueParticipation: "yes",
    petanquePartySize: "4",
    petanqueNames: "Ana",
    petanqueOwnBoules: "yes",
    language: "es",
    schemaVersion: 1,
    createdAt: { seconds: 123, nanoseconds: 0 },
    isAdmin: true,
  };
  const result = validatePetanquePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

test("petanque with wrong schemaVersion fails", () => {
  const payload = {
    petanqueParticipation: "yes",
    petanquePartySize: "4",
    petanqueNames: "Ana",
    petanqueOwnBoules: "yes",
    language: "es",
    schemaVersion: 2,
    createdAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validatePetanquePayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("schemaVersion")));
});

// ── Coast payload ──────────────────────────────────────────────────────

test("valid coast payload passes", () => {
  const payload = {
    name: "Ana García",
    interest: "yes",
    partySize: "2",
    nights: "3",
    destination: "Puerto Escondido",
    style: "beach",
    note: "Prefiero cerca de la playa",
    language: "es",
    schemaVersion: 1,
    createdAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateCoastPayload(payload);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("coast with empty name fails", () => {
  const payload = {
    name: "",
    interest: "yes",
    partySize: "2",
    nights: "3",
    destination: "Puerto Escondido",
    style: "beach",
    note: "",
    language: "es",
    schemaVersion: 1,
    createdAt: { seconds: 123, nanoseconds: 0 },
  };
  const result = validateCoastPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("name")));
});

test("coast with unknown field fails", () => {
  const payload = {
    name: "Ana",
    interest: "yes",
    partySize: "2",
    nights: "3",
    destination: "Puerto",
    style: "beach",
    note: "",
    language: "es",
    schemaVersion: 1,
    createdAt: { seconds: 123, nanoseconds: 0 },
    isAdmin: true,
  };
  const result = validateCoastPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not in the allowed schema")));
});

// ── Invitation code ────────────────────────────────────────────────────

test("valid invitation codes pass", () => {
  assert.equal(isValidInvitationCode("azalea_compartida_porpagar"), true);
  assert.equal(isValidInvitationCode("cabaña_33_privada_porpagar"), true);
  assert.equal(isValidInvitationCode("sin_cabaña"), true);
});

test("absent invitation code passes (optional)", () => {
  assert.equal(isValidInvitationCode(undefined), true);
  assert.equal(isValidInvitationCode(null), true);
  assert.equal(isValidInvitationCode(""), true);
});

test("unknown invitation code fails", () => {
  assert.equal(isValidInvitationCode("not_a_real_code"), false);
  assert.equal(isValidInvitationCode("palacio_admin_pagado"), false);
});
