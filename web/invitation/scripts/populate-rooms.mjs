#!/usr/bin/env node
/**
 * Populate the Firestore `rooms` collection from the static room inventory.
 *
 * The `rooms` collection is the source of truth for room inventory. This
 * script seeds it from the static data in `web/invitation/src/rooms.js`
 * (STATIC_ROOMS). It is idempotent: existing documents are updated in place,
 * and new ones are created. No data is lost.
 *
 * Usage:
 *   node web/invitation/scripts/populate-rooms.mjs
 *
 * Requires Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `firebase login`).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf8")
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);


// ── Room inventory (mirrors STATIC_ROOMS in rooms.js) ────────────────────
const ROOMS = [
  // VILLA MARGARITA
  { id: "VILLA MARGARITA-1", cabin: "VILLA MARGARITA", description: { es: "CUARTO 1: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE 1 : 2 LITS DOUBLES", en: "BEDROOM 1: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },
  { id: "VILLA MARGARITA-2", cabin: "VILLA MARGARITA", description: { es: "CUARTO 2: 4 CAMAS INDIVUDALES (LITERAS)", fr: "CHAMBRE 2 : 4 LITS SIMPLES (LITS SUPERPOSÉS)", en: "BEDROOM 2: 4 SINGLE BEDS (BUNK BEDS)" }, capacity: 4, isShared: true },
  { id: "VILLA MARGARITA-3", cabin: "VILLA MARGARITA", description: { es: "CUARTO 3: 1 CAMA MATRIMONIAL", fr: "CHAMBRE 3 : 1 LIT DOUBLE", en: "BEDROOM 3: 1 DOUBLE BED" }, capacity: 2, isShared: false },

  // VILLA LAVANDA
  { id: "VILLA LAVANDA", cabin: "VILLA LAVANDA", description: { es: "CUARTO: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE : 2 LITS DOUBLES", en: "BEDROOM: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },

  // VILLA HORTENCIA
  { id: "VILLA HORTENCIA-1", cabin: "VILLA HORTENCIA", description: { es: "CUARTO: 1 CAMA KING SIZE", fr: "CHAMBRE : 1 LIT KING SIZE", en: "BEDROOM: 1 KING-SIZE BED" }, capacity: 2, isShared: true },
  { id: "VILLA HORTENCIA-2", cabin: "VILLA HORTENCIA", description: { es: "SALA: SOFA CAMA PARA 2 MENORES", fr: "SALON : CANAPÉ-LIT POUR 2 ENFANTS", en: "LIVING ROOM: SOFA BED FOR 2 CHILDREN" }, capacity: 2, isShared: true },

  // CABAÑA 1
  { id: "CABAÑA 1-1", cabin: "CABAÑA 1", description: { es: "CUARTO: 1 CAMA MATRIMONIAL", fr: "CHAMBRE : 1 LIT DOUBLE", en: "BEDROOM: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CABAÑA 1-2", cabin: "CABAÑA 1", description: { es: "SALA: 1 SOFA CAMA MATRIMONIAL", fr: "SALON : 1 CANAPÉ-LIT DOUBLE", en: "LIVING ROOM: 1 DOUBLE SOFA BED" }, capacity: 2, isShared: false },

  // CABAÑA 2
  { id: "CABAÑA 2-1", cabin: "CABAÑA 2", description: { es: "CUARTO: 1 CAMA MATRIMONIAL", fr: "CHAMBRE : 1 LIT DOUBLE", en: "BEDROOM: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CABAÑA 2-2", cabin: "CABAÑA 2", description: { es: "SALA: 1 SOFA CAMA MATRIMONIAL", fr: "SALON : 1 CANAPÉ-LIT DOUBLE", en: "LIVING ROOM: 1 DOUBLE SOFA BED" }, capacity: 2, isShared: false },

  // CABAÑA 3
  { id: "CABAÑA 3-1", cabin: "CABAÑA 3", description: { es: "CUARTO: 1 CAMA MATRIMONIAL", fr: "CHAMBRE : 1 LIT DOUBLE", en: "BEDROOM: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CABAÑA 3-2", cabin: "CABAÑA 3", description: { es: "SALA: 1 SOFA CAMA MATRIMONIAL", fr: "SALON : 1 CANAPÉ-LIT DOUBLE", en: "LIVING ROOM: 1 DOUBLE SOFA BED" }, capacity: 2, isShared: false },

  // CABAÑA 4
  { id: "CABAÑA 4-1", cabin: "CABAÑA 4", description: { es: "CUARTO: 1 CAMA MATRIMONIAL", fr: "CHAMBRE : 1 LIT DOUBLE", en: "BEDROOM: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CABAÑA 4-2", cabin: "CABAÑA 4", description: { es: "SALA: 1 SOFA CAMA MATRIMONIAL", fr: "SALON : 1 CANAPÉ-LIT DOUBLE", en: "LIVING ROOM: 1 DOUBLE SOFA BED" }, capacity: 2, isShared: false },

  // VILLA DON AGUSTIN
  { id: "VILLA DON AGUSTIN", cabin: "VILLA DON AGUSTIN", description: { es: "CUARTO: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE : 2 LITS DOUBLES", en: "BEDROOM: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },

  // VILLA DON RAFA
  { id: "VILLA DON RAFA-1", cabin: "VILLA DON RAFA", description: { es: "CUARTO 1: UNA CAMA KING SIZE Y UNA INDIVUDAL", fr: "CHAMBRE 1 : 1 LIT KING SIZE ET 1 LIT SIMPLE", en: "BEDROOM 1: 1 KING-SIZE BED AND 1 SINGLE BED" }, capacity: 3, isShared: true },
  { id: "VILLA DON RAFA-2", cabin: "VILLA DON RAFA", description: { es: "CUARTO 2:  CAMA MATRIMONIAL", fr: "CHAMBRE 2 : 1 LIT DOUBLE", en: "BEDROOM 2: 1 DOUBLE BED" }, capacity: 2, isShared: false },

  // VILLA DALIA
  { id: "VILLA DALIA-1", cabin: "VILLA DALIA", description: { es: "CUARTO 1: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE 1 : 2 LITS DOUBLES", en: "BEDROOM 1: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },
  { id: "VILLA DALIA-2", cabin: "VILLA DALIA", description: { es: "CUARTO 2: 4 CAMAS INDIVUDALES (LITERAS)", fr: "CHAMBRE 2 : 4 LITS SIMPLES (LITS SUPERPOSÉS)", en: "BEDROOM 2: 4 SINGLE BEDS (BUNK BEDS)" }, capacity: 4, isShared: true },
  { id: "VILLA DALIA-3", cabin: "VILLA DALIA", description: { es: "CUARTO 3: 1 CAMA MATRIMONIAL", fr: "CHAMBRE 3 : 1 LIT DOUBLE", en: "BEDROOM 3: 1 DOUBLE BED" }, capacity: 2, isShared: false },

  // VILLA AZALEA
  { id: "VILLA AZALEA-1", cabin: "VILLA AZALEA", description: { es: "CUARTO 1: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE 1 : 2 LITS DOUBLES", en: "BEDROOM 1: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },
  { id: "VILLA AZALEA-2", cabin: "VILLA AZALEA", description: { es: "CUARTO 2: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE 2 : 2 LITS DOUBLES", en: "BEDROOM 2: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },
  { id: "VILLA AZALEA-3", cabin: "VILLA AZALEA", description: { es: "CUARTO 3: 3 CAMAS INDIVIDUALES", fr: "CHAMBRE 3 : 3 LITS SIMPLES", en: "BEDROOM 3: 3 SINGLE BEDS" }, capacity: 3, isShared: true },

  // SUITE DON CARLOS
  { id: "SUITE DON CARLOS-1", cabin: "SUITE DON CARLOS", description: { es: "CUARTO 1: 1 CAMA MATRIMONIAL", fr: "CHAMBRE 1 : 1 LIT DOUBLE", en: "BEDROOM 1: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "SUITE DON CARLOS-2", cabin: "SUITE DON CARLOS", description: { es: "CUARTO 2: 1 CAMA MATRIMONIAL Y 1 LITERA INDIVIDUAL", fr: "CHAMBRE 2 : 1 LIT DOUBLE ET 1 LIT SUPERPOSÉ SIMPLE", en: "BEDROOM 2: 1 DOUBLE BED AND 1 SINGLE BUNK BED" }, capacity: 4, isShared: true },
  { id: "SUITE DON CARLOS-3", cabin: "SUITE DON CARLOS", description: { es: "CUARTO 3: 1 LITERA INDIVIDUAL", fr: "CHAMBRE 3 : 1 LIT SUPERPOSÉ SIMPLE", en: "BEDROOM 3: 1 SINGLE BUNK BED" }, capacity: 2, isShared: true },

  // CASONA
  { id: "CASONA-1", cabin: "CASONA", description: { es: "CUARTO 1: 2 CAMAS MATRIMONIALES", fr: "CHAMBRE 1 : 2 LITS DOUBLES", en: "BEDROOM 1: 2 DOUBLE BEDS" }, capacity: 4, isShared: true },
  { id: "CASONA-2", cabin: "CASONA", description: { es: "CUARTO 2: 1 CAMA KING SIZE", fr: "CHAMBRE 2 : 1 LIT KING SIZE", en: "BEDROOM 2: 1 KING-SIZE BED" }, capacity: 1, isShared: false },
  { id: "CASONA-3", cabin: "CASONA", description: { es: "CUARTO 3: 2 CAMAS MATRIMONIALES Y 1 LITERA CON UNA CAMA MATRIMONIAL Y OTRA INDIVIDUAL", fr: "CHAMBRE 3 : 2 LITS DOUBLES ET 1 LIT SUPERPOSÉ (1 LIT DOUBLE + 1 LIT SIMPLE)", en: "BEDROOM 3: 2 DOUBLE BEDS AND 1 BUNK BED (1 DOUBLE BED + 1 SINGLE BED)" }, capacity: 7, isShared: true },
  { id: "CASONA-4", cabin: "CASONA", description: { es: "CUARTO 4: 1 CAMA MATRIMONIAL", fr: "CHAMBRE 4 : 1 LIT DOUBLE", en: "BEDROOM 4: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CASONA-5", cabin: "CASONA", description: { es: "CUARTO 5 : 1 CAMA MATRIMONIAL", fr: "CHAMBRE 5 : 1 LIT DOUBLE", en: "BEDROOM 5: 1 DOUBLE BED" }, capacity: 2, isShared: false },
  { id: "CASONA-6", cabin: "CASONA", description: { es: "SALA : 1 SOFA CAMA MATRIMONIAL", fr: "SALON : 1 CANAPÉ-LIT DOUBLE", en: "LIVING ROOM: 1 DOUBLE SOFA BED" }, capacity: 2, isShared: false },
];

async function main() {
  console.log(`Populating ${ROOMS.length} rooms into Firestore...`);

  const batch = db.batch();
  let created = 0;
  let updated = 0;

  for (const room of ROOMS) {
    const ref = db.collection("rooms").doc(room.id);
    const existing = await ref.get();
    if (existing.exists) {
      batch.set(ref, room, { merge: true });
      updated++;
    } else {
      batch.set(ref, room);
      created++;
    }
  }

  await batch.commit();
  console.log(`Done! Created ${created}, updated ${updated}.`);
}

main().catch((error) => {
  console.error("Failed to populate rooms:", error);
  process.exit(1);
});
