/**
 * Revert Mesa #4 and Mesa #9 back to capacity 10 by removing ONE random guest
 * from each table's slots (set to null) and rebuilding guestIds. The removed
 * guest is left unseated so the admin can reassign them to another table later.
 *
 * Dry-run by default:
 *   node scripts/revert-tables-capacity.mjs
 * Apply changes:
 *   node scripts/revert-tables-capacity.mjs --execute
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

// ── Backup ────────────────────────────────────────────────────────────────
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-tables-capacity-revert-${ts}`);
mkdirSync(runDir, { recursive: true });

const tablesSnap = await db.collection("tables").get();
const tablesDocs = tablesSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(tablesDocs, null, 2), "utf8");
console.log(`[backup] tables: ${tablesDocs.length} docs -> ${runDir}/tables.json`);

// ── Target tables ─────────────────────────────────────────────────────────
const TARGETS = ["Mesa #4", "Mesa #6", "Mesa #9"];
const TARGET_CAPACITY = 10;

for (const target of TARGETS) {
  const doc = tablesDocs.find((t) => t.data.name === target);
  if (!doc) {
    console.log(`[skip] table "${target}" not found`);
    continue;
  }
  const data = doc.data;
  const slots = { ...(data.slots || {}) };
  const capacity = data.capacity;

  // Collect the filled slots (guest ids) in slot order.
  const filled = Object.keys(slots)
    .sort((a, b) => Number(a) - Number(b))
    .filter((k) => slots[k]);

  console.log(`\n[${target}] capacity=${capacity}, seated=${filled.length}`);
  if (filled.length <= TARGET_CAPACITY) {
    console.log(`  already <= ${TARGET_CAPACITY}; nothing to remove`);
    continue;
  }

  // Pick a random filled slot to remove.
  const removeIdx = Math.floor(Math.random() * filled.length);
  const removeSlot = filled[removeIdx];
  const removedGuest = slots[removeSlot];
  console.log(`  removing guest "${removedGuest}" from slot ${removeSlot}`);

  // Set that slot to null and rebuild guestIds.
  slots[removeSlot] = null;
  const guestIds = Object.keys(slots)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => slots[k])
    .filter(Boolean);

  const payload = {
    id: doc.id,
    name: data.name,
    capacity: TARGET_CAPACITY,
    shape: data.shape,
    slots,
    x: data.x,
    y: data.y,
    guestIds,
  };
  console.log(`  new capacity=${TARGET_CAPACITY}, seated=${guestIds.length}`);
  console.log(`  removed guest (now unseated): ${removedGuest}`);

  if (EXECUTE) {
    await db.collection("tables").doc(doc.id).set(payload, { merge: true });
  }
}

if (!EXECUTE) {
  console.log("\n[dry-run] No writes applied. Re-run with --execute to update Firestore.");
} else {
  console.log("\n[ok] Firestore tables capacity revert applied.");
}
