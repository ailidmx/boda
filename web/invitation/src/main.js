import "./styles.css";
import {
  content,
  EVENT,
  SUPPORTED_LANGUAGES,
} from "./content.js";
import { MEDIA } from "./media.js";

const LANGUAGE_STORAGE_KEY = "boda-language";
const app = document.querySelector("#app");
let currentLanguage = "es";

function normalizeLanguage(value) {
  if (!value) return null;
  const language = value.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : null;
}

function getInitialLanguage() {
  const queryLanguage = normalizeLanguage(
    new URLSearchParams(window.location.search).get("lang"),
  );
  if (queryLanguage) return queryLanguage;

  const savedLanguage = normalizeLanguage(
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
  );
  if (savedLanguage) return savedLanguage;

  for (const language of navigator.languages || [navigator.language]) {
    const normalized = normalizeLanguage(language);
    if (normalized) return normalized;
  }

  return "es";
}

function countdownMarkup(labels) {
  const units = [
    ["days", labels.days],
    ["hours", labels.hours],
    ["minutes", labels.minutes],
    ["seconds", labels.seconds],
  ];

  return units
    .map(
      ([unit, label]) => `
        <span class="countdown-unit">
          <strong data-countdown="${unit}">00</strong>
          <small>${label}</small>
        </span>
      `,
    )
    .join("");
}

