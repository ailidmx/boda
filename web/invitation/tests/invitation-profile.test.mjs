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

// ── Per-guest codes are no longer supported ───────────────────────────

test("per-guest IDs are no longer accepted as invitation codes", () => {
  // Per-guest link resolution was removed; only profile codes are valid.
  assert.equal(decodeInvitationCode(encodeInvitationCode("sebastien")), null);
  assert.equal(parseInvitationProfile("sebastien"), null);
});

test("legacy codes parse without guest data", () => {
  INVITATION_CODES.forEach((code) => {
    const profile = parseInvitationProfile(code);
    assert.notEqual(profile, null);
    assert.equal(profile.code, code);
    assert.equal(profile.guest, undefined);
  });
});
