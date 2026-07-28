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
let heroSlideInterval = null;

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

function rsvpFormMarkup(t) {
  const optionsMarkup = (options) =>
    options
      .map(
        (option) =>
          `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");

  return `
    <form class="rsvp-form" aria-describedby="rsvp-preview-note">
      <fieldset>
        <legend>${t.groups.attendance}</legend>
        <div class="rsvp-form-grid">
          <div class="form-field">
            <label for="rsvp-name">${t.fields.name}</label>
            <input id="rsvp-name" name="name" type="text" autocomplete="name" />
          </div>
          <div class="form-field">
            <label for="rsvp-contact">${t.fields.contact}</label>
            <input
              id="rsvp-contact"
              name="contact"
              type="text"
              autocomplete="email"
            />
          </div>
          <div class="form-field">
            <label for="rsvp-attendance">${t.fields.attendance}</label>
            <select id="rsvp-attendance" name="attendance">
              ${optionsMarkup(t.options.attendance)}
            </select>
          </div>
          <div class="form-field">
            <label for="rsvp-party-size">${t.fields.partySize}</label>
            <input
              id="rsvp-party-size"
              name="partySize"
              type="number"
              min="1"
              max="12"
              value="1"
            />
          </div>
          <div class="form-field form-field-wide">
            <label for="rsvp-guests">${t.fields.guests}</label>
            <input id="rsvp-guests" name="guests" type="text" />
          </div>
          <div class="form-field form-field-wide">
            <label for="rsvp-accommodation">${t.fields.accommodation}</label>
            <select id="rsvp-accommodation" name="accommodation">
              ${optionsMarkup(t.options.accommodation)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>${t.groups.travel}</legend>
        <p class="fieldset-note">${t.travelNote}</p>
        <div class="rsvp-form-grid">
          <div class="form-field form-field-wide">
            <label for="travel-status">${t.fields.travelStatus}</label>
            <select id="travel-status" name="travelStatus">
              ${optionsMarkup(t.options.travelStatus)}
            </select>
          </div>
          <div class="form-field">
            <label for="arrival-from">${t.fields.arrivalFrom}</label>
            <input id="arrival-from" name="arrivalFrom" type="text" />
          </div>
          <div class="form-field">
            <label for="arrival-to">${t.fields.arrivalTo}</label>
            <input
              id="arrival-to"
              name="arrivalTo"
              type="text"
              placeholder="GDL"
            />
          </div>
          <div class="form-field">
            <label for="arrival-date">${t.fields.arrivalDate}</label>
            <input id="arrival-date" name="arrivalDate" type="date" />
          </div>
          <div class="form-field">
            <label for="arrival-time">${t.fields.arrivalTime}</label>
            <input id="arrival-time" name="arrivalTime" type="time" />
          </div>
          <div class="form-field">
            <label for="arrival-airline">${t.fields.arrivalAirline}</label>
            <input id="arrival-airline" name="arrivalAirline" type="text" />
          </div>
          <div class="form-field">
            <label for="arrival-flight">${t.fields.arrivalFlight}</label>
            <input id="arrival-flight" name="arrivalFlight" type="text" />
          </div>
          <div class="form-field">
            <label for="departure-from">${t.fields.departureFrom}</label>
            <input
              id="departure-from"
              name="departureFrom"
              type="text"
              placeholder="GDL"
            />
          </div>
          <div class="form-field">
            <label for="departure-to">${t.fields.departureTo}</label>
            <input id="departure-to" name="departureTo" type="text" />
          </div>
          <div class="form-field">
            <label for="departure-date">${t.fields.departureDate}</label>
            <input id="departure-date" name="departureDate" type="date" />
          </div>
          <div class="form-field">
            <label for="departure-time">${t.fields.departureTime}</label>
            <input id="departure-time" name="departureTime" type="time" />
          </div>
          <div class="form-field">
            <label for="departure-airline">${t.fields.departureAirline}</label>
            <input id="departure-airline" name="departureAirline" type="text" />
          </div>
          <div class="form-field">
            <label for="departure-flight">${t.fields.departureFlight}</label>
            <input id="departure-flight" name="departureFlight" type="text" />
          </div>
          <div class="form-field form-field-wide">
            <label for="travel-route">${t.fields.route}</label>
            <input
              id="travel-route"
              name="route"
              type="text"
              placeholder="${t.fields.routePlaceholder}"
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>${t.groups.notes}</legend>
        <div class="form-field">
          <label for="rsvp-notes">${t.fields.notes}</label>
          <textarea id="rsvp-notes" name="notes" rows="4"></textarea>
        </div>
      </fieldset>

      <button class="button button-light" type="submit" disabled>
        ${t.button}
      </button>
      <small id="rsvp-preview-note">${t.previewNote}</small>
    </form>
  `;
}

function galleryMarkup(images, alternativeTexts) {
  return images
    .map(
      (image, index) => `
        <figure class="gallery-photo gallery-photo-${index + 1} reveal">
          <img
            src="${image}"
            alt="${alternativeTexts[index] || alternativeTexts[0]}"
            loading="lazy"
            decoding="async"
          />
        </figure>
      `,
    )
    .join("");
}

function heroMarkup(images, labels) {
  if (!images.length) {
    return `<span class="hero-image-note">${labels.imageNote}</span>`;
  }

  const photos = images
    .map(
      (image, index) => `
        <img
          class="hero-photo${index === 0 ? " is-active" : ""}"
          src="${image}"
          alt=""
          aria-hidden="true"
          ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
          decoding="async"
        />
      `,
    )
    .join("");

  const dots = images
    .map(
      (_, index) => `
        <button
          class="hero-slide-dot"
          type="button"
          data-hero-slide="${index}"
          aria-label="${labels.selectImage} ${index + 1}"
          aria-current="${index === 0}"
        ></button>
      `,
    )
    .join("");

  return `
    <div class="hero-slides" role="img" aria-label="${labels.imageAlt}">
      ${photos}
    </div>
    ${
      images.length > 1
        ? `
          <div class="hero-slideshow-controls">
            <div class="hero-slide-dots">${dots}</div>
            <button class="hero-pause-button" type="button" data-hero-pause>
              ${labels.pause}
            </button>
          </div>
        `
        : ""
    }
  `;
}

function monogramMarkup() {
  return `
    <span class="monogram-initial" aria-hidden="true">
      <span>D.</span>
      <span>A.</span>
    </span>
    <span class="monogram-ampersand" aria-hidden="true">&</span>
    <span class="monogram-initial" aria-hidden="true">
      <span>A.</span>
      <span>D.</span>
    </span>
  `;
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
  const heroImages = Array.isArray(MEDIA.hero)
    ? MEDIA.hero
    : MEDIA.hero
      ? [MEDIA.hero]
      : [];
  const heroMedia = heroMarkup(heroImages, t.hero);

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
          <a class="monogram" href="#top" aria-label="${EVENT.couple}">
            ${monogramMarkup()}
          </a>
          <nav class="desktop-nav" aria-label="Primary">
            <a href="#story">${t.nav.story}</a>
            <a href="#weekend">${t.nav.weekend}</a>
            <a href="#venue">${t.nav.venue}</a>
            <a href="#accommodation">${t.nav.accommodation}</a>
            <a href="#travel">${t.nav.travel}</a>
          </nav>
          <div class="language-switcher" aria-label="Language">
            ${languageSwitcherMarkup(language)}
          </div>
          <a class="header-rsvp" href="#rsvp">${t.nav.rsvp}</a>
        </header>

        <div class="hero-art${heroImages.length ? " has-photo" : ""}">
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

        <section class="gallery-section section" aria-labelledby="gallery-title">
          <div class="gallery-heading reveal">
            <p class="eyebrow">${t.gallery.eyebrow}</p>
            <h2 id="gallery-title">${t.gallery.title}</h2>
            <p>${t.gallery.body}</p>
          </div>
          <div class="photo-gallery">
            ${galleryMarkup(MEDIA.gallery, t.gallery.alts)}
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

        <section class="accommodation-section section" id="accommodation">
          <div class="accommodation-copy reveal">
            <p class="eyebrow">${t.accommodation.eyebrow}</p>
            <h2>${t.accommodation.title}</h2>
            <p class="lead">${t.accommodation.body}</p>
            <div class="accommodation-facts">
              ${t.accommodation.facts
                .map(
                  (fact) => `
                    <article>
                      <strong>${fact.value}</strong>
                      <span>${fact.label}</span>
                    </article>
                  `,
                )
                .join("")}
            </div>
            <p class="accommodation-note">${t.accommodation.specialNote}</p>
            <div class="accommodation-contacts">
              <span>${t.accommodation.contactPrompt}</span>
              ${Object.values(EVENT.contacts)
                .map(
                  (contact) => `
                    <a
                      href="${contact.whatsapp}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${contact.label} · ${contact.phone} ↗
                    </a>
                  `,
                )
                .join("")}
            </div>
          </div>
          <div class="accommodation-form-wrap">
            <p class="eyebrow">${t.accommodation.plan.eyebrow}</p>
            <h3>${t.accommodation.plan.title}</h3>
            <p>${t.accommodation.plan.body}</p>
            <ol class="accommodation-steps">
              ${t.accommodation.plan.steps
                .map(
                  (step, index) => `
                    <li>
                      <span>0${index + 1}</span>
                      <p>${step}</p>
                    </li>
                  `,
                )
                .join("")}
            </ol>
            <a class="button button-dark" href="#rsvp">
              ${t.accommodation.plan.button}
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
            ${rsvpFormMarkup(t.rsvp)}
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <div class="footer-monogram">D. & A.</div>
        <p>${t.footer.line}</p>
        <small>${t.footer.privacy}</small>
      </footer>
    </div>
  `;

  bindLanguageSwitcher();
  bindHeroSlideshow(t.hero);
  observeReveals();
  updateCountdown(language);

  const hashTarget = document.getElementById(window.location.hash.slice(1));
  if (hashTarget) {
    hashTarget
      .querySelectorAll(".reveal")
      .forEach((element) => element.classList.add("is-visible"));
    window.requestAnimationFrame(() =>
      hashTarget.scrollIntoView({ block: "start" }),
    );
    window.setTimeout(
      () => hashTarget.scrollIntoView({ block: "start" }),
      500,
    );
  }
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

function bindHeroSlideshow(labels) {
  window.clearInterval(heroSlideInterval);
  heroSlideInterval = null;

  const photos = [...document.querySelectorAll(".hero-photo")];
  const dots = [...document.querySelectorAll("[data-hero-slide]")];
  const pauseButton = document.querySelector("[data-hero-pause]");
  if (photos.length < 2 || !pauseButton) return;

  let activeIndex = 0;
  let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const showSlide = (index) => {
    activeIndex = (index + photos.length) % photos.length;
    photos.forEach((photo, photoIndex) => {
      photo.classList.toggle("is-active", photoIndex === activeIndex);
    });
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", String(dotIndex === activeIndex));
    });
  };

  const stopRotation = () => {
    window.clearInterval(heroSlideInterval);
    heroSlideInterval = null;
  };

  const startRotation = () => {
    stopRotation();
    if (paused) return;
    heroSlideInterval = window.setInterval(
      () => showSlide(activeIndex + 1),
      6500,
    );
  };

  const updatePauseButton = () => {
    pauseButton.textContent = paused ? labels.play : labels.pause;
    pauseButton.setAttribute("aria-pressed", String(paused));
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      startRotation();
    });
  });

  pauseButton.addEventListener("click", () => {
    paused = !paused;
    updatePauseButton();
    startRotation();
  });

  updatePauseButton();
  startRotation();
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
