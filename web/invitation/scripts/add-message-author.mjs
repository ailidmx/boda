// MIGRATION: Add the `messageAuthor` field (empty string) to every document
// in the `guests` collection. This is a non-destructive, additive migration.

//
// Run: cd web/invitation && node scripts/add-message-author.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf8")
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const snap = await db.collection("guests").get();
console.log(`Total documents in "guests": ${snap.size}\n`);

let updated = 0;
let already = 0;
const batchSize = 400;
let batch = db.batch();
let ops = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  if (typeof data.messageAuthor === "string") {
    already++;
    continue;
  }
  batch.update(doc.ref, { messageAuthor: "" });
  ops++;
  updated++;
  if (ops === batchSize) {
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }
}
if (ops > 0) await batch.commit();

console.log(`[ok] set messageAuthor="" on ${updated} docs`);
console.log(`[ok] already had messageAuthor: ${already}`);
process.exit(0);

