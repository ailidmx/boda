// List all guests with a non-empty cloudinaryId.
// Run: cd web/invitation && node scripts/list-cloudinary-ids.mjs
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
let withPhoto = 0;
snap.forEach((doc) => {
  const d = doc.data();
  const cid = d.cloudinaryId || "";
  if (cid) {
    withPhoto++;
    console.log(`${doc.id}  →  ${cid}`);
  }
});
console.log(`\nTotal guests with cloudinaryId: ${withPhoto}`);
process.exit(0);
