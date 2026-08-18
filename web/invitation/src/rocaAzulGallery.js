/**
 * Roca Azul venue gallery and Lake Chapala highlights.
 *
 * All images are re-hosted on Cloudinary (cloud name k2ajcgxv) under the
 * `boda/` folder so the invitation has a single, reliable media origin:
 *   - boda/roca-azul-01 … boda/roca-azul-25  (venue gallery, tag ROCA_AZUL)
 *   - boda/chapala-01 … boda/chapala-04      (Chapala / Jocotepec, tag LAGO_DE_CHAPALA)
 *
 * The original sources were the Wix static CDN (clubrocaazul.com/galeria) and
 * Wikimedia Commons; they are preserved in scripts/upload-to-cloudinary.mjs.
 */

import { cloudinaryImage } from "./cloudinary.js";

/** Build a Cloudinary delivery URL for a venue gallery image. */
export function wixUrl(id, width = 1200) {
  return cloudinaryImage(`boda/${id}`, { width });
}

/** Full-resolution URL (no CDN transform). */
export function wixOriginal(id) {
  return cloudinaryImage(`boda/${id}`);
}

/**
 * Venue gallery images (25) in the order they appear on the Roca Azul
 * gallery page. The first four are the "iconic Chapala / venue" highlights
 * used in the invitation photo set.
 */
export const ROCA_AZUL_GALLERY = [
  "roca-azul-01",
  "roca-azul-02",
  "roca-azul-03",
  "roca-azul-04",
  "roca-azul-05",
  "roca-azul-06",
  "roca-azul-07",
  "roca-azul-08",
  "roca-azul-09",
  "roca-azul-10",
  "roca-azul-11",
  "roca-azul-12",
  "roca-azul-13",
  "roca-azul-14",
  "roca-azul-15",
  "roca-azul-16",
  "roca-azul-17",
  "roca-azul-18",
  "roca-azul-19",
  "roca-azul-20",
  "roca-azul-21",
  "roca-azul-22",
  "roca-azul-23",
  "roca-azul-24",
  "roca-azul-25",
];

/**
 * Free (Wikimedia Commons) photographs of Lake Chapala and Jocotepec used in
 * the "Un week-end pour se retrouver" story section. Each entry carries a
 * display-size `src` and a full-resolution `full` URL for the lightbox link.
 */
export const CHAPALA_HIGHLIGHTS = [
  {
    src: cloudinaryImage("boda/chapala-01", { width: 1280 }),
    full: cloudinaryImage("boda/chapala-01"),
  },
  {
    src: cloudinaryImage("boda/chapala-02", { width: 1280 }),
    full: cloudinaryImage("boda/chapala-02"),
  },
  {
    src: cloudinaryImage("boda/chapala-03", { width: 1280 }),
    full: cloudinaryImage("boda/chapala-03"),
  },
  {
    src: cloudinaryImage("boda/chapala-04", { width: 1280 }),
    full: cloudinaryImage("boda/chapala-04"),
  },
];
