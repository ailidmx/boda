import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { InitialsSwap, LanguageSwitcher } from "./ui.jsx";

const NAV_LINKS = [
  ["story", "#story"],
  ["venue", "#venue"],
  ["weekend", "#weekend"],
  ["accommodation", "#accommodation"],
  ["travel", "#travel"],
  ["attire", "#attire"],
  ["gift", "#gift"],
  ["photos", "#photos"],
];

export function Nav() {
  const { t, profile } = useApp();
  const isNovio = profile?.guest?.isNovio;

  return (
    <header className="site-header">
      <a className="monogram" href="#top">
        <InitialsSwap variant="identity-swap--header" />
      </a>
      <nav className="desktop-nav" aria-label="Primary">
        {NAV_LINKS.map(([key, href]) => (
          <a key={key} href={href}>
            {t.nav[key]}
          </a>
        ))}
        {isNovio && (
          <a className="nav-dashboard-link" href="/dashboard">
            📊 {t.nav.dashboard}
          </a>
        )}
      </nav>
      <div className="language-switcher" aria-label="Language">
        <LanguageSwitcher />
      </div>
      <a className="header-rsvp" href="#rsvp">
        {t.nav.rsvp}
      </a>
    </header>
  );
}
