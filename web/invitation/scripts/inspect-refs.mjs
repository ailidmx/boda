// Inspect collections that reference guest IDs: invitation_groups, guest_profiles,
// guest_groups, cabins, assignments, guest_auth.
// Run: cd web/invitation && node scripts/inspect-refs.mjs
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

async function dump(colName, limit = 50) {
  console.log(`\n=== ${colName} ===`);
  const snap = await db.collection(colName).get();
  console.log(`  total: ${snap.size}`);
  let i = 0;
  snap.forEach((doc) => {
    if (i >= limit) return;
    i++;
    console.log(`  [${doc.id}] ${JSON.stringify(doc.data())}`);
  });
}

await dump("invitation_groups");
await dump("guest_groups");
await dump("guest_profiles");
await dump("cabins");
await dump("assignments");
process.exit(0);
