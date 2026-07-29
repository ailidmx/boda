import "./styles.css";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  content,
  EVENT,
  SUPPORTED_LANGUAGES,
} from "./content.js";
import { auth, db } from "./firebase.js";
import { MEDIA } from "./media.js";

const LANGUAGE_STORAGE_KEY = "boda-language";
const GUEST_EMAIL = "invitados@boda-500805.firebaseapp.com";
const GUEST_UID = "yfu7MMCmFaPCK7UW4czr5c3x7Aa2";
const app = document.querySelector("#app");
let currentLanguage = "es";
let heroSlideInterval = null;

const interfaceText = {
  es: {
    gateEyebrow: "Invitación privada",
    gateTitle: "David & Aydé",
    gateBody: "Escribe la clave que compartimos contigo para abrir la invitación.",
    gateLabel: "Clave de acceso",
    gateButton: "Entrar",
    gateWorking: "Abriendo…",
    gateError: "La clave no es correcta. Inténtalo de nuevo.",
    submitWorking: "Enviando…",
    submitSuccess: "¡Gracias! Recibimos tu respuesta.",
    submitError: "No pudimos enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.",
  },
  fr: {
    gateEyebrow: "Invitation privée",
    gateTitle: "David & Aydé",
    gateBody: "Saisissez la clé que nous vous avons envoyée pour ouvrir l’invitation.",
    gateLabel: "Clé d’accès",
    gateButton: "Entrer",
    gateWorking: "Ouverture…",
    gateError: "La clé n’est pas correcte. Veuillez réessayer.",
    submitWorking: "Envoi…",
    submitSuccess: "Merci ! Nous avons bien reçu votre réponse.",
    submitError: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
  },
  en: {
    gateEyebrow: "Private invitation",
    gateTitle: "David & Aydé",
    gateBody: "Enter the access key we shared with you to open the invitation.",
    gateLabel: "Access key",
    gateButton: "Enter",
    gateWorking: "Opening…",
    gateError: "That key is not correct. Please try again.",
    submitWorking: "Sending…",
    submitSuccess: "Thank you! We received your response.",
    submitError: "We could not send your response. Check your connection and try again.",
  },
};

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

