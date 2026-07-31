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
import {
  getCustomContent,
  getGroupTag,
  invitationProfileText,
  loadGroupCustomContent,
  parseInvitationProfile,
} from "./invitation-profile.js";


import {
  AUTH_EMAIL_DOMAIN,
  getGuest,
  getGuestByEmail,
  getGuestByUsername,
  getGuestsByUnit,
  loadDeletedGuestIds,
  SHARED_PASSWORD,
} from "./guests.js";

import { getRoom } from "./rooms.js";



import { MEDIA } from "./media.js";
import {
  CHAPALA_HIGHLIGHTS,
  ROCA_AZUL_GALLERY,
  wixUrl,
} from "./rocaAzulGallery.js";
import { chapalaAnecdotes } from "./chapalaAnecdotes.js";


const LANGUAGE_STORAGE_KEY = "boda-language";
const INVITATION_PROFILE_STORAGE_KEY = "boda-invitation-profile-v1";
// The guest username is kept in localStorage so guests don't have to re-enter
// it on every visit. This is the only persistence available to a static PWA;
// it is cleared automatically if the account ever stops working.
const USERNAME_STORAGE_KEY = "boda-username";


const app = document.querySelector("#app");
const isDashboardRoute =
  window.location.pathname.replace(/\/+$/, "") === "/dashboard" ||
  new URLSearchParams(window.location.search).has("dashboard");
let currentLanguage = "es";
let heroSlideInterval = null;
let currentInvitationProfile = getStoredInvitationProfile();


