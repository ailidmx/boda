// Inspect the `isAdmin` field on the Novios' guest docs in live Firestore.
// Run: node scripts/inspect-isadmin.mjs
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
  const group = d.invitationGroup ?? d.tagGroup ?? "";
  if (group === "Novios" || group === "David y Aydé" || d.isNovio === true) {
    rows.push({
      id: doc.id,
      firstName: d.firstName ?? d.identity?.firstName ?? "",
      lastName: d.lastName ?? d.identity?.lastName ?? "",
      isAdmin: d.isAdmin,
      isNovio: d.isNovio,
      group,
    });
  }
});
rows.sort((a, b) => a.id.localeCompare(b.id));
console.log(`Novios docs found: ${rows.length}\n`);
for (const r of rows) {
  console.log(
    `id="${r.id}" | name="${r.firstName} ${r.lastName}" | isAdmin=${r.isAdmin} | isNovio=${r.isNovio} | group="${r.group}"`
  );
}
process.exit(0);
