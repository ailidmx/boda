/**
 * Upload the Lake Chapala anecdote images to Cloudinary.
 *
 * Reads the local images in media/chapala/ and uploads each one to the
 * `funfact/chapala/` folder, tagged so it can be routed to the anecdote
 * carousel in the story section.
 *
 * Expected local files (WebP/JPEG/PNG), one per anecdote:
 *   panorama-lac, lac-montagnes, ile-mezcala, mezcala-village,
 *   ajijic-fontaine, ajijic-mural, ajijic-plaza, ajijic-lettres,
 *   fruits-rouges, rive-lac, oiseaux, charales
 *
 * Usage:
 *   node scripts/upload-chapala-anecdotes.mjs
 *
 * Requires the Cloudinary credentials in web/invitation/.env (see .env.example).
 */

import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CHAPALA_DIR = join(__dirname, "..", "media", "chapala");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** The 12 anecdote slugs expected in media/chapala/. */
const EXPECTED_SLUGS = [
  "panorama-lac",
  "lac-montagnes",
  "ile-mezcala",
  "mezcala-village",
  "ajijic-fontaine",
  "ajijic-mural",
  "ajijic-plaza",
  "ajijic-lettres",
  "fruits-rouges",
  "rive-lac",
  "oiseaux",
  "charales",
];

async function main() {
  const files = readdirSync(CHAPALA_DIR).filter((f) =>
    /\.(webp|jpe?g|png)$/i.test(f),
  );

  console.log(`Found ${files.length} local files in ${CHAPALA_DIR}\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const base = basename(file, extname(file));
    if (!EXPECTED_SLUGS.includes(base)) {
      console.warn(`⚠  Skipping unexpected file: ${file}`);
      continue;
    }
    const publicId = `funfact/chapala/${base}`;
    try {
      const res = await cloudinary.uploader.upload(join(CHAPALA_DIR, file), {
        public_id: publicId,
        resource_type: "image",
        tags: ["FUNFACT", "CHAPALA"],
        overwrite: true,
        use_filename: false,
        unique_filename: false,
      });
      console.log(`✓ ${file} → ${res.public_id}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${file} → ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} uploaded, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

main();
