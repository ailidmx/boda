/**
 * Migrate the seating plan from `guests.table` (a string field on each guest)
 * into the `tables` collection's `slots` map + `guestIds` list.
 *
 * The old model stored each guest's table as a string on the guest doc:
 *   guests/{id}.table = "Mesa #1" | "Novios" | "Sin Mesa" | ...
 *
 * The new model stores the seating plan on the TABLE doc:
 *   tables/{id}.slots     = { "0": guestId|null, "1": guestId|null, ... }
 *   tables/{id}.guestIds  = [guestId, ...]  (ordered, non-null, derived from slots)
 *
 * This script:
 *   1. Backs up the current `tables` and `guests` collections.
 *   2. Creates any tables referenced by guests that don't exist yet
 *      (e.g. "Mesa #6".."Mesa #9").
 *   3. Prepopulates EVERY table's slots with `null` for all capacity indexes
 *      (so the dashboard renders the full set of empty seats).
 *   4. Migrates each guest's `guests.table` into the matching table's slots
 *      (first free slot), building `guestIds` from the filled slots.
 *   5. Recalculates positions so the rectangle (NOVIOS) table sits at the
 *      CENTER and the round tables are distributed equally around it.
 *
 * Guests with `table === "Sin Mesa"` (or empty) are left unseated.
 *
 * Dry-run by default:
 *   node scripts/migrate-tables-guestids.mjs
 * Apply changes:
 *   node scripts/migrate-tables-guestids.mjs --execute
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
const runDir = join(backupDir, `pre-tables-guestids-${ts}`);
mkdirSync(runDir, { recursive: true });

const tablesSnap = await db.collection("tables").get();
const tablesDocs = tablesSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(tablesDocs, null, 2), "utf8");
console.log(`[backup] tables: ${tablesDocs.length} docs -> ${runDir}/tables.json`);

const guestsSnap = await db.collection("guests").get();
const guestsDocs = guestsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "guests.json"), JSON.stringify(guestsDocs, null, 2), "utf8");
console.log(`[backup] guests: ${guestsDocs.length} docs -> ${runDir}/guests.json`);

// ── Build the table registry ─────────────────────────────────────────────
// Map table name → { id, name, capacity, shape, slots, x, y, guestIds }.
// Existing tables keep their id/capacity/shape; missing tables are created.
const tablesByName = new Map();
for (const { id, data } of tablesDocs) {
  const name = data.name || id;
  tablesByName.set(name, {
    id,
    name,
    capacity: data.capacity || 10,
    shape: data.shape === "rectangle" ? "rectangle" : "round",
    slots: { ...(data.slots || {}) },
    x: Number.isInteger(data.x) ? data.x : 0,
    y: Number.isInteger(data.y) ? data.y : 0,
    guestIds: Array.isArray(data.guestIds) ? [...data.guestIds] : [],
  });
}

// Collect the set of table names referenced by guests, and count how many
// guests reference each table so we can size newly-created tables correctly.
const guestTableNames = new Set();
const guestCountByTable = new Map();
for (const { data } of guestsDocs) {
  const t = data.table;
  if (t && t !== "Sin Mesa") {
    guestTableNames.add(t);
    guestCountByTable.set(t, (guestCountByTable.get(t) || 0) + 1);
  }
}

// Create any missing tables (default round). Capacity is sized to fit the
// actual number of guests assigned to it (min 10), so no guest is left out.
let createdCount = 0;
for (const name of guestTableNames) {
  if (!tablesByName.has(name)) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    const guestCount = guestCountByTable.get(name) || 0;
    tablesByName.set(name, {
      id,
      name,
      capacity: Math.max(10, guestCount),
      shape: "round",
      slots: {},
      x: 0,
      y: 0,
      guestIds: [],
    });
    createdCount++;
    console.log(`[plan] create missing table: ${name} (id=${id}, capacity=${Math.max(10, guestCount)})`);
  }
}

// Clean up any stray "__table__" placeholder values in existing slots (e.g.
// the leftover "__table__Petanclub #3" in Petanclub #2) so they don't consume
// a real seat.
for (const table of tablesByName.values()) {
  for (const k of Object.keys(table.slots)) {
    if (typeof table.slots[k] === "string" && table.slots[k].startsWith("__table__")) {
      table.slots[k] = null;
    }
  }
}

// Ensure every EXISTING table's capacity is at least the number of guests
// assigned to it (e.g. "Mesa #4" has 11 guests but capacity 10). This keeps
// the full guest list seated without dropping anyone.
for (const table of tablesByName.values()) {
  const guestCount = guestCountByTable.get(table.name) || 0;
  if (guestCount > table.capacity) {
    console.log(`[plan] bump capacity ${table.name}: ${table.capacity} -> ${guestCount}`);
    table.capacity = guestCount;
  }
}



// ── Prepopulate every table's slots with null for all capacity indexes ──
// This ensures the dashboard renders the full set of empty seats (the user
// asked for "all the index null by default").
for (const table of tablesByName.values()) {
  const capacity = table.capacity;
  const slots = {};
  for (let i = 0; i < capacity; i++) {
    slots[i] = table.slots[i] ?? null;
  }
  table.slots = slots;
}

// ── Migrate guests.table → tables.slots / guestIds ───────────────────────
// For each guest with a real table, place them in the first free slot of that
// table. Guests with "Sin Mesa" or no table stay unseated.
let seatedCount = 0;
let unseatedCount = 0;
for (const { id, data } of guestsDocs) {
  const tableName = data.table;
  if (!tableName || tableName === "Sin Mesa") {
    unseatedCount++;
    continue;
  }
  const table = tablesByName.get(tableName);
  if (!table) {
    unseatedCount++;
    continue;
  }
  // Find the first free slot (null or empty).
  let placed = false;
  for (let i = 0; i < table.capacity; i++) {
    if (!table.slots[i]) {
      table.slots[i] = id;
      placed = true;
      break;
    }
  }
  if (placed) {
    seatedCount++;
  } else {
    unseatedCount++;
    console.log(`[warn] table ${tableName} is full; ${id} left unseated`);
  }
}

// Rebuild guestIds from slots (ordered, non-null).
for (const table of tablesByName.values()) {
  table.guestIds = Object.keys(table.slots)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => table.slots[k])
    .filter(Boolean);
}

// ── Recalculate positions: rectangle at center, rounds equally around ────
// The rectangle (NOVIOS) table sits at grid (0,0). Every round table is
// placed in concentric rings around it, equally spaced by angle.
function autoLayout(tables) {
  const novios = tables.find((t) => t.shape === "rectangle" || /novios/i.test(t.name));
  const others = tables.filter((t) => t !== novios);
  const positions = new Map();
  if (novios) positions.set(novios.name, { x: 0, y: 0 });

  let radius = 12;
  let placed = 0;
  while (placed < others.length) {
    const capacity = Math.max(1, Math.floor((2 * Math.PI * radius) / 8));
    const count = Math.min(capacity, others.length - placed);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.set(others[placed + i].name, {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      });
    }
    placed += count;
    radius += 10;
  }
  return positions;
}

const positions = autoLayout([...tablesByName.values()]);
for (const table of tablesByName.values()) {
  const pos = positions.get(table.name);
  if (pos) {
    table.x = pos.x;
    table.y = pos.y;
  }
}

// ── Plan & apply ──────────────────────────────────────────────────────────
console.log(`\n[summary] tables: ${tablesByName.size} (${createdCount} created)`);
console.log(`[summary] guests seated: ${seatedCount}, unseated: ${unseatedCount}`);

for (const table of tablesByName.values()) {
  const payload = {
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    shape: table.shape,
    slots: table.slots,
    x: table.x,
    y: table.y,
    guestIds: table.guestIds,
  };
  console.log(`[plan] tables/${table.id}`, JSON.stringify({
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    x: table.x,
    y: table.y,
    seated: table.guestIds.length,
  }));
  if (EXECUTE) {
    await db.collection("tables").doc(table.id).set(payload, { merge: true });
  }
}

if (!EXECUTE) {
  console.log("\n[dry-run] No writes applied. Re-run with --execute to update Firestore.");
} else {
  console.log("\n[ok] Firestore tables guestIds migration applied.");
}
