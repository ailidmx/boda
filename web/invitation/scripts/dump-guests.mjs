// Dump all current Firestore guest IDs + their email/username for comparison.
// Run: cd web/invitation && node scripts/dump-guests.mjs
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
const rows = [];
snap.forEach((doc) => {
  const d = doc.data();
  rows.push({
    id: doc.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    username: d.username ?? "",
    email: d.email ?? "",
    group: d.group ?? d.invitationGroup ?? "",
  });
});
rows.sort((a, b) => a.id.localeCompare(b.id));
console.log(`TOTAL: ${rows.length}`);
for (const r of rows) {
  console.log(`${r.id}\t${r.firstName}\t${r.lastName}\t${r.username}\t${r.email}\t${r.group}`);
}
process.exit(0);
