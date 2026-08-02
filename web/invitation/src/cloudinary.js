/**
 * Cloudinary media helpers for the invitation.
 *
 * All approved photos/videos are hosted on Cloudinary (cloud name k2ajcgxv)
 * under the `boda/` folder. This module uses the official Cloudinary SDK
 * (@cloudinary/url-gen) to build resized, optimized delivery URLs at render
 * time so the browser only downloads what it needs.
 *
 * The cloud name is public (it is embedded in every delivery URL), so it is
 * safe to hard-code here. No API secret is ever exposed to the client.
 */

import { Cloudinary } from "@cloudinary/url-gen";
import { crop, fill, scale } from "@cloudinary/url-gen/actions/resize";

import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto as autoFormat } from "@cloudinary/url-gen/qualifiers/format";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";

export const CLOUD_NAME = "k2ajcgxv";
export const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

/** Shared SDK instance. The cloud name is public, so this is safe to reuse. */
const cld = new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });

/**
 * Map the small, familiar option object used across the invitation to the
 * Cloudinary SDK resize action.
 *
 * @param {object} opts  { width, height, crop }
 * @returns {import("@cloudinary/url-gen").CloudinaryImage["resize"]} a resize action
 */
function resizeAction(opts = {}) {
  const { width, height, crop: cropMode } = opts;

  if (cropMode === "fill") {
    // Square / fixed-ratio crop that fills the box and keeps the subject in
    // frame via auto-gravity (used by the facility cards).
    return fill().width(width).height(height).gravity(autoGravity());
  }
  if (cropMode === "crop") {
    return crop().width(width).height(height).gravity(autoGravity());
  }
  // Default: scale to the requested width, preserving aspect ratio.
  return scale().width(width);
}

/**
 * Build a Cloudinary image object (SDK) for a public id, ready to pass to the
 * <AdvancedImage> component or to call `.toURL()` on.
 *
 * @param {string} publicId  e.g. "boda/couple-003"
 * @param {object} opts      { width, height, crop, quality, format }
 * @returns {import("@cloudinary/url-gen").CloudinaryImage}
 */
export function cloudinaryImageObj(publicId, opts = {}) {
  const { quality: q = "auto", format: f = "auto" } = opts;

  let img = cld.image(publicId);

  if (q === "auto") img = img.quality(autoQuality());
  else if (q) img = img.quality(q);

  if (f === "auto") img = img.format(autoFormat());
  else if (f) img = img.format(f);

  const { width, height, crop: cropMode } = opts;
  if (width || height) {
    img = img.resize(resizeAction({ width, height, crop: cropMode }));
  }

  return img;
}

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
  return cloudinaryImageObj(publicId, opts).toURL();
}

/**
 * Build a Cloudinary video object (SDK) for a public id.
 *
 * @param {string} publicId  e.g. "boda/cabin-wooden-tour"
 * @param {object} opts      { width, quality }
 * @returns {import("@cloudinary/url-gen").CloudinaryVideo}
 */
export function cloudinaryVideoObj(publicId, opts = {}) {
  const { width, quality: q = "auto" } = opts;

  let video = cld.video(publicId);
  if (q === "auto") video = video.quality(autoQuality());
  else if (q) video = video.quality(q);
  if (width) video = video.resize(scale().width(width));
  return video;
}

/**
 * Build a Cloudinary video delivery URL for a public id.
 *
 * @param {string} publicId  e.g. "boda/cabin-wooden-tour"
 * @param {object} opts      { width, quality }
 * @returns {string}
 */
export function cloudinaryVideo(publicId, opts = {}) {
  return cloudinaryVideoObj(publicId, opts).toURL();
}
