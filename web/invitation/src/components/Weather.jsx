import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";

export function Weather() {
  const { t } = useApp();
  const weather = t.weather || {};
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [weatherActive, setWeatherActive] = useState(false);
  const [mobileSlide, setMobileSlide] = useState(0);
  const sectionRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const slideCount = 2;


  // Show the "Qué traer" FAB only while the weather section is in view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    let latestEntry = null;
    const sync = () => setWeatherActive(Boolean(latestEntry?.isIntersecting));
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      sync();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll + Escape + focus trap while the advice modal is open.
  useEffect(() => {
    if (!adviceOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setAdviceOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(panelRef.current?.querySelectorAll("button:not([disabled])") || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      fabRef.current?.focus();
    };
  }, [adviceOpen]);

  return (
    <section className="weather-section section" ref={sectionRef}>
      <div className="weather-heading reveal">
        <div>
          <p className="eyebrow">{weather.eyebrow}</p>
          <h2>{weather.title}</h2>
        </div>
        <p className="weather-citation">{weather.body}</p>
        <div className="weather-sun" aria-hidden="true">
          <span />
        </div>
      </div>

      {/* Mobile: the facts and the moments become a 2-slide slideset so the
          section stays compact. On desktop both render in their usual layout. */}
      <div className="weather-slideset">
        <div className="weather-slideset__track">
          <div
            className={`weather-slideset__slide weather-slideset__slide--facts${mobileSlide === 0 ? " is-active" : ""}`}
          >
            <div className="weather-facts">
              {weather.facts.map((fact, index) => (
                <article className="weather-fact reveal" key={index}>
                  <strong>{fact.value}</strong>
                  <span>{fact.label}</span>
                  <small>{fact.note}</small>
                </article>
              ))}
            </div>
          </div>

          <div
            className={`weather-slideset__slide weather-slideset__slide--moments${mobileSlide === 1 ? " is-active" : ""}`}
          >
            <div className="weather-day reveal">
              <ol className="weather-moments">
                {weather.moments.map((moment, index) => (
                  <li key={index}>
                    <time>{moment.time}</time>
                    <div>
                      <h3>{moment.title}</h3>
                      <p>{moment.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <aside className="weather-advice">
                <h3>{weather.adviceTitle}</h3>
                <ul>
                  {weather.advice.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </div>

        {/* Slideset navigation (mobile only) */}
        <div className="weather-slideset__nav" aria-label="Weather slides">
          <button
            className="weather-slideset__arrow"
            type="button"
            aria-label="Previous"
            disabled={mobileSlide === 0}
            onClick={() => setMobileSlide((s) => Math.max(0, s - 1))}
          >
            ←
          </button>
          <div className="weather-slideset__dots">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                className={`weather-slideset__dot${mobileSlide === index ? " is-active" : ""}`}
                type="button"
                aria-label={`Slide ${index + 1}`}
                aria-current={mobileSlide === index ? "true" : undefined}
                onClick={() => setMobileSlide(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            className="weather-slideset__arrow"
            type="button"
            aria-label="Next"
            disabled={mobileSlide === slideCount - 1}
            onClick={() => setMobileSlide((s) => Math.min(slideCount - 1, s + 1))}
          >
            →
          </button>
        </div>
      </div>


      <nav className="section-nav section-nav--light" aria-label="Continue">
        <a className="section-nav-link" href="#weekend-program">
          <span>{weather.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Advice modal (mobile): the "Qué traer" card opens in a modal. */}
      <div
        className={`weather-advice-shell${adviceOpen ? " is-open" : ""}`}
        role={adviceOpen ? "dialog" : undefined}
        aria-modal={adviceOpen ? "true" : undefined}
        aria-label={adviceOpen ? weather.adviceTitle : undefined}
        onMouseDown={(event) => {
          if (adviceOpen && event.target === event.currentTarget) setAdviceOpen(false);
        }}
      >
        <div className="weather-advice-panel" ref={panelRef}>
          <button
            ref={closeRef}
            className="weather-advice__close"
            type="button"
            aria-label="Close"
            onClick={() => setAdviceOpen(false)}
          >
            ×
          </button>
          <p className="eyebrow weather-advice__eyebrow">{weather.eyebrow}</p>
          <h3>{weather.adviceTitle}</h3>
          <ul>
            {weather.advice.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* Advice FAB (mobile) */}
      <button
        ref={fabRef}
        className={`weather-advice-fab${weatherActive && !adviceOpen ? " is-visible" : ""}`}
        type="button"
        aria-label={weather.adviceTitle}
        aria-haspopup="dialog"
        onClick={() => setAdviceOpen(true)}
      >
        <span aria-hidden="true">☀</span>
      </button>
    </section>
  );
}
