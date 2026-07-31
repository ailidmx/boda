/**
 * Cloudinary media helpers for the invitation.
 *
 * All approved photos/videos are hosted on Cloudinary (cloud name k2ajcgxv)
 * under the `boda/` folder. This module builds resized, optimized delivery
 * URLs at render time so the browser only downloads what it needs.
 *
 * The cloud name is public (it is embedded in every delivery URL), so it is
 * safe to hard-code here. No API secret is ever exposed to the client.
 */

export const CLOUD_NAME = "k2ajcgxv";
export const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

/**
 * Build a Cloudinary image delivery URL for a public id.
 *
 * @param {string} publicId  e.g. "boda/couple-003"
 * @param {object} opts      { width, height, crop, quality, format }
 * @returns {string}
 *
 * Note: focal positioning is handled in CSS via `object-position` (see
 * MEDIA.hero in media.js), not as a Cloudinary gravity transform.
 */
export function cloudinaryImage(publicId, opts = {}) {
  const {
    width,
    height,
    crop = "scale",
    quality = "auto",
    format = "auto",
  } = opts;

  const parts = [];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (crop) parts.push(`c_${crop}`);
  if (quality) parts.push(`q_${quality}`);
  if (format) parts.push(`f_${format}`);

  const transform = parts.length ? `${parts.join(",")}/` : "";
  return `${CLOUDINARY_BASE}/image/upload/${transform}v1/${publicId}`;
}


/**
 * Build a Cloudinary video delivery URL for a public id.
 *
 * @param {string} publicId  e.g. "boda/cabin-wooden-tour"
 * @param {object} opts      { width, quality }
 * @returns {string}
 */
export function cloudinaryVideo(publicId, opts = {}) {
  const { width, quality = "auto" } = opts;
  const parts = [];
  if (width) parts.push(`w_${width}`);
  if (quality) parts.push(`q_${quality}`);
  const transform = parts.length ? `${parts.join(",")}/` : "";
  return `${CLOUDINARY_BASE}/video/upload/${transform}v1/${publicId}`;
}
