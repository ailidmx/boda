/**
 * One-off script: delete stale Firestore guest documents.
 * These are guests that exist in Firestore but no longer have a matching
 * row in the Google Sheet (identified by the sync script as "stale").
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const STALE_IDS = [
  "gael",
  "hijo_de_fanny",
  "jesus_de_guadalupe",
  "leonard_de_carne",
  "luca",
  "mama_tina_guadalupe",
  "papa_kao_guadalupe",
  "pareja_de_fred_bonpard",
  "sofía_de_guadalupe",
  "valentina_de_juárez",
];

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

console.log("Delete stale Firestore guests");
console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
console.log(`Targets: ${STALE_IDS.length} stale guest documents`);
console.log("");

let deleted = 0;
let notFound = 0;

for (const id of STALE_IDS) {
  const ref = db.collection("guests").doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    console.log(`  - ${id}: NOT FOUND (already gone)`);
    notFound++;
    continue;
  }

  const data = doc.data();
  const name = data?.identity?.firstName || data?.firstName || "(no name)";
  console.log(`  ~ ${id} (${name})`);

  if (EXECUTE) {
    await ref.delete();
    deleted++;
  }
}

console.log("");
if (EXECUTE) {
  console.log(`[EXECUTE] Deleted ${deleted} guest documents.`);
  console.log(`[EXECUTE] Not found (already gone): ${notFound}`);
} else {
  console.log(`[DRY-RUN] Would delete ${deleted} guest documents.`);
  console.log(`[DRY-RUN] Not found (already gone): ${notFound}`);
  console.log(`[DRY-RUN] Run with --execute to actually delete.`);
}

process.exit(0);
