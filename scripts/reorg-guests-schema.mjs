/**
 * Reorganize Firestore `guests` documents into nested `identity` and `hosting`
 * objects, preserving other fields and deleting the migrated flat keys.
 *
 * Dry-run by default:
 *   node scripts/reorg-guests-schema.mjs
 * Apply changes:
 *   node scripts/reorg-guests-schema.mjs --execute
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
const { getFirestore, FieldValue } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

const IDENTITY_FIELDS = ["age", "cloudinaryId", "firstName", "gender", "middleName", "lastName", "maternalLastName", "lang", "phone"];
const HOSTING_FIELDS = [
  "cabin",
  "room",
  "xtraCabin",
  "xtraRoom",
  "isCabinPaid",
  "isCabinPaidByNovios",
  "isXtraCabinPaidByNovios",
  "isXtraCabinPaid",
];

function buildNestedUpdate(data) {
  const nextIdentity = { ...(data.identity || {}) };
  const nextHosting = { ...(data.hosting || {}) };
  let changed = false;
  const update = {};

  for (const field of IDENTITY_FIELDS) {
    if (data[field] !== undefined && nextIdentity[field] === undefined) {
      nextIdentity[field] = data[field];
      changed = true;
    }
    if (data[field] !== undefined) {
      update[field] = FieldValue.delete();
      changed = true;
    }
  }

  for (const field of HOSTING_FIELDS) {
    if (data[field] !== undefined && nextHosting[field] === undefined) {
      nextHosting[field] = data[field];
      changed = true;
    }
    if (data[field] !== undefined) {
      update[field] = FieldValue.delete();
      changed = true;
    }
  }

  if (Object.keys(nextIdentity).length > 0) {
    update.identity = nextIdentity;
  }
  if (Object.keys(nextHosting).length > 0) {
    update.hosting = nextHosting;
  }

  return { changed, update };
}

const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-guests-schema-reorg-${ts}`);
mkdirSync(runDir, { recursive: true });

const snapshot = await db.collection("guests").get();
const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "guests.json"), JSON.stringify(docs, null, 2), "utf8");
console.log(`[backup] guests: ${docs.length} docs -> ${runDir}/guests.json`);

let changedCount = 0;
for (const { id, data } of docs) {
  const { changed, update } = buildNestedUpdate(data);
  if (!changed) continue;

  changedCount++;
  console.log(`[plan] guests/${id}`, JSON.stringify(update));
  if (EXECUTE) {
    await db.collection("guests").doc(id).update(update);
  }
}

console.log(`\n[summary] guests needing update: ${changedCount}`);
if (!EXECUTE) {
  console.log("[dry-run] No writes applied. Re-run with --execute to update Firestore.");
} else {
  console.log("[ok] Firestore guests schema reorganization applied.");
}