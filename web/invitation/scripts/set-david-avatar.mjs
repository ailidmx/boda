// Set david's cloudinaryId in Firestore.
// Run: cd web/invitation && node scripts/set-david-avatar.mjs
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

const id = "david_aïli";
const cloudinaryId = "20260726_120055_wxzxpv";

await db.collection("guests").doc(id).update({ cloudinaryId });
console.log(`Updated ${id} cloudinaryId → ${cloudinaryId}`);

const doc = await db.collection("guests").doc(id).get();
console.log(`Verify: cloudinaryId = ${JSON.stringify(doc.data().cloudinaryId)}`);
process.exit(0);
