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

const ROCA_AZUL_PHOTOS = bodaSet(ROCA_AZUL_GALLERY);

// TODO: add Cloudinary ids (relative to `boda/`) when provided.
const VALLARTA_IDS = []; // Puerto Vallarta / Bahía de Banderas
const TAPALPA_IDS = []; // Tapalpa
const GUADALAJARA_IDS = []; // Guadalajara

export const PLAN_GALLERIES = {
  vallarta: bodaSet(VALLARTA_IDS),
  guadalajara: bodaSet(GUADALAJARA_IDS),
  rocaAzul: ROCA_AZUL_PHOTOS,
  tapalpa: bodaSet(TAPALPA_IDS),
  barra: BARRA_PHOTOS,
};

/** Resolve the slides for a gallery key (empty array when unknown/empty). */
export function getPlanGallery(key) {
  return PLAN_GALLERIES[key] || [];
}
