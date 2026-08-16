/**
 * Seed the `tables` collection from the seating-plan CSV (invitados/mesas.csv).
 *
 * The dashboard's "Mesas" panel reads the Firestore `tables` collection as the
 * source of truth for the seating plan. Each table document carries the full
 * schema required by the Firestore rules (hasValidTableFields):
 *   id, name, capacity, shape, slots, x, y, guestIds
 *
 * The CSV only defines the table names + capacities (the actual guest-to-seat
 * assignments are done interactively in the dashboard), so this script creates
 * each table with EMPTY slots and a default grid position. It is idempotent:
 * existing tables are left untouched unless --overwrite is passed.
 *
 * Table naming/shape conventions (mirrors the dashboard):
 *   - Named tables (e.g. "38 tonnes #1", "Amigas de Aydé") → round, capacity 10
 *   - "Novios" → round, capacity 22
 *   - "Mesa N" → rectangle (long banquet table), capacity 10
 *   - "Sin Mesa" → skipped (it's a bucket, not a physical table)
 *
 * Dry-run by default:
 *   node scripts/migrate-tables-from-csv.mjs
 * Apply changes:
 *   node scripts/migrate-tables-from-csv.mjs --execute
 * Overwrite existing tables:
 *   node scripts/migrate-tables-from-csv.mjs --execute --overwrite
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");
const OVERWRITE = process.argv.includes("--overwrite");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// ── Parse the CSV ─────────────────────────────────────────────────────────
// Columns: ID,capacidad,nombre,ocupacion
const csvPath = join(__dirname, "../invitados/mesas.csv");
const lines = readFileSync(csvPath, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

// Skip the header row.
const rows = lines.slice(1).map((line) => {
  const [id, capacidad, nombre] = line.split(",");
  return { id: id.trim(), capacity: Number(capacidad), name: (nombre || id).trim() };
});

// ── Build table documents ────────────────────────────────────────────────
// "Sin Mesa" is a bucket, not a physical table — skip it.
const tables = rows
  .filter((r) => r.id && r.id !== "Sin Mesa")
  .map((r, index) => {
    const isNumbered = /^Mesa\s*#?\s*\d+$/i.test(r.id);
    const shape = isNumbered ? "rectangle" : "round";
    // Default grid position: arrange in a rough grid (4 columns).
    const x = (index % 4) * 14 + 2;
    const y = Math.floor(index / 4) * 12 + 2;
    return {
      id: r.id,
      name: r.name,
      capacity: r.capacity || 10,
      shape,
      slots: {},
      x,
      y,
      guestIds: [],
    };
  });

// ── Backup existing tables ───────────────────────────────────────────────
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-tables-seed-${ts}`);
mkdirSync(runDir, { recursive: true });

const existingSnapshot = await db.collection("tables").get();
const existingDocs = existingSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(existingDocs, null, 2), "utf8");
console.log(`[backup] tables: ${existingDocs.length} docs -> ${runDir}/tables.json`);

// ── Plan & apply ─────────────────────────────────────────────────────────
let created = 0;
let skipped = 0;
let overwritten = 0;

for (const table of tables) {
  const existing = existingDocs.find((d) => d.id === table.id);
  if (existing && !OVERWRITE) {
    console.log(`[skip] tables/${table.id} already exists (use --overwrite to replace)`);
    skipped++;
    continue;
  }

  console.log(`[plan] tables/${table.id}`, JSON.stringify(table));
  if (EXECUTE) {
    await db.collection("tables").doc(table.id).set(table);
    if (existing) overwritten++;
    else created++;
  }
}

console.log(`\n[summary] tables in CSV: ${tables.length}`);
console.log(`[summary] created: ${created}, overwritten: ${overwritten}, skipped: ${skipped}`);
if (!EXECUTE) {
  console.log("[dry-run] No writes applied. Re-run with --execute to seed Firestore.");
} else {
  console.log("[ok] Firestore tables collection seeded.");
}
