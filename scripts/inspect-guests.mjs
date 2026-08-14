// Inspect the Firestore `guests` collection: list document IDs and key fields.
// Run: node scripts/inspect-guests.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../integraciones/google_sheets/service_account.json"), "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "boda-us-central1");

const snap = await db.collection("guests").get();
console.log(`Total documents in "guests": ${snap.size}\n`);
const rows = [];
snap.forEach((doc) => {
  const d = doc.data();
  rows.push({
    id: doc.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    username: d.username ?? "",
    email: d.email ?? "",
  });
});
rows.sort((a, b) => a.id.localeCompare(b.id));
for (const r of rows) {
  console.log(
    `id="${r.id}" | firstName="${r.firstName}" | lastName="${r.lastName}" | username="${r.username}" | email="${r.email}"`
  );
}
process.exit(0);
