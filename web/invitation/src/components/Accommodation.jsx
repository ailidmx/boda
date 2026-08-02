import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

export function Accommodation() {
  const { t } = useApp();
  const accommodation = t.accommodation || {};

  return (
    <section className="accommodation-section section">
      <div className="accommodation-copy reveal">
        <p className="eyebrow">{accommodation.eyebrow}</p>
        <h2>{accommodation.title}</h2>
        {accommodation.citation && (
          <p className="accommodation-citation">{accommodation.citation}</p>
        )}
        <p className="lead">{accommodation.body}</p>

        <div className="accommodation-facts">
          {accommodation.facts.map((fact, index) => (
            <article key={index}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </article>
          ))}
        </div>
        <p className="accommodation-note">{accommodation.specialNote}</p>
        <div className="accommodation-contacts">
          <span>{accommodation.contactPrompt}</span>
          {Object.values(EVENT.contacts).map((contact, index) => (
            <a
              key={index}
              className="accommodation-contact-link"
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              {contact.label} ↗
            </a>
          ))}
        </div>

      </div>

      <div className="accommodation-form-wrap">
        <p className="eyebrow">{accommodation.plan.eyebrow}</p>
        <h3>{accommodation.plan.title}</h3>
        <p>{accommodation.plan.body}</p>
        <ol className="accommodation-steps">
          {accommodation.plan.steps.map((step, index) => (
            <li key={index}>
              <span>0{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <a className="button button-dark" href="#rsvp">
          {accommodation.plan.button}
        </a>
      </div>
    </section>
  );
}
