/**
 * invitation-link.js — parse the analytics query-string params that the
 * invitation emails / WhatsApp messages append to the base site URL.
 *
 * Link format:
 *   https://boda-david-y-ayde.web.app/?guest=<email>&password=<pw>&inviteType=<type>&utm_source=<source>&utm_medium=<medium>&utm_campaign=<campaign>&sent_at=<epoch_ms>
 *
 * - `guest`        — the guest's login identifier (email). Used to pre-fill the
 *                    login field. (The guest record does NOT store the auth
 *                    email, so the link carries it directly.)
 * - `password`     — the shared login password. Used to pre-fill the password
 *                    field so the guest only has to tap "Enter".
 * - `inviteType`   — how the guest was invited ("email", "whatsapp", ...).
 * - `utm_source`/`utm_medium`/`utm_campaign` — standard UTM params so we know
 *                    whether the guest came from an email, WhatsApp, or other.
 * - `sent_at`      — epoch milliseconds when the invitation was sent, so we can
 *                    compute "time to answer" at the analytics level.
 *
 * All helpers are pure and safe to call in any environment (they default to
 * `window.location.href` only when a URL is not supplied).
 */

// Cache of the invitation-link params captured on first load. We capture them
// eagerly (before the URL is cleaned) so that even after the query params are
// hidden from the address bar, `signIn()` and `AuthGate` can still read the
// guest/password/UTM/sent_at values for pre-fill and analytics.
let capturedParams = null;

/**
 * Capture the invitation-link params from the current URL exactly once and
 * cache them. Subsequent calls return the cached value (the first call wins).
 * Call this before cleaning the URL so the data survives the cleanup.
 * @returns {{ guest: string, password: string, inviteType: string, source: string, medium: string, campaign: string, sentAt: number|null }}
 */
export function captureInvitationLinkParams() {
  if (!capturedParams) {
    capturedParams = getInvitationLinkParams();
  }
  return capturedParams;
}

/**
 * Remove the invitation-link query params from the address bar (keeping the
 * path and any hash) so the shared password is not left visible in the URL and
 * navigation stays clean. Uses `history.replaceState`, so it does not add a
 * history entry and the back button is unaffected. Safe no-op when there are
 * no query params or when `history` is unavailable.
 */
export function cleanInvitationLinkUrl() {
  try {
    const url = new URL(window.location.href);
    if ([...url.searchParams.keys()].length === 0) return;
    window.history.replaceState(null, "", url.pathname + url.hash);
  } catch {
    // Ignore — cleaning the URL is best-effort and must never break the app.
  }
}

/**
 * Parse the invitation-link analytics params from a URL.
 * @param {string} [url]  Defaults to `window.location.href`.
 * @returns {{ guest: string, password: string, inviteType: string, source: string, medium: string, campaign: string, sentAt: number|null }}
 */
export function getInvitationLinkParams(url) {
  // When the params were captured on first load and no explicit URL is given,
  // return the captured values so they survive the URL cleanup. Callers that
  // pass an explicit URL (e.g. tests) still get a fresh parse.
  if (capturedParams && url === undefined) return capturedParams;
  const target = url ?? window.location.href;
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    parsed = new URL("https://localhost/");
  }
  const sp = parsed.searchParams;
  return {
    guest: (sp.get("guest") || "").trim(),
    password: (sp.get("password") || "").trim(),
    inviteType: (sp.get("inviteType") || "").trim(),
    source: (sp.get("utm_source") || "").trim(),
    medium: (sp.get("utm_medium") || "").trim(),
    campaign: (sp.get("utm_campaign") || "").trim(),
    sentAt: parseSentAt(sp.get("sent_at")),
  };
}


/**
 * Parse a `sent_at` value into epoch milliseconds, or null when invalid.
 *
 * The link may carry `sent_at` in any of three formats, and we normalise them
 * all to epoch ms so the "time to answer" metric is always correct:
 *   - epoch ms (13 digits, ~1.7e12 for 2026)  → used as-is
 *   - epoch seconds (10 digits, ~1.7e9)       → ×1000
 *   - Google Sheets serial date (days since 1899-12-30, ~46000 for 2026,
 *     e.g. what the sheet's NOW() formula produces) → (n - 25569) × 86400000
 * @param {string|null} raw
 * @returns {number|null}
 */
function parseSentAt(raw) {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Epoch milliseconds (13 digits, ~1.7e12 for 2026).
  if (n >= 1e11) return n;
  // Epoch seconds (10 digits, ~1.7e9 for 2026).
  if (n >= 1e8) return Math.round(n * 1000);
  // Google Sheets serial date (days since 1899-12-30, ~46000 for 2026).
  // 25569 = days between 1899-12-30 and 1970-01-01.
  return Math.round((n - 25569) * 86400000);
}


/**
 * Compute the "time to answer" in seconds from when the invitation was sent
 * (`sentAt`, epoch ms) to `now` (epoch ms). Returns null when `sentAt` is
 * missing or in the future.
 * @param {number|null} sentAt
 * @param {number} [now]  Defaults to `Date.now()`.
 * @returns {number|null}
 */
export function computeTimeToAnswer(sentAt, now = Date.now()) {
  if (!sentAt) return null;
  const ms = now - sentAt;
  return ms >= 0 ? Math.round(ms / 1000) : null;
}

/**
 * Normalise a UTM source to a stable channel slug: "email", "whatsapp",
 * "other". Unknown/empty sources map to "other".
 * @param {string} [source]
 * @returns {string}
 */
export function normalizeSource(source) {
  const s = String(source || "").trim().toLowerCase();
  if (s.includes("whatsapp") || s.includes("wa")) return "whatsapp";
  if (s.includes("email") || s.includes("mail")) return "email";
  return "other";
}
