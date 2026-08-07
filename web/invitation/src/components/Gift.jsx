import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

export function Gift() {
  const { t } = useApp();
  const gift = t.gift || {};

  return (
    <section className="gift-section section">
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
                open={currency === "eur"}
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

      {/* Desktop-only bottom nav linking to the next section (Thanks / "MERCI").
          CADEAUX and MERCI share the same dark style, so this transition uses an
          ornamental flourish divider instead of the plain section-nav to keep the
          hand-finished, art-worked feel. Hidden on mobile. */}
      <nav className="section-nav section-nav--light gift-section-nav" aria-label="Continue">
        <span className="gift-section-nav-ornament" aria-hidden="true">✦</span>
        <a className="section-nav-link" href="#thanks">
          <span>{gift.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
