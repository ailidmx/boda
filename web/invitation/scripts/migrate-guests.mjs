// ⚠️ DEPRECATED — DO NOT USE.
//
// This script has been replaced by the safe, incremental sync tooling:
//   - scripts/sheet-mapping.cjs          (single source of truth for field mapping)
//   - scripts/sync-sheet-to-firestore.mjs (dry-run + diff + merge, never destructive)
//   - scripts/verify-sheet-sync.mjs       (post-sync verification, read-only)
//
// Run the new sync from the repo root:
//   ~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs
//
// This old script is kept only for historical reference. It performs a
// DESTRUCTIVE migration (deletes collections, rebuilds from scratch).
//
// MIGRATION: Rebuild `guests` from Google Sheet (source of truth), delete obsolete
// collections, and rebuild `cabins` from our cabin inventory bases.
//
// Run: cd web/invitation && node scripts/migrate-guests.mjs
//
// IMPORTANT: This is a DESTRUCTIVE migration. A backup is created first.
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

// ── Self-contained CSV parser (handles quoted fields) ─────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Last field/row
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? r[i].trim() : "";
    });
    return obj;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

function toBool(v) {
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES" || s === "SI";
}

function toNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[$,\s]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

// ── Load sheet ─────────────────────────────────────────────────────────

const sheetCsv = readFileSync(join(__dirname, "../../../invitados/lista_invitados.csv"), "utf8");
const sheetRows = rowsToObjects(parseCsv(sheetCsv));

// Filter out empty rows (no ID)
const guests = sheetRows.filter((r) => cleanStr(r.ID));
console.log(`Sheet rows with ID: ${guests.length}`);

// ── Build guest docs ───────────────────────────────────────────────────
//
// AGREED FIRESTORE SCHEMA (English field names only). The Google Sheet keeps
// its Spanish column names; this mapping translates them. Fields that are
// derived/calculated (ocupacion, precio, privateCabin, privateRoom,
// nombreCompleto, cuartoDesc, xtraCuartoDesc, email, firebaseEmail,
// defaultEmail, username, password) are NOT stored — the front end computes
// them via refs (cabins/rooms/tables) and Firebase Auth.

function buildGuestDoc(r) {
  const nombre = cleanStr(r.Nombre);
  const nombre2 = cleanStr(r["Nombre 2"]);
  const apellido = cleanStr(r.Apellido);
  const apellido2 = cleanStr(r["Apellido 2"]);
  const cloudinaryId = cleanStr(r.cloudinary_id);

  return {
    id: cleanStr(r.ID),
    identity: {
      firstName: nombre,
      middleName: nombre2,
      lastName: apellido,
      maternalLastName: apellido2,
      gender: cleanStr(r.Genero),
      cloudinaryId,
      lang: cleanStr(r.lang),
      age: cleanStr(r.Edad),
      phone: cleanStr(r.Celular),
    },
    gender: cleanStr(r.Genero),

    idCheckUser: toBool(r.id_check_user),

    cloudinaryId,
    message: cleanStr(r.message),
    messageAuthor: "",

    invitationGroup: cleanStr(r.invitacion_group),

    tagGroup: cleanStr(r.tag_group),
    hosting: {
      cabin: cleanStr(r.Cabaña),
      room: cleanStr(r.Cuarto),
      xtraCabin: cleanStr(r.Xtra_cabaña),
      xtraRoom: cleanStr(r.Xtra_cuarto),
      isCabinPaidByNovios: toBool(r.isCabinPaidByNovios),
      isCabinPaid: toBool(r.isCabinPaid),
      isXtraCabinPaidByNovios: toBool(r.isXtraCabinPaidByNovios),
      isXtraCabinPaid: toBool(r.isXtraCabinPaid),
    },
    table: cleanStr(r.Mesa),
    sent: toBool(r.sent),
    rsvp: {
      friday: toBool(r.RVSP_Friday),
      saturday: toBool(r.RVSP_Saturday),
      sunday: toBool(r.RVSP_Sunday),
      confirmCabin: toBool(r.RVSP_confirmCabin),
      cabinWaitingList: toBool(r.RVSP_cabinWaitingList),
      xtra: toBool(r.RVSP_Xtra),
      playa: toBool(r.RVSP_Playa),
      petanca: toBool(r.RVSP_Petanca),
      needBalls: toBool(r.RVSP_NeedBalls),
    },
    modifiedAt: cleanStr(r["Confirmado el "]),
    travelsByPlane: toBool(r.viajaEnAvion),
    isAdmin: toBool(r.isAdmin),
    _source: "google_sheet",
    _migratedAt: new Date().toISOString(),
  };

}


