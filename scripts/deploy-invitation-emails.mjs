#!/usr/bin/env node
/**
 * deploy-invitation-emails.mjs
 *
 * Deploys the invitation-emails Google Apps Script to the live project via
 * `clasp push`, injecting the REAL service-account private key into the .gs
 * file first (so the deployed script can authenticate to Firestore), then
 * restoring the placeholder so the secret is never committed.
 *
 * The repo keeps `SERVICE_ACCOUNT_PRIVATE_KEY = "...REPLACE_ME..."` as a
 * placeholder. This script reads the real key from
 * `integraciones/google_sheets/service_account.json` (gitignored), substitutes
 * it into `invitation_emails.gs`, runs `clasp push`, and restores the
 * placeholder on success/failure.
 *
 * Usage:
 *   node scripts/deploy-invitation-emails.mjs
 *
 * Requires:
 *   - `clasp` available on PATH (or `npx @google/clasp`).
 *   - `~/.clasprc.json` present (from `clasp login`).
 *   - `integraciones/google_sheets/service_account.json` present (gitignored).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SHEETS_DIR = join(ROOT, "integraciones", "google_sheets");
const GS_FILE = join(SHEETS_DIR, "invitation_emails.gs");
const SA_FILE = join(SHEETS_DIR, "service_account.json");

const PLACEHOLDER = "REPLACE_ME";

function fail(msg) {
  console.error(`[deploy-invitation-emails] ERROR: ${msg}`);
  process.exit(1);
}

// 1. Read the real service account.
let sa;
try {
  sa = JSON.parse(readFileSync(SA_FILE, "utf8"));
} catch (e) {
  fail(`could not read ${SA_FILE}: ${e.message}`);
}
if (!sa.private_key || !sa.client_email) {
  fail(`${SA_FILE} is missing private_key / client_email`);
}

// 2. Read the .gs file.
let gs;
try {
  gs = readFileSync(GS_FILE, "utf8");
} catch (e) {
  fail(`could not read ${GS_FILE}: ${e.message}`);
}
if (!gs.includes(PLACEHOLDER)) {
  fail(`placeholder "${PLACEHOLDER}" not found in ${GS_FILE} — nothing to inject`);
}

// 3. Align the client email with the service account (defensive; the .gs file
//    should already match, but this guarantees the JWT issuer matches the key).
gs = gs.replace(
  /var SERVICE_ACCOUNT_CLIENT_EMAIL = "[^"]*";/,
  `var SERVICE_ACCOUNT_CLIENT_EMAIL = "${sa.client_email}";`
);

// 4. Inject the real private key. The key from JSON is a PEM with real
//    newlines (JSON.parse turns the \n escapes into actual line breaks). The
//    .gs file stores it inside a JS string literal, so we must escape the key
//    back into a valid JS string: real newlines -> \n, and escape backslashes
//    and double quotes.
function toJsStringLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}
const injected = gs.replace(PLACEHOLDER, toJsStringLiteral(sa.private_key));


// 5. Write the injected file, push, then restore the placeholder.
writeFileSync(GS_FILE, injected, "utf8");
console.log("[deploy-invitation-emails] injected service-account key, pushing…");

try {
  execSync("clasp push --force", {
    cwd: SHEETS_DIR,
    stdio: "inherit",
  });
  console.log("[deploy-invitation-emails] clasp push succeeded.");
} catch (e) {
  // Restore the placeholder before rethrowing.
  writeFileSync(GS_FILE, gs, "utf8");
  fail(`clasp push failed: ${e.message}`);
}

// 6. Restore the placeholder so the secret is never committed.
writeFileSync(GS_FILE, gs, "utf8");
console.log("[deploy-invitation-emails] restored placeholder (secret not committed).");
