/**
 * Room inventory — structured from the venue's room data.
 *
 * Each room has a unique ID matching the venue's naming convention.
 * The `cabin` field references the cabin name (display name).
 * Guests are assigned to rooms via the `room` field in guests.js.
 *
 * Occupancy is computed at runtime by counting guests assigned to each room.
 */

/**
 * @typedef {Object} Room
 * @property {string}  id          — unique room ID (e.g. "VILLA MARGARITA-1")
 * @property {string}  cabin       — cabin display name (e.g. "VILLA MARGARITA")
 * @property {string}  description — room description (e.g. "CUARTO 1: 2 CAMAS MATRIMONIALES")
 * @property {number}  capacity    — max persons
 * @property {boolean} isShared    — whether the room is shared among different guest groups
 */

/** @type {Room[]} */
export const ROOMS = [
  // ── VILLA MARGARITA ──────────────────────────────────────────────
  { id: "VILLA MARGARITA-1", cabin: "VILLA MARGARITA", description: "CUARTO 1: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },
  { id: "VILLA MARGARITA-2", cabin: "VILLA MARGARITA", description: "CUARTO 2: 4 CAMAS INDIVUDALES (LITERAS)", capacity: 4, isShared: true },
  { id: "VILLA MARGARITA-3", cabin: "VILLA MARGARITA", description: "CUARTO 3: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },

  // ── VILLA LAVANDA ────────────────────────────────────────────────
  { id: "VILLA LAVANDA", cabin: "VILLA LAVANDA", description: "1 CUARTO: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },

  // ── VILLA HORTENCIA ──────────────────────────────────────────────
  { id: "VILLA HORTENCIA-1", cabin: "VILLA HORTENCIA", description: "1 CUARTO: 1 CAMA KING SIZE Y 1 SOFA CAMA INDIVIDUAL", capacity: 2, isShared: true },
  { id: "VILLA HORTENCIA-2", cabin: "VILLA HORTENCIA", description: "SOFA CAMA PARA 2 MENORES", capacity: 2, isShared: true },

  // ── CABAÑA 1 ─────────────────────────────────────────────────────
  { id: "CABAÑA 1-1", cabin: "CABAÑA 1", description: "1 CUARTO: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CABAÑA 1-2", cabin: "CABAÑA 1", description: "1 SOFA CAMA MATRIMONIAL EN LA SALA", capacity: 2, isShared: false },

  // ── CABAÑA 2 ─────────────────────────────────────────────────────
  { id: "CABAÑA 2-1", cabin: "CABAÑA 2", description: "1 CUARTO: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CABAÑA 2-2", cabin: "CABAÑA 2", description: "1 SOFA CAMA MATRIMONIAL EN LA SALA", capacity: 2, isShared: false },

  // ── CABAÑA 3 ─────────────────────────────────────────────────────
  { id: "CABAÑA 3-1", cabin: "CABAÑA 3", description: "1 CUARTO: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CABAÑA 3-2", cabin: "CABAÑA 3", description: "1 SOFA CAMA MATRIMONIAL EN LA SALA", capacity: 2, isShared: false },

  // ── CABAÑA 4 ─────────────────────────────────────────────────────
  { id: "CABAÑA 4-1", cabin: "CABAÑA 4", description: "CUARTO 1: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CABAÑA 4-2", cabin: "CABAÑA 4", description: "CUARTO 2: 1 CAMA MATRIMONIAL Y 1 LITERA INDIVIDUAL", capacity: 4, isShared: true },
  { id: "CABAÑA 4-3", cabin: "CABAÑA 4", description: "CUARTO 3: 1 LITERA INDIVIDUAL", capacity: 2, isShared: true },

  // ── VILLA DON AGUSTIN ────────────────────────────────────────────
  { id: "VILLA DON AGUSTIN", cabin: "VILLA DON AGUSTIN", description: "1 CUARTO: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },

  // ── VILLA DON RAFA ───────────────────────────────────────────────
  { id: "VILLA DON RAFA-1", cabin: "VILLA DON RAFA", description: "CUARTO 1: UNA CAMA KING SIZE Y UNA INDIVUDAL", capacity: 3, isShared: true },
  { id: "VILLA DON RAFA-2", cabin: "VILLA DON RAFA", description: "CUARTO 2: CAMA MATRIMONIAL", capacity: 2, isShared: false },

  // ── VILLA DALIA ──────────────────────────────────────────────────
  { id: "VILLA DALIA-1", cabin: "VILLA DALIA", description: "CUARTO 1: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },
  { id: "VILLA DALIA-2", cabin: "VILLA DALIA", description: "CUARTO 2: 4 CAMAS INDIVUDALES (LITERAS)", capacity: 4, isShared: true },
  { id: "VILLA DALIA-3", cabin: "VILLA DALIA", description: "CUARTO 3: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },

  // ── VILLA AZALEA ─────────────────────────────────────────────────
  { id: "VILLA AZALEA-1", cabin: "VILLA AZALEA", description: "CUARTO 1: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },
  { id: "VILLA AZALEA-2", cabin: "VILLA AZALEA", description: "CUARTO 2: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },
  { id: "VILLA AZALEA-3", cabin: "VILLA AZALEA", description: "CUARTO 3: 3 CAMAS INDIVIDUALES", capacity: 3, isShared: true },

  // ── SUITE DON CARLOS ─────────────────────────────────────────────
  { id: "SUITE DON CARLOS-1", cabin: "SUITE DON CARLOS", description: "CUARTO 1: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "SUITE DON CARLOS-2", cabin: "SUITE DON CARLOS", description: "CUARTO 2: 1 CAMA MATRIMONIAL Y 1 LITERA INDIVIDUAL", capacity: 4, isShared: true },
  { id: "SUITE DON CARLOS-3", cabin: "SUITE DON CARLOS", description: "CUARTO 3: 1 LITERA INDIVIDUAL", capacity: 2, isShared: true },

  // ── CASONA ───────────────────────────────────────────────────────
  { id: "CASONA-1", cabin: "CASONA", description: "CUARTO 1: 2 CAMAS MATRIMONIALES", capacity: 4, isShared: true },
  { id: "CASONA-2", cabin: "CASONA", description: "CUARTO 2: 1 CAMA KING SIZE", capacity: 1, isShared: false },
  { id: "CASONA-3", cabin: "CASONA", description: "CUARTO 3: 2 CAMAS MATRIMONIALES Y 1 LITERA CON UNA CAMA MATRIMONIAL Y OTRA INDIVIDUAL", capacity: 7, isShared: true },
  { id: "CASONA-4", cabin: "CASONA", description: "CUARTO 4: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CASONA-5", cabin: "CASONA", description: "CUARTO 5: 1 CAMA MATRIMONIAL", capacity: 2, isShared: false },
  { id: "CASONA-6", cabin: "CASONA", description: "SALA: 1 SOFA CAMA MATRIMONIAL", capacity: 2, isShared: false },
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
  madera_31: "CABAÑA 31",
  madera_32: "CABAÑA 32",
  madera_33: "CABAÑA 33",
  madera_34: "CABAÑA 34",
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
  return ROOMS.filter((r) => r.cabin === cabinName);
}

/**
 * Get a room by its ID.
 * @param {string} roomId
 * @returns {Room|undefined}
 */
export function getRoom(roomId) {
  return ROOMS.find((r) => r.id === roomId);
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
  return [...new Set(ROOMS.map((r) => r.cabin))].sort();
}
