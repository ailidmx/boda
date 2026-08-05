// Verify every guest document has a `messageAuthor` field.
// Run: cd web/invitation && node scripts/verify-message-author.mjs

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
let missing = 0;
let empty = 0;
let nonEmpty = 0;
const missingIds = [];
snap.forEach((doc) => {
  const d = doc.data();
  if (typeof d.messageAuthor !== "string") {
    missing++;
    missingIds.push(doc.id);
  } else if (d.messageAuthor === "") {
    empty++;
  } else {
    nonEmpty++;
  }
});
console.log(`Total guests: ${snap.size}`);
console.log(`With messageAuthor="" : ${empty}`);
console.log(`With messageAuthor set: ${nonEmpty}`);
console.log(`Missing messageAuthor  : ${missing}`);
if (missingIds.length) console.log(`Missing IDs: ${missingIds.join(", ")}`);
process.exit(0);

