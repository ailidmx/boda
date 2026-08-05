// Backup all Firestore collections to JSON files in backups/.
// Run: cd web/invitation && node scripts/backup-firestore.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf8")
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const COLLECTIONS = [
  "guests",
  "guest_auth",
  "guest_profiles",
  "invitation_groups",
  "guest_groups",
  "assignments",
  "cabins",
  "budget",
  "flights",
  "stays",
  "transfers",
  "travel_groups",
  "travelers",
  "group_members",
];

const backupDir = join(__dirname, "../../../backups");
mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-migration-${timestamp}`);
mkdirSync(runDir, { recursive: true });

for (const col of COLLECTIONS) {
  const snap = await db.collection(col).get();
  const docs = [];
  snap.forEach((doc) => {
    docs.push({ id: doc.id, data: doc.data() });
  });
  const file = join(runDir, `${col}.json`);
  writeFileSync(file, JSON.stringify(docs, null, 2), "utf8");
  console.log(`[ok] ${col}: ${docs.length} docs -> ${file}`);
}

console.log(`\nBackup complete in: ${runDir}`);
process.exit(0);
