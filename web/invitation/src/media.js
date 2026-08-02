import { cloudinaryImage, cloudinaryVideo } from "./cloudinary.js";
import { CABIN_PHOTOS, CABIN_VIDEOS } from "./generated-media.js";

/*
 * Public invitation media registry.
 *
 * All approved photos and videos are hosted on Cloudinary (cloud name
 * k2ajcgxv) under the `boda/` folder, tagged by section (HERO, NOVIOS,
 * ROCA_AZUL, COMIDA, CABANAS, VESTUARIO, ...). This module maps each public
 * id to the section that uses it and builds optimized delivery URLs.
 *
 * Cabin photos and videos are generated at build time from Cloudinary tags
 * (scripts/generate-media-manifest.mjs) so adding a photo is as simple as
 * tagging it in Cloudinary and re-running the generator.
 *
 * The local WebP/MP4 derivatives in src/assets/approved/ are no longer
 * bundled; they remain only as the source for the Cloudinary upload script
 * (scripts/upload-to-cloudinary.mjs).
 */

const img = (publicId, opts) => cloudinaryImage(`boda/${publicId}`, opts);


// Hero slideshow. Each entry is { src, position? } where `position` is a CSS
// object-position value applied by main.js (focal point within the frame).
const hero = (publicId, position) =>
  position ? { src: img(publicId, { width: 1600 }), position } : { src: img(publicId, { width: 1600 }) };

export const MEDIA = {
  hero: [
    hero("couple-003"),
    hero("couple-013"),
    hero("couple-014", "center 35%"),
    hero("couple-018"),
    hero("couple-new-DSC05180"),
    hero("couple-new-IMG_20190313_205809", "center 35%"),
    hero("couple-new-IMG_20200627_223059", "center 35%"),
    hero("couple-new-IMG_20211030_184411"),
    hero("couple-new-IMG_20211228_225516"),
    hero("couple-new-IMG_20220819_095220", "center 35%"),
    hero("couple-new-20230129_214006", "center 65%"),
    hero("couple-new-IMG_2690"),
    hero("couple-new-IMG_3511", "center 35%"),
    hero("couple-new-IMG_4241"),
    hero("couple-new-IMG_4921", "center 35%"),
    hero("couple-new-IMG_5368"),
    hero("couple-new-IMG_5540"),
    hero("couple-new-102410", "center 35%"),
    hero("couple-new-42142cfb-0bf5-42a8-b462-d8af5dc0672c", "center 20%"),
  ],


  gallery: [
    // Chronological order (oldest first)
    img("couple-new-DSC05180", { width: 900 }),
    img("couple-new-IMG_20190313_205809", { width: 900 }),
    img("couple-new-IMG_20200627_223059", { width: 900 }),
    img("couple-new-IMG_20210211_225341_1", { width: 900 }),
    img("couple-new-IMG_20211030_184411", { width: 900 }),
    img("couple-new-IMG_20211228_225516", { width: 900 }),
    img("couple-new-IMG_20220819_095220", { width: 900 }),
    img("couple-new-20230129_214006", { width: 900 }),
    img("couple-new-IMG_2690", { width: 900 }),
    img("couple-new-IMG_3511", { width: 900 }),
    img("couple-new-IMG_4241", { width: 900 }),
    img("couple-new-IMG_4921", { width: 900 }),
    img("couple-new-IMG_5368", { width: 900 }),
    img("couple-new-IMG_5540", { width: 900 }),
    img("couple-new-102410", { width: 900 }),
    img("couple-new-113160", { width: 900 }),
    img("couple-new-42142cfb-0bf5-42a8-b462-d8af5dc0672c", { width: 900 }),
  ],
  // Facility cards are square (aspect-ratio 1:1), so the Cloudinary
  // transformation is forced to a square crop (c_fill) to match the container.
  venue: {
    cabins: img("venue-cabins", { width: 1200, height: 1200, crop: "fill" }),
    courts: img("venue-courts", { width: 1200, height: 1200, crop: "fill" }),
    gardens: img("venue-gardens", { width: 1200, height: 1200, crop: "fill" }),
    pool: img("venue-pool", { width: 1200, height: 1200, crop: "fill" }),
  },

  food: {
    carnitas: img("food-carnitas", { width: 900 }),
    guacamole: img("food-guacamole", { width: 900 }),
    nopales: img("food-nopales", { width: 900 }),
    taquiza: img("food-taquiza", { width: 900 }),
    tejuino: img("food-tejuino", { width: 900 }),
  },
  oaxaca: [
    img("oaxaca-01", { width: 800 }),
    img("oaxaca-02", { width: 800 }),
    img("oaxaca-04", { width: 800 }),
    img("oaxaca-05", { width: 800 }),
  ],
  // Party photo used as the background banner of the weekend section.
  weekendBanner: img("party-01", { width: 1600 }),


  // Cabin photos and videos are generated at build time from Cloudinary tags
  // (scripts/generate-media-manifest.mjs → src/generated-media.js).
  cabins: Object.fromEntries(
    Object.entries(CABIN_PHOTOS).map(([key, ids]) => [
      key,
      ids.map((id) => img(id, { width: 1200 })),
    ]),
  ),
  cabinVideos: Object.fromEntries(
    Object.entries(CABIN_VIDEOS).map(([key, id]) => [
      key,
      cloudinaryVideo(`boda/${id}`, { width: 1200 }),
    ]),
  ),
};

