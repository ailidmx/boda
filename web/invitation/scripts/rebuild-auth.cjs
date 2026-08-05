// REBUILD FIREBASE AUTH from the Google Sheet (source of truth).
// Uses firebase-admin@13 (works on Node 22, unlike v14's broken jwks-rsa).
// DESTRUCTIVE: deletes ALL existing auth users, then recreates from the sheet.
const admin = require("firebase-admin");
const { readFileSync } = require("fs");
const { join } = require("path");

const sa = require("/Users/aydejuarez/boda/integraciones/google_sheets/service_account.json");
const AUTH_DOMAIN = "boda-david-y-ayde.web.app";

admin.initializeApp({ credential: admin.credential.cert(sa) });
const auth = admin.auth();

// ── CSV parser ─────────────────────────────────────────────────────────
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
function cleanStr(v) { return v === undefined || v === null ? "" : String(v).trim(); }
function toBool(v) {
  if (v === undefined || v === null || v === "") return false;
  return ["TRUE", "1", "YES", "SI"].includes(String(v).trim().toUpperCase());
}

// ── Load sheet ─────────────────────────────────────────────────────────
const sheetCsv = readFileSync("/Users/aydejuarez/boda/invitados/lista_invitados.csv", "utf8");
const guests = rowsToObjects(parseCsv(sheetCsv)).filter((r) => cleanStr(r.ID));
console.log(`Sheet guests with ID: ${guests.length}`);

// ── Build auth user list (handle duplicate emails) ─────────────────────
const usedEmails = new Set();
const users = [];
const skipped = [];

for (const r of guests) {
  const id = cleanStr(r.ID);
  const nombreCompleto = [cleanStr(r.Nombre), cleanStr(r["Nombre 2"]), cleanStr(r.Apellido), cleanStr(r["Apellido 2"])].filter(Boolean).join(" ");
  const username = cleanStr(r.username);
  const password = cleanStr(r.password) || "vivamexico";
  const isAdmin = toBool(r.isAdmin);

  let email = cleanStr(r.firebase_email);
  if (!email) {
    email = username ? `${username}@${AUTH_DOMAIN}` : `${id}@${AUTH_DOMAIN}`;
  }

  let finalEmail = email;
  if (usedEmails.has(finalEmail.toLowerCase())) {
    const fallback = username ? `${username}@${AUTH_DOMAIN}` : `${id}@${AUTH_DOMAIN}`;
    if (usedEmails.has(fallback.toLowerCase())) {
      skipped.push({ id, email, reason: "duplicate email and no unique fallback" });
      continue;
    }
    finalEmail = fallback;
    console.log(`[dup] ${id}: using fallback ${finalEmail} (was ${email})`);
  }
  usedEmails.add(finalEmail.toLowerCase());

  users.push({ id, email: finalEmail, password, displayName: nombreCompleto, isAdmin });
}

console.log(`Auth users to create: ${users.length}`);
console.log(`Skipped: ${skipped.length}`);
skipped.forEach((s) => console.log("  skip:", s.id, "-", s.reason));

// ── Delete all existing auth users ─────────────────────────────────────
async function deleteAllUsers() {
  let count = 0;
  let page;
  do {
    page = await auth.listUsers(1000);
    if (page.users.length === 0) break;
    await auth.deleteUsers(page.users.map((u) => u.uid));
    count += page.users.length;
    console.log(`  deleted ${count} so far...`);
  } while (page.pageToken);
  console.log(`[ok] deleted ${count} auth users`);
}

// ── Create new auth users ──────────────────────────────────────────────
async function createUsers() {
  let created = 0;
  const errors = [];
  for (const u of users) {
    try {
      await auth.createUser({
        uid: u.id,
        email: u.email,
        password: u.password,
        displayName: u.displayName,
        emailVerified: false,
      });
      created++;
      if (created % 25 === 0) console.log(`  created ${created}/${users.length}...`);
    } catch (e) {
      errors.push({ id: u.id, email: u.email, error: e.message });
    }
  }
  console.log(`[ok] created ${created} auth users`);
  if (errors.length) {
    console.log(`[warn] ${errors.length} errors:`);
    errors.forEach((e) => console.log("  ", e.id, e.email, "-", e.error));
  }
}

// ── Set admin custom claims ────────────────────────────────────────────
async function setAdminClaims() {
  const admins = users.filter((u) => u.isAdmin);
  console.log(`\nSetting admin claims for ${admins.length} users...`);
  for (const a of admins) {
    try {
      await auth.setCustomUserClaims(a.id, { admin: true });
      console.log(`[ok] admin claim set: ${a.id} (${a.email})`);
    } catch (e) {
      console.log(`[warn] admin claim failed for ${a.id}: ${e.message}`);
    }
  }
}

(async () => {
  console.log("\nDeleting existing auth users...");
  await deleteAllUsers();

  console.log("\nCreating auth users...");
  await createUsers();

  await setAdminClaims();

  console.log("\nAuth rebuild complete.");
  process.exit(0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
