import React from "react";
import { SUPPORTED_LANGUAGES } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

const LANGUAGE_FLAGS = {
  es: "🇲🇽 ES",
  fr: "🇫🇷 FR",
  en: "🇬🇧 EN",
};

export function InitialsSwap({ variant = "", delay = "0s", className = "" }) {
  return (
    <span
      className={`identity-swap identity-swap--initials ${variant} ${className}`.trim()}
      style={{ "--identity-delay": delay }}
      aria-label="D. & A. — A. & D."
    >
      <span className="identity-swap-state identity-swap-state--primary" aria-hidden="true">
        <span>D.</span>
        <i>&</i>
        <span>A.</span>
      </span>
      <span className="identity-swap-state identity-swap-state--secondary" aria-hidden="true">
        <span>A.</span>
        <i>&</i>
        <span>D.</span>
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
  { prefix: "V", day: "19", label: "Viernes" },
  { prefix: "S", day: "20", label: "Sábado" },
  { prefix: "D", day: "21", label: "Domingo" },
];

function HeroDateState({ day, variant }) {
  return (
    <span className={`hero-date-state hero-date-state--${variant}`} aria-hidden="true">
      <span className="hero-date-prefix">{day.prefix}</span>
      <span className="hero-date-num">{day.day}</span>
      <span className="hero-date-sep">·</span>
      <span className="hero-date-num">02</span>
      <span className="hero-date-sep">·</span>
      <span className="hero-date-num">2027</span>
    </span>
  );
}

export function HeroDate() {
  return (
    <span className="hero-date-swap" aria-label="V 19 · S 20 · D 21 — 20 · 02 · 2027">
      <HeroDateState day={HERO_DAYS[0]} variant="primary" />
      <HeroDateState day={HERO_DAYS[1]} variant="secondary" />
      <HeroDateState day={HERO_DAYS[2]} variant="tertiary" />
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
