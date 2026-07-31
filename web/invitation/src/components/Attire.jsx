import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Attire() {
  const { t } = useApp();
  const attire = t.attire || {};

  return (
    <section className="attire-section section">
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
        <p className="eyebrow">{attire.eyebrow}</p>
        <h2>{attire.title}</h2>
        <p className="lead">{attire.body}</p>
        {attire.dressCode && (
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <p
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 0.75rem",
              }}
            >
              {attire.dressCode.title}
            </p>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              {attire.dressCode.body}
            </p>
          </div>
        )}
        <p className="note">{attire.guestNote}</p>
      </div>
    </section>
  );
}
