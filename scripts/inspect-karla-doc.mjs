// Inspect Karla's guest doc in Firestore to diagnose the "No guest id" error.
// Run: node scripts/inspect-karla-doc.mjs
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

const UID = "karla_ujecić";
const doc = await db.collection("guests").doc(UID).get();
if (!doc.exists) {
  console.log(`DOC ${UID} DOES NOT EXIST`);
  process.exit(1);
}
const d = doc.data();
console.log(`DOC id="${doc.id}" exists. Top-level keys:`);
console.log(Object.keys(d).sort().join(", "));
console.log("\nidentity:", JSON.stringify(d.identity, null, 2));
console.log("\ninvitationGroup:", JSON.stringify(d.invitationGroup));
console.log("\nfirebaseEmail:", JSON.stringify(d.firebaseEmail));
console.log("\ncloudinaryId:", JSON.stringify(d.cloudinaryId));
console.log("\nidCheckUser:", JSON.stringify(d.idCheckUser));
console.log("\nhosting:", JSON.stringify(d.hosting, null, 2));
console.log("\nrsvp:", JSON.stringify(d.rsvp, null, 2));

// Also check Fred's doc for comparison
const fred = await db.collection("guests").doc("fred_38t").get();
if (fred.exists) {
  const fd = fred.data();
  console.log("\n\n=== FRED (comparison) ===");
  console.log(`DOC id="${fred.id}" exists. Top-level keys:`);
  console.log(Object.keys(fd).sort().join(", "));
  console.log("\nidentity:", JSON.stringify(fd.identity, null, 2));
  console.log("\ninvitationGroup:", JSON.stringify(fd.invitationGroup));
  console.log("\nfirebaseEmail:", JSON.stringify(fd.firebaseEmail));
  console.log("\ncloudinaryId:", JSON.stringify(fd.cloudinaryId));
  console.log("\nidCheckUser:", JSON.stringify(fd.idCheckUser));
}

process.exit(0);
