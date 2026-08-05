// MIGRATION: Rename legacy Spanish field names to the agreed English schema.
//
//   invitacionGroup  ->  invitationGroup
//   celular          ->  phone
//   idCheck          ->  DELETED (legacy field not in agreed schema; frontend
//                        only uses idCheckUser)
//   message_author   ->  messageAuthor
//   apellido         ->  DELETED (duplicate of lastName)
//   apellido2        ->  DELETED (duplicate of lastName)
//   nombre           ->  DELETED (duplicate of firstName)
//   nombre2          ->  DELETED (duplicate of firstName)
//   nombreCompleto   ->  DELETED (derived; not in agreed schema)
//   cabana           ->  DELETED (duplicate of cabin)
//   cuarto           ->  DELETED (duplicate of room)
//   cuartoDesc       ->  DELETED (derived; not in agreed schema)
//   confirmadoEl     ->  DELETED (duplicate of modifiedAt)
//   edad             ->  DELETED (duplicate of age)
//   genero           ->  DELETED (duplicate of gender)
//   mesa             ->  DELETED (duplicate of table)
//   personalizacion  ->  DELETED (not in agreed schema)
//   precio           ->  DELETED (not in agreed schema)
//   precioPp2Noches  ->  DELETED (not in agreed schema)
//   viajaEnAvion     ->  DELETED (duplicate of travelsByPlane)
//   xtraCabana       ->  DELETED (duplicate of xtraCabin)
//   xtraCuarto       ->  DELETED (duplicate of xtraRoom)
//   xtraCuartoDesc   ->  DELETED (derived; not in agreed schema)
//
// RSVP RESTRUCTURE: The flat `rsvp*` fields (rsvpFriday, rsvpSaturday, etc.)
// are nested under a single `rsvp` object:
//   rsvpFriday          ->  rsvp.friday
//   rsvpSaturday        ->  rsvp.saturday
//   rsvpSunday          ->  rsvp.sunday
//   rsvpConfirmCabin    ->  rsvp.confirmCabin
//   rsvpCabinWaitingList->  rsvp.cabinWaitingList
//   rsvpXtra            ->  rsvp.xtra
//   rsvpPlaya           ->  rsvp.playa
//   rsvpPetanca         ->  rsvp.petanca
//   rsvpNeedBalls       ->  rsvp.needBalls
//
// This is a NON-destructive, idempotent migration: it reads each document,
// copies the value from the legacy field into the new field (only when the new
// field is absent), and then deletes the legacy field. A backup is written to
// backups/ before any change.
//
// Collections touched:
//   - guests               (all legacy field renames/deletes above + rsvp nesting)
//   - attendance_responses (invitacionGroup -> invitationGroup)
//   - cabins               (Spanish field names -> English)




//
// Run: cd web/invitation && node scripts/rename-fields.mjs
//
// IMPORTANT: Deploy the updated firestore.rules AFTER running this so the
// frontend keeps working with the new field names.