function scheduleMarkup(items) {
  return items
    .map(
      (item, index) => `
        <article class="schedule-item reveal">
          <span class="schedule-number">0${index + 1}</span>
          <p class="schedule-day">${item.day}</p>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function languageSwitcherMarkup(activeLanguage) {
  return SUPPORTED_LANGUAGES.map(
    (language) => `
      <button
        class="language-button"
        type="button"
        data-language="${language}"
        aria-pressed="${language === activeLanguage}"
      >
        ${language.toUpperCase()}
      </button>
    `,
  ).join("");
}

function render(language) {
  currentLanguage = language;
  const t = content[language];
  document.documentElement.lang = language;
  document.title = `${EVENT.couple} — ${EVENT.dateShort}`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t.metaDescription);
  document.querySelector(".skip-link").textContent = t.skip;
  const heroMedia = MEDIA.hero
    ? `<img class="hero-photo" src="${MEDIA.hero}" alt="${t.hero.imageAlt}" />`
    : `<span class="hero-image-note">${t.hero.imageNote}</span>`;

  app.innerHTML = `
    <div class="site-shell">
      <div class="countdown-bar" aria-live="polite">
        <span class="countdown-prefix">${t.countdown.prefix}</span>
        <div class="countdown-values">
          ${countdownMarkup(t.countdown)}
        </div>
      </div>

      <section class="hero" id="top">
        <header class="site-header">
          <a class="monogram" href="#top" aria-label="${EVENT.couple}">D · A</a>
          <nav class="desktop-nav" aria-label="Primary">
            <a href="#story">${t.nav.story}</a>
            <a href="#weekend">${t.nav.weekend}</a>
            <a href="#venue">${t.nav.venue}</a>
            <a href="#travel">${t.nav.travel}</a>
          </nav>
          <div class="language-switcher" aria-label="Language">
            ${languageSwitcherMarkup(language)}
          </div>
          <a class="header-rsvp" href="#rsvp">${t.nav.rsvp}</a>
        </header>

        <div class="hero-art${MEDIA.hero ? " has-photo" : ""}">
          ${heroMedia}
          <div class="sun-disc"></div>
          <div class="motif motif-left"></div>
          <div class="motif motif-right"></div>
        </div>

        <div class="hero-content">
          <p class="eyebrow">${t.hero.eyebrow}</p>
          <h1><span>David</span><i>&</i><span>Aydé</span></h1>
          <p class="hero-date">${EVENT.dateShort}</p>
          <p class="hero-place">${EVENT.venue}<br />${EVENT.place}</p>
          <p class="hero-invitation">${t.hero.invitation}</p>
        </div>

        <a class="scroll-cue" href="#story">
          <span>${t.hero.scroll}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <main id="main-content">
        <section class="story-section section" id="story">
          <div class="story-mark" aria-hidden="true">D<span>&</span>A</div>
          <div class="story-copy reveal">
            <p class="eyebrow">${t.story.eyebrow}</p>
            <h2>${t.story.title}</h2>
            <p class="lead">${t.story.body}</p>
            <p class="handwritten">${t.story.note}</p>
          </div>
        </section>

        <section class="weekend-section section" id="weekend">
          <div class="section-heading reveal">
            <p class="eyebrow">${t.weekend.eyebrow}</p>
            <h2>${t.weekend.title}</h2>
            <p>${t.weekend.intro}</p>
          </div>
          <div class="schedule-grid">
            ${scheduleMarkup(t.weekend.items)}
          </div>
        </section>

        <section class="venue-section section" id="venue">
          <div class="venue-visual reveal">
            <div class="venue-horizon" aria-hidden="true"></div>
            <div class="venue-visual-copy">
              <span>${t.venue.visualTitle}</span>
              <small>${t.venue.visualBody}</small>
            </div>
          </div>
          <div class="venue-copy reveal">
            <p class="eyebrow">${t.venue.eyebrow}</p>
            <h2>${t.venue.title}</h2>
            <p class="lead">${t.venue.body}</p>
            <p class="venue-location">${t.venue.location}</p>
            <a
              class="text-link"
              href="${EVENT.mapUrl}"
              target="_blank"
              rel="noreferrer"
            >
              ${t.venue.map} ↗
            </a>
          </div>
        </section>

        <section class="travel-section section" id="travel">
          <div class="travel-heading reveal">
            <p class="eyebrow">${t.travel.eyebrow}</p>
            <h2>${t.travel.title}</h2>
            <p class="lead">${t.travel.body}</p>
          </div>
          <div class="travel-layout">
            <ol class="travel-points reveal">
              ${t.travel.points
                .map(
                  (point, index) => `
                    <li>
                      <span>0${index + 1}</span>
                      <p>${point}</p>
                    </li>
                  `,
                )
                .join("")}
            </ol>
            <div class="travel-card reveal">
              <span class="travel-route">EUROPE</span>
              <span class="route-line" aria-hidden="true"></span>
              <span class="travel-route">GDL</span>
              <a class="button button-dark" href="#rsvp">${t.travel.cta}</a>
              <small>${t.travel.ctaNote}</small>
            </div>
          </div>
        </section>

        <section class="attire-section section" id="attire">
          <div class="textile-pattern" aria-hidden="true"></div>
          <div class="attire-copy reveal">
            <p class="eyebrow">${t.attire.eyebrow}</p>
            <h2>${t.attire.title}</h2>
            <p class="lead">${t.attire.body}</p>
            <p class="note">${t.attire.guestNote}</p>
          </div>
        </section>

        <section class="rsvp-section section" id="rsvp">
          <div class="rsvp-frame reveal">
            <p class="eyebrow">${t.rsvp.eyebrow}</p>
            <h2>${t.rsvp.title}</h2>
            <p>${t.rsvp.body}</p>
            <button class="button button-light" type="button" disabled>
              ${t.rsvp.button}
            </button>
            <small>${t.rsvp.dateNote}</small>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <div class="footer-monogram">D · A</div>
        <p>${t.footer.line}</p>
        <small>${t.footer.privacy}</small>
      </footer>
    </div>
  `;

  bindLanguageSwitcher();
  observeReveals();
  updateCountdown(language);
}

function setLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (!normalized) return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", normalized);
  window.history.replaceState({}, "", url);
  render(normalized);
}

function bindLanguageSwitcher() {
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });
}

function getTimeRemaining() {
  const distance = new Date(EVENT.date).getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(distance / 1000));

  return {
    distance,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function updateCountdown(language) {
  const remaining = getTimeRemaining();
  const countdownBar = document.querySelector(".countdown-bar");

  if (remaining.distance <= 0) {
    countdownBar.innerHTML = `<strong>${content[language].countdown.arrived}</strong>`;
    return;
  }

  Object.entries(remaining).forEach(([unit, value]) => {
    if (unit === "distance") return;
    const target = document.querySelector(`[data-countdown="${unit}"]`);
    if (target) target.textContent = String(value).padStart(2, "0");
  });
}

function observeReveals() {
  const elements = document.querySelectorAll(".reveal");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  elements.forEach((element) => observer.observe(element));
}

const initialLanguage = getInitialLanguage();
render(initialLanguage);
window.setInterval(() => updateCountdown(currentLanguage), 1000);
