import React, { useState } from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";



/* ── Section 1 · ESTHÉTIQUE MEXICAINE (TEMATICA) ─────────────────────────
   The Mexican aesthetic intro: eyebrow, title, body, the Oaxaca + Wixárika
   photo montages and the guest note. Uses the terracotta background. */
export function Attire() {
  const { t } = useApp();
  const attire = t.attire || {};

  // Full-screen lightbox state. `lightbox` holds { source, startIndex } or
  // null, where `source` is "oaxaca" | "wixarica" so each montage opens its
  // own slide set.
  const [lightbox, setLightbox] = useState(null);

  // Build the slide sets (same src for thumbnail and full view).
  const oaxacaSlides = MEDIA.oaxaca.map((src) => ({ src, full: src }));
  const wixaricaSlides = MEDIA.wixarica.map((src) => ({ src, full: src }));

  const activeSlides =
    lightbox?.source === "wixarica" ? wixaricaSlides : oaxacaSlides;

  return (
    <section className="attire-section attire-section--tematica section story-bg">
      {/* Full-bleed terracotta background behind the whole tematica section. */}
      <div className="attire-bg attire-bg--terracotta" aria-hidden="true" />

      <p className="eyebrow attire-eyebrow">{attire.eyebrow}</p>

      {/* Vertical stack: title, Oaxaca montage, citation. On desktop the
          title + citation share the right column while the Oaxaca montage
          fills the left column; on mobile everything stacks. */}
      <div className="attire-grid">
        <h2 className="attire-title reveal">{attire.title}</h2>
        <div className="oaxaca-grid" aria-label={attire.eyebrow}>
          {MEDIA.oaxaca.map((src, i) => (
            <button
              className="oaxaca-tile"
              type="button"
              onClick={() => setLightbox({ source: "oaxaca", startIndex: i })}
              aria-label={`${attire.eyebrow} · ${i + 1} — ver en grande`}
              style={{ "--tile-index": i }}
              key={i}
            >
              <img
                className="oaxaca-tile__img"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
        <div className="attire-copy reveal">
          <p className="attire-citation">{attire.body}</p>
          <p className="note">{attire.guestNote}</p>
        </div>
      </div>

      {/* Wixárika (Huichol) photo montage — same treatment as the Oaxaca
          montage above, shown as an additional full-width strip. */}
      <div className="wixarica-grid" aria-label="Wixárika">
        {MEDIA.wixarica.map((src, i) => (
          <button
            className="oaxaca-tile"
            type="button"
            onClick={() => setLightbox({ source: "wixarica", startIndex: i })}
            aria-label={`Wixárika · ${i + 1} — ver en grande`}
            style={{ "--tile-index": i }}
            key={i}
          >
            <img
              className="oaxaca-tile__img"
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Bottom nav → the dress code section */}
      <nav className="attire-nav" aria-label="Attire navigation">
        <a className="attire-nav-link" href="#dress-code">
          <span>{t.nav.dressCode}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Shared full-screen lightbox carousel for the Oaxaca + Wixárika
          montages. The lightbox itself is swipeable (touch, arrows, dots). */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={activeSlides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={lightbox?.source === "wixarica" ? "Wixárika" : attire.eyebrow}
      />
    </section>
  );
}


/* ── Section 2 · DRESS CODE ──────────────────────────────────────────────
   The dress-code guidance: title and paragraphs over the confetti
   background. */
export function DressCode() {
  const { t } = useApp();
  const attire = t.attire || {};
  const dressCode = attire.dressCode || {};

  return (
    <section className="attire-section attire-section--dresscode section story-bg">
      {/* Full-bleed confetti background behind the dress-code section. */}
      <div className="attire-bg attire-bg--confetti" aria-hidden="true" />

      <p className="eyebrow attire-eyebrow">{dressCode.eyebrow}</p>

      {dressCode.title && (
        <div className="attire-dress-code reveal">
          <p className="attire-dress-code__title">{dressCode.title}</p>
          {dressCode.paragraphs?.map((paragraph, i) => (
            <p className="attire-dress-code__body" key={i}>
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Bottom nav → the weather section */}
      <nav className="attire-nav" aria-label="Dress code navigation">
        <a className="attire-nav-link" href="#weather">
          <span>{t.nav.weather}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
