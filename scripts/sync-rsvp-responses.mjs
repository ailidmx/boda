/**
 * Firestore -> Google Sheet RSVP responses sync.
 *
 * Reads the LIVE RSVP answers from Firestore (each guest's `rsvp.answers`
 * map, questionId -> scale level 0-5) and fills the corresponding `_rvsp.*`
 * columns in the "Invitados" sheet tab.
 *
 * Column mapping (sheet header -> Firestore path):
 *   _rvsp.friday          -> rsvp.answers.friday
 *   _rvsp.saturday        -> rsvp.answers.saturday
 *   _rvsp.sunday          -> rsvp.answers.sunday
 *   _rvsp.confirmCabin    -> rsvp.answers.confirmCabin
 *   _rvsp.cabinWaitingList-> rsvp.answers.cabinWaitingList
 *   _rvsp.xtra            -> rsvp.answers.xtra
 *   _rvsp.playa           -> rsvp.answers.playa
 *   _rvsp.petanca         -> rsvp.answers.petanca
 *   _rvsp.needBalls       -> rsvp.answers.needBalls
 *
 * Rows are matched to guests by the `UID` column (the guest document id).
 *
 * Dry-run by default. Use --execute to write to the sheet.
 *
 * Usage:
 *   node scripts/sync-rsvp-responses.mjs                 # dry-run
 *   node scripts/sync-rsvp-responses.mjs --execute       # write to sheet
 *   node scripts/sync-rsvp-responses.mjs --sheet-name="Invitados"
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const sheetIdArg = args.find((arg) => arg.startsWith("--sheet-id="))?.split("=")[1];
const sheetNameArg = args.find((arg) => arg.startsWith("--sheet-name="))?.split("=")[1];

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const SHEETS_ENV_PATH = join(__dirname, "../integraciones/google_sheets/.env");
const GUEST_COLLECTION = "guests";

// Sheet header -> Firestore rsvp.answers key.
const RSVP_COLUMNS = [
  { header: "_rvsp.friday", key: "friday" },
  { header: "_rvsp.saturday", key: "saturday" },
  { header: "_rvsp.sunday", key: "sunday" },
  { header: "_rvsp.confirmCabin", key: "confirmCabin" },
  { header: "_rvsp.cabinWaitingList", key: "cabinWaitingList" },
  { header: "_rvsp.xtra", key: "xtra" },
  { header: "_rvsp.playa", key: "playa" },
  { header: "_rvsp.petanca", key: "petanca" },
  { header: "_rvsp.needBalls", key: "needBalls" },
];

function parseSimpleEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function signJwtAssertion({ privateKey, clientEmail, scope }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(claim)}`;
  const signature = cryptoSign(signingInput, privateKey);
  return `${signingInput}.${signature}`;
}

function cryptoSign(input, privateKey) {
  const crypto = require("crypto");
  return crypto.sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
}

async function getSheetsAccessToken() {
  const assertion = signJwtAssertion({
    privateKey: serviceAccount.private_key,
    clientEmail: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth token response missing access_token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function columnLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

async function readSheetRaw(token, spreadsheetId, sheetName) {
  const range = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets values request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.values || [];
}

async function writeSheetColumn(token, spreadsheetId, sheetName, columnIndex, values) {
  const letter = columnLetter(columnIndex);
  const range = encodeURIComponent(`${sheetName}!${letter}2:${letter}${values.length + 1}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ majorDimension: "ROWS", values: values.map((v) => [v]) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets values update failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function loadGuests() {
  const snap = await db.collection(GUEST_COLLECTION).get();
  const guests = new Map();
  snap.forEach((doc) => {
    const data = doc.data();
    guests.set(doc.id, data);
  });
  return guests;
}

function resolveAnswer(guest, key) {
  const value = guest?.rsvp?.answers?.[key];
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : "";
}

async function main() {
  const envValues = parseSimpleEnvFile(readFileSync(SHEETS_ENV_PATH, "utf-8"));
  const spreadsheetId = sheetIdArg || envValues.GOOGLE_SHEETS_ID;
  const sheetName = sheetNameArg || envValues.WS_INVITADOS || "Invitados";

  if (!spreadsheetId) {
    throw new Error("Missing Google Sheets ID. Set GOOGLE_SHEETS_ID in integraciones/google_sheets/.env or pass --sheet-id.");
  }

  console.log(`[rsvp-sync] Reading sheet "${sheetName}"...`);
  const token = await getSheetsAccessToken();
  const raw = await readSheetRaw(token, spreadsheetId, sheetName);
  if (raw.length === 0) {
    throw new Error("Sheet is empty; nothing to sync.");
  }

  const headers = raw[0].map((h) => String(h ?? "").trim());
  const uidIndex = headers.findIndex((h) => h === "UID");
  if (uidIndex === -1) {
    throw new Error('Sheet has no "UID" column; cannot match rows to guests.');
  }

  // Locate the _rvsp.* columns that exist in the sheet.
  const columns = RSVP_COLUMNS.map((col) => ({
    ...col,
    index: headers.findIndex((h) => h === col.header),
  })).filter((col) => col.index !== -1);

  if (columns.length === 0) {
    throw new Error('No "_rvsp.*" columns found in the sheet. Expected e.g. _rvsp.friday, _rvsp.saturday, ...');
  }

  console.log(`[rsvp-sync] Loading guests from Firestore...`);
  const guests = await loadGuests();
  console.log(`[rsvp-sync] Loaded ${guests.size} guests.`);

  // Build per-column value arrays aligned to sheet rows (row 2 onward).
  const rowCount = raw.length - 1;
  const columnValues = columns.map(() => new Array(rowCount).fill(""));
  let matched = 0;
  let unmatched = 0;

  for (let r = 0; r < rowCount; r++) {
    const uid = String(raw[r + 1]?.[uidIndex] ?? "").trim();
    if (!uid) continue;
    const guest = guests.get(uid);
    if (!guest) {
      unmatched++;
      continue;
    }
    matched++;
    for (let c = 0; c < columns.length; c++) {
      columnValues[c][r] = resolveAnswer(guest, columns[c].key);
    }
  }

  console.log(`[rsvp-sync] Matched ${matched} rows by UID; ${unmatched} rows had no matching guest.`);

  if (!EXECUTE) {
    console.log("[rsvp-sync] DRY-RUN — no writes performed. Re-run with --execute to write to the sheet.");
    for (const col of columns) {
      const filled = columnValues[columns.indexOf(col)].filter((v) => v !== "").length;
      console.log(`  ${col.header}: ${filled}/${rowCount} cells filled`);
    }
    return;
  }

  console.log("[rsvp-sync] Writing to sheet...");
  for (let c = 0; c < columns.length; c++) {
    const col = columns[c];
    await writeSheetColumn(token, spreadsheetId, sheetName, col.index, columnValues[c]);
    console.log(`  ${col.header} -> ${columnValues[c].filter((v) => v !== "").length} cells written`);
  }

  console.log("[rsvp-sync] Done.");
}

main().catch((err) => {
  console.error("[rsvp-sync] ERROR:", err.message);
  process.exit(1);
});
