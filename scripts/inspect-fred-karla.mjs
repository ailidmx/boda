// Inspect Fred & Karla's guest docs + the "Fred et Karla" group membership.
// Run: node scripts/inspect-fred-karla.mjs
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

// Run the EXACT query the invitation uses: where invitationGroup == "Fred et Karla"
const q = db.collection("guests").where("invitationGroup", "==", "Fred et Karla");
const snap = await q.get();
console.log(`QUERY where invitationGroup == "Fred et Karla" returned ${snap.size} docs`);
snap.forEach((doc) => {
  const d = doc.data();
  console.log(`  id="${doc.id}" | firstName="${d.identity?.firstName}" | lastName="${d.identity?.lastName}"`);
});

// Also try with the trimmed value variants to catch whitespace issues
console.log("\n--- Variants ---");
for (const variant of ["Fred et Karla", "Fred et Karla\n", " Fred et Karla", "Fred et Karla "]) {
  const q2 = db.collection("guests").where("invitationGroup", "==", variant);
  const s2 = await q2.get();
  console.log(`  where invitationGroup == ${JSON.stringify(variant)} -> ${s2.size} docs`);
}

process.exit(0);
