import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";



/* ── Section 1 · ESTHÉTIQUE MEXICAINE (TEMATICA) ─────────────────────────
   The Mexican aesthetic intro: eyebrow, title, body, the Oaxaca + Wixárika
   photo montages and the guest note. Uses the terracotta background. */
export function Attire() {
  const { t } = useApp();
  const attire = t.attire || {};

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
            <img
              className="oaxaca-tile"
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ "--tile-index": i }}
              key={i}
            />
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
          <img
            className="oaxaca-tile"
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ "--tile-index": i }}
            key={i}
          />
        ))}
      </div>

      {/* Bottom nav → the dress code section */}
      <nav className="attire-nav" aria-label="Attire navigation">
        <a className="attire-nav-link" href="#dress-code">
          <span>{t.nav.dressCode}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
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

