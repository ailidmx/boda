/**
 * Check if there's any Firestore data under the auto-generated UIDs
 * for the 6 new users, before we delete/recreate their auth accounts.
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

const AUTO_UIDS = [
  "0ciSDalOu2QwAhVu5RaRpuQlK2z1", // michel_passelande
  "285j8uGPjVf7WRBiTTzyTGs21gt1", // nicole_passelande
  "eS9DHfHZ2OY9hZCdne00j1XxOI03", // sébastien_passelande
  "MQvSevKtjHhxcbw70a5a9mGFlv82", // gilles
  "1CpUHTUQUMW2cT7ekLahHLTPzG83", // habiba
  "1Nknb3M874TvnzCqILYeCJKK2jb2", // yvon_leborgne
];

const COLLECTIONS_TO_CHECK = [
  "guests",
  "attendance_responses",
  "rsvp_submissions",
  "experience_suggestions",
  "coast_interest",
  "petanque_participation",
];

for (const uid of AUTO_UIDS) {
  console.log(`\n=== UID: ${uid} ===`);
  for (const col of COLLECTIONS_TO_CHECK) {
    try {
      const doc = await db.collection(col).doc(uid).get();
      if (doc.exists) {
        console.log(`  ${col}/${uid}: EXISTS`);
        console.log(`    Data: ${JSON.stringify(doc.data()).substring(0, 200)}`);
      } else {
        console.log(`  ${col}/${uid}: not found`);
      }
    } catch (e) {
      console.log(`  ${col}/${uid}: ERROR ${e.message}`);
    }
  }
}

process.exit(0);
