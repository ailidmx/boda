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

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";


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

function logDb(event, detail) {
  console.log(`[db][rooms][${event}]`, detail);
}

/** @type {boolean} */
let roomsLoaded = false;

/**
 * Load rooms from the Firestore `rooms` collection.
 * The Firestore `rooms` collection is the single source of truth — no local
 * fallback data is used.
 * @returns {Promise<Room[]>}
 */
export async function loadRooms() {
  if (roomsLoaded) return ROOMS;
  try {
    logDb("read:start", { collection: collections.rooms, op: "getDocs" });
    const snapshot = await getDocs(collection(db, collections.rooms));

    const loaded = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      loaded.push({
        id: data.id || doc.id,
        cabin: data.cabin,
        description: data.description,
        capacity: data.capacity,
        isShared: data.isShared,
      });
    });
    if (loaded.length > 0) {
      ROOMS = loaded;
      roomsLoaded = true;
      logDb("read:success", { collection: collections.rooms, op: "getDocs", size: loaded.length });
      console.log(`[rooms] Loaded ${loaded.length} rooms from Firestore`);
    }
  } catch (error) {
    logDb("read:error", { collection: collections.rooms, op: "getDocs", error: error.message });
    console.warn("[rooms] Could not load rooms from Firestore", error.message);
  }
  return ROOMS;
}


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

  const assigned = guests.filter((g) => (g.hosting?.room || g.room) === roomId);
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

