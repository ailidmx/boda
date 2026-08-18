/**
 * roomRepository — the ONLY module that touches the Firestore `rooms`
 * collection for the dashboard.
 *
 * Responsibilities (per the architecture contract):
 *   - collection paths (via `collections.rooms` from the shared contract)
 *   - Firestore queries / document refs
 *   - document → Room conversion
 *   - Firestore-specific errors
 *
 * It contains NO UI behavior and NO business rules. The dashboard's room
 * inventory is loaded through this repository; the pure lookup helpers
 * (`getRoomsByCabin`, `getRoom`, `getRoomDescription`, `getRoomOccupancy`,
 * `getCabinNames`) live in `rooms.js` and consume the loaded list.
 */

import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Convert a Firestore `rooms` doc into the internal Room shape.
 * @param {import("firebase/firestore").DocumentSnapshot} doc
 * @returns {object} Room
 */
function roomFromDoc(doc) {
  const data = doc.data();
  return {
    id: data.id || doc.id,
    cabin: data.cabin,
    description: data.description,
    capacity: data.capacity,
    isShared: data.isShared,
  };
}

/**
 * Load all rooms from the Firestore `rooms` collection.
 * @returns {Promise<object[]>} array of Room
 */
export async function fetchRooms() {
  const snapshot = await getDocs(
    query(collection(db, collections.rooms), limit(500)),
  );
  const loaded = [];
  snapshot.forEach((doc) => {
    loaded.push(roomFromDoc(doc));
  });
  return loaded;
}