function routeGroupMarkup(items) {
  return items
    .map(
      (item) => `
        <article class="route-node">
          <strong>${item.place}</strong>
          <span>${item.duration}</span>
          <small>${item.detail}</small>
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
    <form class="rsvp-form" data-form-kind="rsvp" aria-describedby="rsvp-preview-note">
      <fieldset>
        <legend>${t.groups.attendance}</legend>
        <div class="rsvp-form-grid">
          <div class="form-field">
            <label for="rsvp-first-name">${t.fields.firstName}</label>
            <input
              id="rsvp-first-name"
              name="firstName"
              type="text"
              autocomplete="given-name"
              required
            />
          </div>
          <div class="form-field">
            <label for="rsvp-last-name">${t.fields.lastName}</label>
            <input
              id="rsvp-last-name"
              name="lastName"
              type="text"
              autocomplete="family-name"
              required
            />
          </div>
          <div class="form-field">
            <label for="rsvp-email">${t.fields.email}</label>
            <input
              id="rsvp-email"
              name="email"
              type="email"
              autocomplete="email"
              required
            />
          </div>
          <div class="form-field">
            <label for="rsvp-whatsapp">${t.fields.whatsapp}</label>
            <input
              id="rsvp-whatsapp"
              name="whatsapp"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              required
            />
          </div>
          <div class="form-field">
            <label for="rsvp-attendance">${t.fields.attendance}</label>
            <select id="rsvp-attendance" name="attendance">
              ${optionsMarkup(t.options.attendance)}
            </select>
          </div>
          <div class="form-field">
            <label for="rsvp-group-mode">${t.fields.groupMode}</label>
            <select id="rsvp-group-mode" name="groupMode">
              ${optionsMarkup(t.options.groupMode)}
            </select>
          </div>
          <div class="form-field">
            <label for="rsvp-group-name">${t.fields.groupName}</label>
            <input id="rsvp-group-name" name="groupName" type="text" />
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
          <div class="form-field">
            <label for="rsvp-adults">${t.fields.adults}</label>
            <input
              id="rsvp-adults"
              name="adults"
              type="number"
              min="1"
              max="12"
              value="1"
            />
          </div>
          <div class="form-field">
            <label for="rsvp-children">${t.fields.children}</label>
            <input
              id="rsvp-children"
              name="children"
              type="number"
              min="0"
              max="12"
              value="0"
            />
          </div>
          <div class="form-field">
            <label for="rsvp-guests">${t.fields.guests}</label>
            <input id="rsvp-guests" name="guests" type="text" />
          </div>
          <div class="form-field form-field-wide">
            <label for="rsvp-accommodation">${t.fields.accommodation}</label>
            <select id="rsvp-accommodation" name="accommodation">
              ${optionsMarkup(t.options.accommodation)}
            </select>
          </div>
          <div class="form-field" data-independent-stay hidden>
            <label for="rsvp-independent-arrival">
              ${t.fields.independentArrival}
            </label>
            <select
              id="rsvp-independent-arrival"
              name="independentArrival"
              disabled
            >
              ${optionsMarkup(t.options.independentArrival)}
            </select>
          </div>
          <div class="form-field" data-independent-stay hidden>
            <label for="rsvp-sunday-morning">${t.fields.sundayMorning}</label>
            <select
              id="rsvp-sunday-morning"
              name="sundayMorning"
              disabled
            >
              ${optionsMarkup(t.options.sundayMorning)}
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

      <button class="button button-light" type="submit">
        ${t.button}
      </button>
      <small id="rsvp-preview-note" data-form-status>${t.previewNote}</small>
    </form>
  `;
}

function suggestionFormMarkup(t) {
  const optionsMarkup = (options) =>
    options
      .map(
        (option) =>
          `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");

  return `
    <form class="suggestion-form" data-form-kind="suggestions" aria-describedby="suggestion-preview-note">
      <div class="form-field">
        <label for="suggestion-name">${t.fields.name}</label>
        <input
          id="suggestion-name"
          name="name"
          type="text"
          autocomplete="name"
          required
        />
      </div>
      <div class="form-field">
        <label for="dessert-vote">${t.fields.dessert}</label>
        <select id="dessert-vote" name="dessert">
          ${optionsMarkup(t.options.dessert)}
        </select>
      </div>
      <div class="form-field form-field-wide">
        <label for="food-suggestion">${t.fields.food}</label>
        <textarea id="food-suggestion" name="foodSuggestion" rows="3"></textarea>
      </div>
      <div class="form-field">
        <label for="song-title">${t.fields.song}</label>
        <input id="song-title" name="songTitle" type="text" />
      </div>
      <div class="form-field">
        <label for="song-artist">${t.fields.artist}</label>
        <input id="song-artist" name="songArtist" type="text" />
      </div>
      <div class="form-field form-field-wide">
        <label for="sing-interest">${t.fields.sing}</label>
        <select id="sing-interest" name="singInterest">
          ${optionsMarkup(t.options.sing)}
        </select>
      </div>
      <div class="form-field form-field-wide">
        <label for="experience-extra">${t.fields.extra}</label>
        <textarea id="experience-extra" name="extra" rows="3"></textarea>
      </div>
      <button class="button button-dark" type="submit">
        ${t.button}
      </button>
      <small id="suggestion-preview-note" data-form-status>${t.previewNote}</small>
    </form>
  `;
}

function coastFormMarkup(t) {
  const optionsMarkup = (options) =>
    options
      .map(
        (option) =>
          `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");

  return `
    <form class="coast-form" data-form-kind="coast" aria-describedby="coast-preview-note">
      <div class="form-field">
        <label for="coast-name">${t.fields.name}</label>
        <input id="coast-name" name="name" type="text" autocomplete="name" required />
      </div>
      <div class="form-field">
        <label for="coast-interest">${t.fields.interest}</label>
        <select id="coast-interest" name="interest">
          ${optionsMarkup(t.options.interest)}
        </select>
      </div>
      <div class="form-field">
        <label for="coast-party-size">${t.fields.partySize}</label>
        <input
          id="coast-party-size"
          name="partySize"
          type="number"
          min="1"
          max="20"
          value="1"
        />
      </div>
      <div class="form-field">
        <label for="coast-nights">${t.fields.nights}</label>
        <input id="coast-nights" name="nights" type="number" min="0" max="7" />
      </div>
      <div class="form-field">
        <label for="coast-destination">${t.fields.destination}</label>
        <select id="coast-destination" name="destination">
          ${optionsMarkup(t.options.destination)}
        </select>
      </div>
      <div class="form-field">
        <label for="coast-style">${t.fields.style}</label>
        <select id="coast-style" name="style">
          ${optionsMarkup(t.options.style)}
        </select>
      </div>
      <div class="form-field form-field-wide">
        <label for="coast-note">${t.fields.note}</label>
        <textarea id="coast-note" name="note" rows="3"></textarea>
      </div>
      <button class="button button-dark" type="submit">
        ${t.button}
      </button>
      <small id="coast-preview-note" data-form-status>${t.previewNote}</small>
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

function cabinUnitMarkup(cabin, eyebrow) {
  const photos = MEDIA.cabins[cabin.key];
  const video = MEDIA.cabinVideos[cabin.key];

  return `
    <article class="cabin-unit">
      <div class="cabin-profile reveal">
        <div class="cabin-profile-heading">
          <p class="eyebrow">${eyebrow}</p>
          <h2>${cabin.title}</h2>
          <p class="lead">${cabin.intro}</p>
        </div>
        <div class="cabin-profile-details">
          <div class="cabin-profile-facts">
            <strong>${cabin.capacity}</strong>
            <span>${cabin.roomsLabel}</span>
            <span>${cabin.bedsLabel}</span>
          </div>
          <ul>${cabin.rooms.map((room) => `<li>${room}</li>`).join("")}</ul>
          <p>${cabin.amenities}</p>
        </div>
      </div>
      <div class="cabin-gallery" aria-label="${cabin.galleryLabel}">
        ${photos
          .map(
            (photo, index) => `
              <figure class="cabin-gallery-photo reveal">
                <img
                  src="${photo}"
                  alt="${cabin.photoAlts[index]}"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  <span>${cabin.title}</span>
                  <small>${String(index + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}</small>
                </figcaption>
              </figure>
            `,
          )
          .join("")}
        ${
          video
            ? `
              <figure class="cabin-gallery-photo cabin-gallery-video reveal">
                <video
                  controls
                  playsinline
                  preload="metadata"
                  poster="${photos[0]}"
                  aria-label="${cabin.videoLabel}"
                >
                  <source src="${video}" type="video/mp4" />
                </video>
                <figcaption>
                  <span>${cabin.title}</span>
                  <small>${cabin.videoLabel}</small>
                </figcaption>
              </figure>
            `
            : ""
        }
      </div>
      <p class="cabin-profile-note reveal">${cabin.note}</p>
    </article>
  `;
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
          <div class="saturday-program reveal">
            <div class="saturday-program-heading">
              <p class="eyebrow">${t.weekend.saturday.eyebrow}</p>
              <h3>${t.weekend.saturday.title}</h3>
              <p class="arrival-warning">${t.weekend.saturday.warning}</p>
            </div>
            <ol class="saturday-timeline">
              ${t.weekend.saturday.items
                .map(
                  (item) => `
                    <li>
                      <time>${item.time}</time>
                      <div>
                        <h4>${item.title}</h4>
                        <p>${item.body}</p>
                      </div>
                    </li>
                  `,
                )
                .join("")}
            </ol>
          </div>
        </section>

        <section class="weather-section section" id="weather">
          <div class="weather-heading reveal">
            <div>
              <p class="eyebrow">${t.weather.eyebrow}</p>
              <h2>${t.weather.title}</h2>
            </div>
            <p class="lead">${t.weather.body}</p>
            <div class="weather-sun" aria-hidden="true">
              <span></span>
            </div>
          </div>
          <div class="weather-facts">
            ${t.weather.facts
              .map(
                (fact) => `
                  <article class="weather-fact reveal">
                    <strong>${fact.value}</strong>
                    <span>${fact.label}</span>
                    <small>${fact.note}</small>
                  </article>
                `,
              )
              .join("")}
          </div>
          <div class="weather-day reveal">
            <ol class="weather-moments">
              ${t.weather.moments
                .map(
                  (moment) => `
                    <li>
                      <time>${moment.time}</time>
                      <div>
                        <h3>${moment.title}</h3>
                        <p>${moment.body}</p>
                      </div>
                    </li>
                  `,
                )
                .join("")}
            </ol>
            <aside class="weather-advice">
              <h3>${t.weather.adviceTitle}</h3>
              <ul>
                ${t.weather.advice.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </aside>
          </div>
          <p class="weather-disclaimer">${t.weather.disclaimer}</p>
        </section>

        <section class="food-section section" id="food">
          <div class="experience-heading reveal">
            <p class="eyebrow">${t.food.eyebrow}</p>
            <h2>${t.food.title}</h2>
            <p class="lead">${t.food.body}</p>
          </div>
          <div class="flavours-heading reveal">
            <p class="eyebrow">${t.food.flavoursEyebrow}</p>
            <h3>${t.food.flavoursTitle}</h3>
          </div>
          <div class="flavours-grid">
            ${t.food.flavours
              .map(
                (flavour) => `
                  <article class="flavour-card reveal">
                    <img
                      src="${MEDIA.food[flavour.key]}"
                      alt="${flavour.title}"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <h3>${flavour.title}</h3>
                      <p>${flavour.body}</p>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
          <details class="photo-credits reveal">
            <summary>${t.food.photoCredits}</summary>
            <p>
              <a href="https://commons.wikimedia.org/wiki/File:Taco_de_carnitas.jpg" target="_blank" rel="noreferrer">Carnitas — Padaguan, CC BY-SA 3.0</a> ·
              <a href="https://commons.wikimedia.org/wiki/File:Taquiza_en_el_DF.jpg" target="_blank" rel="noreferrer">Taquiza — El Mono Español, CC BY-SA 3.0</a> ·
              <a href="https://commons.wikimedia.org/wiki/File:Tejuino_tapat%C3%ADo_y_sus_complementos.jpg" target="_blank" rel="noreferrer">Tejuino — Salvador alc, CC BY-SA 4.0</a> ·
              <a href="https://commons.wikimedia.org/wiki/File:Nopalitos_(cactus_salad).jpg" target="_blank" rel="noreferrer">Nopalitos — Madman2001, CC BY-SA 4.0</a> ·
              <a href="https://commons.wikimedia.org/wiki/File:Guacamole_-_La_Casa_Restaurant_-_January_2023_-_Sarah_Stierch.jpg" target="_blank" rel="noreferrer">Guacamole — Sarah Stierch, CC BY 4.0</a>
            </p>
          </details>
          <div class="food-grid">
            ${t.food.days
              .map(
                (day) => `
                  <article class="food-day reveal">
                    <p class="food-day-label">${day.day}</p>
                    <h3>${day.title}</h3>
                    <ul>
                      ${day.items.map((item) => `<li>${item}</li>`).join("")}
                    </ul>
                  </article>
                `,
              )
              .join("")}
          </div>
          <p class="experience-note reveal">${t.food.note}</p>
          <article class="drinks-policy reveal">
            <p class="eyebrow">${t.food.drinks.eyebrow}</p>
            <h3>${t.food.drinks.title}</h3>
            <p>${t.food.drinks.body}</p>
            <p class="drinks-policy-note">${t.food.drinks.note}</p>
          </article>
        </section>

        <section class="music-section section" id="music">
          <div class="experience-heading reveal">
            <p class="eyebrow">${t.music.eyebrow}</p>
            <h2>${t.music.title}</h2>
            <p class="lead">${t.music.body}</p>
          </div>
          <div class="music-lineup">
            ${t.music.acts
              .map(
                (act, index) => `
                  <article class="music-act reveal">
                    <span>0${index + 1}</span>
                    <p>${act.moment}</p>
                    <h3>${act.name}</h3>
                    <small>${act.note}</small>
                  </article>
                `,
              )
              .join("")}
          </div>
          <div class="playlist-section reveal">
            <div class="playlist-heading">
              <p class="eyebrow">${t.music.playlists.eyebrow}</p>
              <h3>${t.music.playlists.title}</h3>
              <p>${t.music.playlists.body}</p>
            </div>
            <div class="playlist-grid">
              ${[
                ["general", EVENT.playlists.general],
                ["karaoke", EVENT.playlists.karaoke],
              ]
                .map(
                  ([playlist, url], index) => `
                    <article class="playlist-card">
                      <span class="playlist-number">0${index + 1}</span>
                      <div class="spotify-mark" aria-hidden="true">
                        <i></i><i></i><i></i>
                      </div>
                      <h4>${t.music.playlists[playlist].title}</h4>
                      <p>${t.music.playlists[playlist].body}</p>
                      <a
                        class="text-link"
                        href="${url}"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ${t.music.playlists.button} ↗
                      </a>
                    </article>
                  `,
                )
                .join("")}
            </div>
          </div>
          <div class="open-stage reveal">
            <div>
              <p class="eyebrow">${t.music.stage.eyebrow}</p>
              <h3>${t.music.stage.title}</h3>
              <p>${t.music.stage.body}</p>
            </div>
            ${suggestionFormMarkup(t.suggestions)}
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

        <section class="facilities-section section" id="facilities">
          <div class="experience-heading reveal">
            <p class="eyebrow">${t.facilities.eyebrow}</p>
            <h2>${t.facilities.title}</h2>
            <p class="lead">${t.facilities.body}</p>
          </div>
          <div class="venue-gallery">
            ${t.facilities.gallery
              .map(
                (image) => `
                  <figure class="venue-gallery-card reveal">
                    <img
                      src="${MEDIA.venue[image.key]}"
                      alt="${image.alt}"
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>${image.title}</figcaption>
                  </figure>
                `,
              )
              .join("")}
          </div>
          <a
            class="venue-gallery-source"
            href="https://www.clubrocaazul.com/"
            target="_blank"
            rel="noreferrer"
          >${t.facilities.gallerySource} ↗</a>
          <div class="facilities-grid">
            ${t.facilities.groups
              .map(
                (group) => `
                  <article class="facility-group reveal">
                    <h3>${group.title}</h3>
                    <ul>
                      ${group.items.map((item) => `<li>${item}</li>`).join("")}
                    </ul>
                  </article>
                `,
              )
              .join("")}
          </div>
          <p class="facilities-note">${t.facilities.note}</p>
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

        <section class="cabins-showcase section" id="cabins">
          ${cabinUnitMarkup(
            t.accommodation.cabinsShowcase,
            t.accommodation.cabinsShowcase.eyebrow,
          )}
          ${t.accommodation.cabinsShowcase.additionalUnits
            .map((cabin) =>
              cabinUnitMarkup(
                cabin,
                t.accommodation.cabinsShowcase.eyebrow,
              ),
            )
            .join("")}
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
          <div class="route-map reveal" aria-labelledby="route-map-title">
            <div class="route-map-heading">
              <p class="eyebrow">${t.travel.routes.eyebrow}</p>
              <h3 id="route-map-title">${t.travel.routes.title}</h3>
              <p>${t.travel.routes.note}</p>
            </div>
            <div class="route-map-diagram">
              <section class="route-group route-origins">
                <h4>${t.travel.routes.originsLabel}</h4>
                ${routeGroupMarkup(t.travel.routes.origins)}
              </section>
              <div class="route-venue">
                <span aria-hidden="true">◆</span>
                <strong>${t.travel.routes.venue}</strong>
              </div>
              <section class="route-group route-destinations">
                <h4>${t.travel.routes.destinationsLabel}</h4>
                ${routeGroupMarkup(t.travel.routes.destinations)}
              </section>
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

        <section class="coast-section section" id="after">
          <div class="coast-copy reveal">
            <p class="eyebrow">${t.coast.eyebrow}</p>
            <h2>${t.coast.title}</h2>
            <p class="lead">${t.coast.body}</p>
            <div class="coast-ideas">
              ${t.coast.ideas
                .map(
                  (idea) => `
                    <article>
                      <strong>${idea.title}</strong>
                      <span>${idea.body}</span>
                    </article>
                  `,
                )
                .join("")}
            </div>
            <p class="coast-note">${t.coast.note}</p>
          </div>
          <div class="coast-form-wrap reveal">
            <p class="eyebrow">${t.coast.form.eyebrow}</p>
            <h3>${t.coast.form.title}</h3>
            <p>${t.coast.form.body}</p>
            ${coastFormMarkup(t.coast.form)}
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
  bindRsvpConditionalFields();
  bindSubmissionForms();
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
  if (auth.currentUser?.uid === GUEST_UID) {
    render(normalized);
  } else {
    renderGate(normalized);
  }
}

function bindLanguageSwitcher() {
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });
}

