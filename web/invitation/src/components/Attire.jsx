import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Attire() {
  const { t } = useApp();
  const attire = t.attire || {};
  const weekend = t.weekend || {};

  return (
    <section className="attire-section section">
      <p className="eyebrow attire-eyebrow">{attire.eyebrow}</p>
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
          {attire.dressCode && (
            <div className="attire-dress-code">
              <p className="attire-dress-code__title">
                {attire.dressCode.title}
              </p>
              {(attire.dressCode.paragraphs || [attire.dressCode.body]).map(
                (paragraph, i) => (
                  <p className="attire-dress-code__body" key={i}>
                    {paragraph}
                  </p>
                )
              )}
            </div>
          )}
          <p className="note">{attire.guestNote}</p>
        </div>
      </div>
      <nav className="attire-nav" aria-label="Attire navigation">
        <a className="attire-nav-link" href="#weekend-program">
          <span>{weekend.navProgram}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );

}
