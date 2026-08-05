// Check david's Firestore guest record for cloudinaryId.
// Run: cd web/invitation && node scripts/check-david-photo.mjs
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

for (const id of ["david_aïli", "aydé_juárez_guadalupe"]) {
  const doc = await db.collection("guests").doc(id).get();
  if (!doc.exists) {
    console.log(`${id}: NOT FOUND`);
    continue;
  }
  const d = doc.data();
  console.log(`${id}:`);
  console.log(`  cloudinaryId = ${JSON.stringify(d.cloudinaryId)}`);
  console.log(`  messageAuthor = ${JSON.stringify(d.messageAuthor)}`);

  console.log(`  email = ${JSON.stringify(d.email)}`);
  console.log(`  guestId = ${JSON.stringify(d.guestId)}`);
}
process.exit(0);
