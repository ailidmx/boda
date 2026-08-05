import React from "react";
import { useApp } from "../context/AppContext.jsx";

export function Travel() {
  const { t } = useApp();
  const travel = t.travel || {};

  return (
    <section className="travel-section section">
      <div className="travel-heading reveal">
        <p className="eyebrow">{travel.eyebrow}</p>
        <h2>{travel.title}</h2>
        <p className="lead">{travel.body}</p>
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
        <div className="travel-card reveal">
          <span className="travel-route">EUROPE</span>
          <span className="route-line" aria-hidden="true" />
          <span className="travel-route">GDL</span>
          <a className="button button-dark" href="#rsvp">
            {travel.cta}
          </a>
          <small>{travel.ctaNote}</small>
        </div>
      </div>
    </section>
  );
}
