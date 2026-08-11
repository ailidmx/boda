import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { getGuest } from "../guests.js";

import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { loadThanksCredits } from "../thanks.js";



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

// Resolve a credit to the live guest record (full name + photo) strictly by
// its guestId (the agreed schema). No fuzzy name matching — if the guestId
// doesn't resolve, the credit falls back to its own name with no photo.
function resolveCredit(credit) {
  if (credit.guestId) {
    const guest = getGuest(credit.guestId);
    if (guest) {
      const { fullName } = resolveGuestName(guest);
      const photo = resolveGuestPhoto(guest);
      return { name: fullName || credit.name, photo: photo || null };
    }
  }
  return { name: credit.name, photo: null };
}



export function Thanks() {
  const { t, language } = useApp();
  const thanks = t.thanks || {};
  const humor = thanks.humor || [];

  // Credits are sourced from the Firestore `thanks` collection (the source of

  // truth), not from hardcoded content. Each document carries a `guest` ID and
  // the localized role/thanks text for the active language.
  const [credits, setCredits] = React.useState([]);

  React.useEffect(() => {
    let active = true;
    loadThanksCredits(language).then((loaded) => {
      if (active) setCredits(loaded);
    });
    return () => {
      active = false;
    };
  }, [language]);

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
          {credits.map((credit, index) => {
            const resolved = resolveCredit(credit);
            return (

              <li className="thanks-credit" key={index}>
                {resolved.photo ? (
                  <span
                    className="thanks-avatar thanks-avatar--photo"
                    aria-hidden="true"
                  >
                    <img
                      src={resolved.photo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                ) : (
                  <span className="thanks-avatar" aria-hidden="true">
                    {initialsOf(resolved.name)}
                  </span>
                )}
                <span className="thanks-credit-text">
                  <strong className="thanks-name">{resolved.name}</strong>
                  <span className="thanks-role">{credit.role}</span>
                </span>
              </li>
            );
          })}
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
