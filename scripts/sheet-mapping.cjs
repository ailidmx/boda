/**
 * sheet-mapping.cjs
 *
 * SINGLE SOURCE OF TRUTH for the Google Sheet → Firestore field mapping.
 *
 * The Google Sheets keep Spanish/mixed column names (e.g. `Celular`,
 * `invitacion_group`, `Cabaña`). Firestore uses English camelCase
 * (e.g. `phone`, `invitationGroup`, `cabin`). This module defines that
 * translation once, so both `sync-sheet-to-firestore.mjs` and any future
 * tooling use the same mapping.
 *
 * NOTE: This is a CommonJS module (.cjs) because the root package.json
 * has `"type": "module"`. It is loaded via `require()` from the .mjs scripts.
 *
 * Each mapping entry:
 *   sheetColumn  — exact header name in the CSV (from Google Sheets)
 *   firestoreField — Firestore field path (dot notation for nested)
 *   type         — "string" | "boolean" | "number"
 *   required     — if true, the column MUST exist in the CSV header
 *   sheetControlled — if true, the value comes from the sheet on every sync
 *   firestoreOnly   — if true, the field is NOT in the sheet; it is preserved
 *                     from the existing Firestore document during sync
 *   description  — human-readable purpose
 *
 * IMPORTANT:
 *   - `firestoreOnly` fields are never overwritten by the sync.
 *   - `sheetControlled` fields are always updated from the sheet.
 *   - If a `required` column is missing from the CSV header, the sync ABORTS.
 */

// ── Type converters ──────────────────────────────────────────────────────

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

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

// ── Guests mapping (lista_invitados.csv → guests collection) ─────────────

/**
 * Guest field mapping.
 * NOTE: identity and hosting use dot-notation field paths so the sync emits
 * nested Firestore objects while keeping the CSV column mapping explicit.
 */
