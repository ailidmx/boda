/**
 * Remove derived occupancy fields from the Firestore `cabins` collection.
 *
 * Usage:
 *   node scripts/cleanup-cabins-derived-occupancy.mjs
 *   node scripts/cleanup-cabins-derived-occupancy.mjs --execute
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const execute = process.argv.includes("--execute");
const invitationDir = join(scriptDir, "../web/invitation");
const requireFromInvitation = createRequire(join(invitationDir, "package.json"));

const appPath = requireFromInvitation.resolve("firebase-admin/app");
const firestorePath = requireFromInvitation.resolve("firebase-admin/firestore");
const { initializeApp, cert } = await import(appPath);
const { getFirestore, FieldValue } = await import(firestorePath);

const serviceAccount = JSON.parse(
  readFileSync(join(scriptDir, "../integraciones/google_sheets/service_account.json"), "utf8"),
);
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = getFirestore(app);

async function main() {
  console.log(`cleanup-cabins-derived-occupancy :: ${execute ? "EXECUTE" : "DRY-RUN"}`);
  const snapshot = await db.collection("cabins").get();
  const affected = [];

  snapshot.forEach((document) => {
    const data = document.data();
    const fields = ["occupancy", "occupancyPct", "ocupancy", "ocupancyPct"]
      .filter((field) => Object.prototype.hasOwnProperty.call(data, field));
    if (fields.length > 0) affected.push({ id: document.id, fields, name: data.name });
  });

  console.log(`Cabins total: ${snapshot.size}`);
  console.log(`Cabins with stored derived occupancy: ${affected.length}`);
  affected.forEach(({ id, fields, name }) => {
    console.log(`- ${id} | ${name || "(no name)"} | ${fields.join(", ")}`);
  });

  if (!execute || affected.length === 0) {
    console.log(execute ? "Nothing to clean." : "Dry-run complete. Re-run with --execute to remove these fields.");
    return;
  }

  const batch = db.batch();
  affected.forEach(({ id, fields }) => {
    const deletes = Object.fromEntries(fields.map((field) => [field, FieldValue.delete()]));
    batch.set(db.collection("cabins").doc(id), deletes, { merge: true });
  });
  await batch.commit();

  const verifySnapshot = await db.collection("cabins").get();
  let remaining = 0;
  verifySnapshot.forEach((document) => {
    const data = document.data();
    if (["occupancy", "occupancyPct", "ocupancy", "ocupancyPct"]
      .some((field) => Object.prototype.hasOwnProperty.call(data, field))) remaining += 1;
  });
  console.log(`Removed derived occupancy fields from ${affected.length} cabins.`);
  console.log(`Verification - cabins still storing derived occupancy: ${remaining}`);
}

main().catch((error) => {
  console.error("cleanup failed", error);
  process.exitCode = 1;
});
