/**
 * Backfill the `isAdult` boolean field on every `guests` document, derived from
 * the existing `identity.age` string ("Adulto" → true, "Niño" → false).
 *
 * The `isAdult` field is stored INSIDE `identity` (alongside `age`), matching
 * the other identity fields. Guests with no `age` value are left untouched
 * (no `isAdult` written) so the dashboard can distinguish "unknown" from a
 * real adult/child.
 *
 * Dry-run by default:
 *   node scripts/backfill-guest-isAdult.mjs
 * Apply changes:
 *   node scripts/backfill-guest-isAdult.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

const snap = await db.collection("guests").get();
const changes = [];
let skipped = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  const age = d.identity?.age ?? d.age;
  let isAdult;
  if (age === "Adulto") isAdult = true;
  else if (age === "Niño") isAdult = false;
  else {
    skipped++;
    continue;
  }
  changes.push({ id: doc.id, age, isAdult });
}

console.log(`total guests: ${snap.size}`);
console.log(`to update: ${changes.length}`);
console.log(`skipped (no age): ${skipped}`);

if (!EXECUTE) {
  console.log("\nDRY RUN — pass --execute to apply.");
  const report = { total: snap.size, toUpdate: changes.length, skipped, changes };
  mkdirSync(join(__dirname, "../reports"), { recursive: true });
  writeFileSync(join(__dirname, "../reports/backfill-guest-isAdult-dry-run.json"), JSON.stringify(report, null, 2));
  process.exit(0);
}

let ok = 0;
let failed = 0;
for (const c of changes) {
  try {
    // Use dot-notation so we MERGE into the existing identity map instead of
    // replacing it. Replacing the whole map (identity: { age, isAdult }) would
    // wipe firstName/lastName/phone/cloudinaryId/gender/etc.
    await db.collection("guests").doc(c.id).update({
      "identity.age": c.age,
      "identity.isAdult": c.isAdult,
    });
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED ${c.id}: ${err.message}`);
  }

}
console.log(`\napplied: ${ok} updated, ${failed} failed`);
