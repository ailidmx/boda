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

