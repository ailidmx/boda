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

// Inspect the target guest (benjamin) and one admin (david) to see all top-level fields.
for (const id of ["benjamin", "david_aïli"]) {
  const ref = db.collection("guests").doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`\n=== ${id}: NOT FOUND ===`); continue; }
  const d = snap.data();
  console.log(`\n=== ${id} top-level keys (${Object.keys(d).length}) ===`);
  console.log(Object.keys(d).sort().join(", "));
  console.log(`\n--- hosting keys ---`);
  console.log(d.hosting ? Object.keys(d.hosting).join(", ") : "(none)");
  console.log(`\n--- identity keys ---`);
  console.log(d.identity ? Object.keys(d.identity).join(", ") : "(none)");
  console.log(`\n--- rsvp keys ---`);
  console.log(d.rsvp ? Object.keys(d.rsvp).join(", ") : "(none)");
  console.log(`\n--- flightInfo keys ---`);
  console.log(d.flightInfo ? Object.keys(d.flightInfo).join(", ") : "(none)");
}
process.exit(0);
