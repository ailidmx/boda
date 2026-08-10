/**
 * Cabin inventory.
 *
 * The `cabins` Firestore collection is the source of truth for the
 * operational inventory (capacity, pricing, booking flags). This module loads
 * the inventory from Firestore and provides lookup helpers used by the
 * Accommodation section.
 *
 * AGREED SCHEMA (English field names only):
 *   - id            (string) — unique cabin ID (e.g. "VILLA AZALEA")
 *   - name          (string) — display name (e.g. "VILLA AZALEA - 12p")
 *   - capacity      (number) — max persons
 *   - totalPrice2Nights (number) — internal price for 2 nights (MXN)
 *   - pricePerPerson2Nights (number) — internal price per person (MXN)
 *   - isPrivate     (boolean) — whether the cabin is a private unit
 *   - showcase      (map)    — { es, fr, en } localized showcase descriptions
 *   - cloudinaryIds (string) — comma-separated Cloudinary public IDs for the
 *                              showcase photos (e.g. "cabin-azalea-01,cabin-azalea-02")
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";

/** @type {import("./cabins.js").Cabin[]} */
let CABINS = [];

/** @type {boolean} */
let cabinsLoaded = false;

function logDb(event, detail) {

  console.log(`[db][cabins][${event}]`, detail);
}

/**
 * Load the cabin inventory from the Firestore `cabins` collection.
 * @returns {Promise<import("./cabins.js").Cabin[]>}
 */
export async function loadCabins() {
  if (cabinsLoaded) return CABINS;
  try {
    logDb("read:start", { collection: collections.cabins, op: "getDocs" });
    const snapshot = await getDocs(collection(db, collections.cabins));

    const loaded = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      loaded.push({
        id: data.id || doc.id,
        key: data.key,
        name: data.name,
        capacity: data.capacity,
        totalPrice2Nights: data.totalPrice2Nights,
        pricePerPerson2Nights: data.pricePerPerson2Nights,
        isPrivate: data.isPrivate,
        showcase: data.showcase,
        cloudinaryIds: data.cloudinaryIds,
      });
    });

    if (loaded.length > 0) {
      CABINS = loaded;
      cabinsLoaded = true;
      logDb("read:success", { collection: collections.cabins, op: "getDocs", size: loaded.length });
      console.log(`[cabins] Loaded ${loaded.length} cabins from Firestore`);
    }
  } catch (error) {
    logDb("read:error", { collection: collections.cabins, op: "getDocs", error: error.message });
    console.warn("[cabins] Could not load cabins from Firestore", error.message);
  }
  return CABINS;
}

/**
 * Look up a cabin by its ID or name (case-insensitive).
 *
 * The Firestore `cabins` collection is the single source of truth. No local
 * fallback data is used — if a cabin is not in the DB it is not returned.
 * @param {string} cabinIdOrName
 * @returns {import("./cabins.js").Cabin | null}
 */
export function getCabin(cabinIdOrName) {
  if (!cabinIdOrName) return null;
  const normalized = cabinIdOrName.trim().toLocaleUpperCase();
  return CABINS.find((cabin) =>
    cabin.id?.toLocaleUpperCase() === normalized
      || cabin.name?.toLocaleUpperCase() === normalized,
  ) || null;
}