const interfaceText = {
  es: {
    gateEyebrow: "Invitación privada",
    gateBody:
      "Escribe tu usuario y la contraseña que compartimos contigo para abrir la invitación.",
    gateUsernameLabel: "Usuario",
    gateUsernamePlaceholder: "Tu usuario",
    gateLabel: "Contraseña",
    gateButton: "Entrar",
    gateWorking: "Abriendo…",
    gateError:
      "El usuario o la contraseña no son correctos. Revisa que los hayas escrito bien o pide que te los reenviemos.",
    gateNoProfile:
      "No encontramos un invitado con este usuario. Revisa que lo hayas escrito bien o escríbenos para ayudarte.",



    gateLost: "¿Perdiste tu usuario o contraseña? Escríbenos y te los reenviaremos.",

    submitWorking: "Enviando…",
    submitSuccess: "¡Gracias! Recibimos tu respuesta.",
    submitError: "No pudimos enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.",
  },
  fr: {
    gateEyebrow: "Invitation privée",
    gateBody:
      "Saisissez votre identifiant et le mot de passe que nous vous avons envoyés pour ouvrir l’invitation.",
    gateUsernameLabel: "Identifiant",
    gateUsernamePlaceholder: "Votre identifiant",
    gateLabel: "Mot de passe",
    gateButton: "Entrer",
    gateWorking: "Ouverture…",
    gateError:
      "L’identifiant ou le mot de passe n’est pas correct. Vérifiez-les ou demandez-nous de vous les renvoyer.",
    gateNoProfile:
      "Aucun invité ne correspond à cet identifiant. Vérifiez-le ou écrivez-nous pour obtenir de l’aide.",



    gateLost: "Identifiant ou mot de passe perdu ? Écrivez-nous et nous vous les renverrons.",

    submitWorking: "Envoi…",
    submitSuccess: "Merci ! Nous avons bien reçu votre réponse.",
    submitError: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
  },
  en: {
    gateEyebrow: "Private invitation",
    gateBody:
      "Enter your username and the password we shared with you to open the invitation.",
    gateUsernameLabel: "Username",
    gateUsernamePlaceholder: "Your username",
    gateLabel: "Password",
    gateButton: "Enter",
    gateWorking: "Opening…",
    gateError:
      "The username or password is not correct. Check them or ask us to resend them.",
    gateNoProfile:
      "We could not find a guest with this username. Check it or message us for help.",


    gateLost: "Lost your username or password? Message us and we'll resend them.",


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
    ["years", labels.years],
    ["months", labels.months],
    ["days", labels.days],
    ["hours", labels.hours],
    ["minutes", labels.minutes],
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

function getStoredInvitationProfile() {
  try {
    return parseInvitationProfile(
      window.localStorage.getItem(INVITATION_PROFILE_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

/**
 * Build a profile object (compatible with parseInvitationProfile) from a
 * guest record. The guest is the source of truth for identity after login.
 */
function buildProfileFromGuest(guest) {
  if (!guest) return null;
  const room = guest.room ? getRoom(guest.room) : null;
  return {
    code: guest.id,
    hasCabin: guest.hasCabin,
    unit: guest.unit,
    occupancy: guest.occupancy,
    payment: guest.payment,
    room: guest.room,
    roomDescription: room?.description || null,
    guest,
  };
}

/**
 * Resolve the signed-in guest and activate their invitation profile.
 *
 * The canonical link between a Firebase Auth account and a guest is the auth
 * email (guest.firebaseEmail). We match by email first; the username stored
 * in localStorage is only a fallback for older sessions. Returns true when a
 * valid identity was found.
 *
 * @param {string} [email] - the signed-in user's email
 */
function activateGuestProfile(email) {
  let guest = email ? getGuestByEmail(email) : null;
  if (!guest) {
    const username = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    guest = username ? getGuestByUsername(username) : null;
  }
  if (!guest) return false;
  currentInvitationProfile = buildProfileFromGuest(guest);
  window.localStorage.setItem(
    INVITATION_PROFILE_STORAGE_KEY,
    currentInvitationProfile.code,
  );
  return true;
}



function invitationProfileMarkup(language) {
  const profile = invitationProfileText(currentInvitationProfile, language);
  if (!profile) return "";

  // Personalised greeting when a per-guest code is used
  const guest = currentInvitationProfile?.guest;
  const greeting = guest
    ? `<p class="invitation-greeting">✨ ${guest.firstName} ${guest.lastName}</p>`
    : "";

  // Dashboard link only for novios
  const dashboardLink = guest?.isNovio
    ? `<a class="invitation-dashboard-link" href="/dashboard">📊 Panel de los novios</a>`
    : "";

  // Custom content from Firestore overrides
  const custom = getCustomContent(currentInvitationProfile);
  const customGreeting = custom?.greeting
    ? `<p class="invitation-custom-greeting">${custom.greeting}</p>`
    : "";
  const customMessage = custom?.message
    ? `<div class="invitation-custom-message">${custom.message}</div>`
    : "";
  const customSection = custom?.section
    ? `<section class="invitation-custom-section section">${custom.section}</section>`
    : "";

  return `
    <section class="invitation-profile section" aria-labelledby="invitation-profile-title">
      <div class="invitation-profile-card reveal">
        ${customGreeting}
        ${greeting}
        <p class="eyebrow">${profile.eyebrow}</p>
        <h2 id="invitation-profile-title">${profile.title}</h2>
        <p class="lead">${profile.body}</p>
        ${
          profile.facts.length
            ? `
              <div class="invitation-profile-facts">
                ${profile.facts.map((fact) => `<strong>${fact}</strong>`).join("")}
              </div>
            `
            : ""
        }
        ${customMessage}
        <small>${profile.note}</small>
        ${dashboardLink}
      </div>
    </section>
    ${customSection}
  `;
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

/**
 * Screenshots of the driving routes shared with guests. Two groups:
 * "venue" (how to reach Roca Azul) and "beach" (how to reach Barra de
 * Navidad). Each group is shown as its own image carousel.
 */
const MAP_IMAGES = {
  venue: [
    {
      src: "https://res.cloudinary.com/k2ajcgxv/image/upload/v1785521656/Captura_de_pantalla_2026-07-31_a_la_s_11.58.29_a.m._eqyghk.png",
      alt: "Mapa 1 · ruta hacia Roca Azul",
    },
    {
      src: "https://res.cloudinary.com/k2ajcgxv/image/upload/v1785521653/Captura_de_pantalla_2026-07-31_a_la_s_11.59.01_a.m._fedfdr.png",
      alt: "Mapa 2 · ruta hacia Roca Azul",
    },
    {
      src: "https://res.cloudinary.com/k2ajcgxv/image/upload/v1785521649/Captura_de_pantalla_2026-07-31_a_la_s_11.59.30_a.m._t05ski.png",
      alt: "Mapa 3 · ruta hacia Roca Azul",
    },
  ],
  beach: [
    {
      src: "https://res.cloudinary.com/k2ajcgxv/image/upload/v1785521647/Captura_de_pantalla_2026-07-31_a_la_s_11.59.57_a.m._lenxjn.png",
      alt: "Mapa · ruta hacia Barra de Navidad",
    },
  ],
};

/**
 * Build the itinerary map carousels. Each group (venue / beach) renders as
 * its own image carousel with prev/next arrows and dots.
 * @param {Array<{label: string, images: Array<{src: string, alt: string}>}>} groups
 * @returns {string}
 */
function mapCarouselMarkup(groups) {
  return groups
    .map(
      (group, groupIndex) => `
        <div class="map-carousel-group">
          <h4>${group.label}</h4>
          <div class="map-carousel" data-map-carousel="${groupIndex}">
            <button
              class="map-carousel-arrow map-carousel-arrow--prev"
              type="button"
              data-map-prev="${groupIndex}"
              aria-label="Previous"
            >‹</button>
            <div class="map-carousel-viewport">
              <div class="map-carousel-track" data-map-track="${groupIndex}">
                ${group.images
                  .map(
                    (image, index) => `
                      <figure class="map-carousel-slide" data-map-slide="${groupIndex}">
                        <img
                          src="${image.src}"
                          alt="${image.alt}"
                          loading="lazy"
                          decoding="async"
                        />
                        <figcaption>
                          ${String(index + 1).padStart(2, "0")} / ${String(
                            group.images.length,
                          ).padStart(2, "0")}
                        </figcaption>
                      </figure>
                    `,
                  )
                  .join("")}
              </div>
            </div>
            <button
              class="map-carousel-arrow map-carousel-arrow--next"
              type="button"
              data-map-next="${groupIndex}"
              aria-label="Next"
            >›</button>
            <div class="map-carousel-dots" data-map-dots="${groupIndex}">
              ${group.images
                .map(
                  (_, index) => `
                    <button
                      class="map-carousel-dot"
                      type="button"
                      data-map-dot="${groupIndex}"
                      data-index="${index}"
                      aria-label="Map ${index + 1}"
                      ${index === 0 ? 'aria-current="true"' : ""}
                    ></button>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `,
    )
    .join("");
}

/**
 * Wire up all itinerary map carousels currently in the DOM.
 * Each carousel supports prev/next arrows and dots.
 */
function bindMapCarousels() {
  document.querySelectorAll("[data-map-carousel]").forEach((carousel) => {
    const id = carousel.dataset.mapCarousel;
    const track = carousel.querySelector(`[data-map-track="${id}"]`);
    const slides = [
      ...carousel.querySelectorAll(`[data-map-slide="${id}"]`),
    ];
    const dots = [...carousel.querySelectorAll(`[data-map-dot="${id}"]`)];
    const prev = carousel.querySelector(`[data-map-prev="${id}"]`);
    const next = carousel.querySelector(`[data-map-next="${id}"]`);
    if (!track || slides.length < 2) return;

    let index = 0;

    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((slide, i) => {
        slide.setAttribute("aria-current", String(i === index));
      });
      dots.forEach((dot, i) => {
        dot.setAttribute("aria-current", String(i === index));
      });
    };

    prev?.addEventListener("click", () => show(index - 1));
    next?.addEventListener("click", () => show(index + 1));
    dots.forEach((dot) => {
      dot.addEventListener("click", () => show(Number(dot.dataset.index)));
    });
  });
}



function rsvpFormMarkup(t) {
  const optionsMarkup = (options) =>
    options
      .map(
        (option) =>
          `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");

  // Conditionally show the travel section based on the guest's origin
  const showTravelSection = currentInvitationProfile?.guest?.comesFromFar === true;

  return `
    <form class="rsvp-form" data-form-kind="rsvp" aria-describedby="rsvp-preview-note">
      <fieldset>
        <legend>${t.groups.attendance}</legend>
        <div class="rsvp-form-grid">
          <div class="form-field">
            <label for="rsvp-full-name">${t.fields.fullName}</label>
            <input
              id="rsvp-full-name"
              name="fullName"
              type="text"
              autocomplete="name"
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

      ${
        showTravelSection
          ? `
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
      </fieldset>`
          : ""
      }

      <fieldset class="petanque-fieldset">
        <legend>${t.petanque.eyebrow}</legend>
        <div class="petanque-intro">
          <p>${t.petanque.intro}</p>
          <a class="text-link" href="${t.petanque.organizerWhatsapp}" target="_blank" rel="noreferrer">
            ${t.petanque.organizerLabel} ↗
          </a>
        </div>
        <div class="rsvp-form-grid">
          <div class="form-field">
            <label for="petanque-participation">${t.petanque.fields.participation}</label>
            <select id="petanque-participation" name="petanqueParticipation">
              ${optionsMarkup(t.petanque.options.participation)}
            </select>
          </div>
          <div class="form-field">
            <label for="petanque-party-size">${t.petanque.fields.partySize}</label>
            <input
              id="petanque-party-size"
              name="petanquePartySize"
              type="number"
              min="0"
              max="12"
              value="0"
            />
          </div>
          <div class="form-field form-field-wide">
            <label for="petanque-names">${t.petanque.fields.names}</label>
            <input id="petanque-names" name="petanqueNames" type="text" placeholder="${t.petanque.fields.namesPlaceholder}" />
          </div>
          <div class="form-field">
            <label for="petanque-own-boules">${t.petanque.fields.ownBoules}</label>
            <select id="petanque-own-boules" name="petanqueOwnBoules">
              ${optionsMarkup(t.petanque.options.ownBoules)}
            </select>
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
        <span class="form-field-label">${t.fields.genres}</span>
        <div class="genre-grid">
          ${t.genres
            .map(
              (genre) => `
                <label class="genre-chip">
                  <input type="checkbox" name="genres" value="${genre}" />
                  <span>${genre}</span>
                </label>
              `,
            )
            .join("")}
        </div>
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
        <label for="coast-plan">${t.fields.plan}</label>
        <select id="coast-plan" name="plan">
          ${optionsMarkup(t.options.plan)}
        </select>
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

const GALLERY_PHOTOS = MEDIA.gallery;

function galleryMarkup() {
  const rows = [];
  for (let i = 0; i < GALLERY_PHOTOS.length; i += 3) {
    const chunk = GALLERY_PHOTOS.slice(i, i + 3);
    rows.push(`
      <div class="gallery-row">
        ${chunk
          .map(
            (src) => `
          <a class="gallery-item" href="${src}" target="_blank" rel="noreferrer">
            <img src="${src}" alt="" loading="lazy" decoding="async" />
          </a>
        `,
          )
          .join("")}
      </div>
    `);
  }
  return rows.join("");
}

/**
 * Reusable "fun facts" carousel.
 *
 * Renders a vertical list of short facts with an optional title on top and a
 * separator line between the title and the content. Only a fixed number of
 * rows (PAGE_SIZE) is shown at a time; prev/next arrows and dots page through
 * the remaining facts. It is intentionally generic so it can be dropped into
 * any section with a different set of facts (e.g. the story, the venue, the
 * food…).
 *
 * @param {string[]} facts - short strings to display as rows
 * @param {string} id - unique id so multiple carousels can coexist on a page
 * @param {string} [label] - optional title shown on the first row
 * @returns {string} markup
 */
const FUN_FACT_PAGE_SIZE = 5;

function funFactCarouselMarkup(facts, id, label = "") {
  if (!facts || !facts.length) return "";
  const pages = [];
  for (let i = 0; i < facts.length; i += FUN_FACT_PAGE_SIZE) {
    pages.push(facts.slice(i, i + FUN_FACT_PAGE_SIZE));
  }
  const pageCount = pages.length;

  return `
    <div class="fun-fact-list" data-fun-fact-carousel="${id}" aria-label="${label || "Fun facts"}">
      ${
        label
          ? `
            <div class="fun-fact-list-heading">
              <span class="fun-fact-label" aria-hidden="true">${label}</span>
            </div>
            <hr class="fun-fact-divider" aria-hidden="true" />
          `
          : ""
      }
      <div class="fun-fact-viewport">
        <div class="fun-fact-track" data-fun-fact-track="${id}">
          ${pages
            .map(
              (page, pageIndex) => `
                <ol class="fun-fact-rows" data-fun-fact-page="${id}" ${pageIndex === 0 ? 'aria-current="true"' : ""}>
                  ${page
                    .map(
                      (fact, index) => `
                        <li class="fun-fact-row">
                          <span class="fun-fact-row-index" aria-hidden="true">${String(pageIndex * FUN_FACT_PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                          <p>${fact}</p>
                        </li>
                      `,
                    )
                    .join("")}
                </ol>
              `,
            )
            .join("")}
        </div>
      </div>
      ${
        pageCount > 1
          ? `
            <div class="fun-fact-controls">
              <button
                class="fun-fact-arrow fun-fact-arrow--prev"
                type="button"
                data-fun-fact-prev="${id}"
                aria-label="Previous"
              >‹</button>
              <div class="fun-fact-dots" data-fun-fact-dots="${id}">
                ${pages
                  .map(
                    (_, index) => `
                      <button
                        class="fun-fact-dot"
                        type="button"
                        data-fun-fact-dot="${id}"
                        data-index="${index}"
                        aria-label="Page ${index + 1}"
                        ${index === 0 ? 'aria-current="true"' : ""}
                      ></button>
                    `,
                  )
                  .join("")}
              </div>
              <button
                class="fun-fact-arrow fun-fact-arrow--next"
                type="button"
                data-fun-fact-next="${id}"
                aria-label="Next"
              >›</button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

/**
 * Wire up all fun-fact carousels currently in the DOM.
 * Each carousel pages through its rows with prev/next arrows and dots.
 */
function bindFunFactCarousels() {
  document.querySelectorAll("[data-fun-fact-carousel]").forEach((carousel) => {
    const id = carousel.dataset.funFactCarousel;
    const track = carousel.querySelector(`[data-fun-fact-track="${id}"]`);
    const pages = [
      ...carousel.querySelectorAll(`[data-fun-fact-page="${id}"]`),
    ];
    const dots = [...carousel.querySelectorAll(`[data-fun-fact-dot="${id}"]`)];
    const prev = carousel.querySelector(`[data-fun-fact-prev="${id}"]`);
    const next = carousel.querySelector(`[data-fun-fact-next="${id}"]`);
    if (!track || pages.length < 2) return;

    let index = 0;

    const show = (nextIndex) => {
      index = (nextIndex + pages.length) % pages.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      pages.forEach((page, i) => {
        page.setAttribute("aria-current", String(i === index));
      });
      dots.forEach((dot, i) => {
        dot.setAttribute("aria-current", String(i === index));
      });
    };

    prev?.addEventListener("click", () => show(index - 1));
    next?.addEventListener("click", () => show(index + 1));
    dots.forEach((dot) => {
      dot.addEventListener("click", () => show(Number(dot.dataset.index)));
    });
  });
}

// Maps a guest's assigned unit to the corresponding cabin-showcase key.
// Returns null when the guest has no cabin or their unit is not in the
// showcase catalogue (e.g. hortencia, lavanda, casona, cabaña_4…6).
function getGuestCabinKey(profile) {

  if (!profile?.hasCabin) return null;
  const unit = String(profile.unit || "").toLowerCase();
  if (unit === "azalea") return "azalea";
  if (unit === "dalia") return "dalia";
  if (unit === "margarita") return "margarita";
  if (/^cabaña_(3[1-4])$/.test(unit)) return "wooden";
  return null;
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
    .map((image, index) => {
      const src = typeof image === "string" ? image : image.src;
      const position = typeof image === "string" ? "" : image.position || "";
      return `
        <img
          class="hero-photo${index === 0 ? " is-active" : ""}"
          src="${src}"
          alt=""
          aria-hidden="true"
          ${position ? `style="object-position: ${position}"` : ""}
          ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
          decoding="async"
        />
      `;
    })
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

function initialsSwapMarkup(variant = "", delay = "0s") {
  return `
    <span
      class="identity-swap identity-swap--initials ${variant}"
      style="--identity-delay: ${delay}"
      aria-label="D. & A. — A. & D."
    >
      <span class="identity-swap-state identity-swap-state--primary" aria-hidden="true">
        <span>D.</span><i>&</i><span>A.</span>
      </span>
      <span class="identity-swap-state identity-swap-state--secondary" aria-hidden="true">
        <span>A.</span><i>&</i><span>D.</span>
      </span>
    </span>
  `;
}

function coupleNamesMarkup(variant = "", delay = "0s") {
  const ayde = `Ayd<span class="identity-accent">é</span>`;

  return `
    <span
      class="identity-swap identity-swap--names ${variant}"
      style="--identity-delay: ${delay}"
      aria-label="David & Aydé — Aydé y David"
    >
      <span class="identity-swap-state identity-swap-state--primary" aria-hidden="true">
        <span class="identity-person">David</span>
        <i class="identity-connector">&</i>
        <span class="identity-person">${ayde}</span>
      </span>
      <span class="identity-swap-state identity-swap-state--secondary" aria-hidden="true">
        <span class="identity-person">${ayde}</span>
        <i class="identity-connector">y</i>
        <span class="identity-person">David</span>
      </span>
    </span>
  `;
}

// Cinematic date animation: cycles through the three wedding-weekend days
// (V 19 · S 20 · D 21) with a day-of-week prefix, reusing the identity-swap
// reveal pattern. The wedding day (S 20) is emphasised.
function heroDateMarkup() {
  const days = [
    { prefix: "V", day: "19", label: "Viernes" },
    { prefix: "S", day: "20", label: "Sábado" },
    { prefix: "D", day: "21", label: "Domingo" },
  ];

  const state = (day, variant) => `
    <span
      class="hero-date-state hero-date-state--${variant}"
      aria-hidden="true"
    >
      <span class="hero-date-prefix">${day.prefix}</span>
      <span class="hero-date-num">${day.day}</span>
      <span class="hero-date-sep">·</span>
      <span class="hero-date-num">02</span>
      <span class="hero-date-sep">·</span>
      <span class="hero-date-num">2027</span>
    </span>
  `;

  return `
    <span class="hero-date-swap" aria-label="V 19 · S 20 · D 21 — 20 · 02 · 2027">
      ${state(days[0], "primary")}
      ${state(days[1], "secondary")}
      ${state(days[2], "tertiary")}
    </span>
  `;
}


const LANGUAGE_FLAGS = {
  es: "🇲🇽 ES",
  fr: "🇫🇷 FR",
  en: "🇬🇧 EN",
};


function languageSwitcherMarkup(activeLanguage) {
  return SUPPORTED_LANGUAGES.map(
    (language) => `
      <button
        class="language-button"
        type="button"
        data-language="${language}"
        aria-pressed="${language === activeLanguage}"
      >
        ${LANGUAGE_FLAGS[language]}
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
  const heroImages = Array.isArray(MEDIA.hero)
    ? MEDIA.hero
    : MEDIA.hero
      ? [MEDIA.hero]
      : [];
  const heroMedia = heroMarkup(heroImages, t.hero);

  app.innerHTML = `
    <a class="skip-link" href="#main-content">${t.skip}</a>
    <div class="site-shell">
      <div class="countdown-bar" aria-live="polite">
        ${
          currentInvitationProfile?.guest
            ? `<span class="countdown-guest">${currentInvitationProfile.guest.firstName} ${currentInvitationProfile.guest.lastName}</span>`
            : ""
        }
        <span class="countdown-prefix">${t.countdown.prefix}</span>
        <div class="countdown-values">
          ${countdownMarkup(t.countdown)}
        </div>
      </div>

      <header class="site-header">
        <a class="monogram" href="#top">
          ${initialsSwapMarkup("identity-swap--header")}
        </a>
        <nav class="desktop-nav" aria-label="Primary">
          <a href="#story">${t.nav.story}</a>
          <a href="#venue">${t.nav.venue}</a>
          <a href="#weekend">${t.nav.weekend}</a>
          <a href="#accommodation">${t.nav.accommodation}</a>

          <a href="#travel">${t.nav.travel}</a>
          <a href="#attire">${t.nav.attire}</a>
          <a href="#gift">${t.nav.gift}</a>
          <a href="#photos">${t.nav.photos}</a>
          ${
            currentInvitationProfile?.guest?.isNovio
              ? `<a class="nav-dashboard-link" href="/dashboard">📊 ${t.nav.dashboard}</a>`
              : ""
          }
        </nav>
        <div class="language-switcher" aria-label="Language">
          ${languageSwitcherMarkup(language)}
        </div>
        <a class="header-rsvp" href="#rsvp">${t.nav.rsvp}</a>
      </header>

      <section class="hero" id="top">
        <div class="hero-art${heroImages.length ? " has-photo" : ""}">

          ${heroMedia}
          <div class="sun-disc"></div>
          <div class="motif motif-left"></div>
          <div class="motif motif-right"></div>
        </div>

        <div class="hero-content">
          ${
            currentInvitationProfile?.guest
              ? `<p class="hero-guest-name">${currentInvitationProfile.guest.firstName} ${currentInvitationProfile.guest.lastName}</p>`
              : ""
          }
          <p class="hero-eyebrow">${t.hero.eyebrow}</p>
          <h1>${coupleNamesMarkup("identity-swap--hero", "-1.2s")}</h1>
          <p class="hero-date">
            ${heroDateMarkup()}
            <span class="hero-date-label">${EVENT.dateShort}</span>
          </p>

          <p class="hero-place">${EVENT.venue}<br />${EVENT.place}</p>
          ${
            currentInvitationProfile?.guest
              ? `<p class="hero-group-name">${getGroupTag(currentInvitationProfile.guest.invitacionGroup || currentInvitationProfile.guest.group).label}</p>`
              : ""
          }
          <p class="hero-invitation">${t.hero.invitation}</p>
        </div>


        <a class="scroll-cue" href="#story">
          <span>${t.hero.scroll}</span>
          <span aria-hidden="true">↓</span>
        </a>


      </section>

      <main id="main-content">
        <section class="story-section section" id="story">
          <div class="story-mark">
            ${initialsSwapMarkup("identity-swap--story", "-3.4s")}
          </div>
          <div class="story-copy reveal">
            <p class="eyebrow">${t.story.eyebrow}</p>
            <h2>${t.story.title}</h2>
            <p class="lead">${t.story.body}</p>
            <p class="handwritten">${t.story.note}</p>
            <div class="chapala-photos" aria-label="${t.story.photosLabel}">
              ${CHAPALA_HIGHLIGHTS.map(
                (photo, index) => `
                  <a
                    class="chapala-photo"
                    href="${photo.full}"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src="${photo.src}"
                      alt="${t.story.photoAlts[index]}"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                `,
              ).join("")}
            </div>
          </div>
          <div class="story-footer">
            ${funFactCarouselMarkup(
              chapalaAnecdotes(language).map(
                (anecdote) => `${anecdote.icon} ${anecdote.title} — ${anecdote.text}`,
              ),
              "story-anecdotes",
              t.story.anecdotesLabel,
            )}
          </div>
        </section>


        <section class="facilities-section section" id="venue">


          <div class="experience-heading reveal">
            <p class="eyebrow">${t.facilities.eyebrow}</p>
            <h2>${t.facilities.title}</h2>
            <p class="lead facilities-lead">${t.facilities.body}</p>

          </div>
          <a
            class="venue-location-link reveal"
            href="https://maps.app.goo.gl/2KvGys1BMDbpiZkF7"
            target="_blank"
            rel="noreferrer"
          >
            ${EVENT.venue} · ${EVENT.place} ↗
          </a>
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
          <div class="venue-video reveal">
            <div class="video-frame">
              <iframe
                src="https://www.youtube.com/embed/oGOgfQGz9tw"
                title="${t.facilities.videoTitle}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
          </div>
          <div class="roca-gallery" aria-label="${t.facilities.rocaGalleryLabel}">

            ${ROCA_AZUL_GALLERY.map(
              (id, index) => `
                <a
                  class="roca-gallery-item"
                  href="${wixUrl(id, 1600)}"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src="${wixUrl(id, 500)}"
                    alt="${t.facilities.rocaGalleryAlts[index % t.facilities.rocaGalleryAlts.length]}"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              `,
            ).join("")}
          </div>
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
          <div class="venue-privacy reveal">
            <h3>${t.facilities.privacyTitle}</h3>
            <p>${t.facilities.privacyBody}</p>
          </div>
          <p class="facilities-note">${t.facilities.note}</p>
        </section>

        <section class="weekend-section section" id="weekend">
          <div class="weekend-banner">
            <img
              src="${MEDIA.weekendBanner}"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div class="weekend-banner-content">
              <div class="section-heading reveal">
                <p class="eyebrow">${t.weekend.eyebrow}</p>
                <h2>${t.weekend.title}</h2>
                <p>${t.weekend.intro}</p>
              </div>
            </div>
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
                ["shared", EVENT.playlists.shared],
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

        ${invitationProfileMarkup(language)}


        ${
          (() => {
            const showcase = t.accommodation.cabinsShowcase;
            const guestCabinKey = getGuestCabinKey(currentInvitationProfile);
            // Only guests with lodging see the cabins showcase, filtered to
            // their own cabin. Guests without a cabin (or whose unit is not in
            // the catalogue) see nothing here.
            if (!guestCabinKey) return "";

            const mainUnit =
              showcase.key === guestCabinKey ? showcase : null;
            const additionalUnit =
              mainUnit
                ? null
                : showcase.additionalUnits.find(
                    (cabin) => cabin.key === guestCabinKey,
                  );
            const cabinToShow = mainUnit || additionalUnit;
            if (!cabinToShow) return "";

            return `
              <section class="cabins-showcase section" id="cabins">
                ${cabinUnitMarkup(
                  cabinToShow,
                  showcase.eyebrow,
                )}
                <div class="cabins-private-video reveal">
                  <p class="eyebrow">${showcase.privateVideoEyebrow}</p>
                  <h3>${showcase.privateVideoTitle}</h3>
                  <div class="video-frame">
                    <iframe
                      src="https://www.youtube.com/embed/zf0zhZihub4"
                      title="${showcase.privateVideoTitle}"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin"
                      allowfullscreen
                    ></iframe>
                  </div>
                </div>
              </section>
            `;
          })()
        }


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

            <section class="route-subsection">
              <div class="route-subsection-heading">
                <h4>${t.travel.routes.originsLabel}</h4>
                <p>${t.travel.routes.maps.venueLabel}</p>
              </div>
              <div class="route-map-diagram">
                <section class="route-group route-origins">
                  ${routeGroupMarkup(t.travel.routes.origins)}
                </section>
                <div class="route-venue">
                  <span aria-hidden="true">◆</span>
                  <strong>${t.travel.routes.venue}</strong>
                </div>
              </div>
              ${mapCarouselMarkup([
                {
                  label: t.travel.routes.maps.venueLabel,
                  images: MAP_IMAGES.venue,
                },
              ])}
            </section>

            <section class="route-subsection">
              <div class="route-subsection-heading">
                <h4>${t.travel.routes.destinationsLabel}</h4>
                <p>${t.travel.routes.maps.beachLabel}</p>
              </div>
              <div class="route-map-diagram">
                <div class="route-venue">
                  <span aria-hidden="true">◆</span>
                  <strong>${t.travel.routes.venue}</strong>
                </div>
                <section class="route-group route-destinations">
                  ${routeGroupMarkup(t.travel.routes.destinations)}
                </section>
              </div>
              ${mapCarouselMarkup([
                {
                  label: t.travel.routes.maps.beachLabel,
                  images: MAP_IMAGES.beach,
                },
              ])}
            </section>

          </div>

        </section>

        <section class="attire-section section" id="attire">
          <div class="oaxaca-grid" aria-label="${t.attire.eyebrow}">
            ${MEDIA.oaxaca
              .map(
                (src, i) => `
                  <img
                    class="oaxaca-tile"
                    src="${src}"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style="--tile-index: ${i}"
                  />
                `,
              )
              .join("")}
          </div>
          <div class="attire-copy reveal">

            <p class="eyebrow">${t.attire.eyebrow}</p>
            <h2>${t.attire.title}</h2>
            <p class="lead">${t.attire.body}</p>
            ${
              t.attire.dressCode
                ? `
                  <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.35);">
                    <p style="font-weight: 600; font-size: 0.9rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 0.75rem;">${t.attire.dressCode.title}</p>
                    <p style="font-size: 0.95rem; line-height: 1.6; margin: 0;">${t.attire.dressCode.body}</p>
                  </div>
                `
                : ""
            }
            <p class="note">${t.attire.guestNote}</p>
          </div>
        </section>

        <section class="gift-section section" id="gift">
          <div class="gift-copy reveal">
            <p class="eyebrow">${t.gift.eyebrow}</p>
            <h2>${t.gift.title}</h2>
            <p class="lead">${t.gift.body}</p>
            <p class="note">${t.gift.note}</p>
            ${
              t.gift.accounts
                ? `
                  <div class="gift-accounts">
                    ${Object.entries(t.gift.accounts)
                      .map(
                        ([currency, account]) => `
                          <details class="gift-account" ${currency === "eur" ? "open" : ""}>
                            <summary>${account.title}</summary>
                            <dl>
                              ${account.details
                                .map(
                                  (detail) => `
                                    <dd>${detail}</dd>
                                  `,
                                )
                                .join("")}
                            </dl>
                            ${account.note ? `<small>${account.note}</small>` : ""}
                          </details>
                        `,
                      )
                      .join("")}
                  </div>
                `
                : ""
            }
            <div class="gift-contacts">
              <span>${t.gift.cta}</span>
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
        </section>

        <section class="coast-section section" id="after">
          <div class="coast-copy reveal">
            <p class="eyebrow">${t.coast.eyebrow}</p>
            <h2>${t.coast.title}</h2>
            <p class="lead">${t.coast.body}</p>
            <div class="coast-ideas">
              ${t.coast.plans
                .map(
                  (plan) => `
                    <article>
                      <strong>${plan.title}</strong>
                      <span>${plan.body}</span>
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

        <section class="gallery-section section" aria-labelledby="gallery-title">

          <div class="gallery-heading reveal">
            <p class="eyebrow">${t.gallery.eyebrow}</p>
            <h2 id="gallery-title">${t.gallery.title}</h2>
            <p>${t.gallery.body}</p>
          </div>
          <div class="photo-gallery">
            ${galleryMarkup()}
          </div>
        </section>

        <section class="gift-section section" id="photos" style="background: var(--ink);">
          <div class="gift-copy reveal">
            <p class="eyebrow">${t.nav.photos}</p>
            <h2>Comparte tus fotos</h2>
            <p class="lead">Queremos ver la boda a través de tus ojos. Hemos creado dos álbumes compartidos de Google Photos donde puedes subir tus fotos.</p>


            <div style="margin-top: 2rem; display: grid; gap: 1.5rem;">
              <div style="background: rgba(255,255,255,0.06); border-radius: 0.75rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.12);">
                <p style="font-weight: 600; font-size: 1rem; margin: 0 0 0.5rem; color: var(--marigold);">📸 Antes de la boda</p>
                <p style="margin: 0 0 1rem; font-size: 0.9rem; opacity: 0.8;">Comparte tus fotos favoritas de nosotros antes del gran día.</p>
                <a class="button button-light" href="https://photos.app.goo.gl/Vhg2AY3gXzXL2iKp8" target="_blank" rel="noreferrer" style="text-decoration: none;">
                  Subir fotos ↗
                </a>
              </div>
              <div style="background: rgba(255,255,255,0.06); border-radius: 0.75rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.12);">
                <p style="font-weight: 600; font-size: 1rem; margin: 0 0 0.5rem; color: var(--marigold);">🎉 La boda vista por los invitados</p>
                <p style="margin: 0 0 1rem; font-size: 0.9rem; opacity: 0.8;">Después de la boda, comparte aquí las fotos que tomaste durante la celebración.</p>
                <a class="button button-light" href="https://photos.app.goo.gl/Df3QwjTKQTGVEqEU6" target="_blank" rel="noreferrer" style="text-decoration: none;">
                  Subir fotos ↗
                </a>
              </div>
            </div>
            <p class="note" style="margin-top: 2rem;">Solicita acceso al álbum haciendo clic en "Subir fotos". Una vez dentro, podrás subir todas las fotos que quieras. ¡Gracias por capturar estos momentos con nosotros!</p>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <div class="footer-monogram">
          ${initialsSwapMarkup("identity-swap--footer", "-5.6s")}
        </div>
        <p>${t.footer.line}</p>
        <small>${t.footer.privacy}</small>
      </footer>
    </div>
  `;

  bindLanguageSwitcher();
  bindHeroSlideshow(t.hero);
  bindFunFactCarousels();
  bindMapCarousels();
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
  if (auth.currentUser) {
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

  if (currentInvitationProfile) {
    accommodation.value = currentInvitationProfile.hasCabin
      ? "onsite_two_nights"
      : "independent";
  }

  // Auto-fill the full name from the invitation code (guest identity).
  const fullNameField = form.querySelector("#rsvp-full-name");
  const guest = currentInvitationProfile?.guest;
  if (fullNameField && guest) {
    const fullName = [guest.firstName, guest.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fullName) fullNameField.value = fullName;
  }

  accommodation.addEventListener("change", syncFields);
  form.addEventListener("reset", () => window.setTimeout(syncFields, 0));
  syncFields();
}


function formValues(form) {
  const data = new FormData(form);
  const values = Object.fromEntries(
    [...data.entries()].map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );

  // Collect checkbox groups (e.g. music genres) into arrays.
  const checkboxGroups = new Set(
    [...data.keys()].filter((key) => data.getAll(key).length > 1),
  );
  checkboxGroups.forEach((key) => {
    values[key] = data.getAll(key).map((value) => value.trim());
  });

  return values;
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

      const invitationCode = currentInvitationProfile?.code;
      if (!invitationCode) {
        status.textContent = labels.submitError;
        status.dataset.state = "error";
        button.disabled = false;
        button.textContent = originalButtonLabel;
        console.error("Form submission blocked: no invitation code");
        return;
      }

      try {
        await addDoc(collection(db, targetCollection), {
          ...formValues(form),
          language: currentLanguage,
          invitationCode,
          schemaVersion: kind === "rsvp" ? 4 : 1,
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

function renderGate(language, messageKey = null) {
  currentLanguage = language;
  document.documentElement.lang = language;
  const t = interfaceText[language];
  const hasError = Boolean(messageKey);
  const statusMessage = messageKey ? t[messageKey] : "";


  app.innerHTML = `
    <main class="access-gate">
      <section class="access-card">
        <div class="gate-monogram">
          ${initialsSwapMarkup("identity-swap--gate", "-2.1s")}
        </div>
        <p class="eyebrow">${t.gateEyebrow}</p>
        <h1>${coupleNamesMarkup("identity-swap--gate-names", "-4.2s")}</h1>
        <p>${t.gateBody}</p>

        <form data-access-form>

          <label for="access-username">${t.gateUsernameLabel}</label>
          <input
            id="access-username"
            name="username"
            type="text"
            autocomplete="username"
            placeholder="${t.gateUsernamePlaceholder}"
            required
            autofocus
          />
          <label for="access-password">${t.gateLabel}</label>
          <input
            id="access-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <button class="button button-dark" type="submit">${t.gateButton}</button>
          <small data-access-status data-state="${hasError ? "error" : ""}">
            ${statusMessage}
          </small>

        </form>

        <p class="gate-lost-key">${t.gateLost}</p>
        <div class="gate-contacts">
          <a
            class="gate-contact-link"
            href="${EVENT.contacts.david.whatsapp}"
            target="_blank"
            rel="noreferrer"
          >
            ${EVENT.contacts.david.label} ↗
          </a>
          <a
            class="gate-contact-link"
            href="${EVENT.contacts.ayde.whatsapp}"
            target="_blank"
            rel="noreferrer"
          >
            ${EVENT.contacts.ayde.label} ↗
          </a>
        </div>
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
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    button.disabled = true;
    button.textContent = t.gateWorking;
    status.textContent = "";

    // Guard against a hanging sign-in (e.g. slow network) so the button never
    // stays stuck on "Ouverture…". If the request takes too long we reset the
    // form and show the error message so the guest can try again.
    const timeout = new Promise((_, reject) =>
      window.setTimeout(
        () => reject(new Error("timeout")),
        15000,
      ),
    );

    try {
      const email = `${username}@${AUTH_EMAIL_DOMAIN}`;
      await Promise.race([
        (async () => {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithEmailAndPassword(auth, email, password);
        })(),
        timeout,
      ]);
      // Remember the username so the guest doesn't have to re-enter it on
      // every visit. This is the only persistence available to a static PWA;
      // it is cleared automatically if the account ever stops working.
      window.localStorage.setItem(USERNAME_STORAGE_KEY, username);
      // onAuthStateChanged will fire with the signed-in user and render the
      // invitation; nothing more to do here.
    } catch (error) {
      console.warn("Invitation access rejected", error.code || error.message);
      renderGate(currentLanguage, "gateError");
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

// Countdown to the wedding (20/02 at 2 PM Mexico time).
// Returns years, months, days, hours and minutes remaining until the wedding.
function getTimeUntilWedding() {
  const anchor = new Date(EVENT.weddingDate).getTime();
  const now = Date.now();
  const remainingMs = Math.max(0, anchor - now);

  const totalMinutes = Math.floor(remainingMs / 60000);
  const years = Math.floor(totalMinutes / (365 * 24 * 60));
  const months = Math.floor(
    (totalMinutes % (365 * 24 * 60)) / (30 * 24 * 60),
  );
  const days = Math.floor(
    (totalMinutes % (30 * 24 * 60)) / (24 * 60),
  );
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { years, months, days, hours, minutes };
}

function updateCountdown(language) {
  const timeUntilWedding = getTimeUntilWedding();
  const countdownBar = document.querySelector(".countdown-bar");

  Object.entries(timeUntilWedding).forEach(([unit, value]) => {
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

// ── Bootstrap ──────────────────────────────────────────────────────────

// Load deleted guest IDs and group custom content before anything else.
// Resolves once the guest registry is ready so identity can be resolved
// reliably from the signed-in auth account.
const profileReady = Promise.all([
  loadDeletedGuestIds(),
  loadGroupCustomContent(),
]);


if (isDashboardRoute) {
  import("./dashboard.js").then(({ startDashboard }) => {
    startDashboard(app);
  });
} else {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Wait for the guest registry to be ready before deciding identity.
      await profileReady;
      // The auth email is the canonical link to a guest (guest.firebaseEmail).
      // We match by email first, falling back to the remembered username.
      if (!activateGuestProfile(user.email)) {
        // No valid guest identity for this account; sign out and show the gate.
        await auth.signOut();
        window.localStorage.removeItem(USERNAME_STORAGE_KEY);
        renderGate(currentLanguage, "gateNoProfile");
        return;
      }

      render(currentLanguage);
      return;
    }


    // Auto sign-in with the username remembered in localStorage so guests
    // don't have to re-enter it on every visit (e.g. after the Firebase
    // session expires or the browser clears its auth cookies).
    const storedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    if (storedUsername) {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(
          auth,
          `${storedUsername}@${AUTH_EMAIL_DOMAIN}`,
          SHARED_PASSWORD,
        );
        // onAuthStateChanged will fire again with the signed-in user and
        // render the invitation; nothing more to do here.
        return;
      } catch (error) {
        // The stored username is no longer valid; clear it and show the gate.
        console.warn("Stored username rejected", error.code || error.message);
        window.localStorage.removeItem(USERNAME_STORAGE_KEY);
      }
    }

    renderGate(currentLanguage);
  });




  window.setInterval(() => updateCountdown(currentLanguage), 60000);

}




// ── Service Worker (PWA installability) ────────────────────────────────

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // SW registration is optional; fail silently
    });
  });
}
