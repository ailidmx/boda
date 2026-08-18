/**
 * Cabin inventory (dashboard).
 *
 * The `cabins` Firestore collection is the source of truth for the cabin
 * showcase photos. Each cabin doc carries a `cloudinaryIds` field (array or
 * comma-separated string) with the Cloudinary public IDs of its showcase
 * photos. Photos are stored relative to the `boda/` prefix and rendered as
 * `cloudinaryImage(\`boda/${id}\`)`.
 *
 * AGREED SCHEMA (English field names only):
 *   - id            (string) — unique cabin ID (e.g. "VILLA AZALEA")
 *   - name          (string) — display name (e.g. "VILLA AZALEA - 12p")
 *   - cloudinaryIds (string|string[]) — showcase photo public IDs
 */

import { fetchCabins } from "./repositories/cabinRepository.js";


/** @type {Array<{ id: string, name: string, cloudinaryIds: string[] }>} */
let CABINS = [];

/** @type {boolean} */
let cabinsLoaded = false;

/**
 * Load the cabin inventory from the Firestore `cabins` collection.
 * @returns {Promise<Array<{ id: string, name: string, cloudinaryIds: string[] }>>}
 */
export async function loadCabins() {
  if (cabinsLoaded) return CABINS;
  try {
    const loaded = await fetchCabins();
    if (loaded.length > 0) {
      CABINS = loaded;
      cabinsLoaded = true;
      console.log(`[cabins] Loaded ${loaded.length} cabins from Firestore`);
    }
  } catch (error) {
    console.warn("[cabins] Could not load cabins from Firestore", error.message);
  }
  return CABINS;
}


/**
 * Normalize a cabin's `cloudinaryIds` into an array of public IDs.
 * Accepts the new array format or the legacy comma-separated string.
 * @param {string|string[]|undefined} raw
 * @returns {string[]}
 */
export function normalizeCloudinaryIds(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Get the showcase photo public IDs for a cabin by its display name
 * (e.g. "VILLA AZALEA"). Returns an empty array when the cabin has no photos.
 * @param {string} displayName — cabin display name (e.g. "VILLA AZALEA")
 * @returns {string[]}
 */
export function getCabinPhotos(displayName) {
  if (!displayName) return [];
  const normalized = displayName.trim().toLocaleUpperCase();
  const cabin = CABINS.find(
    (c) =>
      c.id?.toLocaleUpperCase() === normalized ||
      c.name?.toLocaleUpperCase() === normalized,
  );
  if (!cabin) return [];
  return normalizeCloudinaryIds(cabin.cloudinaryIds);
}
