import React, { useState } from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";

export function Gallery() {
  const { t } = useApp();
  const gallery = t.gallery || {};
  const photos = MEDIA.gallery || [];

  // Full-screen lightbox state. `lightbox` holds { startIndex } or null.
  const [lightbox, setLightbox] = useState(null);

  // Build the slide set (same src for thumbnail and full view).
  const slides = photos.map((src, index) => ({
    src,
    full: src,
    alt: gallery.alts[index % gallery.alts.length],
  }));

  return (
    <section className="gallery-section section">
      <div className="gallery-heading section-heading reveal">
        <p className="eyebrow">{gallery.eyebrow}</p>
        <h2>{gallery.title}</h2>
        <p className="lead">{gallery.body}</p>
      </div>

      <div className="photo-gallery">
        {photos.map((src, index) => (
          <button
            className="gallery-item"
            type="button"
            onClick={() => setLightbox({ startIndex: index })}
            aria-label={`${gallery.alts[index % gallery.alts.length]} — ver en grande`}
            key={index}
          >
            <img
              src={src}
              alt={gallery.alts[index % gallery.alts.length]}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={slides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={gallery.title}
      />
    </section>
  );
}
