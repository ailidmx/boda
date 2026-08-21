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
 *   - capacity      (number) — max persons
 *   - totalPrice2Nights (number) — internal price for 2 nights (MXN)
 *   - pricePerPerson2Nights (number) — internal price per person (MXN)
 *   - isPrivate     (boolean) — whether the cabin is a private unit
 *   - cloudinaryIds (string|string[]) — showcase photo public IDs
 */

import { fetchCabins } from "./repositories/cabinRepository.js";


/** @type {Array<{ id: string, name: string, capacity: number, totalPrice2Nights: number, pricePerPerson2Nights: number, isPrivate: boolean, cloudinaryIds: string[] }>} */
let CABINS = [];

/** @type {boolean} */
let cabinsLoaded = false;

/**
 * Load the cabin inventory from the Firestore `cabins` collection.
 * @returns {Promise<Array<{ id: string, name: string, capacity: number, totalPrice2Nights: number, pricePerPerson2Nights: number, isPrivate: boolean, cloudinaryIds: string[] }>>}
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

/**
 * Get the FULL cabin object by its display name (e.g. "VILLA AZALEA"),
 * including the operational pricing fields (`capacity`, `totalPrice2Nights`,
 * `pricePerPerson2Nights`, `isPrivate`). Returns `null` when the cabin is not
 * in the `cabins` collection.
 *
 * Used by the cabins panel to show the global cabin cost in the card header
 * and to compute the per-person cost for each assigned guest (mirroring the
 * invitation's Accommodation pricing rule).
 * @param {string} displayName — cabin display name (e.g. "VILLA AZALEA")
 * @returns {{ id: string, name: string, capacity: number, totalPrice2Nights: number, pricePerPerson2Nights: number, isPrivate: boolean, cloudinaryIds: string[] }|null}
 */
export function getCabinByDisplayName(displayName) {
  if (!displayName) return null;
  const normalized = displayName.trim().toLocaleUpperCase();
  return (
    CABINS.find(
      (c) =>
        c.id?.toLocaleUpperCase() === normalized ||
        c.name?.toLocaleUpperCase() === normalized,
    ) || null
  );
}

/**
 * Build a Cloudinary URL for a cabin showcase photo from its public id.
 *
 * TRICK (back office only): the `cabins` collection stores the showcase photo
 * public ids WITHOUT the `boda/` prefix (e.g. `cabin-margarita-06`), but the
 * actual Cloudinary assets live under the `boda/` folder (e.g.
 * `boda/cabin-margarita-06`). So we prepend `boda/` here so the dashboard
 * renders the correct images.
 *
 * NOTE: This is a temporary workaround applied ONLY to the back office. The
 * real fix is to store the FULL public id (with the `boda/` prefix) in the
 * `cabins` collection. See the todo list file for the follow-up.
 * @param {string} publicId
 * @returns {string}
 */
export function cabinPhotoUrl(publicId) {
  if (!publicId) return "";
  const fullId = publicId.startsWith("boda/") ? publicId : `boda/${publicId}`;
  return `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_1200,h_800/${fullId}`;
}


/**
 * Get all cabin display names from the `cabins` collection.
 *
 * Used by the cabins panel to show cabins that have NO guests assigned in a
 * given period (so the admin can open them for rental). Returns the cabin
 * `id` (the canonical display name, e.g. "VILLA AZALEA"), falling back to
 * `name` when `id` is missing.
 * @returns {string[]}
 */
export function getAllCabinNames() {
  return CABINS.map((c) => c.id || c.name).filter(Boolean);
}
