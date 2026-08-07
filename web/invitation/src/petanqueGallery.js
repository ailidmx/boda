/**
 * Pétanque photo set for the "Un homenaje a la petanca" section.
 *
 * These are PLACEHOLDER images for now — the couple will provide real photos
 * of their pétanque club and friends later. Each entry carries a display-size
 * `src` and a full-resolution `full` URL for the lightbox link.
 *
 * To swap in real photos later, replace the `src`/`full` values with
 * Cloudinary delivery URLs (see cloudinary.js), e.g.:
 *   src:  cloudinaryImage("boda/petanque-01", { width: 1280 }),
 *   full: cloudinaryImage("boda/petanque-01"),
 */

/** Build a small inline SVG placeholder with a pétanque motif. */
function placeholder(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${hue}"/>
  <circle cx="400" cy="330" r="120" fill="none" stroke="#f4eee4" stroke-width="10" opacity="0.9"/>
  <circle cx="400" cy="330" r="34" fill="#f4eee4" opacity="0.95"/>
  <circle cx="300" cy="470" r="46" fill="#f4eee4" opacity="0.85"/>
  <circle cx="500" cy="470" r="46" fill="#f4eee4" opacity="0.85"/>
  <circle cx="400" cy="520" r="46" fill="#f4eee4" opacity="0.85"/>
  <text x="400" y="640" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#f4eee4" opacity="0.9">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PETANQUE_PLACEHOLDERS = [
  {
    src: placeholder("Pétanque · 1", "#293b35"),
    full: placeholder("Pétanque · 1", "#293b35"),
  },
  {
    src: placeholder("Pétanque · 2", "#a94d31"),
    full: placeholder("Pétanque · 2", "#a94d31"),
  },
  {
    src: placeholder("Pétanque · 3", "#c68b2b"),
    full: placeholder("Pétanque · 3", "#c68b2b"),
  },
  {
    src: placeholder("Pétanque · 4", "#7a8b7a"),
    full: placeholder("Pétanque · 4", "#7a8b7a"),
  },
];
