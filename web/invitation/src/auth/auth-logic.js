/**
 * Pure auth/login helpers for the invitation.
 *
 * These functions contain NO React, NO Firestore, and NO module-level state.
 * They are pure functions of their inputs, so they are trivially unit-testable.
 * The React context (`AppContext.jsx`) orchestrates them; it does not re-implement
 * the credential/language logic.
 *
 * @module auth/auth-logic
 */

/**
 * Normalize a language value to one of the supported languages, falling back to
 * the default (`es`) for unknown values.
 * @param {string} value
 * @param {string[]} supported  list of supported language codes
 * @param {string} [fallback="es"]
 * @returns {string}
 */
export function normalizeLanguage(value, supported, fallback = "es") {
  return supported.includes(value) ? value : fallback;
}

/**
 * Resolve the initial language. The login page always defaults to Spanish. A
 * stored language is only trusted for a signed-in user (it is cleaned when we
 * land on the login page), so we never rely on browser detection here.
 *
 * `storage` is injected so the function is testable without a real `window`.
 * @param {{ getItem: (k: string) => string|null }} storage
 * @param {string} storageKey
 * @param {string[]} supported
 * @returns {string}
 */
export function getInitialLanguage(storage, storageKey, supported) {
  const stored = storage.getItem(storageKey);
  if (stored) {
    return normalizeLanguage(stored, supported);
  }
  return "es";
}

/**
 * Normalize a guest's login identifier: trim surrounding whitespace and
 * lowercase it so " David@Gmail.com " becomes "david@gmail.com". Emails are
 * case-insensitive in Firebase Auth, so this avoids false rejections.
 * @param {string} username
 * @returns {string}
 */
export function normalizeIdentifier(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

/**
 * Validate credentials against Firebase Auth's schema BEFORE hitting the
 * network so we fail fast with a clear reason instead of a cryptic 400.
 *   - Email: valid format, max 254 chars, no leading/trailing whitespace.
 *   - Password: min 6 chars, max 4096 chars.
 * @param {string} email
 * @param {string} password
 * @returns {{ emailValid: boolean, passwordValid: boolean }}
 */
export function validateCredentials(email, password) {
  const emailValid =
    email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid =
    typeof password === "string" &&
    password.length >= 6 &&
    password.length <= 4096;
  return { emailValid, passwordValid };
}
