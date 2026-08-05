/**
 * Cloudinary unsigned upload helper for guest avatar photos.
 *
 * Guests upload a close-up photo that is stored in a dedicated Cloudinary
 * folder (`boda/avatars`) and used as their avatar in the fun-fact carousel.
 *
 * This uses an UNSIGNED upload preset so no API secret is exposed to the
 * browser. The preset must be created in the Cloudinary dashboard:
 *   Settings → Upload → Add upload preset
 *     - Signing mode: Unsigned
 *     - Folder: boda/avatars
 *     - Allowed formats: jpg, jpeg, png, webp
 *     - (optional) Transformation: c_fill,g_face,w_400,h_400
 * Then set the preset name below (and/or via VITE_CLOUDINARY_UPLOAD_PRESET).
 */

import { CLOUD_NAME } from "./cloudinary.js";

/** Unsigned upload preset name. Create it in the Cloudinary dashboard. */
export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || "boda_avatars_unsigned";

/** Folder where guest avatars are stored. */
export const AVATAR_FOLDER = "boda/avatars";

/**
 * Upload an image File to Cloudinary (unsigned) and return the Cloudinary
 * public id (e.g. "boda/avatars/abc123"). We store only the public id, never
 * the delivery URL, so the URL can be rebuilt/optimised at render time.
 *
 * @param {File} file  the image file to upload
 * @returns {Promise<string>} Cloudinary public id of the uploaded image
 */
export async function uploadAvatar(file) {
  if (!file) throw new Error("No file provided");
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", AVATAR_FOLDER);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed (${response.status}) ${text}`);
  }

  const data = await response.json();
  if (!data?.public_id) {
    throw new Error("Upload failed: no public id returned");
  }
  return data.public_id;
}


/**
 * Validate that a chosen file looks like a reasonable close-up photo.
 * @param {File} file
 * @returns {string|null} error message or null if ok
 */
export function validateAvatarFile(file) {
  if (!file) return "No file selected";
  if (!file.type.startsWith("image/")) return "Please choose an image file";
  if (file.size > 8 * 1024 * 1024) return "Image is too large (max 8 MB)";
  return null;
}
