/**
 * Pétanque photo set for the "Un homenaje a la petanca" section.
 *
 * Real photos of the couple's pétanque club and friends, hosted on Cloudinary
 * (cloud name k2ajcgxv) at the account root. Each entry carries a display-size
 * `src` and a full-resolution `full` URL for the lightbox link.
 */

import { cloudinaryImage } from "./cloudinary.js";

export const PETANQUE_PLACEHOLDERS = [
  {
    src: cloudinaryImage("petanca_grd0nb", { width: 1280 }),
    full: cloudinaryImage("petanca_grd0nb"),
  },
  {
    src: cloudinaryImage("petanca_0_krmwov", { width: 1280 }),
    full: cloudinaryImage("petanca_0_krmwov"),
  },
  {
    src: cloudinaryImage("petanca_2_cezchn", { width: 1280 }),
    full: cloudinaryImage("petanca_2_cezchn"),
  },
  {
    src: cloudinaryImage("petanca4_fteoht", { width: 1280 }),
    full: cloudinaryImage("petanca4_fteoht"),
  },
];
