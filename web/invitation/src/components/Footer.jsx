import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, InitialsSwap } from "./ui.jsx";

export function Footer() {
  const { t } = useApp();
  const footer = t.footer || {};
  const identity = t.identity || {};

  return (
    <footer className="site-footer">
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
      </div>
    </footer>
  );
}
