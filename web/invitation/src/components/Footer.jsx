import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, InitialsSwap } from "./ui.jsx";
import { InstallApp } from "./InstallApp.jsx";

const BUILD = typeof __BUILD_NUMBER__ !== "undefined" ? __BUILD_NUMBER__ : null;

function formatBuild(build) {
  if (!build) return null;
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(build);
  if (!m) return build;
  const [, y, mo, d, h, mi] = m;
  return `${y}-${mo}-${d} ${h}:${mi} UTC`;
}

export function Footer() {
  const { t, language } = useApp();
  const footer = t.footer || {};
  const identity = t.identity || {};
  const versionLabel = formatBuild(BUILD);

  return (
    <footer className="site-footer">
      {identity.whatsappUrl && (
        <div className="site-footer-whatsapp">
          <a className="identity-whatsapp-link" href={identity.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <span className="identity-whatsapp-icon" aria-hidden="true">💬</span>
            <span className="identity-whatsapp-text">
              <strong>{identity.whatsappLabel}</strong>
              <small>{identity.whatsappHint}</small>
            </span>
            <span className="identity-whatsapp-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <InstallApp language={language} />
      <div className="footer-inner">
        <InitialsSwap variant="identity-swap--footer" delay="0s" />
        <p className="footer-names">
          <CoupleNames variant="identity-swap--footer" delay="0.2s" />
        </p>
        <p className="footer-meta">
          <span className="footer-meta__item">{footer.line}</span>
          <span className="footer-meta__sep" aria-hidden="true">·</span>
          <span className="footer-meta__item">{EVENT.dateShort} · {EVENT.venue}</span>
          <span className="footer-meta__sep" aria-hidden="true">·</span>
          <span className="footer-meta__item">{footer.privacy}</span>
        </p>
        {versionLabel && <p className="footer-version" title="Build number">v{versionLabel}</p>}
      </div>
    </footer>
  );
}
