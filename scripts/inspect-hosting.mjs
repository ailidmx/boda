// Inspect the `hosting` maps in live Firestore to find any keys not allowed
// by hasValidGuestHostingFields().
// Run from functions/: node inspect-hosting.mjs
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

const ALLOWED = new Set([
  "cabin", "room", "xtraCabin", "xtraRoom",
  "isCabinPaidByNovios", "isCabinPaid",
  "isXtraCabinPaidByNovios", "isXtraCabinPaid",
]);

const snap = await db.collection("guests").get();
let withHosting = 0;
const offenders = [];
snap.forEach((doc) => {
  const d = doc.data();
  if (!d.hosting || typeof d.hosting !== "object") return;
  withHosting++;
  const keys = Object.keys(d.hosting);
  const bad = keys.filter((k) => !ALLOWED.has(k));
  if (bad.length) {
    offenders.push({ id: doc.id, badKeys: bad, allKeys: keys });
  }
});
console.log(`Guests with hosting map: ${withHosting}`);
console.log(`Guests with disallowed hosting keys: ${offenders.length}\n`);
for (const o of offenders) {
  console.log(`id="${o.id}" | badKeys=${JSON.stringify(o.badKeys)} | allKeys=${JSON.stringify(o.allKeys)}`);
}
process.exit(0);
