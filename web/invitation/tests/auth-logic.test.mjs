import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialLanguage,
  normalizeIdentifier,
  normalizeLanguage,
  validateCredentials,
} from "../src/auth/auth-logic.js";

const SUPPORTED = ["es", "fr", "en"];

// ── normalizeLanguage ───────────────────────────────────────────────────

test("normalizeLanguage keeps a supported language", () => {
  assert.equal(normalizeLanguage("fr", SUPPORTED), "fr");
  assert.equal(normalizeLanguage("en", SUPPORTED), "en");
});

test("normalizeLanguage falls back to es for unknown values", () => {
  assert.equal(normalizeLanguage("de", SUPPORTED), "es");
  assert.equal(normalizeLanguage(undefined, SUPPORTED), "es");
  assert.equal(normalizeLanguage(null, SUPPORTED), "es");
  assert.equal(normalizeLanguage("", SUPPORTED), "es");
});

test("normalizeLanguage supports a custom fallback", () => {
  assert.equal(normalizeLanguage("de", SUPPORTED, "fr"), "fr");
});

// ── getInitialLanguage ──────────────────────────────────────────────────

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
  };
}

test("getInitialLanguage returns the stored supported language", () => {
  const storage = makeStorage({ "boda-language": "fr" });
  assert.equal(
    getInitialLanguage(storage, "boda-language", SUPPORTED),
    "fr",
  );
});

test("getInitialLanguage falls back to es when nothing is stored", () => {
  const storage = makeStorage({});
  assert.equal(
    getInitialLanguage(storage, "boda-language", SUPPORTED),
    "es",
  );
});

test("getInitialLanguage ignores an unsupported stored language", () => {
  const storage = makeStorage({ "boda-language": "de" });
  assert.equal(
    getInitialLanguage(storage, "boda-language", SUPPORTED),
    "es",
  );
});

// ── normalizeIdentifier ─────────────────────────────────────────────────

test("normalizeIdentifier trims and lowercases", () => {
  assert.equal(normalizeIdentifier("  David@Gmail.com  "), "david@gmail.com");
  assert.equal(normalizeIdentifier("  david  "), "david");
});

test("normalizeIdentifier handles empty/undefined input", () => {
  assert.equal(normalizeIdentifier(""), "");
  assert.equal(normalizeIdentifier(undefined), "");
  assert.equal(normalizeIdentifier(null), "");
});

// ── validateCredentials ─────────────────────────────────────────────────

test("validateCredentials accepts a valid email and password", () => {
  const { emailValid, passwordValid } = validateCredentials(
    "david@gmail.com",
    "secret123",
  );
  assert.equal(emailValid, true);
  assert.equal(passwordValid, true);
});

test("validateCredentials rejects a malformed email", () => {
  const { emailValid } = validateCredentials("not-an-email", "secret123");
  assert.equal(emailValid, false);
});

test("validateCredentials rejects an email with whitespace", () => {
  const { emailValid } = validateCredentials(" david@gmail.com", "secret123");
  assert.equal(emailValid, false);
});

test("validateCredentials rejects an email over 254 chars", () => {
  const longLocal = "a".repeat(250);
  const { emailValid } = validateCredentials(
    `${longLocal}@gmail.com`,
    "secret123",
  );
  assert.equal(emailValid, false);
});

test("validateCredentials rejects a short password", () => {
  const { passwordValid } = validateCredentials("david@gmail.com", "12345");
  assert.equal(passwordValid, false);
});

test("validateCredentials rejects a non-string password", () => {
  const { passwordValid } = validateCredentials("david@gmail.com", null);
  assert.equal(passwordValid, false);
});
