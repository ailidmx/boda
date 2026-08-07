import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { PETANQUE_PLACEHOLDERS } from "../petanqueGallery.js";

/**
 * Pétanque — a tribute to the traditional French ball game that has brought
 * the couple together with a wonderful community of friends and clubmates in
 * Mexico and around the world. Sits between the detailed programme and the
 * accommodation section.
 */
export function Petanque() {
  const { t } = useApp();
  const petanque = t.petanqueTribute || {};
  const nav = t.nav || {};

  // Full-screen lightbox state for the pétanque photo set.
  const [lightbox, setLightbox] = useState(null);

  const slides = PETANQUE_PLACEHOLDERS.map((photo, index) => ({
    src: photo.src,
    full: photo.full,
    alt: petanque.photoAlts?.[index],
  }));

  return (
    <section className="petanque-section section" id="petanque">
      <div className="petanque-copy reveal">
        <div className="section-heading">
          <p className="eyebrow">{petanque.eyebrow}</p>
          <h2>{petanque.title}</h2>
          <p className="lead petanque-lead">{petanque.intro}</p>
        </div>

        <p className="petanque-body">{petanque.body}</p>
        <p className="petanque-homage handwritten">{petanque.homage}</p>

        <div className="petanque-photos" aria-label={petanque.photosLabel}>
          {PETANQUE_PLACEHOLDERS.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="petanque-photo"
              onClick={() => setLightbox({ startIndex: index })}
              aria-label={`${petanque.photoAlts?.[index] || ""} — ver en grande`}
            >
              <img
                src={photo.src}
                alt={petanque.photoAlts?.[index] || ""}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop-only bottom nav: leads to the accommodation section. */}
      <nav className="petanque-nav" aria-label="Continue">
        <a className="petanque-nav-link" href="#accommodation">
          <span>{petanque.navNext || nav.accommodation}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={slides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={petanque.photosLabel}
      />
    </section>
  );
}
