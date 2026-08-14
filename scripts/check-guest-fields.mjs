/**
 * Check all unique field names across all guest documents in Firestore.
 * This helps us build the correct hasOnly() list for the rules.
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

const snap = await db.collection("guests").get();
const allFields = new Set();
const fieldCounts = {};
let totalDocs = 0;

snap.forEach((doc) => {
  totalDocs++;
  const data = doc.data();
  for (const key of Object.keys(data)) {
    allFields.add(key);
    fieldCounts[key] = (fieldCounts[key] || 0) + 1;
  }
});

console.log(`Total guest docs: ${totalDocs}`);
console.log(`\nAll unique fields (${allFields.size}):`);
for (const field of [...allFields].sort()) {
  console.log(`  ${field} (${fieldCounts[field]} docs)`);
}

process.exit(0);
