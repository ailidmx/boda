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

test("validateGuestContactPayload: rejects protected fields being modified", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    isAdmin: true, // protected (privilege-granting), not writable
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("protected fields")));
});

test("validateGuestContactPayload: rejects hosting being modified", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    hosting: { cabin: "CABAÑA 1", room: "CABAÑA 1-1" }, // admin-managed
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("protected fields")));
});

test("validateGuestContactPayload: accepts a NEW unknown field (blacklist)", () => {
  // The guests write rule is a BLACKLIST: any field not in the protected list
  // may be written freely, so adding a new guest-writable field needs no
  // change to the validator or the rules.
  const result = validateGuestContactPayload({
    guestId: "catherine",
    email: "catherine@example.com", // not in the old whitelist, now allowed
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateGuestContactPayload: accepts arbitrary identity sub-fields", () => {
  // identity is only required to be a map; its internal structure is no longer
  // enumerated (validated client-side by the app, not by the rules).
  const result = validateGuestContactPayload({
    guestId: "catherine",
    identity: { nickname: "Kiki", phone: "+33 6 12 34 56 78" },
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateGuestContactPayload: rejects non-object payload", () => {
  const result = validateGuestContactPayload("not-an-object");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("must be an object")));
});

test("validateGuestContactPayload: rejects _deleted (protected)", () => {
  // _deleted is a protected (admin-managed) field, so guests may never write it.
  const result = validateGuestContactPayload({
    guestId: "catherine",
    _deleted: true,
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("protected fields")));
});

test("validateGuestContactPayload: rejects non-map identity", () => {
  const result = validateGuestContactPayload({
    guestId: "catherine",
    identity: "not-a-map",
    invitationGroup: "Familia de David",
    updatedBy: "david_aili",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("identity must be an object")));
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

