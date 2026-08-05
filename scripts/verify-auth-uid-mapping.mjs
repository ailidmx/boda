/**
 * Verify that the Firebase Auth UIDs (localId) match the Google Sheet guest
 * UIDs (the `UID` column) for rows where `firebase.auth` is true. Auth records
 * use localId = UID, so auth.uid == guestId. This lets the Firestore rules
 * look up `guests/{auth.uid}` directly.
 *
 * Usage:
 *   node scripts/verify-auth-uid-mapping.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_EXPORT = "/tmp/auth_users.json";
const CSV_PATH = join(__dirname, "../invitados/lista_invitados.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i].trim() : ""; });
    return obj;
  });
}

const auth = JSON.parse(readFileSync(AUTH_EXPORT, "utf-8"));
const authUsers = auth.users || [];

const csv = readFileSync(CSV_PATH, "utf-8");
function toBool(value) {
  return ["TRUE", "1", "YES", "SI"].includes(String(value ?? "").trim().toUpperCase());
}

const allSheetRows = rowsToObjects(parseCsv(csv)).filter((r) => r.UID);
const sheetRows = allSheetRows.filter((r) => toBool(r["firebase.auth"] ?? r.firebase_auth));

// Build a map from expected Auth UID -> row, and from email -> UID.
const sheetById = new Map();
const sheetByEmail = new Map();
for (const r of sheetRows) {
  sheetById.set(r.UID, r);
  const email = (r["firebase.Identifier"] || r.firebase_email || "").trim().toLowerCase();
  if (email) sheetByEmail.set(email, r.UID);
}

console.log(`Auth users: ${authUsers.length}`);
console.log(`Sheet rows with UID: ${allSheetRows.length}`);
console.log(`Sheet rows requiring Auth: ${sheetRows.length}`);
console.log("");

let matchedByUid = 0;
let matchedByEmail = 0;
let unmatched = [];

for (const u of authUsers) {
  const uid = u.localId;
  const email = (u.email || "").toLowerCase();
  const sheetRow = sheetById.get(uid);
  if (sheetRow) {
    matchedByUid++;
    continue;
  }
  // Fallback: match by email
  const sheetIdByEmail = sheetByEmail.get(email);
  if (sheetIdByEmail) {
    matchedByEmail++;
    unmatched.push({ uid, email, sheetId: sheetIdByEmail, reason: "matched by email, uid != sheet UID" });
    continue;
  }
  unmatched.push({ uid, email, sheetId: null, reason: "no match in sheet" });
}

console.log(`Auth UIDs that match an enabled sheet UID directly: ${matchedByUid}`);
console.log(`Auth UIDs matched by email (uid != sheet UID): ${matchedByEmail}`);
console.log(`Auth UIDs with no sheet match: ${unmatched.length}`);
console.log("");

if (unmatched.length > 0) {
  console.log("Unmatched / mismatched auth users:");
  for (const u of unmatched) {
    console.log(`  uid=${u.uid}  email=${u.email}  sheetId=${u.sheetId || "(none)"}  -> ${u.reason}`);
  }
}

// Also check: any enabled sheet UIDs that have NO auth user.
const authUids = new Set(authUsers.map((u) => u.localId));
const missingAuth = sheetRows.filter((r) => !authUids.has(r.UID));
console.log("");
console.log(`Enabled sheet UIDs with NO auth user: ${missingAuth.length}`);
for (const r of missingAuth) {
  console.log(`  ${r.UID}  (${r["identity.firstName"] || r.Nombre} ${r["identity.lastName"] || r.Apellido})`);
}
