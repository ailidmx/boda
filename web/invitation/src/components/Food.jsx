import React, { useEffect, useRef, useState } from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

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

  // Slideset: 3 cards per slide on desktop, 1 card per slide on mobile.
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 899px)").matches : false
  );
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const pageSize = mobile ? 1 : 3;
  const slides = [];
  const flavours = food.flavours || [];
  for (let i = 0; i < flavours.length; i += pageSize) {
    slides.push(flavours.slice(i, i + pageSize));
  }
  const count = slides.length;

  // Drinks policy: disclosure card on desktop, FAB-activated modal on mobile.
  const [drinksOpen, setDrinksOpen] = useState(false);
  const [drinksActive, setDrinksActive] = useState(false);
  const sectionRef = useRef(null);
  const drinksFabRef = useRef(null);
  const drinksCloseRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    const mobile = window.matchMedia("(max-width: 899px)");
    let latestEntry = null;
    const syncVisibility = () => {
      setDrinksActive(Boolean(mobile.matches && latestEntry?.isIntersecting));
      if (!mobile.matches) setDrinksOpen(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(section);
    mobile.addEventListener?.("change", syncVisibility);
    return () => {
      observer.disconnect();
      mobile.removeEventListener?.("change", syncVisibility);
    };
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

  // Track the breakpoint so the page size (and number of slides) updates.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Changing breakpoint changes the number of slides. Return to the first
  // slide so no stale index can point beyond the current slide set.
  useEffect(() => {
    setActive(0);
  }, [mobile]);

  // Slow autoplay: give guests time to read each slide of flavours.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 10000);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <section className="food-section section" id="food" ref={sectionRef}>
      <div className="experience-heading reveal">
        <p className="eyebrow">{food.eyebrow}</p>
        <h2>{food.title}</h2>
        <p className="accommodation-citation">{food.body}</p>
      </div>

      <div className="flavours-slideset reveal" aria-label={food.flavoursTitle}>
        <div className="flavours-slideset__track">
          {slides.map((slide, slideIndex) => (
            <div
              key={slideIndex}
              className={`flavours-slide${slideIndex === active ? " is-active" : ""}`}
              aria-hidden={slideIndex !== active}
            >
              {slide.map((flavour, index) => (
                <article className="flavour-card" key={index}>
                  {MEDIA.food[flavour.key] ? (
                    <img
                      src={MEDIA.food[flavour.key]}
                      alt={flavour.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flavour-card__illustration" aria-hidden="true">
                      <span>Pizza</span>
                    </div>
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
                </article>

              ))}
            </div>
          ))}
        </div>
        <div className="flavours-slideset__nav">
          <button
            type="button"
            className="flavours-slideset__arrow"
            onClick={() => setActive((a) => (a - 1 + count) % count)}
            aria-label="Anterior"
          >
            ←
          </button>
          <div className="flavours-slideset__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`flavours-slideset__dot${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`${food.flavoursTitle} ${i + 1}`}
                aria-current={i === active}
              />
            ))}
          </div>
          <button
            type="button"
            className="flavours-slideset__arrow"
            onClick={() => setActive((a) => (a + 1) % count)}
            aria-label="Siguiente"
          >
            →
          </button>
          <button
            type="button"
            className="flavours-slideset__toggle"
            aria-pressed={!playing}
            aria-label={playing ? "Pausar" : "Reproducir"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>

      <p className="experience-note reveal">{food.note}</p>


      {/* Drinks policy — disclosure card on desktop, FAB modal on mobile.
          The desktop panel mirrors the venue privacy panel: a decorative
          icon, a header (icon + title) and a body of text. */}
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
        onClick={() => setDrinksOpen(true)}
      >
        <span>🍸</span>
      </button>
    </section>
  );
}
