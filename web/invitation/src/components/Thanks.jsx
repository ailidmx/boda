import React, { useEffect, useRef } from "react";

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

// Fisher–Yates shuffle so the credits roll in a different order on every
// visit (the "random infinite loop" feel).
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Base auto-scroll speed for the cinema credits roll (px per ms).
const CREDITS_SCROLL_SPEED = 0.06;
// How long to keep the auto-scroll paused after the guest stops interacting
// (mouse leave / wheel / drag) before it resumes.
const CREDITS_IDLE_MS = 1200;

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

  // ── Cinematic auto-scroll credits roll ──────────────────────────────────
  // The stage auto-scrolls downward like a movie credits roll, but the guest
  // can take over at any time (hover / drag / wheel). Once they stop
  // interacting and move the pointer away, the auto-scroll resumes. When the
  // roll reaches the bottom it loops back to the top (infinite loop).
  const stageRef = useRef(null);
  // True while the pointer is over the stage (guest is "watching" it).
  const hoverRef = useRef(false);
  // True briefly after a wheel/trackpad/drag so auto-scroll doesn't fight the
  // guest's own scrolling.
  const cooldownRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const handleStageEnter = () => {
    hoverRef.current = true;
  };
  const handleStageLeave = () => {
    hoverRef.current = false;
  };
  const handleStageWheel = () => {
    cooldownRef.current = true;
    window.clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setTimeout(() => {
      cooldownRef.current = false;
    }, CREDITS_IDLE_MS);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || credits.length === 0) return undefined;

    let rafId = 0;
    let lastTs = 0;

    const tick = (ts) => {
      if (!stage) return;
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;

      // Auto-scroll only when the guest is NOT hovering and NOT in a
      // post-interaction cooldown.
      if (!hoverRef.current && !cooldownRef.current) {
        const maxScroll = stage.scrollHeight - stage.clientHeight;
        if (maxScroll > 0) {
          stage.scrollTop += dt * CREDITS_SCROLL_SPEED;
          // Infinite loop: when we reach the bottom, jump back to the top.
          if (stage.scrollTop >= maxScroll - 1) {
            stage.scrollTop = 0;
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(cooldownTimerRef.current);
    };
  }, [credits.length]);


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

        {/* Cinematic vertical credits list: a tall stage with a fade mask.
            It auto-scrolls downward like a movie credits roll, but the guest
            can take over at any time (hover / drag / wheel). Once they stop
            interacting and move the pointer away, the auto-scroll resumes.
            The order is shuffled on every visit (random infinite loop). */}
        <div
          ref={stageRef}
          className="thanks-credits-stage"
          onMouseEnter={handleStageEnter}
          onMouseLeave={handleStageLeave}
          onPointerDown={handleStageEnter}
          onPointerUp={handleStageLeave}
          onPointerCancel={handleStageLeave}
          onWheel={handleStageWheel}
        >
          <ul className="thanks-credits">
            {shuffle(credits).map((credit, index) => {
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
        </div>




        <div className="thanks-humor">
          {/* Two identical sets so the -50% translate loops seamlessly. */}
          <div className="thanks-humor-track">
            {[0, 1].map((setIndex) => (
              <div className="thanks-humor-set" key={setIndex} aria-hidden={setIndex === 1}>
                {humor.map((line, index) => (
                  <blockquote className="thanks-humor-line" key={index}>
                    <p>{line}</p>
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
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
    
      <nav className="section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#footer">
          <span>{t.nav.footer}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
</section>
  );
}
