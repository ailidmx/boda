/**
 * Cabin inventory + showcase.
 *
 * The `cabins` Firestore collection is the source of truth for both the
 * operational inventory (capacity, pricing, booking flags) and the public
 * showcase (localized descriptions + Cloudinary photo IDs). This module loads
 * both from Firestore and falls back to static data when Firestore is
 * unavailable (offline / dev).
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
 * Falls back to the static inventory if Firestore is unavailable.
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
    console.warn("[cabins] Could not load cabins from Firestore, using static fallback", error.message);
  }
  return CABINS;
}

/**
 * Load the cabin showcase (localized descriptions + Cloudinary photo IDs)
 * from the Firestore `cabins` collection.
 *
 * Returns an array of showcase units in the shape expected by the Cabins
 * section, keyed by the invitation's cabin key (azalea, dalia, margarita,
 * wooden). Only cabins that carry a `showcase` field are included.
 *
 * Falls back to an empty array when Firestore is unavailable or no cabin has
 * showcase data yet (the Cabins component then uses the static content.js
 * data).
 * @param {string} [language] — "es" | "fr" | "en"
 * @returns {Promise<Array<Object>>}
 */
export async function loadCabinsShowcase(language = "es") {
  const cabins = await loadCabins();
  const lang = language || "es";

  const units = [];
  for (const cabin of cabins) {
    if (!cabin.showcase) continue;
    const s = cabin.showcase;
    // The showcase is a map of { es, fr, en }, each holding the full unit
    // description. Pick the requested language, falling back to es → fr → en.
    const langData = s[lang] || s.es || s.fr || s.en || {};
    const pick = (field) => langData[field] ?? "";
    const pickList = (field) => langData[field] ?? [];

    units.push({
      key: langData.key || cabin.id,
      title: pick("title"),
      intro: pick("intro"),
      capacity: pick("capacity"),
      roomsLabel: pick("roomsLabel"),
      bedsLabel: pick("bedsLabel"),
      rooms: pickList("rooms"),
      amenities: pick("amenities"),
      galleryLabel: pick("galleryLabel"),
      photoAlts: pickList("photoAlts"),
      videoLabel: pick("videoLabel"),
      note: pick("note"),
      cloudinaryIds: cabin.cloudinaryIds
        ? cabin.cloudinaryIds.split(",").map((id) => id.trim()).filter(Boolean)
        : [],
    });
  }

  return units;
}

export function getCabin(cabinIdOrName) {
  if (!cabinIdOrName) return null;
  const normalized = cabinIdOrName.trim().toLocaleUpperCase();
  const source = CABINS.length > 0 ? CABINS : STATIC_CABINS;
  return source.find((cabin) =>
    cabin.id?.toLocaleUpperCase() === normalized
      || cabin.name?.toLocaleUpperCase() === normalized,
  ) || null;
}

// ── Static fallback inventory ─────────────────────────────────────────────
// Used only if Firestore is unavailable (offline / dev). The Firestore
// `cabins` collection is the source of truth.
const STATIC_CABINS = [
  { id: "VILLA AZALEA", name: "VILLA AZALEA - 12p", capacity: 12, totalPrice2Nights: 8470, pricePerPerson2Nights: 706, isPrivate: false },
  { id: "VILLA DALIA", name: "VILLA DALIA - 10p", capacity: 10, totalPrice2Nights: 11150, pricePerPerson2Nights: 1115, isPrivate: false },
  { id: "VILLA MARGARITA", name: "VILLA MARGARITA - 10p", capacity: 10, totalPrice2Nights: 11150, pricePerPerson2Nights: 1115, isPrivate: false },
  { id: "VILLA LAVANDA", name: "VILLA LAVANDA - 4p", capacity: 4, totalPrice2Nights: 5980, pricePerPerson2Nights: 1495, isPrivate: false },
  { id: "VILLA HORTENCIA", name: "VILLA HORTENCIA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 1", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 2", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 3", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 4", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "VILLA DON AGUSTIN", name: "VILLA DON AGUSTIN - 4p", capacity: 4, totalPrice2Nights: 5980, pricePerPerson2Nights: 1495, isPrivate: true },
  { id: "VILLA DON RAFA", name: "VILLA DON RAFA - 6p", capacity: 6, totalPrice2Nights: 7210, pricePerPerson2Nights: 1202, isPrivate: true },
  { id: "SUITE DON CARLOS", name: "SUITE DON CARLOS - 8p", capacity: 8, totalPrice2Nights: 9640, pricePerPerson2Nights: 1205, isPrivate: false },
  { id: "CASONA", name: "CASONA - 18p", capacity: 18, totalPrice2Nights: 16980, pricePerPerson2Nights: 943, isPrivate: false },
];
