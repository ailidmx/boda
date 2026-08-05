import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";

// Wedding planner contact used in the humorous "credits" mentions.
const PLANNER = {
  label: "Manuel",
  whatsapp: "https://wa.me/523311549397",
};


function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildGuestSearchIndex() {
  const guests = getActiveGuests();
  return guests
    .map((guest) => {
      const photo = resolveGuestPhoto(guest);
      if (!photo) return null;
      const { firstName, middleName, lastName, maternalLastName, fullName } =
        resolveGuestName(guest);
      const variants = [
        fullName,
        [firstName, lastName].filter(Boolean).join(" "),
        [firstName, middleName, lastName].filter(Boolean).join(" "),
        [firstName, lastName, maternalLastName].filter(Boolean).join(" "),
        firstName,
        [lastName, maternalLastName].filter(Boolean).join(" "),
      ]
        .map(normalizeName)
        .filter(Boolean);
      return {
        guest,
        photo,
        variants,
      };
    })
    .filter(Boolean);
}

function findCreditAvatar(creditName, index) {
  const needle = normalizeName(creditName);
  if (!needle) return null;

  // Strict match: the credit name must exactly match one of the guest's
  // name variants (full name, first+last, first name, etc.). No fuzzy
  // substring fallback, so a credit can never be matched to the wrong guest.
  const exact = index.find((entry) => entry.variants.includes(needle));
  return exact?.photo || null;
}

export function Thanks() {
  const { t } = useApp();
  const thanks = t.thanks || {};
  const credits = thanks.credits || [];
  const humor = thanks.humor || [];
  const guestIndex = React.useMemo(() => buildGuestSearchIndex(), []);

  return (
    <section className="thanks-section section" id="thanks">
      <div className="thanks-frame">
        <div className="section-heading thanks-heading">
          <p className="eyebrow">{thanks.eyebrow}</p>

          <blockquote className="thanks-quote">
            <h2>{thanks.title}</h2>
            <p className="thanks-subtitle">{thanks.subtitle}</p>
          </blockquote>
        </div>

        <ul className="thanks-credits">
          {credits.map((credit, index) => (
            <li className="thanks-credit" key={index}>
              {findCreditAvatar(credit.name, guestIndex) ? (
                <span className="thanks-avatar thanks-avatar--photo" aria-hidden="true">
                  <img
                    src={findCreditAvatar(credit.name, guestIndex)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              ) : (
                <span className="thanks-avatar" aria-hidden="true">
                  {initialsOf(credit.name)}
                </span>
              )}
              <span className="thanks-credit-text">
                <strong className="thanks-name">{credit.name}</strong>
                <span className="thanks-role">{credit.role}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="thanks-humor">
          {humor.map((line, index) => (
            <blockquote className="thanks-humor-line" key={index}>
              <p>{line}</p>
            </blockquote>
          ))}
        </div>

        <div className="thanks-contacts">
          <span>{thanks.cta}</span>
          {Object.values(EVENT.contacts).map((contact, index) => (
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              key={index}
            >
              {contact.label} · ↗
            </a>
          ))}
          <a href={PLANNER.whatsapp} target="_blank" rel="noreferrer">
            {thanks.ctaPlanner} · {PLANNER.label} ↗
          </a>
        </div>
      </div>
    </section>
  );
}
