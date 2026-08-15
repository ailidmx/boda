/**
 * invitation-link.js — parse the analytics query-string params that the
 * invitation emails / WhatsApp messages append to the base site URL.
 *
 * Link format:
 *   https://boda-david-y-ayde.web.app/?guest=<email>&password=<pw>&inviteType=<type>&invitationCode=<code>&utm_source=<source>&utm_medium=<medium>&utm_campaign=<campaign>&sent_at=<epoch_ms>
 *
 * - `guest`        — the guest's login identifier (email). Used to pre-fill the
 *                    login field. (The guest record does NOT store the auth
 *                    email, so the link carries it directly.)
 * - `password`     — the shared login password. Used to pre-fill the password
 *                    field so the guest only has to tap "Enter".
 * - `inviteType`   — how the guest was invited ("email", "whatsapp", ...).
 * - `invitationCode` — the guest's profile code (base64url), when known.
 * - `utm_source`/`utm_medium`/`utm_campaign` — standard UTM params so we know
 *                    whether the guest came from an email, WhatsApp, or other.
 * - `sent_at`      — epoch milliseconds when the invitation was sent, so we can
 *                    compute "time to answer" at the analytics level.
 *
 * All helpers are pure and safe to call in any environment (they default to
 * `window.location.href` only when a URL is not supplied).
 */

/**
 * Parse the invitation-link analytics params from a URL.
 * @param {string} [url]  Defaults to `window.location.href`.
 * @returns {{ guest: string, password: string, inviteType: string, invitationCode: string, source: string, medium: string, campaign: string, sentAt: number|null }}
 */
export function getInvitationLinkParams(url = window.location.href) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    parsed = new URL("https://localhost/");
  }
  const sp = parsed.searchParams;
  return {
    guest: (sp.get("guest") || "").trim(),
    password: (sp.get("password") || "").trim(),
    inviteType: (sp.get("inviteType") || "").trim(),
    invitationCode: (sp.get("invitationCode") || "").trim(),
    source: (sp.get("utm_source") || "").trim(),
    medium: (sp.get("utm_medium") || "").trim(),
    campaign: (sp.get("utm_campaign") || "").trim(),
    sentAt: parseSentAt(sp.get("sent_at")),
  };
}

/**
 * Parse a `sent_at` value (epoch ms) into a number, or null when invalid.
 * @param {string|null} raw
 * @returns {number|null}
 */
function parseSentAt(raw) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
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
