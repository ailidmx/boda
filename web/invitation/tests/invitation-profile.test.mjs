import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInvitationUrl,
  decodeInvitationCode,
  encodeInvitationCode,
  getInvitationCodeFromUrl,
  INVITATION_CODES,
  parseInvitationProfile,
} from "../src/invitation-profile.js";
import GUESTS from "../src/guests.js";

const GUEST_IDS = GUESTS.map((g) => g.id);


// ── Legacy profile codes ──────────────────────────────────────────────

test("every configured invitation code survives a Base64URL round trip", () => {
  INVITATION_CODES.forEach((code) => {
    assert.equal(decodeInvitationCode(encodeInvitationCode(code)), code);
  });
});

test("every generated URL decodes to its original profile", () => {
  INVITATION_CODES.forEach((code) => {
    const url = buildInvitationUrl("https://example.web.app/", code);
    assert.equal(getInvitationCodeFromUrl(url), code);
    assert.equal(parseInvitationProfile(code)?.code, code);
  });
});

test("unknown and malformed profiles are ignored", () => {
  assert.equal(decodeInvitationCode("not-valid!"), null);
  assert.equal(
    decodeInvitationCode(encodeInvitationCode("palacio_admin_pagado")),
    null,
  );
  assert.equal(
    getInvitationCodeFromUrl(
      "https://example.web.app/?accessType=other&invitationCode=anything",
    ),
    null,
  );
});

// ── Per-guest codes ───────────────────────────────────────────────────

test("every guest ID survives a Base64URL round trip", () => {
  GUEST_IDS.forEach((id) => {
    assert.equal(decodeInvitationCode(encodeInvitationCode(id)), id);
  });
});

test("every guest URL decodes to its original ID", () => {
  GUEST_IDS.forEach((id) => {
    const url = buildInvitationUrl("https://example.web.app/", id);
    assert.equal(getInvitationCodeFromUrl(url), id);
  });
});

test("per-guest codes parse to a profile with guest data", () => {
  GUEST_IDS.forEach((id) => {
    const profile = parseInvitationProfile(id);
    assert.notEqual(profile, null);
    assert.equal(profile.code, id);
    assert.ok(profile.guest, "guest property should be present");
    assert.equal(profile.guest.id, id);
  });
});

test("legacy codes parse without guest data", () => {
  INVITATION_CODES.forEach((code) => {
    const profile = parseInvitationProfile(code);
    assert.notEqual(profile, null);
    assert.equal(profile.code, code);
    assert.equal(profile.guest, undefined);
  });
});
