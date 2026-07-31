/**
 * Provision Firebase Auth accounts for every guest.
 *
 * The invitation gate now signs in with a per-guest username + password
 * (email = <username>@boda-david-y-ayde.web.app, shared password). Those
 * accounts must exist in Firebase Auth before anyone can log in. This script
 * creates them (or resets the password if they already exist) using the
 * Firebase Admin SDK.
 *
 * Usage:
 *   node scripts/provision-auth-accounts.mjs
 *
 * Requires:
 *   - A Firebase service-account key in FIREBASE_SERVICE_ACCOUNT env var
 *     or at ~/.firebase/boda-500805-service-account.json
 *   - firebase-admin installed (npm install firebase-admin)
 *
 * The script is idempotent: it creates missing accounts and updates the
 * password of existing ones so they always match the CSV.
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));


const CSV_PATH = join(__dirname, "../../../invitados/lista_invitados.csv");
const AUTH_DOMAIN = "boda-david-y-ayde.web.app";
const DEFAULT_PASSWORD = "vivamexico";

// ── Service account ────────────────────────────────────────────────────

const possiblePaths = [
  process.env.FIREBASE_SERVICE_ACCOUNT,
  `${homedir()}/.firebase/boda-500805-service-account.json`,
  `${homedir()}/.firebase/boda-500805.json`,
  join(__dirname, "../../../integraciones/google_sheets/service_account.json"),
];


let serviceAccount = null;
for (const p of possiblePaths) {
  if (p && existsSync(p)) {
    serviceAccount = JSON.parse(readFileSync(p, "utf-8"));
    break;
  }
}

if (!serviceAccount) {
  console.error(
    "No service account found. Set FIREBASE_SERVICE_ACCOUNT env var or place the key at ~/.firebase/boda-500805-service-account.json"
  );
  process.exit(1);
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "boda-500805",
});

const auth = getAuth(app);


// ── CSV parsing ────────────────────────────────────────────────────────
//
// The CSV has numeric columns with unquoted thousands separators (e.g.
// `$5,310`), so a naive split(",") misaligns every column after them. The
// last three columns are always `username,firebase_email,password` and never
// contain commas, so we extract them from the tail of each line. The guest
// name is the third column (also comma-free).

function parseAccounts(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const accounts = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const username = (cells[cells.length - 3] || "").trim();
    const email = (cells[cells.length - 2] || "").trim();
    const password = (cells[cells.length - 1] || "").trim();
    const name = (cells[2] || "").trim();
    if (!username || !email) continue;
    accounts.push({
      username,
      email,
      password: password || DEFAULT_PASSWORD,
      name,
    });
  }
  return accounts;
}

const csv = readFileSync(CSV_PATH, "utf-8");
const accounts = parseAccounts(csv);


console.log(`Provisioning ${accounts.length} Firebase Auth accounts…`);

let created = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

for (const account of accounts) {
  try {
    const existing = await auth.getUserByEmail(account.email);
    // Account exists — reset the password so it always matches the CSV.
    await auth.updateUser(existing.uid, { password: account.password });
    updated++;
    console.log(`  updated  ${account.email}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      await auth.createUser({
        email: account.email,
        password: account.password,
        displayName: account.name || account.username,
      });
      created++;
      console.log(`  created  ${account.email}`);
    } else {
      failed++;
      console.error(`  FAILED   ${account.email}: ${error.message}`);
    }
  }
}


console.log(
  `\nDone. Created: ${created}, updated: ${updated}, skipped: ${skipped}, failed: ${failed}.`
);
