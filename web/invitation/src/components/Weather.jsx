import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";

export function Weather() {
  const { t } = useApp();
  const weather = t.weather || {};
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [weatherActive, setWeatherActive] = useState(false);
  const [mobileSlide, setMobileSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches,
  );
  const sectionRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const touchStartX = useRef(null);
  const slideCount = 2;

  // Track the breakpoint so the weather-day reveal animation only plays when
  // slide 2 (the moments) is active on mobile, while staying always-on for
  // desktop where the slideset is not used.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);


  const goToSlide = (index) => {
    setMobileSlide(Math.max(0, Math.min(slideCount - 1, index)));
  };

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

  // Swipe support: track a horizontal drag on the slideset track and change
  // the active slide when the swipe crosses a threshold.
  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 40) return; // ignore taps / small movements
    if (deltaX < 0) {
      goToSlide(mobileSlide + 1); // swipe left → next
    } else {
      goToSlide(mobileSlide - 1); // swipe right → previous
    }
  };

  return (
    <section className="weather-section section story-bg" ref={sectionRef}>
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
          section stays compact. On desktop both render in their usual layout.
          Big arrows sit on the left/right edges, vertically centred, and the
          slides are swipable. */}
      <div className="weather-slideset">
        <button
          className="weather-slideset__arrow weather-slideset__arrow--prev"
          type="button"
          aria-label="Previous"
          disabled={mobileSlide === 0}
          onClick={() => goToSlide(mobileSlide - 1)}
        >
          ←
        </button>

        <div
          className="weather-slideset__track"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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
            <div className={`weather-day${!isMobile || mobileSlide === 1 ? " reveal" : ""}`}>
              <div className="weather-moments">
                {weather.moments.map((moment, index) => (
                  <article className="weather-moment reveal" key={index}>
                    <strong>{moment.time}</strong>
                    <span>{moment.title}</span>
                    <small>{moment.body}</small>
                  </article>
                ))}
              </div>
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

        <button
          className="weather-slideset__arrow weather-slideset__arrow--next"
          type="button"
          aria-label="Next"
          disabled={mobileSlide === slideCount - 1}
          onClick={() => goToSlide(mobileSlide + 1)}
        >
          →
        </button>
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
        data-analytics="fab.weather.advice"
        onClick={() => setAdviceOpen(true)}
      >

        <span aria-hidden="true">☀</span>
      </button>
    </section>
  );
}
