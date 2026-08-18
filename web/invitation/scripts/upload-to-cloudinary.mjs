/**
 * Upload all approved invitation media to Cloudinary.
 *
 * Reads the local WebP/MP4 derivatives in src/assets/approved/ and uploads
 * each one to the configured Cloudinary account, tagging it so it can be
 * routed to the right section of the invitation.
 *
 * Usage:
 *   node scripts/upload-to-cloudinary.mjs
 *
 * Requires the Cloudinary credentials in web/invitation/.env (see .env.example).
 */

import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";


const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "src", "assets", "approved");



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Map a local filename to a Cloudinary public_id and its routing tag(s).
 * The public_id keeps the same base name so the code can reference it
 * predictably; the tag routes the asset to the section that uses it.
 */
function routeFor(filename) {
  const base = basename(filename, extname(filename));

  // Couple photos used in the hero slideshow
  const heroSet = new Set([
    "couple-003",
    "couple-013",
    "couple-014",
    "couple-018",
    "couple-new-DSC05180",
    "couple-new-IMG_20190313_205809",
    "couple-new-IMG_20200627_223059",
    "couple-new-IMG_20211030_184411",
    "couple-new-IMG_20211228_225516",
    "couple-new-IMG_20220819_095220",
    "couple-new-20230129_214006",
    "couple-new-IMG_2690",
    "couple-new-IMG_3511",
    "couple-new-IMG_4241",
    "couple-new-IMG_4921",
    "couple-new-IMG_5368",
    "couple-new-IMG_5540",
    "couple-new-102410",
    "couple-new-42142cfb-0bf5-42a8-b462-d8af5dc0672c",
  ]);

  if (heroSet.has(base)) {
    return { publicId: `boda/${base}`, tags: ["HERO", "NOVIOS"] };
  }

  if (base.startsWith("couple-")) {
    return { publicId: `boda/${base}`, tags: ["NOVIOS"] };
  }

  if (base.startsWith("venue-")) {
    return { publicId: `boda/${base}`, tags: ["ROCA_AZUL"] };
  }

  if (base.startsWith("food-")) {
    return { publicId: `boda/${base}`, tags: ["COMIDA"] };
  }

  if (base.startsWith("cabin-")) {
    const isVideo = extname(filename).toLowerCase() === ".mp4";
    // Per-cabin tag so photos can be fetched dynamically by cabin. The tag is
    // the source of truth for which photos belong to which cabin.
    const cabinTag =
      base.startsWith("cabin-azalea-")
        ? "CABANA_AZALEA"
        : base.startsWith("cabin-dalia-")
          ? "CABANA_DALIA"
          : base.startsWith("cabin-margarita-")
            ? "CABANA_MARGARITA"
            : base.startsWith("cabin-wooden-")
              ? "CABANA_MADERA"
              : null;
    return {
      publicId: `boda/${base}`,
      tags: [
        "CABANAS",
        ...(cabinTag ? [cabinTag] : []),
        ...(isVideo ? ["VIDEO"] : []),
      ],
    };
  }


  if (base.startsWith("party-")) {
    return { publicId: `boda/${base}`, tags: ["FIESTA"] };
  }

  if (base.startsWith("oaxaca-")) {
    return { publicId: `boda/${base}`, tags: ["VESTUARIO"] };
  }


  return { publicId: `boda/${base}`, tags: ["OTROS"] };
}

async function uploadFile(filePath, { publicId, tags }) {
  const resourceType = extname(filePath).toLowerCase() === ".mp4" ? "video" : "image";
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    resource_type: resourceType,
    tags,
    overwrite: true,
    use_filename: false,
    unique_filename: false,
  });
  return result;
}

async function main() {

  const files = readdirSync(ASSETS_DIR).filter((f) =>
    /\.(webp|mp4)$/i.test(f)
  );

  console.log(`Found ${files.length} local files to upload from ${ASSETS_DIR}\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = join(ASSETS_DIR, file);
    const { publicId, tags } = routeFor(file);
    try {
      const res = await uploadFile(filePath, { publicId, tags });
      console.log(`✓ ${file} → ${res.public_id} [${tags.join(", ")}]`);
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

