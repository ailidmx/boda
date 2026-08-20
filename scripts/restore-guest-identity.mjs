/**
 * RESTORE the `identity` map on every `guests` document from the most recent
 * backup snapshot (pre-tables-guestids-2026-08-16T15-35-11-541Z).
 *
 * The earlier backfill script used `update({ identity: { age, isAdult } })`,
 * which REPLACED the whole `identity` map and wiped firstName/lastName/phone/
 * cloudinaryId/gender/etc. This script restores ONLY the `identity` fields
 * using dot-notation updates (`identity.firstName`, ...) so the rest of each
 * document (rsvp, hosting, tagGroup, ...) is preserved untouched.
 *
 * It also re-applies `isAdult` (derived from `age`) so the new field survives.
 *
 * Dry-run by default:
 *   node scripts/restore-guest-identity.mjs
 * Apply changes:
 *   node scripts/restore-guest-identity.mjs --execute
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
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

const BACKUP = join(__dirname, "../backups/pre-tables-guestids-2026-08-16T15-35-11-541Z/guests.json");
const backup = JSON.parse(readFileSync(BACKUP, "utf8"));
const byId = new Map(backup.map((g) => [g.id, g.data]));

const IDENTITY_FIELDS = [
  "age", "cloudinaryId", "firstName", "gender", "middleName", "lastName",
  "maternalLastName", "lang", "phone",
];

const snap = await db.collection("guests").get();
const plans = [];
let noBackup = 0;

for (const doc of snap.docs) {
  const current = doc.data();
  const backupData = byId.get(doc.id);
  if (!backupData) {
    noBackup++;
    console.log(`  NO BACKUP for ${doc.id} — leaving as-is`);
    continue;
  }
  const backupIdentity = backupData.identity || {};
  const update = {};
  for (const f of IDENTITY_FIELDS) {
    if (backupIdentity[f] !== undefined) update[`identity.${f}`] = backupIdentity[f];
  }
  // Re-apply isAdult derived from age.
  const age = backupIdentity.age ?? current.identity?.age;
  if (age === "Adulto") update["identity.isAdult"] = true;
  else if (age === "Niño") update["identity.isAdult"] = false;
  plans.push({ id: doc.id, update });
}

console.log(`total guests: ${snap.size}`);
console.log(`to restore: ${plans.length}`);
console.log(`no backup (skipped): ${noBackup}`);

if (!EXECUTE) {
  console.log("\nDRY RUN — pass --execute to apply.");
  const sample = plans[0];
  console.log("sample update for", sample.id, ":", JSON.stringify(sample.update, null, 2));
  process.exit(0);
}

let ok = 0;
let failed = 0;
for (const p of plans) {
  try {
    await db.collection("guests").doc(p.id).update(p.update);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED ${p.id}: ${err.message}`);
  }
}
console.log(`\napplied: ${ok} restored, ${failed} failed`);
