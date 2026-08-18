/**
 * cabinRepository — the ONLY module that touches the Firestore `cabins`
 * collection for the dashboard.
 *
 * Responsibilities (per the architecture contract):
 *   - collection paths (via `collections.cabins` from the shared contract)
 *   - Firestore queries / document refs
 *   - document → Cabin conversion
 *   - Firestore-specific errors
 *
 * It contains NO UI behavior and NO business rules. The dashboard's cabin
 * inventory is loaded through this repository; the pure lookup helpers
 * (`normalizeCloudinaryIds`, `getCabinPhotos`) live in `cabins.js` and
 * consume the loaded list.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Convert a Firestore `cabins` doc into the internal Cabin shape.
 * @param {import("firebase/firestore").DocumentSnapshot} doc
 * @returns {{ id: string, name: string, cloudinaryIds: string|string[]|undefined }}
 */
function cabinFromDoc(doc) {
  const data = doc.data();
  return {
    id: data.id || doc.id,
    name: data.name,
    cloudinaryIds: data.cloudinaryIds,
  };
}

/**
 * Load all cabins from the Firestore `cabins` collection.
 * @returns {Promise<Array<{ id: string, name: string, cloudinaryIds: string|string[]|undefined }>>}
 */
export async function fetchCabins() {
  const snapshot = await getDocs(collection(db, collections.cabins));
  const loaded = [];
  snapshot.forEach((doc) => {
    loaded.push(cabinFromDoc(doc));
  });
  return loaded;
}
