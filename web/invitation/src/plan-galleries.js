/**
 * Plan galleries — the photo set shown behind each timeline card and opened
 * in the shared `LightboxCarousel` when the card is clicked.
 *
 * Reuses the existing sets:
 *   - "barra"    → Barra de Navidad photos (root Cloudinary ids).
 *   - "rocaAzul" → Roca Azul venue gallery (`boda/roca-azul-*`).
 *
 * The couple will provide the missing sets later; add the Cloudinary public
 * ids (relative to the `boda/` prefix, like the Roca Azul set) to the
 * corresponding *_IDS arrays below.
 */

import { cloudinaryImage } from "./cloudinary.js";
import { BARRA_PHOTOS } from "./barraGallery.js";
import { ROCA_AZUL_GALLERY } from "./rocaAzulGallery.js";

/** Build { src, full } slides from `boda/`-prefixed public ids. */
function bodaSet(ids) {
  return (ids || []).map((id) => ({
    src: cloudinaryImage(`boda/${id}`, { width: 1280 }),
    full: cloudinaryImage(`boda/${id}`),
  }));
}

/** Build { src, full } slides from root public ids (no prefix), like Barra. */
function rootSet(ids) {
  return (ids || []).map((id) => ({
    src: cloudinaryImage(id, { width: 1280 }),
    full: cloudinaryImage(id),
  }));
}

const ROCA_AZUL_PHOTOS = bodaSet(ROCA_AZUL_GALLERY);

// Vallarta photos (root public ids, provided by the couple).
const VALLARTA_IDS = [
  "VALLARTA_dxkruu",
  "VALLARTA-4_cjh3qz",
  "VALLARTA-1_gvyira",
  "VALLARTA-2_k1fojn",
  "VALLARTA-3_rkseea",
  "VALLARTA-7_a1r7zk",
  "VALLARTA-6_mam6wl",
  "VALLARTA-8_ar9sao",
  "VALLARTA-5_k4bwcm",
];

// Tapalpa photos (root public ids, provided by the couple).
const TAPALPA_IDS = [
  "tapalpa_qumlzy",
  "tapalpa-1_ahgevn",
  "tapalpa-2_i2zjcf",
  "tapalpa-3_tqe7tl",
  "tapalpa-4_be7ixa",
  "tapalpa-5_nxegd0",
  "tapalpa-6_xlt7fe",
  "tapalpa-7_ebqirs",
  "tapalpa-8_ns0jv1",
  "tapalpa-9_um3lol",
  "tapalpa-10_g6w18l",
  "tapalpa-11_zo0wbv",
];

// TODO: add Cloudinary ids when provided (root, like the other couple-provided sets).
const SAN_PANCHO_IDS = []; // San Pancho (SURF)
const CHACALA_IDS = []; // Chacala (CALME)

// TODO: add Cloudinary ids when provided (prefix depends on upload location).
const GUADALAJARA_IDS = []; // Guadalajara

export const PLAN_GALLERIES = {
  vallarta: rootSet(VALLARTA_IDS),
  sanPancho: rootSet(SAN_PANCHO_IDS),
  chacala: rootSet(CHACALA_IDS),
  guadalajara: bodaSet(GUADALAJARA_IDS),
  rocaAzul: ROCA_AZUL_PHOTOS,
  tapalpa: rootSet(TAPALPA_IDS),
  barra: BARRA_PHOTOS,
};

/** Resolve the slides for a gallery key (empty array when unknown/empty). */
export function getPlanGallery(key) {
  return PLAN_GALLERIES[key] || [];
}
