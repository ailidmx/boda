import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { FlightInfo } from "./FlightInfo.jsx";


// The final chosen background mood for the Travel section is "ciel"
// (Vol de nuit / Ciel étoilé). The temporary background selector was removed;
// the section always uses the NIGHT FLIGHT variant.
const BACKGROUND = "ciel";

export function Travel() {
  const { t } = useApp();
  const travel = t.travel || {};

  // Full-screen lightbox state for the language-specific flight map.
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // The flight map is a single image whose public id differs per language
  // (es: vuelos_c6qdcq, fr: vol_chr0ri, en: flights_ne6k2g).
  const vuelosSlide = travel.vuelosImage
    ? {
        src: cloudinaryImage(travel.vuelosImage, { width: 1280 }),
        full: cloudinaryImage(travel.vuelosImage),
        alt: travel.vuelosLabel,
      }
    : null;

  return (
    <section
      className={`travel-section section story-bg travel-bg--${BACKGROUND}`}
    >
      <div className="travel-heading reveal">
        <p className="eyebrow">{travel.eyebrow}</p>
        <h2>{travel.title}</h2>
        <blockquote className="travel-lead-citation">{travel.body}</blockquote>
      </div>

      <div className="travel-layout">
        <ol className="travel-points reveal">
          {travel.points.map((point, index) => (
            <li key={index}>
              <span>0{index + 1}</span>
              <p>{point}</p>
            </li>
          ))}
        </ol>
        {vuelosSlide && (
          <button
            type="button"
            className="travel-vuelos reveal"
            aria-label={travel.vuelosLabel}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={vuelosSlide.src}
              alt={travel.vuelosLabel}
              loading="lazy"
              decoding="async"
            />
          </button>
        )}
      </div>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={vuelosSlide ? [vuelosSlide] : []}
        startIndex={0}
        label={travel.vuelosLabel}
      />

      {/* Guest flight details form (only meaningful for guests who fly in). */}
      <FlightInfo />

      {/* Desktop-only bottom nav: leads to the accommodation section. */}

      <nav className="section-nav travel-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#accommodation">
          <span>{t.nav.accommodation}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}

