import React from "react";
import { SUPPORTED_LANGUAGES } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

export const LANGUAGE_FLAGS = {
  es: "🇲🇽 ES",
  fr: "🇫🇷 FR",
  en: "🇬🇧 EN",
};

// Flag-only labels (no language code) used in compact contexts such as the
// user menu language indicator.
export const LANGUAGE_FLAGS_ONLY = {
  es: "🇲🇽",
  fr: "🇫🇷",
  en: "🇬🇧",
};



// Renders a single initial as two spans: the letter and a golden dot, so the
// dot can be styled independently (e.g. a marigold accent).
function Initial({ letter }) {
  return (
    <span className="identity-initial">
      <span className="identity-initial-letter">{letter}</span>
      <span className="identity-initial-dot" aria-hidden="true">.</span>
    </span>
  );
}

export function InitialsSwap({ variant = "", delay = "0s", className = "" }) {
  return (
    <span
      className={`identity-swap identity-swap--initials ${variant} ${className}`.trim()}
      style={{ "--identity-delay": delay }}
      aria-label="D. & A. — A. & D."
    >
      <span className="identity-swap-state identity-swap-state--primary" aria-hidden="true">
        <Initial letter="D" />
        <i>&</i>
        <Initial letter="A" />
      </span>
      <span className="identity-swap-state identity-swap-state--secondary" aria-hidden="true">
        <Initial letter="A" />
        <i>&</i>
        <Initial letter="D" />
      </span>
    </span>
  );
}


export function CoupleNames({ variant = "", delay = "0s", className = "" }) {
  const ayde = <>Ayd<span className="identity-accent">é</span></>;
  return (
    <span
      className={`identity-swap identity-swap--names ${variant} ${className}`.trim()}
      style={{ "--identity-delay": delay }}
      aria-label="David & Aydé — Aydé y David"
    >
      <span className="identity-swap-state identity-swap-state--primary" aria-hidden="true">
        <span className="identity-person">David</span>
        <i className="identity-connector">&</i>
        <span className="identity-person">{ayde}</span>
      </span>
      <span className="identity-swap-state identity-swap-state--secondary" aria-hidden="true">
        <span className="identity-person">{ayde}</span>
        <i className="identity-connector">y</i>
        <span className="identity-person">David</span>
      </span>
    </span>
  );
}

const HERO_DAYS = [
  { day: "19", label: "Viernes" },
  { day: "20", label: "Sábado" },
  { day: "21", label: "Domingo" },
];

const HERO_STATES = ["primary", "secondary", "tertiary"];

export function HeroDate() {
  return (
    <span className="hero-date-swap" aria-label="20 · 02 · 27">
      <span className="hero-date-daynames" aria-hidden="true">
        {HERO_DAYS.map((d, i) => (
          <span
            key={d.label}
            className={`hero-date-dayname hero-date-dayname--${HERO_STATES[i]}`}
          >
            {d.label}
          </span>
        ))}
      </span>
      <span className="hero-date-line">
        <span className="hero-date-day-swap" aria-hidden="true">
          {HERO_DAYS.map((d, i) => (
            <span
              key={d.day}
              className={`hero-date-day hero-date-day--${HERO_STATES[i]}`}
            >
              {d.day}
            </span>
          ))}
        </span>
        <span className="hero-date-sep">·</span>
        <span className="hero-date-num">02</span>
        <span className="hero-date-sep">·</span>
        <span className="hero-date-num">27</span>
      </span>
    </span>
  );
}



export function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage } = useApp();
  return (
    <div className={`language-switcher ${className}`.trim()}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          className="language-button"
          type="button"
          aria-pressed={lang === language}
          onClick={() => setLanguage(lang)}
        >
          {LANGUAGE_FLAGS[lang]}
        </button>
      ))}
    </div>
  );
}
