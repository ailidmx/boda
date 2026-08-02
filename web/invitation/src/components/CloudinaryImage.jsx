import React from "react";
import { AdvancedImage } from "@cloudinary/react";
import { cloudinaryImageObj } from "../cloudinary.js";

/**
 * Reusable Cloudinary image component.
 *
 * Wraps the official <AdvancedImage> component from @cloudinary/react so any
 * photo in the invitation can be rendered with automatic format/quality
 * optimization and responsive resizing, without hand-writing Cloudinary URLs.
 *
 * Usage:
 *   <CloudinaryImage
 *     publicId="boda/couple-003"
 *     opts={{ width: 900 }}
 *     alt="..."
 *     className="..."
 *     loading="lazy"
 *   />
 *
 * @param {object} props
 * @param {string} props.publicId  Cloudinary public id (e.g. "boda/couple-003")
 * @param {object} [props.opts]    { width, height, crop, quality, format }
 * @param {string} [props.alt]     alt text
 * @param {string} [props.className]
 * @param {string} [props.loading] "lazy" | "eager"
 * @param {string} [props.decoding] "async" | "sync" | "auto"
 * @param {object} [props.rest]    any other props forwarded to <img>
 */
export function CloudinaryImage({
  publicId,
  opts = {},
  alt = "",
  className,
  loading,
  decoding,
  ...rest
}) {
  const cldImg = cloudinaryImageObj(publicId, opts);

  return (
    <AdvancedImage
      cldImg={cldImg}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
}
