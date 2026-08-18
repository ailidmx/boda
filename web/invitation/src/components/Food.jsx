import React, { useEffect, useRef, useState } from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";
import { StarVote } from "./StarVote.jsx";


// Decorative icon for the drinks policy panel (a raised glass / toast).
function DrinksIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M20 8h24l-4 22a8 8 0 0 1-16 0Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 38v14M24 56h16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 14h20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Food() {

  const { t } = useApp();
  const food = t.food || {};
  const flavours = food.flavours || [];

  // Drinks policy: FAB-activated modal on all screen sizes.

  const [drinksOpen, setDrinksOpen] = useState(false);
  const [drinksActive, setDrinksActive] = useState(false);
  const sectionRef = useRef(null);
  const drinksFabRef = useRef(null);
  const drinksCloseRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    let latestEntry = null;
    const syncVisibility = () => {
      setDrinksActive(Boolean(latestEntry?.isIntersecting));
      if (!latestEntry?.isIntersecting) setDrinksOpen(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    if (!drinksOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const trigger = drinksFabRef.current;
    document.body.style.overflow = "hidden";
    drinksCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrinksOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [drinksOpen]);

  return (
    <section className="food-section section story-bg" id="food" ref={sectionRef}>
      <div className="experience-heading reveal">
        <p className="eyebrow">{food.eyebrow}</p>
        <h2>{food.title}</h2>
        <p className="accommodation-citation">{food.body}</p>
      </div>

      <SwipeCardCarousel className="flavours-grid" label={food.flavoursTitle}>
        {flavours.map((flavour, index) => (
          <article className="flavour-card reveal" key={index}>
            {MEDIA.food[flavour.key] ? (
              <img
                src={MEDIA.food[flavour.key]}
                alt={flavour.title}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flavour-card__illustration" aria-hidden="true">
                <span>{food.flavourPlaceholder}</span>
              </div>
            )}
            {flavour.key === "taquiza" && MEDIA.food.donaCarmen && (
              <img
                className="flavour-card__badge"
                src={MEDIA.food.donaCarmen}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
              />
            )}

            <div>
              {flavour.type && food.flavourType?.[flavour.type] ? (
                <span className={`flavour-card__type flavour-card__type--${flavour.type}`}>
                  {food.flavourType[flavour.type]}
                </span>
              ) : null}
              <h3>{flavour.title}</h3>
              <p>{flavour.body}</p>
            </div>
            <StarVote cardType="food" cardKey={flavour.key} />
          </article>

        ))}
      </SwipeCardCarousel>

      <p className="experience-note reveal">{food.note}</p>


      {/* Drinks policy — FAB-activated modal on all screen sizes. The
          inline card is hidden; a FAB opens a full overlay. */}
      <article className="drinks-policy reveal">

        <div className="drinks-policy__header">
          <span className="drinks-policy__icon" aria-hidden="true">
            <DrinksIcon />
          </span>
          <div className="drinks-policy__heading">
            <p className="eyebrow">{food.drinks.eyebrow}</p>
            <h3>{food.drinks.title}</h3>
          </div>
        </div>
        <div className="drinks-policy__body">
          <p>{food.drinks.body}</p>
          <p className="drinks-policy-note">{food.drinks.note}</p>
        </div>
      </article>


      <div className="drinks-policy-shell" aria-hidden={!drinksOpen}>
        <div className="drinks-policy-panel" role="dialog" aria-modal="true" aria-label={food.drinks.title}>
          <button
            type="button"
            className="drinks-policy-close"
            ref={drinksCloseRef}
            aria-label="Close"
            onClick={() => setDrinksOpen(false)}
          >
            ×
          </button>
          <p className="eyebrow drinks-policy-eyebrow">{food.drinks.eyebrow}</p>
          <h3>{food.drinks.title}</h3>
          <p className="drinks-policy">{food.drinks.body}</p>
          <p className="drinks-policy-note">{food.drinks.note}</p>
        </div>
      </div>

      <button
        type="button"
        className={`drinks-policy-fab${drinksActive ? " is-visible" : ""}`}
        ref={drinksFabRef}
        aria-label={food.drinks.title}
        data-analytics="fab.food.drinks"
        onClick={() => setDrinksOpen(true)}
      >

        <span>🍸</span>
      </button>

      {/* Desktop-only bottom nav: leads to the music section. */}
      <nav className="section-nav food-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#guisos">
          <span>{t.nav.music}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
