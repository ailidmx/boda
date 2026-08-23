/**
 * Materialize the existing `tables` collection into a spatial event-layout
 * plan (`plans/{planId}/plans/{docId}`) used by the new editor.
 *
 * The legacy `tables` docs carry: id, name, capacity,
 * shape ("rectangle"|"round"), slots { index: guestId|null }, x, y, guestIds.
 *
 * This maps them into the spatial domain model:
 *   - definitions: system round / NOVIOS / rect (normalized)
 *   - instances:   one per table, with transform { x, y (meters), rotation }
 *   - guestAssignments: slots/guestIds → { [instanceId]: { [seatId]: guestId } }
 *
 * The legacy `tables` collection is NOT modified or deleted (it remains the
 * legacy source of truth for the old panel until we retire it). The new plan
 * is written to `plans/main/plans/default`.
 *
 * Dry-run by default:
 *   node scripts/migrate-tables-to-plan.mjs
 * Apply changes:
 *   node scripts/migrate-tables-to-plan.mjs --execute
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
const { getFirestore } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// Copy of the seat-id derivation used by the editor (kept local + verifiable).
const ROUND_DIAM = 1.8;
const NOVIOS_W = 7;
const NOVIOS_H = 1.5;
const RECT_W = 2.4;
const RECT_H = 0.9;
const SEAT_OFFSET = 0.35;

function roundSeatIds(count) {
  return Array.from({ length: count }, (_, i) => `seat-${i}`);
}

function rectSeatIds(count, enabledEdges = ["north", "south"]) {
  // North/south split (north first, then south), matching the legacy layout.
  const ids = [];
  const northCount = Math.ceil(count / 2);
  const southCount = count - northCount;
  for (let i = 0; i < northCount; i++) ids.push(`north-${i}`);
  for (let i = 0; i < southCount; i++) ids.push(`south-${i}`);
  return ids;
}

function definitionFor(table) {
  const name = table.name || table.id || "";
  const isNovios = /novios/i.test(name) || (table.capacity || 0) >= 22;
  const shape = table.shape === "rectangle" ? "rectangle" : "round";
  if (isNovios) return "sys-table-novios";
  if (shape === "rectangle") return "sys-table-rect";
  return "sys-table-round-10";
}

function seatIdsFor(defId, capacity) {
  if (defId === "sys-table-novios") return rectSeatIds(capacity, ["north", "south"]);
  if (defId === "sys-table-rect") return rectSeatIds(capacity, ["north", "south"]);
  return roundSeatIds(capacity);
}

function guestAssignmentsFor(defId, capacity, slots, guestIds) {
  const ordered = Array.isArray(guestIds) ? guestIds : [];
  const seatIds = seatIdsFor(defId, capacity);
  const assignments = {};
  // Prefer the explicit slots map (index → guestId), fall back to guestIds order.
  if (slots && typeof slots === "object" && Object.keys(slots).length) {
    for (const k of Object.keys(slots)) {
      const index = Number(k);
      const guestId = slots[k];
      if (Number.isInteger(index) && guestId && seatIds[index]) {
        assignments[seatIds[index]] = guestId;
      }
    }
  } else {
    ordered.forEach((guestId, i) => {
      if (guestId && seatIds[i]) assignments[seatIds[i]] = guestId;
    });
  }
  return assignments;
}

// ── Backup ────────────────────────────────────────────────────────────────
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-tables-plan-${ts}`);
mkdirSync(runDir, { recursive: true });

const tablesSnap = await db.collection("tables").get();
const tables = tablesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
writeFileSync(join(runDir, "tables.json"), JSON.stringify(tables, null, 2), "utf8");
console.log(`[backup] tables: ${tables.length} docs -> ${runDir}/tables.json`);

const planSnap = await db.collection("plans").doc("main").get();
writeFileSync(join(runDir, "plan-existing.json"), JSON.stringify(planSnap.exists ? planSnap.data() : null, null, 2), "utf8");
console.log(`[backup] existing plan: ${planSnap.exists ? "yes" : "no"}`);

// ── Build the plan ────────────────────────────────────────────────────────
// The legacy `tables` coordinates are recentered and geometry is intentionally
// reset; only the table COUNT and guest ASSIGNMENTS are preserved. The venue
// adopts the REAL banquet-hall dimensions from the legacy tables.js
// (30 m wide × 6 m tall), anchored at the top-left corner (x:0..30, y:0..6)
// so the footprint matches the actual space and fits the scale.
const ZONE_W = 30; // real hall width (matches legacy tables.js CANVAS_W)
const ZONE_H = 6; // real hall height (matches legacy tables.js CANVAS_H)
const zoneMinX = 0;
const zoneMinY = 0;

const plan = {
  id: "main",
  name: "Evento",
  venue: { width: ZONE_W, height: ZONE_H },
  zones: [{
    id: "main",
    name: "Salón principal",
    x: zoneMinX,
    y: zoneMinY,
    width: ZONE_W,
    height: ZONE_H,
    locked: false,
    visible: true,
  }],
  definitions: [],
  instances: [],
  groups: [],
  connections: [],
  guestAssignments: {},
};
console.log(`[zone] main zone: x=${zoneMinX} y=${zoneMinY} w=${ZONE_W} h=${ZONE_H} (all instances reset to 0,0)`);

const DEFINITIONS = {
  "sys-table-round-10": {
    id: "sys-table-round-10",
    origin: "system",
    name: "Mesa redonda",
    category: "table",
    shape: "circle",
    diameter: ROUND_DIAM,
    radius: ROUND_DIAM / 2,
    rotationMode: "none",
    canRotate: false,
    seating: { enabled: true, mode: "fixed", seatCount: 10, startAngle: -90, seatRadius: ROUND_DIAM / 2 + SEAT_OFFSET },
    connection: { enabled: false, ports: [] },
  },
  "sys-table-novios": {
    id: "sys-table-novios",
    origin: "system",
    name: "Mesa de novios",
    category: "table",
    shape: "rectangle",
    width: NOVIOS_W,
    height: NOVIOS_H,
    rotationMode: "orthogonal",
    canRotate: true,
    seating: { enabled: true, mode: "fixed", seatCount: 22, enabledEdges: ["north", "south"], startMargin: 0.3, endMargin: 0.3 },
    connection: { enabled: false, ports: [] },
  },
  "sys-table-rect": {
    id: "sys-table-rect",
    origin: "system",
    name: "Mesa rectangular",
    category: "table",
    shape: "rectangle",
    width: RECT_W,
    height: RECT_H,
    rotationMode: "orthogonal",
    canRotate: true,
    seating: { enabled: true, mode: "auto", enabledEdges: ["north", "south"], startMargin: 0.3, endMargin: 0.3 },
    connection: { enabled: true, ports: ["north", "east", "south", "west"] },
  },
};

for (const table of tables) {
  const defId = definitionFor(table);
  if (!plan.definitions.some((d) => d.id === defId)) plan.definitions.push(DEFINITIONS[defId]);

  const capacity = Math.max(1, table.capacity || 10);
  const instanceId = `inst-${table.id}`;
  // Geometry is intentionally reset: every migrated instance sits at (0,0).
  // The table COUNT and guest assignments are preserved; positions are left
  // for the user to drag into place in the editor.
  plan.instances.push({
    id: instanceId,
    definitionId: defId,
    zoneId: "main",
    transform: { x: 0, y: 0, rotation: 0 },
    unplaced: true,
    metadata: { displayName: table.name || table.id, legacyTableId: table.id },
  });

  const assignments = guestAssignmentsFor(defId, capacity, table.slots, table.guestIds);
  if (Object.keys(assignments).length) {
    plan.guestAssignments[instanceId] = assignments;
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log(`\n[summary] tables: ${tables.length}`);
console.log(`[summary] definitions: ${plan.definitions.map((d) => d.id).join(", ")}`);
console.log(`[summary] instances: ${plan.instances.length}`);
console.log(`[summary] guest-assigned instances: ${Object.keys(plan.guestAssignments).length}`);

if (EXECUTE) {
  await db.collection("plans").doc("main").set(
    { ...plan, updatedAt: new Date() },
    { merge: false },
  );
  console.log("\n[ok] Spatial plan written to plans/main.");
} else {
  writeFileSync(join(runDir, "plan-output.json"), JSON.stringify(plan, null, 2), "utf8");
  console.log(`\n[dry-run] Plan preview written to ${runDir}/plan-output.json`);
  console.log("[dry-run] No writes applied. Re-run with --execute to persist.");
}