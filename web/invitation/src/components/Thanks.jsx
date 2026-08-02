import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

// Wedding planner contact used in the humorous "credits" mentions.
const PLANNER = {
  label: "Manuel",
  whatsapp: "https://wa.me/523311549397",
};


function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Thanks() {
  const { t } = useApp();
  const thanks = t.thanks || {};
  const credits = thanks.credits || [];
  const humor = thanks.humor || [];

  return (
    <section className="thanks-section section" id="thanks">
      <div className="thanks-frame">
        <p className="eyebrow">{thanks.eyebrow}</p>

        <blockquote className="thanks-quote">
          <h2>{thanks.title}</h2>
          <p className="thanks-subtitle">{thanks.subtitle}</p>
        </blockquote>

        <ul className="thanks-credits">
          {credits.map((credit, index) => (
            <li className="thanks-credit" key={index}>
              <span className="thanks-avatar" aria-hidden="true">
                {initialsOf(credit.name)}
              </span>
              <span className="thanks-credit-text">
                <strong className="thanks-name">{credit.name}</strong>
                <span className="thanks-role">{credit.role}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="thanks-humor">
          {humor.map((line, index) => (
            <blockquote className="thanks-humor-line" key={index}>
              <p>{line}</p>
            </blockquote>
          ))}
        </div>

        <div className="thanks-contacts">
          <span>{thanks.cta}</span>
          {Object.values(EVENT.contacts).map((contact, index) => (
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              key={index}
            >
              {contact.label} · {contact.phone} ↗
            </a>
          ))}
          <a href={PLANNER.whatsapp} target="_blank" rel="noreferrer">
            {thanks.ctaPlanner} · {PLANNER.label} ↗
          </a>
        </div>
      </div>
    </section>
  );
}
