import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { DressCodePictograms } from "./DressCodePictograms.jsx";


/* Palette icon for the dress-code FAB. Kept inline so it inherits currentColor
   and stays crisp at any size. */
function PaletteIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        d="M32 8a24 24 0 1 0 0 48c3 0 5-2 5-5 0-1-.4-2-1-3-1-1-1-2-1-3 0-3 2-5 5-5h4c6 0 12-5 12-12 0-11-11-20-24-20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="24" r="3" fill="currentColor" />
      <circle cx="32" cy="18" r="3" fill="currentColor" />
      <circle cx="44" cy="24" r="3" fill="currentColor" />
      <circle cx="46" cy="36" r="3" fill="currentColor" />
    </svg>
  );
}


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

      {/* Row 1: photos (1/3) + citation (2/3) */}
      <div className="attire-grid">
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
          <h2>{attire.title}</h2>
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
   The dress-code guidance: title, paragraphs and the pictogram modal opened
   by the FAB. Uses the colour patchwork background. */
export function DressCode() {
  const { t } = useApp();
  const attire = t.attire || {};
  const dressCode = attire.dressCode || {};

  // Dress-code pictogram modal state.
  const [pictoOpen, setPictoOpen] = useState(false);
  // Whether the dress-code section is currently in view (drives the FAB).
  const [dressCodeActive, setDressCodeActive] = useState(false);

  const sectionRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Show the FAB only while the dress-code section is in view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    let latestEntry = null;
    const sync = () => setDressCodeActive(Boolean(latestEntry?.isIntersecting));
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      sync();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll + Escape + focus trap while the modal is open.
  useEffect(() => {
    if (!pictoOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPictoOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(panelRef.current?.querySelectorAll("button:not([disabled])") || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      fabRef.current?.focus();
    };
  }, [pictoOpen]);

  return (
    <section className="attire-section attire-section--dresscode section story-bg" ref={sectionRef}>
      {/* Full-bleed colour patchwork background behind the dress-code section. */}
      <div className="attire-bg attire-bg--patchwork" aria-hidden="true" />

      <p className="eyebrow attire-eyebrow">{attire.eyebrow}</p>

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

      {/* Dress-code section FAB: a real floating action button, fixed to the
          viewport edge and contained within the 120rem column on wide screens.
          It is rendered through a portal to <body> so it escapes the section's
          overflow:hidden and always floats over the viewport (a true FAB),
          matching the other section FABs. */}
      {createPortal(
        <button
          ref={fabRef}
          className={`attire-picto-fab${dressCodeActive && !pictoOpen ? " is-visible" : ""}`}
          type="button"
          aria-label={dressCode.title}
          aria-haspopup="dialog"
          onClick={() => setPictoOpen(true)}
        >
          <PaletteIcon />
        </button>,
        document.body
      )}

      {/* Dress-code pictogram modal */}
      {dressCode.title && (
        <div
          className={`attire-picto-shell${pictoOpen ? " is-open" : ""}`}
          role={pictoOpen ? "dialog" : undefined}
          aria-modal={pictoOpen ? "true" : undefined}
          aria-label={pictoOpen ? dressCode.title : undefined}
          onMouseDown={(event) => {
            if (pictoOpen && event.target === event.currentTarget) setPictoOpen(false);
          }}
        >
          <div className="attire-picto-panel" ref={panelRef}>
            <button
              ref={closeRef}
              className="attire-picto__close"
              type="button"
              aria-label="Close"
              onClick={() => setPictoOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow attire-picto__eyebrow">{attire.eyebrow}</p>
            <p className="attire-picto__title">{dressCode.title}</p>
            <DressCodePictograms labels={dressCode.pictograms} />
          </div>
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
