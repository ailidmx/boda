// Inspect guest docs for any auth-UID-related field and the doc IDs.
// Run from functions/: node inspect-uid.mjs
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
const rows = [];
snap.forEach((doc) => {
  const d = doc.data();
  const uidFields = {};
  for (const k of Object.keys(d)) {
    if (/uid|auth|uuid/i.test(k)) uidFields[k] = d[k];
  }
  rows.push({ id: doc.id, uidFields });
});
rows.sort((a, b) => a.id.localeCompare(b.id));
for (const r of rows) {
  if (Object.keys(r.uidFields).length) {
    console.log(`id="${r.id}" | uidFields=${JSON.stringify(r.uidFields)}`);
  }
}
console.log(`\nTotal docs: ${rows.length}`);
process.exit(0);
