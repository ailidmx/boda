/**
 * Seed Firestore with master data from CSVs.
 *
 * Schema defined in docs/firestore-schema.md
 *
 * Usage:
 *   node scripts/seed-firestore.mjs [--dry-run]
 *
 * Options:
 *   --dry-run   Log what would be written without writing
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS must point to a service account key
 *   with Firestore write access, OR you must be authenticated via
 *   `firebase login` and have a default project set.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");

const DRY_RUN = process.argv.includes("--dry-run");

// ── CSV parser (simple, no deps) ──────────────────────────────────────

function parseCsv(text) {
  const lines = text.split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header.trim()] = (values[i] || "").trim();
    });
    return row;
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────

function loadCsv(relativePath) {
  const text = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return parseCsv(text);
}

/**
 * Parse a price string like "$8,470" or "$1,115" to a number.
 * Returns 0 if unparseable.
 */
function parsePrice(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[$,]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Map a cabin name from the CSV to a cabin code.
 *
 * CSV names → codes:
 *   "AZALEA - 12p"        → "AZALEA"
 *   "DALIA - 10p"         → "DALIA"
 *   "MARGARITA - 10p"     → "MARGARITA"
 *   "LAVANDA - 4p"        → "LAVANDA"
 *   "HORTENCIA - 2p"      → "HORTENCIA"
 *   "CABAÑAS_MADERA_31_2_ADULTOS" → "CABAÑA_31"
 *   "CABAÑAS_MADERA_32_2_ADULTOS" → "CABAÑA_32"
 *   "CABAÑAS_MADERA_33_2_ADULTOS" → "CABAÑA_33"
 *   "CABAÑAS_MADERA_34_2_ADULTOS" → "CABAÑA_34"
 *   "CABAÑA_6 - 4p"       → "CABAÑA_6"
 *   "CABAÑA_5 - 6p"       → "CABAÑA_5"
 *   "CABAÑA_4 - 8p"       → "CABAÑA_4"
 *   "CASONA - 18p"        → "CASONA"
 */
function cabinNameToCode(cabinName) {
  if (!cabinName || cabinName.trim() === "") return null;
  const c = cabinName.trim();

  // Direct matches for simple names
  if (c.startsWith("AZALEA")) return "AZALEA";
  if (c.startsWith("DALIA")) return "DALIA";
  if (c.startsWith("MARGARITA")) return "MARGARITA";
  if (c.startsWith("LAVANDA")) return "LAVANDA";
  if (c.startsWith("HORTENCIA")) return "HORTENCIA";
  if (c.startsWith("CASONA")) return "CASONA";

  // Madera cabins
  if (c.includes("MADERA_31") || c.includes("MADERA 31")) return "CABAÑA_31";
  if (c.includes("MADERA_32") || c.includes("MADERA 32")) return "CABAÑA_32";
  if (c.includes("MADERA_33") || c.includes("MADERA 33")) return "CABAÑA_33";
  if (c.includes("MADERA_34") || c.includes("MADERA 34")) return "CABAÑA_34";

  // Numbered cabins
  if (c.startsWith("CABAÑA_6") || c.startsWith("CABAÑA 6")) return "CABAÑA_6";
  if (c.startsWith("CABAÑA_5") || c.startsWith("CABAÑA 5")) return "CABAÑA_5";
  if (c.startsWith("CABAÑA_4") || c.startsWith("CABAÑA 4")) return "CABAÑA_4";

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n  🔥 Firestore seed (${DRY_RUN ? "DRY RUN" : "LIVE"})\n`);

  // ── 1. GUESTS ────────────────────────────────────────────────────────

  const guestsCsv = loadCsv("invitados/lista_invitados.csv");
  console.log(`  📋 Guests: ${guestsCsv.length} rows loaded`);

  const guestRecords = guestsCsv.map((row, i) => {
    const rowNum = parseInt(row["No"] || String(i + 1), 10);
    const cabinName = row["Hospedaje"] || "";
    const cabinCode = cabinNameToCode(cabinName);
    return {
      row: rowNum,
      firstName: row["Nombre"] || "",
      lastName: row["Apellido"] || "",
      email: row["Email"] || "",
      groupId: row["Grupo"] || "",
      cabinId: cabinCode, // null if no cabin
      isChild: (row["Adulto/Niño"] || "").toLowerCase() === "niño",
      gender: row["Hombre/Mujer"] || "",
      invitationSent: row["Se envió invitación "] === "TRUE",
      confirmed: row["Confirmado"] === "TRUE",
      confirmedDate: row["Confirmado el"] || null,
    };
  });

  // ── 2. GUEST GROUPS ──────────────────────────────────────────────────

  const groupNames = [...new Set(guestsCsv.map((r) => r["Grupo"]).filter(Boolean))];
  const guestGroupRecords = groupNames.map((name) => {
    const count = guestsCsv.filter((r) => r["Grupo"] === name).length;
    return {
      name,
      label: name,
      labelEn: name,
      labelFr: name,
      memberCount: count,
    };
  });
  console.log(`  👥 Guest groups: ${guestGroupRecords.length}`);

  // ── 3. CABINS ────────────────────────────────────────────────────────

  const cabinsCsv = loadCsv("invitados/cabanas_inventario.csv");
  // Filter to only data rows (lines 1-14 in CSV, which have all columns filled).
  // The CSV also contains notes rows (room descriptions) that we skip.
  // We detect data rows by checking they have a numeric CAPACIDAD value.
  const cabinRecords = cabinsCsv
    .filter((c) => {
      const name = (c["NOMBRE"] || "").trim();
      const code = cabinNameToCode(name);
      if (!code) return false;
      // Only include rows that have a capacity value (data rows only)
      return c["CAPACIDAD"] && c["CAPACIDAD"].trim() !== "";
    })
    .map((c) => {
      const name = c["NOMBRE"].trim();
      const code = cabinNameToCode(name);
      const tagsRaw = (c["Column 9"] || "").trim();
      return {
        code,
        name,
        capacity: parseInt(c["CAPACIDAD"] || "0", 10),
        occupancy: parseInt(c["OCUPACION"] || "0", 10),
        occupancyPct: parseFloat((c["% OCUPACION"] || "0").replace("%", "")),
        totalPrice2Nights: parsePrice(c["PRECIO_TOTAL_2_NOCHES"]),
        pricePerPerson2Nights: parsePrice(c["PRECIO_POR_PERSONA_2_NOCHES"]),
        pricePerPersonPerNight: parsePrice(c["PRECIO_POR_PERSONA_POR_NOCHE"]),
        tags: tagsRaw ? [tagsRaw] : [],
        selected: c["SELECCION"] === "TRUE",
      };
    });
  console.log(`  🏠 Cabins: ${cabinRecords.length} loaded`);

  // ── 4. ASSIGNMENTS (propuesta_v2) ────────────────────────────────────

  const assignmentsCsv = loadCsv("invitados/asignacion_cabanas.csv");
  const assignmentRecords = assignmentsCsv.map((a) => {
    const cabinName = a["cabana"] || "";
    return {
      id: parseInt(a["id"] || "0", 10),
      guestName: a["nombre_completo"] || "",
      group: a["grupo"] || "",
      cabinId: cabinNameToCode(cabinName),
      priority: a["prioridad_alojamiento"] || "",
      status: a["status"] || "",
      notes: a["notas"] || "",
    };
  });
  console.log(`  📌 Assignments: ${assignmentRecords.length} loaded`);

  // ── 5. TRAVEL GROUPS ─────────────────────────────────────────────────

  const travelGroupsCsv = loadCsv("viajes/grupos_viaje.csv");
  const travelGroupRecords = travelGroupsCsv.map((g) => ({
    groupId: g["group_id"] || "",
    name: g["nombre_grupo"] || "",
    arrivalDate: g["fecha_llegada"] || "",
    departureDate: g["fecha_salida"] || "",
    dateStatus: g["estado_fechas"] || "",
    attendanceStatus: g["estado_asistencia"] || "",
    origin: g["origen"] || "",
    airport: g["aeropuerto_llegada"] || "",
    totalPeople: parseInt(g["total_personas"] || "0", 10),
    coordinator: g["coordinador"] || "",
    notes: g["notas"] || "",
  }));
  console.log(`  ✈️  Travel groups: ${travelGroupRecords.length}`);

  // ── 6. GROUP MEMBERS ─────────────────────────────────────────────────

  const groupMembersCsv = loadCsv("viajes/grupo_miembros.csv");
  const groupMemberRecords = groupMembersCsv.map((m) => ({
    groupId: m["group_id"] || "",
    guestId: parseInt(m["guest_id"] || "0", 10),
    travelerId: m["traveler_id"] || null,
    name: m["nombre"] || "",
    role: m["rol"] || "",
    travelStatus: m["estado_viaje"] || "",
  }));
  console.log(`  👥 Group members: ${groupMemberRecords.length}`);

  // ── 7. TRAVELERS ─────────────────────────────────────────────────────

  const travelersCsv = loadCsv("viajes/viajeros.csv");
  const travelerRecords = travelersCsv.map((t) => ({
    travelerId: t["traveler_id"] || "",
    travelGroupId: t["travel_group_id"] || "",
    guestId: parseInt(t["guest_id"] || "0", 10),
    name: t["nombre"] || "",
    originCity: t["ciudad_origen"] || "",
    originCountry: t["pais_origen"] || "",
    tripStart: t["fecha_inicio_viaje"] || "",
    tripEnd: t["fecha_fin_viaje"] || "",
    arrivalAirport: t["aeropuerto_llegada"] || "",
    flightStatus: t["estado_vuelos"] || "",
    stayStatus: t["estado_estancias"] || "",
    transferStatus: t["estado_traslados"] || "",
    notes: t["notas"] || "",
  }));
  console.log(`  🧳 Travelers: ${travelerRecords.length}`);

  // ── 8. FLIGHTS ───────────────────────────────────────────────────────

  const flightsCsv = loadCsv("viajes/vuelos.csv");
  const flightRecords = flightsCsv.map((f) => ({
    travelerId: f["traveler_id"] || "",
    segment: parseInt(f["segmento"] || "0", 10),
    direction: f["direccion"] || "",
    status: f["estado"] || "",
    date: f["fecha_salida"] || "",
    origin: f["origen"] || "",
    destination: f["destino"] || "",
    airline: f["aerolinea"] || "",
    flightNumber: f["numero_vuelo"] || "",
    departureLocal: f["salida_local"] || "",
    arrivalDate: f["fecha_llegada"] || "",
    arrivalLocal: f["llegada_local"] || "",
    terminalDeparture: f["terminal_salida"] || "",
    terminalArrival: f["terminal_llegada"] || "",
    sourceUrl: f["fuente_horario"] || "",
    verifiedDate: f["verificado_el"] || "",
    notes: f["notas"] || "",
  }));
  console.log(`  🛩️  Flights: ${flightRecords.length}`);

  // ── 9. STAYS ─────────────────────────────────────────────────────────

  const staysCsv = loadCsv("viajes/estancias.csv");
  const stayRecords = staysCsv.map((s) => ({
    travelerId: s["traveler_id"] || "",
    block: parseInt(s["bloque"] || "0", 10),
    checkIn: s["check_in"] || "",
    checkOut: s["check_out"] || "",
    city: s["ciudad"] || "",
    place: s["lugar"] || "",
    address: s["direccion"] || "",
    status: s["estado"] || "",
    contact: s["contacto"] || "",
    notes: s["notas"] || "",
  }));
  console.log(`  🏨 Stays: ${stayRecords.length}`);

  // ── 10. TRANSFERS ────────────────────────────────────────────────────

  const transfersCsv = loadCsv("viajes/traslados.csv");
  const transferRecords = transfersCsv.map((t) => ({
    transferId: t["transfer_id"] || "",
    travelerId: t["traveler_id"] || "",
    type: t["tipo"] || "",
    date: t["fecha"] || "",
    airport: t["aeropuerto"] || "",
    flightRef: t["vuelo_referencia"] || "",
    flightTime: t["hora_vuelo"] || "",
    airportTargetTime: t["hora_objetivo_aeropuerto"] || "",
    pickupSuggestedTime: t["hora_recogida_sugerida"] || "",
    origin: t["origen"] || "",
    destination: t["destino"] || "",
    responsible: t["responsable"] || "",
    vehicle: t["vehiculo"] || "",
    status: t["estado"] || "",
    notes: t["notas"] || "",
  }));
  console.log(`  🚐 Transfers: ${transferRecords.length}`);

  // ── 11. BUDGET ───────────────────────────────────────────────────────

  const budgetCsv = loadCsv("presupuesto/presupuesto.csv");
  // Skip header rows (first 3 rows are headers/totals)
  const budgetRecords = budgetCsv.slice(3).map((b) => ({
    item: b["col_1"] || "",
    totalMxn: parsePrice(b["col_2"]),
    approxMxn: parsePrice(b["col_3"]),
    paidMxn: parsePrice(b["col_4"]),
    paidDate: b["col_6"] || "",
    paidBy: b["col_7"] || "",
    davidPct: parseFloat((b["col_9"] || "0").replace("%", "")) / 100,
    aydePct: parseFloat((b["col_10"] || "0").replace("%", "")) / 100,
    davidAmount: parsePrice(b["col_11"]),
    aydeAmount: parsePrice(b["col_12"]),
    confirmedCount: parseInt(b["col_17"] || "0", 10),
    estimatedCount: parseInt(b["col_18"] || "0", 10),
  }));
  console.log(`  💰 Budget rows: ${budgetRecords.length}`);

  // ── Firestore writes ────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log("\n  ✅ Dry run complete — no data written.\n");
    return;
  }

  // We need firebase-admin to write to Firestore
  let firebaseAdmin;
  try {
    firebaseAdmin = await import("firebase-admin");
  } catch {
    console.error(
      "\n  ❌ firebase-admin not installed. Run: npm install firebase-admin\n",
    );
    process.exit(1);
  }

  // Initialize Firebase Admin
  const { initializeApp, applicationDefault, getApps } = firebaseAdmin;
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
    });
  }

  // Get Firestore instance (modular API in v13+)
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore();

  // Helper: batch write with chunking
  async function writeCollection(collectionName, records, idField = null) {
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      for (const record of chunk) {
        const docId = idField
          ? String(record[idField])
          : db.collection(collectionName).doc().id;
        const ref = db.collection(collectionName).doc(docId);
        batch.set(ref, record);
      }
      await batch.commit();
      console.log(
        `    Wrote ${Math.min(i + batchSize, records.length)}/${records.length} to ${collectionName}`,
      );
    }
  }

  console.log("\n  Writing to Firestore...\n");

  // Write guest_groups first (referenced by guests)
  await writeCollection("guest_groups", guestGroupRecords, "name");
  console.log("  ✅ guest_groups collection written\n");

  // Write cabins (referenced by guests.cabinId)
  await writeCollection("cabins", cabinRecords, "code");
  console.log("  ✅ cabins collection written\n");

  // Write guests
  await writeCollection("guests", guestRecords, "row");
  console.log("  ✅ guests collection written\n");

  // Write assignments
  await writeCollection("assignments", assignmentRecords, "id");
  console.log("  ✅ assignments collection written\n");

  // Write travel data
  await writeCollection("travel_groups", travelGroupRecords, "groupId");
  console.log("  ✅ travel_groups written\n");
  await writeCollection("group_members", groupMemberRecords);
  console.log("  ✅ group_members written\n");
  await writeCollection("travelers", travelerRecords, "travelerId");
  console.log("  ✅ travelers written\n");
  await writeCollection("flights", flightRecords);
  console.log("  ✅ flights written\n");
  await writeCollection("stays", stayRecords);
  console.log("  ✅ stays written\n");
  await writeCollection("transfers", transferRecords, "transferId");
  console.log("  ✅ transfers written\n");

  // Write budget
  await writeCollection("budget", budgetRecords);
  console.log("  ✅ budget written\n");

  console.log("  🎉 Seed complete!\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
