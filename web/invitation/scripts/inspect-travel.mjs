// Inspect travel collections for guest ID references.
// Run: cd web/invitation && node scripts/inspect-travel.mjs
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

for (const colName of ["flights", "stays", "transfers", "travel_groups", "travelers", "group_members"]) {
  console.log(`\n=== ${colName} ===`);
  const snap = await db.collection(colName).get();
  console.log(`  total: ${snap.size}`);
  snap.forEach((doc) => {
    console.log(`  [${doc.id}] ${JSON.stringify(doc.data())}`);
  });
}
process.exit(0);
