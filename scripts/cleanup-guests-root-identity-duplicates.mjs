/**
 * Remove legacy root-level identity duplicates from guests docs.
 *
 * Keeps canonical fields in `identity.*` and deletes only:
 *   - gender
 *   - cloudinaryId
 *
 * Usage:
 *   node scripts/cleanup-guests-root-identity-duplicates.mjs
 *   node scripts/cleanup-guests-root-identity-duplicates.mjs --execute
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

function hasLegacyRootFields(data) {
  if (!data || typeof data !== "object") return false;
  return Object.prototype.hasOwnProperty.call(data, "gender")
    || Object.prototype.hasOwnProperty.call(data, "cloudinaryId");
}

async function main() {
  console.log(`cleanup-guests-root-identity-duplicates :: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);

  const snap = await db.collection("guests").get();
  const ids = [];

  snap.forEach((doc) => {
    if (hasLegacyRootFields(doc.data())) ids.push(doc.id);
  });

  console.log(`Guests total: ${snap.size}`);
  console.log(`Guests with legacy root fields: ${ids.length}`);
  console.log("Sample IDs:", ids.slice(0, 30));

  if (!EXECUTE) {
    console.log("Dry-run complete. Re-run with --execute to apply cleanup.");
    return;
  }

  if (ids.length === 0) {
    console.log("Nothing to clean.");
    return;
  }

  let batch = db.batch();
  let writes = 0;

  for (const id of ids) {
    batch.set(
      db.collection("guests").doc(id),
      {
        gender: FieldValue.delete(),
        cloudinaryId: FieldValue.delete(),
      },
      { merge: true },
    );
    writes++;
    if (writes % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (writes % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Applied updates to ${writes} guests.`);

  const verify = await db.collection("guests").get();
  let remaining = 0;
  verify.forEach((doc) => {
    if (hasLegacyRootFields(doc.data())) remaining++;
  });
  console.log(`Verification - guests still with root gender/cloudinaryId: ${remaining}`);
}

main().catch((error) => {
  console.error("cleanup failed", error);
  process.exit(1);
});
