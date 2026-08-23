/**
 * Backup the `tables` collection into Firestore (`tables_backup`) AND a JSON
 * dump under `backups/`.
 *
 * The spatial editor now reads/writes `plans/main`; the legacy `tables`
 * collection remains the fallback source of truth. Before any cleanup (e.g.
 * removing the unused `guestIds`/`slots` field), snapshot every doc so we can
 * recover.
 *
 * Firestore copy: `tables_backup/{tableId}` (same id, full doc + _backedUpAt).
 * JSON dump:     `backups/tables-backup-<timestamp>/tables.json`
 *
 * Run:  node scripts/backup-tables.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore, Timestamp } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// ── JSON backup ──────────────────────────────────────────────────────────
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `tables-backup-${ts}`);
mkdirSync(runDir, { recursive: true });

const snap = await db.collection("tables").get();
const tables = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(tables, null, 2), "utf8");
console.log(`[backup] JSON dump: ${tables.length} docs -> ${runDir}/tables.json`);

// ── Firestore copy into `tables_backup` ─────────────────────────────────
const copiedAt = Timestamp.now();
let copied = 0;
for (const doc of snap.docs) {
  await db.collection("tables_backup").doc(doc.id).set(
    { ...doc.data(), _backedUpAt: copiedAt, _sourceId: doc.id },
    { merge: true },
  );
  copied++;
}
console.log(`[backup] Firestore copy: ${copied} docs -> tables_backup/*`);

process.exit(0);