import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf8")
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ── Backup ─────────────────────────────────────────────────────────────
const backupDir = join(__dirname, "../../../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-field-rename-${ts}`);
mkdirSync(runDir, { recursive: true });

// ── Field rename map per collection ────────────────────────────────────
// { collection: { legacyField: newField } }
// NOTE: `idCheck` is a legacy field NOT in the agreed schema. It is simply
// deleted (the frontend only reads/writes `idCheckUser`). We use a special
// sentinel value "__DELETE__" to indicate "delete only, no rename".
const RENAMES = {
  guests: {
    // Renames (legacy -> agreed English)
    invitacionGroup: "invitationGroup",
    celular: "phone",
    message_author: "messageAuthor",
    // Deletes (legacy fields not in agreed schema, or duplicates of English fields)
    idCheck: "__DELETE__",
    apellido: "__DELETE__",
    apellido2: "__DELETE__",
    nombre: "__DELETE__",
    nombre2: "__DELETE__",
    nombreCompleto: "__DELETE__",
    cabana: "__DELETE__",
    cuarto: "__DELETE__",
    cuartoDesc: "__DELETE__",
    confirmadoEl: "__DELETE__",
    edad: "__DELETE__",
    genero: "__DELETE__",
    mesa: "__DELETE__",
    personalizacion: "__DELETE__",
    precio: "__DELETE__",
    precioPp2Noches: "__DELETE__",
    viajaEnAvion: "__DELETE__",
    xtraCabana: "__DELETE__",
    xtraCuarto: "__DELETE__",
    xtraCuartoDesc: "__DELETE__",
    rsvpXtraCuarto: "__DELETE__",
    privateCabin: "__DELETE__",
    privateRoom: "__DELETE__",
    defaultEmail: "__DELETE__",
    email: "__DELETE__",
    firebaseEmail: "__DELETE__",
    password: "__DELETE__",
    username: "__DELETE__",

  },
  attendance_responses: {
    invitacionGroup: "invitationGroup",
  },
  cabins: {
    // Renames (Spanish -> English)
    descr: "name",
    capacidad: "capacity",
    capacidadCuartoCheck: "capacityRoomCheck",
    precioTotal2Noches: "totalPrice2Nights",
    precioPorPersona2Noches: "pricePerPerson2Nights",
    precioPorPersonaPorNoche: "pricePerPersonPerNight",
  },
};




async function migrateCollection(collectionName, fieldMap) {
  const snap = await db.collection(collectionName).get();
  const docs = [];
  snap.forEach((doc) => docs.push({ id: doc.id, data: doc.data() }));

  // Backup
  writeFileSync(
    join(runDir, `${collectionName}.json`),
    JSON.stringify(docs, null, 2),
    "utf8"
  );
  console.log(`[backup] ${collectionName}: ${docs.length} docs -> ${runDir}/${collectionName}.json`);

  let changed = 0;
  for (const { id, data } of docs) {
    const update = {};
    let needsUpdate = false;

    for (const [legacy, next] of Object.entries(fieldMap)) {
      if (data[legacy] === undefined) continue;
      if (next === "__DELETE__") {
        // Legacy field not in the agreed schema — just delete it.
        update[legacy] = FieldValue.delete();
        needsUpdate = true;
        continue;
      }
      if (data[next] === undefined) {
        // Copy legacy value into the new field (only if new field absent).
        update[next] = data[legacy];
        needsUpdate = true;
      }
      // Always remove the legacy field once migrated.
      update[legacy] = FieldValue.delete();
      needsUpdate = true;
    }


    if (needsUpdate) {
      await db.collection(collectionName).doc(id).update(update);
      changed++;
    }
  }
  console.log(`[ok] ${collectionName}: ${changed} docs updated`);
}

console.log("Starting field rename migration...\n");
for (const [collectionName, fieldMap] of Object.entries(RENAMES)) {
  await migrateCollection(collectionName, fieldMap);
}

// ── RSVP nesting: flat rsvp* fields -> rsvp object ─────────────────────
// The flat fields (rsvpFriday, rsvpSaturday, etc.) are nested under a single
// `rsvp` object. This is a separate step because it's a restructuring, not a
// simple rename.

const RSVP_FIELD_MAP = {
  rsvpFriday: "friday",
  rsvpSaturday: "saturday",
  rsvpSunday: "sunday",
  rsvpConfirmCabin: "confirmCabin",
  rsvpCabinWaitingList: "cabinWaitingList",
  rsvpXtra: "xtra",
  rsvpPlaya: "playa",
  rsvpPetanca: "petanca",
  rsvpNeedBalls: "needBalls",
};

console.log("\nNesting flat rsvp* fields into rsvp object...");
const guestsSnap = await db.collection("guests").get();
let rsvpChanged = 0;
for (const doc of guestsSnap.docs) {
  const data = doc.data();
  const rsvpObj = {};
  let hasRsvpFields = false;

  // Collect values from flat fields
  for (const [flatField, nestedKey] of Object.entries(RSVP_FIELD_MAP)) {
    if (data[flatField] !== undefined) {
      rsvpObj[nestedKey] = data[flatField];
      hasRsvpFields = true;
    }
  }

  // Merge with any existing rsvp object
  if (data.rsvp && typeof data.rsvp === "object") {
    Object.assign(rsvpObj, data.rsvp);
    hasRsvpFields = true;
  }

  if (!hasRsvpFields) continue;

  const update = { rsvp: rsvpObj };
  // Delete all flat fields
  for (const flatField of Object.keys(RSVP_FIELD_MAP)) {
    if (data[flatField] !== undefined) {
      update[flatField] = FieldValue.delete();
    }
  }
  await db.collection("guests").doc(doc.id).update(update);
  rsvpChanged++;
}
console.log(`[ok] guests: ${rsvpChanged} docs updated with nested rsvp object`);

console.log("\nMigration complete.");

console.log("Next steps:");
console.log("  1. Deploy the updated firestore.rules (firebase deploy --only firestore:rules)");
console.log("  2. Re-run scripts/generate-guests.mjs to regenerate web/shared/guests.js");

console.log("  3. Re-run scripts/migrate-guests.mjs if you want to fully rebuild from the sheet");
process.exit(0);
