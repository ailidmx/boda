/**
 * Room inventory — structured from the venue's room data (Google Sheet).
 *
 * Rooms are stored in the Firestore `rooms` collection (source of truth).
 * Each room has a unique ID matching the venue's naming convention.
 * The `cabin` field references the cabin name (display name).
 * Guests are assigned to rooms via the `room` field in guests.js.
 *
 * Occupancy is computed at runtime by counting guests assigned to each room.
 *
 * AGREED SCHEMA (English field names only):
 *   - id          (string) — unique room ID (e.g. "VILLA MARGARITA-1")
 *   - cabin       (string) — cabin display name (e.g. "VILLA MARGARITA")
 *   - description (map)    — { es, fr, en } localized descriptions
 *   - capacity    (number) — max persons
 *   - isShared    (boolean) — whether the room is shared among guest groups
 */

import { fetchRooms } from "./repositories/roomRepository.js";




/**
 * @typedef {Object} RoomDescription
 * @property {string} es — Spanish description (source of truth)
 * @property {string} fr — French description
 * @property {string} en — English description
 */

/**
 * @typedef {Object} Room
 * @property {string}  id          — unique room ID (e.g. "VILLA MARGARITA-1")
 * @property {string}  cabin       — cabin display name (e.g. "VILLA MARGARITA")
 * @property {RoomDescription} description — localized room description
 * @property {number}  capacity    — max persons
 * @property {boolean} isShared    — whether the room is shared among different guest groups
 */

/** @type {Room[]} */
let ROOMS = [];

/** @type {boolean} */
let roomsLoaded = false;

/**
 * Load rooms from the Firestore `rooms` collection.
 * Falls back to the static inventory if Firestore is unavailable.
 * @returns {Promise<Room[]>}
 */
export async function loadRooms() {
  if (roomsLoaded) return ROOMS;
  try {
    const loaded = await fetchRooms();
    if (loaded.length > 0) {
      ROOMS = loaded;
      roomsLoaded = true;
      console.log(`[rooms] Loaded ${loaded.length} rooms from Firestore`);
    }
  } catch (error) {
    console.warn("[rooms] Could not load rooms from Firestore, using static fallback", error.message);
  }
  return ROOMS;
}


// ── Static fallback inventory ─────────────────────────────────────────────
// Used only if Firestore is unavailable (offline / dev). The Firestore
// `rooms` collection is the source of truth.
const STATIC_ROOMS = [
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

// ── Cabin name mapping (unit code → display name) ─────────────────────

/**
 * Map from internal unit codes (used in guests.js) to display cabin names.
 */
export const CABIN_NAME_MAP = {
  azalea: "VILLA AZALEA",
  dalia: "VILLA DALIA",
  margarita: "VILLA MARGARITA",
  lavanda: "VILLA LAVANDA",
  hortencia: "VILLA HORTENCIA",
  casona: "CASONA",
  cabana_4: "CABAÑA 4",
  cabana_5: "CABAÑA 5",
  cabana_6: "CABAÑA 6",
  // The "Cabaña de madera" units (31–34) are the SAME physical cabins as
  // CABAÑA 1–4 in the room inventory. Their rooms are stored under
  // CABAÑA 1/2/3/4 (e.g. madera_33 → CABAÑA 3-1), so map them accordingly.
  madera_31: "CABAÑA 1",
  madera_32: "CABAÑA 2",
  madera_33: "CABAÑA 3",
  madera_34: "CABAÑA 4",

};

/**
 * Get the display cabin name from an internal unit code.
 * @param {string} unitCode
 * @returns {string}
 */
export function getCabinDisplayName(unitCode) {
  return CABIN_NAME_MAP[unitCode] || unitCode;
}

// ── Room lookup helpers ────────────────────────────────────────────────

/**
 * Get all rooms belonging to a cabin.
 * @param {string} cabinName — display name (e.g. "VILLA AZALEA")
 * @returns {Room[]}
 */
export function getRoomsByCabin(cabinName) {
  const source = ROOMS.length > 0 ? ROOMS : STATIC_ROOMS;
  return source.filter((r) => r.cabin === cabinName);
}

/**
 * Get a room by its ID.
 * @param {string} roomId
 * @returns {Room|undefined}
 */
export function getRoom(roomId) {
  const source = ROOMS.length > 0 ? ROOMS : STATIC_ROOMS;
  return source.find((r) => r.id === roomId);
}

/**
 * Resolve a room's localized description for a given language.
 * Falls back to Spanish (the source of truth) when the requested language
 * is missing.
 * @param {Room|RoomDescription|string|undefined} roomOrDesc — a Room, a
 *   RoomDescription object, or a plain string (legacy).
 * @param {string} [lang] — "es" | "fr" | "en"
 * @returns {string}
 */
export function getRoomDescription(roomOrDesc, lang = "es") {
  if (!roomOrDesc) return "";
  // Legacy: a plain string is returned as-is.
  if (typeof roomOrDesc === "string") return roomOrDesc;
  const desc = roomOrDesc.description || roomOrDesc;
  if (typeof desc === "string") return desc;
  return desc[lang] || desc.es || desc.fr || desc.en || "";
}

/**
 * Compute occupancy for a room based on assigned guests.
 * @param {string} roomId
 * @param {import("./guests.js").GuestProfile[]} guests — list of all guests
 * @returns {{ capacity: number, ocupacion: number, available: number, guests: import("./guests.js").GuestProfile[] }}
 */
export function getRoomOccupancy(roomId, guests) {
  const room = getRoom(roomId);
  if (!room) return null;

  const assigned = guests.filter((g) => g.room === roomId);
  return {
    capacity: room.capacity,
    ocupacion: assigned.length,
    available: room.capacity - assigned.length,
    guests: assigned,
  };
}

/**
 * Get all unique cabin names from the room inventory.
 * @returns {string[]}
 */
export function getCabinNames() {
  const source = ROOMS.length > 0 ? ROOMS : STATIC_ROOMS;
  return [...new Set(source.map((r) => r.cabin))].sort();
}