const GUEST_MAPPING = {
  // Identity — nested under `identity`
  id: { sheetColumn: "UID", type: "string", required: true, sheetControlled: true, description: "Unique guest ID (Firestore document ID and Auth UID when firebase.auth is true)" },
  "identity.firstName": { sheetColumn: "Nombre", type: "string", required: true, sheetControlled: true, description: "First name (Nombre)" },
  "identity.middleName": { sheetColumn: "Nombre 2", type: "string", required: false, sheetControlled: true, description: "Second first name (Nombre 2)" },
  "identity.lastName": { sheetColumn: "Apellido", type: "string", required: true, sheetControlled: true, description: "First last name (Apellido)" },
  "identity.maternalLastName": { sheetColumn: "Apellido 2", type: "string", required: false, sheetControlled: true, description: "Maternal last name (Apellido 2)" },
  "identity.lang": { sheetColumn: "lang", type: "string", required: false, sheetControlled: true, description: "Preferred language (es/fr/en)" },
  "identity.age": { sheetColumn: "Edad", type: "string", required: false, sheetControlled: true, description: "Age category" },
  gender: { sheetColumn: "Genero", type: "string", required: false, sheetControlled: true, description: "Gender (H/M)" },

  // Contact
  "identity.phone": { sheetColumn: "Celular", type: "string", required: false, sheetControlled: true, description: "Phone / WhatsApp" },
  idCheckUser: { sheetColumn: "id_check_user", type: "boolean", required: false, sheetControlled: true, description: "Identity verified" },

  // Media & messaging
  cloudinaryId: { sheetColumn: "cloudinary_id", type: "string", required: false, sheetControlled: true, description: "Cloudinary photo ID" },
  message: { sheetColumn: "message", type: "string", required: false, sheetControlled: true, description: "Personal message" },
  messageAuthor: { firestoreOnly: true, type: "string", description: "Message author (Firestore-only, preserved)" },

  // Grouping & assignments
  invitationGroup: { sheetColumn: "invitacion_group", type: "string", required: false, sheetControlled: true, description: "Invitation group" },
  tagGroup: { sheetColumn: "tag_group", type: "string", required: false, sheetControlled: true, description: "Tag group" },
  "hosting.cabin": { sheetColumn: "Cabaña", type: "string", required: false, sheetControlled: true, description: "Assigned cabin" },
  "hosting.room": { sheetColumn: "Cuarto", type: "string", required: false, sheetControlled: true, description: "Assigned room" },
  table: { sheetColumn: "Mesa", type: "string", required: false, sheetControlled: true, description: "Assigned table" },
  sent: { sheetColumn: "sent", type: "boolean", required: false, sheetControlled: true, description: "Invitation sent" },

  // RSVP (nested object)
  "rsvp.friday": { sheetColumn: "RVSP_Friday", type: "boolean", required: false, sheetControlled: true, description: "RSVP Friday" },
  "rsvp.saturday": { sheetColumn: "RVSP_Saturday", type: "boolean", required: false, sheetControlled: true, description: "RSVP Saturday" },
  "rsvp.sunday": { sheetColumn: "RVSP_Sunday", type: "boolean", required: false, sheetControlled: true, description: "RSVP Sunday" },
  "rsvp.confirmCabin": { sheetColumn: "RVSP_confirmCabin", type: "boolean", required: false, sheetControlled: true, description: "RSVP cabin confirmed" },
  "rsvp.cabinWaitingList": { sheetColumn: "RVSP_cabinWaitingList", type: "boolean", required: false, sheetControlled: true, description: "RSVP cabin waiting list" },
  "rsvp.xtra": { sheetColumn: "RVSP_Xtra", type: "boolean", required: false, sheetControlled: true, description: "RSVP extra cabin" },
  "rsvp.playa": { sheetColumn: "RVSP_Playa", type: "boolean", required: false, sheetControlled: true, description: "RSVP beach" },
  "rsvp.petanca": { sheetColumn: "RVSP_Petanca", type: "boolean", required: false, sheetControlled: true, description: "RSVP petanque" },
  "rsvp.needBalls": { sheetColumn: "RVSP_NeedBalls", type: "boolean", required: false, sheetControlled: true, description: "RSVP needs boules" },

  // Hosting
  "hosting.xtraCabin": { sheetColumn: "Xtra_cabaña", type: "string", required: false, sheetControlled: true, description: "Extra cabin" },
  "hosting.xtraRoom": { sheetColumn: "Xtra_cuarto", type: "string", required: false, sheetControlled: true, description: "Extra room" },

  // Metadata
  modifiedAt: { sheetColumn: "Confirmado el", type: "string", required: false, sheetControlled: true, description: "Last modified date" },
  travelsByPlane: { sheetColumn: "viajaEnAvion", type: "boolean", required: false, sheetControlled: true, description: "Travels by plane" },

  // Admin / payment
  isAdmin: { sheetColumn: "isAdmin", type: "boolean", required: false, sheetControlled: true, description: "Is administrator" },
  "hosting.isCabinPaidByNovios": { sheetColumn: "isCabinPaidByNovios", type: "boolean", required: false, sheetControlled: true, description: "Cabin paid by couple" },
  "hosting.isCabinPaid": { sheetColumn: "isCabinPaid", type: "boolean", required: false, sheetControlled: true, description: "Cabin paid" },
  "hosting.isXtraCabinPaidByNovios": { sheetColumn: "isXtraCabinPaidByNovios", type: "boolean", required: false, sheetControlled: true, description: "Extra cabin paid by couple" },
  "hosting.isXtraCabinPaid": { sheetColumn: "isXtraCabinPaid", type: "boolean", required: false, sheetControlled: true, description: "Extra cabin paid" },

  // Source metadata (Firestore-only, preserved)
  _source: { firestoreOnly: true, type: "string", description: "Data source (Firestore-only)" },
  _migratedAt: { firestoreOnly: true, type: "string", description: "Migration timestamp (Firestore-only)" },
};

// ── Cabins mapping (cabanas_inventario.csv → cabins collection) ──────────

