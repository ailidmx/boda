/**
 * Generate the invitation's media manifest from Cloudinary tags + the cabin
 * database (invitados/cabanas/*.json).
 *
 * This is a build-time step: it queries Cloudinary's Admin API (which requires
 * the API secret and therefore cannot run in the browser) and writes a static
 * `src/generated-media.js` module that the invitation imports. The result keeps
 * the site fully static while making it easy to add/remove photos by simply
 * tagging them in Cloudinary.
 *
 * What it produces:
 *   - CABIN_PHOTOS:  { mediaKey: [publicId, ...] }  — from per-cabin tags
 *   - CABIN_VIDEOS:  { mediaKey: publicId }          — cabin tour videos
 *   - CABIN_DB:      { mediaKey: { ...cabinJson } }  — cabin metadata from the
 *                     database (invitados/cabanas/*.json), the source of truth
 *                     for capacity, rooms, beds, etc.
 *
 * Usage:
 *   node scripts/generate-media-manifest.mjs
 *
 * Requires the Cloudinary credentials in web/invitation/.env (see .env.example).
 */

import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");
const CABIN_DB_DIR = join(
  __dirname,
  "..",
  "..",
  "..",
  "invitados",
  "cabanas",
);
const OUT_FILE = join(SRC_DIR, "generated-media.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Map a cabin database id (from invitados/cabanas/*.json) to the media key used
 * by the invitation (MEDIA.cabins) and to its Cloudinary tag.
 */
const CABIN_MEDIA = [
  { dbId: "azalea", key: "azalea", tag: "CABANA_AZALEA" },
  { dbId: "dalia", key: "dalia", tag: "CABANA_DALIA" },
  { dbId: "margarita", key: "margarita", tag: "CABANA_MARGARITA" },
  { dbId: "madera-31-34", key: "wooden", tag: "CABANA_MADERA" },
];

/** Fetch all public_ids for a given tag (paginated). */
async function publicIdsByTag(tag) {
  const ids = [];
  let nextCursor = null;
  do {
    const res = await cloudinary.api.resources_by_tag(tag, {
      resource_type: "image",
      max_results: 100,
      next_cursor: nextCursor,
    });
    for (const asset of res.resources || []) {
      ids.push(asset.public_id.replace(/^boda\//, ""));
    }
    nextCursor = res.next_cursor || null;
  } while (nextCursor);
  return ids.sort();
}

/** Fetch the single video public_id for a cabin tag (if any). */
async function videoByTag(tag) {
  const res = await cloudinary.api.resources_by_tag(tag, {
    resource_type: "video",
    max_results: 100,
  });
  const video = (res.resources || []).find(
    (asset) => asset.resource_type === "video",
  );
  return video ? video.public_id.replace(/^boda\//, "") : null;
}

/** Load a cabin JSON file from the database. */
function loadCabinDb(dbId) {
  const file = join(CABIN_DB_DIR, `${dbId}.json`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.warn(`  ! could not read ${file}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("Generating media manifest from Cloudinary tags + cabin DB…\n");

  const cabinPhotos = {};
  const cabinVideos = {};
  const cabinDb = {};

  for (const { dbId, key, tag } of CABIN_MEDIA) {
    const photos = await publicIdsByTag(tag);
    const video = await videoByTag(tag);
    const db = loadCabinDb(dbId);

    cabinPhotos[key] = photos;
    if (video) cabinVideos[key] = video;
    if (db) cabinDb[key] = db;

    console.log(
      `  ${key.padEnd(9)} ${String(photos.length).padStart(2)} photos` +
        (video ? `, 1 video` : "") +
        (db ? `, db: ${db.nombre}` : ", db: MISSING"),
    );
  }

  const source = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by scripts/generate-media-manifest.mjs from Cloudinary tags and the
 * cabin database (invitados/cabanas/*.json). Re-run that script after tagging
 * new photos or updating cabin data.
 *
 *   node scripts/generate-media-manifest.mjs
 */

// Cabin photo public_ids, keyed by the invitation's cabin key. The order is
// alphabetical by public_id (Cloudinary tag order).
export const CABIN_PHOTOS = ${JSON.stringify(cabinPhotos, null, 2)};

// Cabin tour video public_ids (one per cabin, if present).
export const CABIN_VIDEOS = ${JSON.stringify(cabinVideos, null, 2)};

// Cabin metadata straight from the database (invitados/cabanas/*.json).
export const CABIN_DB = ${JSON.stringify(cabinDb, null, 2)};
`;

  writeFileSync(OUT_FILE, source, "utf8");
  console.log(`\nWrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