function bindRsvpConditionalFields() {
  const form = document.querySelector('[data-form-kind="rsvp"]');
  const accommodation = form?.querySelector("#rsvp-accommodation");
  const conditionalFields = form?.querySelectorAll(
    "[data-independent-stay]",
  );

  if (!form || !accommodation || !conditionalFields?.length) return;

  const syncFields = () => {
    const isIndependent = accommodation.value === "independent";

    conditionalFields.forEach((field) => {
      field.hidden = !isIndependent;
      const control = field.querySelector("select, input, textarea");
      if (!control) return;
      control.disabled = !isIndependent;
      control.required = isIndependent;
    });
  };

  accommodation.addEventListener("change", syncFields);
  form.addEventListener("reset", () => window.setTimeout(syncFields, 0));
  syncFields();
}

function formValues(form) {
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
}

function bindSubmissionForms() {
  const collections = {
    rsvp: "rsvp_submissions",
    suggestions: "experience_suggestions",
    coast: "coast_interest",
  };

  document.querySelectorAll("[data-form-kind]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const kind = form.dataset.formKind;
      const targetCollection = collections[kind];
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector("[data-form-status]");
      const labels = interfaceText[currentLanguage];
      const originalButtonLabel = button.textContent;

      button.disabled = true;
      button.textContent = labels.submitWorking;
      status.textContent = labels.submitWorking;
      status.dataset.state = "working";

      try {
        await addDoc(collection(db, targetCollection), {
          ...formValues(form),
          language: currentLanguage,
          schemaVersion: kind === "rsvp" ? 3 : 1,
          createdAt: serverTimestamp(),
        });
        form.reset();
        status.textContent = labels.submitSuccess;
        status.dataset.state = "success";
      } catch (error) {
        console.error("Firebase form submission failed", error);
        status.textContent = labels.submitError;
        status.dataset.state = "error";
      } finally {
        button.disabled = false;
        button.textContent = originalButtonLabel;
      }
    });
  });
}

