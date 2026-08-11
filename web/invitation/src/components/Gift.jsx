import React, { useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

export function Gift() {
  const { t } = useApp();
  const gift = t.gift || {};

  // TEMPORARY A/B test: which background variant to show. Remove this state,
  // the selector UI and the variant classes once a final background is chosen.
  const [bgVariant, setBgVariant] = useState("deep-green");

  return (
    <section className="gift-section section story-bg">
      {/* Full-bleed background behind the whole CADEAUX section. The variant
          class (deep-green / midnight / terracotta) is chosen by the temporary
          A/B selector below. The copy stays in the foreground. */}
      <div className={`gift-bg gift-bg--${bgVariant}`} aria-hidden="true" />

      {/* TEMPORARY A/B test selector — remove once a final background is
          chosen. Lets us switch between the background suggestions. */}
      <div className="gift-bg-switch" role="group" aria-label="Background A/B test">
        <span className="gift-bg-switch__label">Fondo</span>
        <button
          type="button"
          className={`gift-bg-switch__btn${bgVariant === "deep-green" ? " is-active" : ""}`}
          onClick={() => setBgVariant("deep-green")}
        >
          Verde profundo
        </button>
        <button
          type="button"
          className={`gift-bg-switch__btn${bgVariant === "midnight" ? " is-active" : ""}`}
          onClick={() => setBgVariant("midnight")}
        >
          Medianoche
        </button>
        <button
          type="button"
          className={`gift-bg-switch__btn${bgVariant === "terracotta" ? " is-active" : ""}`}
          onClick={() => setBgVariant("terracotta")}
        >
          Terracota
        </button>
      </div>

      <div className="gift-copy reveal">
        <div className="section-heading">
          <p className="eyebrow">{gift.eyebrow}</p>
          <h2>{gift.title}</h2>
          <p className="lead">{gift.body}</p>
        </div>
        <p className="note">{gift.note}</p>
        {gift.accounts && (
          <div className="gift-accounts">
            {Object.entries(gift.accounts).map(([currency, account]) => (
              <details
                className="gift-account"
                open
                key={currency}
              >
                <summary>{account.title}</summary>
                <dl>
                  {account.details.map((detail, index) => (
                    <dd key={index}>{detail}</dd>
                  ))}
                </dl>
                {account.note && <small>{account.note}</small>}
              </details>
            ))}
          </div>
        )}
        <div className="gift-contacts">
          <span>{gift.cta}</span>
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
        </div>
      </div>

      {/* Desktop-only bottom nav linking to the next section (RSVP / "À table").
          CADEAUX and MERCI share the same dark style, so this transition uses an
          ornamental flourish divider instead of the plain section-nav to keep the
          hand-finished, art-worked feel. Hidden on mobile. */}
      <nav className="section-nav section-nav--light gift-section-nav" aria-label="Continue">
        <span className="gift-section-nav-ornament" aria-hidden="true">✦</span>
        <a className="section-nav-link" href="#rsvp">
          <span>{gift.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
