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

export function Attire() {
  const { t } = useApp();
  const attire = t.attire || {};
  const weekend = t.weekend || {};

  // Dress-code pictogram modal state.
  const [pictoOpen, setPictoOpen] = useState(false);
  // TEMPORARY A/B test: which background variant to show. Remove this state,
  // the selector UI and the variant classes once a final background is chosen.
  const [bgVariant, setBgVariant] = useState("patchwork");
  // Whether the attire section is currently in view (drives the FAB).
  const [attireActive, setAttireActive] = useState(false);

  const sectionRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Show the FAB only while the attire section is in view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    let latestEntry = null;
    const sync = () => setAttireActive(Boolean(latestEntry?.isIntersecting));
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
    <section className="attire-section section story-bg" ref={sectionRef}>
      {/* Full-bleed background behind the whole dress-code section. The
          variant class (patchwork / terracotta) is chosen by the temporary
          A/B selector below. The photo montages stay in the foreground. */}
      <div className={`attire-bg attire-bg--${bgVariant}`} aria-hidden="true" />

      {/* TEMPORARY A/B test selector — remove once a final background is
          chosen. Lets us switch between the background suggestions. */}
      <div className="attire-bg-switch" role="group" aria-label="Background A/B test">
        <span className="attire-bg-switch__label">Fondo</span>
        <button
          type="button"
          className={`attire-bg-switch__btn${bgVariant === "patchwork" ? " is-active" : ""}`}
          onClick={() => setBgVariant("patchwork")}
        >
          Patchwork
        </button>
        <button
          type="button"
          className={`attire-bg-switch__btn${bgVariant === "terracotta" ? " is-active" : ""}`}
          onClick={() => setBgVariant("terracotta")}
        >
          Terracota
        </button>
      </div>

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

      {/* Row 2: dress-code text, full width (1/1). The pictograms live in a
          modal opened by the FAB so the text stays clean and readable. */}

      {attire.dressCode && (
        <div className="attire-dress-code reveal">
          <p className="attire-dress-code__title">{attire.dressCode.title}</p>
          {attire.dressCode.paragraphs?.map((paragraph, i) => (
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
          className={`attire-picto-fab${attireActive && !pictoOpen ? " is-visible" : ""}`}
          type="button"
          aria-label={attire.dressCode.title}
          aria-haspopup="dialog"
          onClick={() => setPictoOpen(true)}
        >
          <PaletteIcon />
        </button>,
        document.body
      )}


      {/* Dress-code pictogram modal */}
      {attire.dressCode && (
        <div
          className={`attire-picto-shell${pictoOpen ? " is-open" : ""}`}
          role={pictoOpen ? "dialog" : undefined}
          aria-modal={pictoOpen ? "true" : undefined}
          aria-label={pictoOpen ? attire.dressCode.title : undefined}
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
            <p className="attire-picto__title">{attire.dressCode.title}</p>
            <DressCodePictograms labels={attire.dressCode.pictograms} />

          </div>
        </div>
      )}

      <nav className="attire-nav" aria-label="Attire navigation">
        <a className="attire-nav-link" href="#weather">
          <span>{t.nav.weather}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
