// Compare current Firestore guests vs Google Sheet guests.
// Matches by normalized full name and by email.
// Run: cd web/invitation && node scripts/compare-guests.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const csv = require("csv-parse/sync");

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../integraciones/google_sheets/service_account.json"), "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// Normalize a name for fuzzy matching: lowercase, strip accents, collapse spaces
function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Load sheet
const sheetCsv = readFileSync(join(__dirname, "../../invitados/lista_invitados.csv"), "utf8");
const sheetRows = csv.parse(sheetCsv, { columns: true, skip_empty_lines: true });
const sheetByName = new Map();
const sheetByEmail = new Map();
for (const r of sheetRows) {
  const full = norm(`${r.Nombre ?? ""} ${r["Nombre 2"] ?? ""} ${r.Apellido ?? ""} ${r["Apellido 2"] ?? ""}`);
  const email = (r.email || "").trim().toLowerCase();
  if (full) sheetByName.set(full, r);
  if (email) sheetByEmail.set(email, r);
}

// Load Firestore guests
const snap = await db.collection("guests").get();
const fsGuests = [];
snap.forEach((doc) => {
  const d = doc.data();
  fsGuests.push({
    id: doc.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    email: (d.email ?? "").trim().toLowerCase(),
  });
});

let matchedByName = 0;
let matchedByEmail = 0;
let unmatched = [];
for (const g of fsGuests) {
  const full = norm(`${g.firstName} ${g.lastName}`);
  const byName = sheetByName.get(full);
  const byEmail = g.email ? sheetByEmail.get(g.email) : undefined;
  if (byName) matchedByName++;
  else if (byEmail) matchedByEmail++;
  else unmatched.push(`${g.id} (${g.firstName} ${g.lastName})`);
}

console.log(`Firestore guests: ${fsGuests.length}`);
console.log(`Sheet rows: ${sheetRows.length}`);
console.log(`Matched by name: ${matchedByName}`);
console.log(`Matched by email only: ${matchedByEmail}`);
console.log(`UNMATCHED in Firestore (not in sheet): ${unmatched.length}`);
console.log("\n--- Unmatched Firestore guests ---");
for (const u of unmatched) console.log(`  ${u}`);
process.exit(0);
