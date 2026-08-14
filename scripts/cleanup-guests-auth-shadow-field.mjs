/**
 * Remove legacy internal auth shadow field from guests documents.
 *
 * Why:
 * - `__auth` was historical sync metadata and should not live in `guests`.
 * - It is not required by app runtime or Firestore rules.
 *
 * Usage:
 *   node scripts/cleanup-guests-auth-shadow-field.mjs            # dry-run
 *   node scripts/cleanup-guests-auth-shadow-field.mjs --execute  # apply
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const EXECUTE = process.argv.includes("--execute");
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));

const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(appPath);
const { getFirestore, FieldValue } = await import(firestorePath);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../integraciones/google_sheets/service_account.json"), "utf8"),
);

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore(app, "boda-us-central1");
const guestsRef = db.collection("guests");

async function main() {
  console.log(`cleanup-guests-auth-shadow-field :: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);

  const snap = await guestsRef.get();
  const idsWithAuth = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data && Object.prototype.hasOwnProperty.call(data, "__auth")) {
      idsWithAuth.push(doc.id);
    }
  });

  console.log(`Guests total: ${snap.size}`);
  console.log(`Guests with __auth: ${idsWithAuth.length}`);

  if (idsWithAuth.length === 0) {
    console.log("Nothing to clean.");
    return;
  }

  console.log("Sample IDs:", idsWithAuth.slice(0, 30));

  if (!EXECUTE) {
    console.log("Dry-run complete. Re-run with --execute to remove __auth.");
    return;
  }

  let writes = 0;
  let batch = db.batch();

  for (const id of idsWithAuth) {
    const ref = guestsRef.doc(id);
    batch.set(ref, { __auth: FieldValue.delete() }, { merge: true });
    writes++;
    if (writes % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (writes % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Removed __auth from ${writes} guests.`);

  const verifySnap = await guestsRef.get();
  let remaining = 0;
  verifySnap.forEach((doc) => {
    const data = doc.data();
    if (data && Object.prototype.hasOwnProperty.call(data, "__auth")) {
      remaining++;
    }
  });

  console.log(`Verification - guests still with __auth: ${remaining}`);
}

main().catch((error) => {
  console.error("cleanup failed", error);
  process.exit(1);
});
