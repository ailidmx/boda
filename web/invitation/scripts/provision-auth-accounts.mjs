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
import { createRequire } from "module";

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

// Resolve firebase-admin from the invitation app's node_modules to avoid
// the CJS/ESM interop issue with jwks-rsa/jose in firebase-admin v14.
const invitationDir = join(__dirname, "..");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { getAuth } = await import(authPath);

if (admin.getApps().length === 0) {
  admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: serviceAccount.project_id || "boda-500805",
  });
}

const auth = getAuth();



// ── CSV parsing ────────────────────────────────────────────────────────
//
// The CSV has numeric columns with unquoted thousands separators (e.g.
// `$5,310`), so a naive split(",") misaligns every column after them. We
// use the header row to find the exact column indices for `username`,
// `firebase_email`, and `password`.

function parseAccounts(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const headers = lines[0].split(",").map((h) => h.trim());
  const usernameIdx = headers.indexOf("username");
  const emailIdx = headers.indexOf("firebase_email");
  const passwordIdx = headers.indexOf("password");
  const nameIdx = headers.indexOf("Nombre");

  if (usernameIdx === -1 || emailIdx === -1) {
    console.error("CSV missing required columns: username, firebase_email");
    return [];
  }

  const accounts = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const username = (cells[usernameIdx] || "").trim();
    const email = (cells[emailIdx] || "").trim();
    const password = (cells[passwordIdx] || "").trim();
    const name = nameIdx >= 0 ? (cells[nameIdx] || "").trim() : "";
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
