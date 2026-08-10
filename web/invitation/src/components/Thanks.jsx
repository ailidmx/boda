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

  const exact = index.find((entry) => entry.variants.includes(needle));
  if (exact) return exact.photo;

  const includes = index.find((entry) =>
    entry.variants.some(
      (variant) => variant.includes(needle) || needle.includes(variant),
    ),
  );
  return includes?.photo || null;
}

export function Thanks() {
  const { t } = useApp();
  const thanks = t.thanks || {};
  const credits = thanks.credits || [];
  const humor = thanks.humor || [];
  const guestIndex = React.useMemo(() => buildGuestSearchIndex(), []);

  return (
    <section className="thanks-section section" id="thanks">
      {/* Geometric art-deco backdrop — jewel-toned shapes, sunburst rays and
          a metallic sheen over the deep indigo base. Purely decorative. */}
      <div className="thanks-art" aria-hidden="true">
        <span className="thanks-art__sunburst" />
        <span className="thanks-art__shape thanks-art__shape--diamond" />
        <span className="thanks-art__shape thanks-art__shape--ring" />
        <span className="thanks-art__shape thanks-art__shape--arc" />
        <span className="thanks-art__shape thanks-art__shape--triangle" />
        <span className="thanks-art__shape thanks-art__shape--dot thanks-art__shape--dot-1" />
        <span className="thanks-art__shape thanks-art__shape--dot thanks-art__shape--dot-2" />
        <span className="thanks-art__shape thanks-art__shape--dot thanks-art__shape--dot-3" />
        <span className="thanks-art__shape thanks-art__shape--dot thanks-art__shape--dot-4" />
        <span className="thanks-art__sheen" />
      </div>
      <div className="thanks-frame">

        <p className="eyebrow">{thanks.eyebrow}</p>

        <blockquote className="thanks-quote">
          <h2>{thanks.title}</h2>
          <p className="thanks-subtitle">{thanks.subtitle}</p>
        </blockquote>

        <ul className="thanks-credits">
          {credits.map((credit, index) => (
            <li className="thanks-credit" key={index}>
              {findCreditAvatar(credit.name, guestIndex) ? (
                <span
                  className="thanks-avatar thanks-avatar--photo"
                  aria-hidden="true"
                >
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
