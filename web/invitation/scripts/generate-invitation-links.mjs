/**
 * Generate invitation links for all guests.
 *
 * Usage:
 *   node scripts/generate-invitation-links.mjs [baseUrl]
 *
 * Default baseUrl: https://boda-500805.web.app/
 *
 * Outputs:
 *   1. Per-guest links (one per guest ID)
 *   2. Legacy profile links (backward compat)
 *   3. Dashboard link
 */

import { buildInvitationUrl } from "../src/invitation-profile.js";
import { GUEST_IDS } from "../src/guests.js";
import { INVITATION_CODES } from "../src/invitation-profile.js";

const baseUrl = process.argv[2] || "https://boda-500805.web.app/";

// ── Per-guest links ───────────────────────────────────────────────────
console.log("══════════════════════════════════════════════════════════");
console.log("  PER-GUEST INVITATION LINKS");
console.log("══════════════════════════════════════════════════════════\n");

GUEST_IDS.forEach((id) => {
  console.log(`${id}\n${buildInvitationUrl(baseUrl, id)}\n`);
});

// ── Legacy profile links ──────────────────────────────────────────────
console.log("══════════════════════════════════════════════════════════");
console.log("  LEGACY PROFILE LINKS (backward compat)");
console.log("══════════════════════════════════════════════════════════\n");

INVITATION_CODES.forEach((code) => {
  console.log(`${code}\n${buildInvitationUrl(baseUrl, code)}\n`);
});

// ── Dashboard ─────────────────────────────────────────────────────────
console.log("══════════════════════════════════════════════════════════");
console.log("  DASHBOARD");
console.log("══════════════════════════════════════════════════════════\n");
console.log(`novios_dashboard\n${new URL("/dashboard", baseUrl)}\n`);
