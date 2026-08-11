/**
 * Inspect the "NEW UUID" column in the Invitados sheet.
 * Reads the live sheet and prints the headers plus any rows where
 * the NEW UUID column is populated.
 *
 * Usage:
 *   node scripts/inspect-new-uuid-column.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

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
  if (!data.access_token) throw new Error("OAuth token response missing access_token");
  return data.access_token;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

const envValues = parseSimpleEnvFile(readFileSync(SHEETS_ENV_PATH, "utf-8"));
const spreadsheetId = envValues.GOOGLE_SHEETS_ID;
const sheetName = envValues.WS_INVITADOS || "Invitados";

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
const values = data.values || [];

if (values.length === 0) {
  console.log("Sheet is empty.");
  process.exit(0);
}

const headers = values[0].map((h) => normalizeText(h));
console.log("=== HEADERS ===");
headers.forEach((h, i) => console.log(`  [${i}] ${h}`));

// Find the NEW UUID column(s)
const newUuidCols = headers
  .map((h, i) => ({ h, i }))
  .filter(({ h }) => /new.*uuid|uuid.*new|nuevo.*uuid|uuid.*nuevo/i.test(h));

console.log("\n=== NEW UUID COLUMNS ===");
if (newUuidCols.length === 0) {
  console.log("  (none found by name pattern)");
} else {
  for (const { h, i } of newUuidCols) {
    console.log(`  Column "${h}" at index ${i}`);
  }
}

// Print rows where any NEW UUID column is populated
console.log("\n=== ROWS WITH NEW UUID ===");
let found = 0;
for (let r = 1; r < values.length; r++) {
  const row = values[r];
  const rowObj = {};
  headers.forEach((h, i) => { rowObj[h] = normalizeText(row?.[i] ?? ""); });
  const uid = rowObj["UID"] || "";
  const newUuidValues = newUuidCols.map(({ h }) => rowObj[h]).filter((v) => v !== "");
  if (newUuidValues.length > 0) {
    found++;
    console.log(`  Row ${r + 1}: UID="${uid}" NEW_UUID="${newUuidValues.join(", ")}"`);
  }
}
console.log(`\nTotal rows with NEW UUID populated: ${found}`);
process.exit(0);
