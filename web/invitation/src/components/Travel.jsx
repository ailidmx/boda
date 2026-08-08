import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";

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
    <section className="travel-section section story-bg">
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
    </section>
  );
}
