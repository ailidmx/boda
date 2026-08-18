/**
 * Reset Firebase Auth passwords from the Google Sheet `firebase.password`
 * column.
 *
 * Reads the live "Invitados" sheet (same source as gsheet-firestore-sync) and,
 * for every row that has a `firebase.password` value AND a matching Firebase
 * Auth user (matched by UID), resets that user's password to the sheet value.
 *
 * This is the value the guest must finally enter to log in.
 *
 * Dry-run by default. Use --execute to actually reset passwords.
 *
 * Usage:
 *   node scripts/reset-auth-passwords.mjs            # dry-run (prints plan)
 *   node scripts/reset-auth-passwords.mjs --execute  # apply the resets
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getAuth } = await import(authPath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth(app);

const SHEETS_ENV_PATH = join(__dirname, "../integraciones/google_sheets/.env");

function parseSimpleEnvFile(envText) {
  const result = {};
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtAssertion({ clientEmail, privateKey, scope }) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function getSheetsAccessToken() {
  const assertion = signJwtAssertion({
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
  });

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("OAuth token response missing access_token");
  }
  return data.access_token;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function worksheetValuesToObjects(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const headers = values[0].map((header) => normalizeText(header));
  const sanitizedHeaders = [];
  const headerSeen = new Map();
  for (let i = 0; i < headers.length; i++) {
    const base = headers[i] || `col_${i + 1}`;
    const count = (headerSeen.get(base) || 0) + 1;
    headerSeen.set(base, count);
    sanitizedHeaders.push(count === 1 ? base : `${base}_${count}`);
  }

  const rows = [];
  for (const rawRow of values.slice(1)) {
    const row = {};
    for (let i = 0; i < sanitizedHeaders.length; i++) {
      row[sanitizedHeaders[i]] = normalizeText(rawRow?.[i] ?? "");
    }
    rows.push(row);
  }
  return rows;
}

async function readSheetFromGoogle() {
  const envValues = parseSimpleEnvFile(readFileSync(SHEETS_ENV_PATH, "utf-8"));
  const spreadsheetId = envValues.GOOGLE_SHEETS_ID;
  const sheetName = envValues.WS_INVITADOS || "Invitados";

  if (!spreadsheetId) {
    throw new Error("Missing Google Sheets ID. Set GOOGLE_SHEETS_ID in integraciones/google_sheets/.env.");
  }

  const token = await getSheetsAccessToken();
  const range = encodeURIComponent(`${sheetName}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets values request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const rows = worksheetValuesToObjects(data.values || []);
  return { rows, spreadsheetId, sheetName };
}

async function readAuthUsers() {
  const users = [];
  let nextPageToken;
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return users;
}

async function main() {
  console.log("Reset Firebase Auth passwords from Google Sheet");
  console.log("================================================");

  const { rows, spreadsheetId, sheetName } = await readSheetFromGoogle();
  console.log(`Source: spreadsheetId=${spreadsheetId}; sheet=${sheetName}`);
  console.log(`Sheet rows: ${rows.length}`);

  // Build the list of (uid, password) pairs from the sheet.
  const sheetPasswords = [];
  for (const row of rows) {
    const uid = normalizeText(row.UID);
    const password = normalizeText(row["firebase.password"] || row.password);
    if (uid && password) {
      sheetPasswords.push({ uid, password });
    }
  }
  console.log(`Sheet rows with a password: ${sheetPasswords.length}`);

  // Load all auth users and index by uid.
  const authUsers = await readAuthUsers();
  const authByUid = new Map(authUsers.map((u) => [u.uid, u]));
  console.log(`Auth users: ${authUsers.length}`);

  // Match sheet passwords to existing auth users.
  const matched = [];
  const noAuthUser = [];
  for (const { uid, password } of sheetPasswords) {
    if (authByUid.has(uid)) {
      matched.push({ uid, password, email: authByUid.get(uid).email });
    } else {
      noAuthUser.push({ uid });
    }
  }
  console.log(`Matched to an auth user: ${matched.length}`);
  console.log(`Sheet password rows with NO auth user: ${noAuthUser.length}`);

  if (noAuthUser.length > 0) {
    console.log("\nNo auth user for these UIDs (skipped):");
    for (const { uid } of noAuthUser) {
      console.log(`  - ${uid}`);
    }
  }

  if (matched.length === 0) {
    console.log("\nNothing to reset.");
    return;
  }

  console.log("\nPassword reset plan:");
  for (const { uid, email, password } of matched) {
    console.log(`  - ${uid} (${email || "no email"}): password=${password}`);
  }

  if (!EXECUTE) {
    console.log("\nDry-run: no changes made. Re-run with --execute to apply.");
    return;
  }

  console.log("\nApplying password resets...");
  let applied = 0;
  let failed = 0;
  for (const { uid, password } of matched) {
    try {
      await auth.updateUser(uid, { password });
      applied++;
      console.log(`  ✓ ${uid}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${uid}: ${error.code || error.message}`);
    }
  }

  console.log(`\nDone. Applied: ${applied}, failed: ${failed}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
