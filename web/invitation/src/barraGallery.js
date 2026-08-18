/**
 * Barra de Navidad photo set for the "Et après ?" (coast) section.
 *
 * These photos are hosted on Cloudinary (cloud name k2ajcgxv) at the account
 * root (no `boda/` folder prefix), matching the `mapabarra_oipjde` map image.
 * Each entry carries a display-size `src` and a full-resolution `full` URL so
 * the slideset can open a lightbox if needed.
 */

import { cloudinaryImage } from "./cloudinary.js";

const BARRA_IDS = [
  "barra5_edareq",
  "barra4_rt2yn2",
  "barra1_aeo1ra",
  "barra_v3bv76",
  "barra_2_xuqpvu",
  "barra3_kbkxlr",
];

/** Build the display + full URLs for a Barra de Navidad photo. */
function barraPhoto(id) {
  return {
    src: cloudinaryImage(id, { width: 1280 }),
    full: cloudinaryImage(id),
  };
}

/** Barra de Navidad photos in the order they appear in the slideset. */
export const BARRA_PHOTOS = BARRA_IDS.map(barraPhoto);