function renderGate(language, hasError = false) {
  currentLanguage = language;
  document.documentElement.lang = language;
  const t = interfaceText[language];

  app.innerHTML = `
    <main class="access-gate">
      <section class="access-card">
        <div class="gate-monogram" aria-hidden="true">D. <i>&</i> A.</div>
        <p class="eyebrow">${t.gateEyebrow}</p>
        <h1>${t.gateTitle}</h1>
        <p>${t.gateBody}</p>
        <form data-access-form>
          <label for="access-key">${t.gateLabel}</label>
          <input
            id="access-key"
            name="accessKey"
            type="password"
            autocomplete="current-password"
            required
            autofocus
          />
          <button class="button button-dark" type="submit">${t.gateButton}</button>
          <small data-access-status data-state="${hasError ? "error" : ""}">
            ${hasError ? t.gateError : ""}
          </small>
        </form>
        <div class="gate-languages" aria-label="Language">
          ${languageSwitcherMarkup(language)}
        </div>
      </section>
    </main>
  `;

  bindLanguageSwitcher();
  const form = document.querySelector("[data-access-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    const status = form.querySelector("[data-access-status]");
    const accessKey = new FormData(form).get("accessKey");

    button.disabled = true;
    button.textContent = t.gateWorking;
    status.textContent = "";

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(
        auth,
        GUEST_EMAIL,
        accessKey,
      );
      if (credential.user.uid !== GUEST_UID) {
        await auth.signOut();
        throw new Error("Unexpected guest account");
      }
    } catch (error) {
      console.warn("Invitation access rejected", error.code || error.message);
      renderGate(currentLanguage, true);
    }
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
currentLanguage = initialLanguage;
onAuthStateChanged(auth, async (user) => {
  if (user?.uid === GUEST_UID) {
    render(currentLanguage);
    return;
  }

  if (user) await auth.signOut();
  renderGate(currentLanguage);
});
window.setInterval(() => updateCountdown(currentLanguage), 1000);
