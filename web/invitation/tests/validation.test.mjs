import assert from "node:assert/strict";
import test from "node:test";
import {
  validateGuestContactPayload,
  validateAttendancePayload,
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