// ── Backup current guests before overwriting ───────────────────────────

const backupDir = join(__dirname, "../../../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-guests-rebuild-${ts}`);
mkdirSync(runDir, { recursive: true });

const oldGuests = await db.collection("guests").get();
const oldDocs = [];
oldGuests.forEach((doc) => oldDocs.push({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "guests.json"), JSON.stringify(oldDocs, null, 2), "utf8");
console.log(`[backup] guests: ${oldDocs.length} docs -> ${runDir}/guests.json`);

// ── Write new guests ───────────────────────────────────────────────────

console.log("\nWriting guests collection...");
let written = 0;
for (const r of guests) {
  const doc = buildGuestDoc(r);
  await db.collection("guests").doc(doc.id).set(doc);
  written++;
}
console.log(`[ok] guests: ${written} docs written`);

// ── Delete stale guests (not in sheet) ─────────────────────────────────

console.log("\nDeleting stale guests (not in sheet)...");
const validIds = new Set(guests.map((r) => cleanStr(r.ID)));
const allGuests = await db.collection("guests").get();
const staleIds = [];
allGuests.forEach((doc) => {
  if (!validIds.has(doc.id)) staleIds.push(doc.id);
});
const delBatchSize = 400;
for (let i = 0; i < staleIds.length; i += delBatchSize) {
  const batch = db.batch();
  staleIds.slice(i, i + delBatchSize).forEach((id) => batch.delete(db.collection("guests").doc(id)));
  await batch.commit();
}
console.log(`[ok] deleted stale guests: ${staleIds.length}`);


// ── Delete obsolete collections ────────────────────────────────────────

// NOTE: `invitation_groups` is intentionally NOT in this list — the dashboard
// and invitation frontend both read custom group content from it.
const DELETE_COLLECTIONS = [
  "guest_auth",
  "guest_profiles",
  "guest_groups",
  "assignments",
  "flights",
  "stays",
  "transfers",
  "travel_groups",
  "travelers",
  "group_members",
];


console.log("\nDeleting obsolete collections...");
for (const col of DELETE_COLLECTIONS) {
  const snap = await db.collection(col).get();
  let count = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    ops++;
    count++;
    if (ops === batchSize) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  console.log(`[ok] deleted ${col}: ${count} docs`);
}

// ── Rebuild cabins from our bases ──────────────────────────────────────

console.log("\nRebuilding cabins collection...");
const cabinCsv = readFileSync(join(__dirname, "../../../invitados/cabanas_inventario.csv"), "utf8");
const cabinRows = rowsToObjects(parseCsv(cabinCsv));

// Exclude the TOTAL row
const cabins = cabinRows.filter((r) => cleanStr(r.ID) && cleanStr(r.ID).toUpperCase() !== "TOTAL");
console.log(`[info] cabin inventory rows (excl TOTAL): ${cabins.length}`);

// Delete existing cabins then rewrite
const oldCabins = await db.collection("cabins").get();
let cabinDel = 0;
for (const doc of oldCabins.docs) {
  await doc.ref.delete();
  cabinDel++;
}
console.log(`[ok] deleted old cabins: ${cabinDel}`);

let cabinWritten = 0;
for (const r of cabins) {
  const id = cleanStr(r.ID);
  const doc = {
    id,
    name: cleanStr(r.Descr),
    capacity: toNum(r.CAPACIDAD),
    capacityRoomCheck: toNum(r.CAPACIDAD_CUARTO_CHECK),
    totalPrice2Nights: toNum(r.PRECIO_TOTAL_2_NOCHES),
    pricePerPerson2Nights: toNum(r.PRECIO_POR_PERSONA_2_NOCHES),
    pricePerPersonPerNight: toNum(r.PRECIO_POR_PERSONA_POR_NOCHE),
    isPrivate: toBool(r.isPrivate),
    isBooked: toBool(r.isBooked),
    isBookedXtra: toBool(r.isBookedXtra),
    isPaid: toBool(r.isPaid),
    isPaidXtra: toBool(r.isPaidXtra),
    _source: "cabanas_inventario.csv",
    _migratedAt: new Date().toISOString(),
  };
  await db.collection("cabins").doc(id).set(doc);
  cabinWritten++;
}
console.log(`[ok] cabins: ${cabinWritten} docs written`);


// ── Rebuild rooms from cuartos sheet ───────────────────────────────────
// Source: invitados/cuartos.csv (the "cuartos" Google Sheet tab). Each room
// references its cabin by display name (`cabin`). `ocupacion` is NOT stored —
// it is calculated at runtime by counting guests assigned to each room.

console.log("\nRebuilding rooms collection...");
const roomCsv = readFileSync(join(__dirname, "../../../invitados/cuartos.csv"), "utf8");
const roomRows = rowsToObjects(parseCsv(roomCsv));
const rooms = roomRows.filter((r) => cleanStr(r.ID));
console.log(`[info] room rows: ${rooms.length}`);

const oldRooms = await db.collection("rooms").get();
let roomDel = 0;
for (const doc of oldRooms.docs) {
  await doc.ref.delete();
  roomDel++;
}
console.log(`[ok] deleted old rooms: ${roomDel}`);

let roomWritten = 0;
for (const r of rooms) {
  const id = cleanStr(r.ID);
  const doc = {
    id,
    cabin: cleanStr(r.CABIN),
    description: {
      es: cleanStr(r["CUARTO ES"]),
      fr: cleanStr(r["CUARTO FR"]),
      en: cleanStr(r["CUARTO EN"]),
    },
    capacity: toNum(r.capacidad),
    isShared: toBool(r.isShared),
    _source: "cuartos.csv",
    _migratedAt: new Date().toISOString(),
  };
  await db.collection("rooms").doc(id).set(doc);
  roomWritten++;
}
console.log(`[ok] rooms: ${roomWritten} docs written`);

// ── Rebuild tables from mesas sheet ────────────────────────────────────
// Source: invitados/mesas.csv (the "mesas" Google Sheet tab). `ocupacion` is
// NOT stored — it is calculated at runtime by counting guests assigned to
// each table.

console.log("\nRebuilding tables collection...");
const tableCsv = readFileSync(join(__dirname, "../../../invitados/mesas.csv"), "utf8");
const tableRows = rowsToObjects(parseCsv(tableCsv));
const tables = tableRows.filter((r) => cleanStr(r.ID));
console.log(`[info] table rows: ${tables.length}`);

const oldTables = await db.collection("tables").get();
let tableDel = 0;
for (const doc of oldTables.docs) {
  await doc.ref.delete();
  tableDel++;
}
console.log(`[ok] deleted old tables: ${tableDel}`);

let tableWritten = 0;
for (const r of tables) {
  const id = cleanStr(r.ID);
  const doc = {
    id,
    name: cleanStr(r.nombre),
    capacity: toNum(r.capacidad),
    _source: "mesas.csv",
    _migratedAt: new Date().toISOString(),
  };
  await db.collection("tables").doc(id).set(doc);
  tableWritten++;
}
console.log(`[ok] tables: ${tableWritten} docs written`);

console.log("\nMigration complete.");
process.exit(0);