const CABIN_MAPPING = {
  id: { sheetColumn: "ID", type: "string", required: true, sheetControlled: true, description: "Cabin ID (doc ID)" },
  name: { sheetColumn: "Descr", type: "string", required: true, sheetControlled: true, description: "Cabin display name" },
  capacity: { sheetColumn: "CAPACIDAD", type: "number", required: false, sheetControlled: true, description: "Nominal capacity" },
  capacityRoomCheck: { sheetColumn: "CAPACIDAD_CUARTO_CHECK", type: "number", required: false, sheetControlled: true, description: "Room-check capacity" },
  totalPrice2Nights: { sheetColumn: "PRECIO_TOTAL_2_NOCHES", type: "number", required: false, sheetControlled: true, description: "Total price 2 nights (MXN)" },
  pricePerPerson2Nights: { sheetColumn: "PRECIO_POR_PERSONA_2_NOCHES", type: "number", required: false, sheetControlled: true, description: "Price per person 2 nights (MXN)" },
  pricePerPersonPerNight: { sheetColumn: "PRECIO_POR_PERSONA_POR_NOCHE", type: "number", required: false, sheetControlled: true, description: "Price per person per night (MXN)" },
  isPrivate: { sheetColumn: "isPrivate", type: "boolean", required: false, sheetControlled: true, description: "Is private" },
  isBooked: { sheetColumn: "isBooked", type: "boolean", required: false, sheetControlled: true, description: "Is booked" },
  isBookedXtra: { sheetColumn: "isBookedXtra", type: "boolean", required: false, sheetControlled: true, description: "Is booked as extra" },
  isPaid: { sheetColumn: "isPaid", type: "boolean", required: false, sheetControlled: true, description: "Is paid" },
  isPaidXtra: { sheetColumn: "isPaidXtra", type: "boolean", required: false, sheetControlled: true, description: "Is paid as extra" },
  _source: { firestoreOnly: true, type: "string", description: "Data source (Firestore-only)" },
  _migratedAt: { firestoreOnly: true, type: "string", description: "Migration timestamp (Firestore-only)" },
};

// ── Rooms mapping (cuartos.csv → rooms collection) ───────────────────────

const ROOM_MAPPING = {
  id: { sheetColumn: "ID", type: "string", required: true, sheetControlled: true, description: "Room ID (doc ID)" },
  cabin: { sheetColumn: "CABIN", type: "string", required: true, sheetControlled: true, description: "Cabin display name" },
  "description.es": { sheetColumn: "CUARTO ES", type: "string", required: false, sheetControlled: true, description: "Description in Spanish" },
  "description.fr": { sheetColumn: "CUARTO FR", type: "string", required: false, sheetControlled: true, description: "Description in French" },
  "description.en": { sheetColumn: "CUARTO EN", type: "string", required: false, sheetControlled: true, description: "Description in English" },
  capacity: { sheetColumn: "capacidad", type: "number", required: false, sheetControlled: true, description: "Max persons" },
  isShared: { sheetColumn: "isShared", type: "boolean", required: false, sheetControlled: true, description: "Is shared among groups" },
  _source: { firestoreOnly: true, type: "string", description: "Data source (Firestore-only)" },
  _migratedAt: { firestoreOnly: true, type: "string", description: "Migration timestamp (Firestore-only)" },
};

// ── Tables mapping (mesas.csv → tables collection) ───────────────────────

const TABLE_MAPPING = {
  id: { sheetColumn: "ID", type: "string", required: true, sheetControlled: true, description: "Table ID (doc ID)" },
  name: { sheetColumn: "nombre", type: "string", required: true, sheetControlled: true, description: "Table display name" },
  capacity: { sheetColumn: "capacidad", type: "number", required: false, sheetControlled: true, description: "Max persons" },
  _source: { firestoreOnly: true, type: "string", description: "Data source (Firestore-only)" },
  _migratedAt: { firestoreOnly: true, type: "string", description: "Migration timestamp (Firestore-only)" },
};

// ── Collection definitions ───────────────────────────────────────────────

/**
 * Each collection definition:
 *   collection   — Firestore collection name
 *   csvPath      — relative path to the CSV file
 *   mapping      — field mapping object
 *   idField      — which mapping key is the document ID
 *   excludeRows  — optional predicate to filter out rows (e.g. TOTAL row)
 */
const COLLECTIONS = [
  {
    collection: "guests",
    csvPath: "invitados/lista_invitados.csv",
    mapping: GUEST_MAPPING,
    idField: "id",
    description: "Guest registry (source of truth: Google Sheet INVITADOS tab)",
  },
  {
    collection: "rooms",

    csvPath: "invitados/cuartos.csv",
    mapping: ROOM_MAPPING,
    idField: "id",
    description: "Room inventory (source of truth: Google Sheet cuartos tab)",
  },
  {
    collection: "tables",
    csvPath: "invitados/mesas.csv",
    mapping: TABLE_MAPPING,
    idField: "id",
    description: "Table assignments (source of truth: Google Sheet mesas tab)",
  },
];

// ── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  GUEST_MAPPING,
  CABIN_MAPPING,
  ROOM_MAPPING,
  TABLE_MAPPING,
  COLLECTIONS,
  toBool,
  toNum,
  toStr,
};
