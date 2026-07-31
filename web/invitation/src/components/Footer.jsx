import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, InitialsSwap } from "./ui.jsx";

export function Footer() {
  const { t } = useApp();
  const footer = t.footer || {};

  return (
    <footer className="site-footer">
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
