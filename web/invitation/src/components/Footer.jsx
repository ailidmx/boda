import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, InitialsSwap } from "./ui.jsx";

// Wedding planner contact shown in the footer contact bar.
const PLANNER = {
  label: "Manuel",
  whatsapp: "https://wa.me/523311549397",
};

export function Footer() {
  const { t } = useApp();
  const footer = t.footer || {};
  const identity = t.identity || {};
  const thanks = t.thanks || {};

  return (
    <footer className="site-footer story-bg">
      {/* Full-width contact bar, styled like the top header bar. */}
      <div className="site-footer-contacts">
        <span className="site-footer-contacts-label">{thanks.cta}</span>
        {Object.values(EVENT.contacts).map((contact, index) => (
          <a
            className="site-footer-contacts-link"
            href={contact.whatsapp}
            target="_blank"
            rel="noreferrer"
            key={index}
          >
            {contact.label} · ↗
          </a>
        ))}
        <a
          className="site-footer-contacts-link"
          href={PLANNER.whatsapp}
          target="_blank"
          rel="noreferrer"
        >
          {thanks.ctaPlanner} · {PLANNER.label} ↗
        </a>
      </div>

      {identity.whatsappUrl && (
        <div className="site-footer-whatsapp">
          <a
            className="identity-whatsapp-link"
            href={identity.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="identity-whatsapp-icon" aria-hidden="true">💬</span>
            <span className="identity-whatsapp-text">
              <strong>{identity.whatsappLabel}</strong>
              <small>{identity.whatsappHint}</small>
            </span>
            <span className="identity-whatsapp-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <div className="footer-inner">
        <InitialsSwap variant="identity-swap--footer" delay="0s" />
        <p className="footer-names">
          <CoupleNames variant="identity-swap--footer" delay="0.2s" />
        </p>
        <p className="footer-line">{footer.line}</p>
        <p className="footer-date">
          {EVENT.dateShort} · {EVENT.venue}
        </p>
        <p className="footer-privacy">{footer.privacy}</p>
        <p className="footer-build" aria-hidden="true">
          v{__BUILD_NUMBER__}
        </p>
      </div>
    </footer>
  );
}
