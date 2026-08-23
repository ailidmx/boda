/**
 * Remove the REDUNDANT `guestIds` field from the legacy `tables` collection.
 *
 * WHY BOTH EXIST:
 *   - `slots`    = { "0": guestId|null, "1": guestId|null, ... } — the
 *                  POSITIONAL canonical (which guest sits in which seat index).
 *   - `guestIds` = [guestId, ...] — an ORDERED list fully DERIVED from `slots`
 *                  (the non-null slot values in index order). It carries no
 *                  information `slots` doesn't already have.
 *
 * HISTORY: `migrate-tables-guestids.mjs` and `revert-tables-capacity.mjs` both
 * BUILD `guestIds` from `slots` ("rebuilding guestIds"), confirming `guestIds`
 * is derived, never canonical. The sanctioned bridge to the spatial editor
 * (`migrate-tables-to-plan.mjs`) also PREFERS `slots` and only falls back to
 * `guestIds`. The live spatial editor does NOT read the `tables` collection at
 * all — it reads/writes `plans/main` (instances + guestAssignments + definitions).
 *
 * The one remaining consumer of `tables.guestIds` is the LEGACY DOM canvas
 * (`web/dashboard/src/tables.js`), whose container `[data-table-assignments]`
 * is no longer rendered in the dashboard (the "Mesas" tab now renders
 * `[data-spatial-editor]`). That panel is dead.
 *
 * A full Firestore + JSON backup was taken first (scripts/backup-tables.mjs →
 * `tables_backup/*` + backups/tables-backup-<ts>/tables.json).
 *
 * Dry-run by default:
 *   node scripts/cleanup-tables-redundant-guestids.mjs
 * Apply (deletes `guestIds` via FieldValue.delete):
 *   node scripts/cleanup-tables-redundant-guestids.mjs --execute
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
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore, FieldValue } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

const snap = await db.collection("tables").get();
console.log(`[cleanup] tables: ${snap.size} docs · mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);

let withGuestIds = 0;
for (const doc of snap.docs) {
  const d = doc.data();
  const hasSlots = d.slots && typeof d.slots === "object" && Object.keys(d.slots).length > 0;
  const hasGuestIds = Array.isArray(d.guestIds);
  if (!hasGuestIds) continue;
  withGuestIds++;

  console.log(`  - ${doc.id}: guestIds.length=${d.guestIds.length} · slots=${hasSlots ? "present" : "MISSING"}`);
  if (EXECUTE) {
    await doc.ref.update({ guestIds: FieldValue.delete() });
  }
}

// ── Snapshot of the pre-removal state for audit ──
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-cleanup-tables-guestids-${ts}`);
mkdirSync(runDir, { recursive: true });
const before = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(before, null, 2), "utf8");

console.log(`[cleanup] ${withGuestIds} docs have guestIds (snapshot -> ${runDir}/tables.json)`);
console.log(EXECUTE ? "[cleanup] guestIds removed." : "[cleanup] dry-run — no writes. Re-run with --execute to remove.");

process.exit(0);