import React, { useState, useEffect, useRef } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Weekend() {
  const { t } = useApp();
  const weekend = t.weekend || {};
  const nav = t.nav || {};

  return (
    <section className="weekend-section section">
      {/* ── Slide 1 · banner + the three days, one full-height slide ── */}
      <div className="weekend-slide">
        <div className="weekend-banner">
          <img src={MEDIA.weekendBanner} alt="" loading="lazy" decoding="async" />
          <div className="weekend-banner-content">
            <div className="section-heading reveal">
              <p className="eyebrow">{weekend.eyebrow}</p>
              <h2>{weekend.title}</h2>
              <p>{weekend.intro}</p>
            </div>
            <div className="weekend-dates" aria-hidden="true">
              <span className="weekend-date weekend-date--side">19 · 02 · 27</span>
              <span className="weekend-date weekend-date--center">20 · 02 · 27</span>
              <span className="weekend-date weekend-date--side">21 · 02 · 27</span>
            </div>

          </div>
        </div>

        {/* The three day cards sit side-by-side on desktop and form a
            swipeable horizontal strip on mobile. */}
        <ScheduleCarousel items={weekend.items} />

        <nav className="weekend-nav weekend-nav--light" aria-label="Weekend navigation">
          <a className="weekend-nav-link" href="#attire">
            <span>{nav.attire}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </div>
    </section>
  );

}

export function WeekendProgram() {
  const { t } = useApp();
  const weekend = t.weekend || {};
  const programs = [weekend.friday, weekend.saturday, weekend.sunday].filter(Boolean);

  return <DayProgramSlideset programs={programs} />;
}

// The detailed programme is a full-height slide with its own menu entry
// ("programme"). It is laid out as a flex column: a header (eyebrow + title)
// pinned to the top, the day-program slideset centered, and a footer nav
// pinned to the bottom.
function DayProgramSlideset({ programs }) {
  const { t } = useApp();
  const weekend = t.weekend || {};
  const nav = t.nav || {};
  const [active, setActive] = useState(0);
  const [warningOpen, setWarningOpen] = useState(false);
  const [programActive, setProgramActive] = useState(false);
  const programTrackRef = useRef(null);
  const sectionRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const count = programs.length;
  const current = programs[active] || {};
  // The FAB warning modal always shows the same traffic disclaimer (the
  // Saturday note about the Guadalajara access), regardless of the day that
  // is currently active in the programme slideset.
  const traffic = weekend.saturday || {};


  useEffect(() => {
    programTrackRef.current
      ?.querySelector(".day-program-slide.is-active")
      ?.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);

  // Show the warning FAB only while the programme section is in view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;
    let latestEntry = null;
    const sync = () => setProgramActive(Boolean(latestEntry?.isIntersecting));
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      sync();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll + Escape + focus trap while the warning modal is open.
  useEffect(() => {
    if (!warningOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setWarningOpen(false);
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
  }, [warningOpen]);

  return (
    <section className="weekend-program section" ref={sectionRef}>
      <div className="weekend-program__header">
        <div className="section-heading reveal">
          <div className="weekend-program__eyebrow-row">
            <button
              type="button"
              className={`day-program-slideset__arrow${active === 0 ? " is-hidden" : ""}`}
              onClick={() => setActive((a) => (a - 1 + count) % count)}
              aria-label="Día anterior"
              tabIndex={active === 0 ? -1 : 0}
            >
              ←
            </button>
            <p className="eyebrow">{current.eyebrow}</p>
            <button
              type="button"
              className={`day-program-slideset__arrow${active === count - 1 ? " is-hidden" : ""}`}
              onClick={() => setActive((a) => (a + 1) % count)}
              aria-label="Día siguiente"
              tabIndex={active === count - 1 ? -1 : 0}
            >
              →
            </button>
          </div>
          <h2>{current.title}</h2>
          {current.citation && <p className="programme-citation">{current.citation}</p>}
        </div>
      </div>


      <div className="day-program-slideset">
        <div className="day-program-slideset__track" ref={programTrackRef}>
          {programs.map((program, index) => (
            <div
              key={index}
              className={`day-program-slide${index === active ? " is-active" : ""}`}
              aria-hidden={index !== active}
            >
              <DayProgram program={program} index={index} />
            </div>
          ))}
        </div>
        <div className="day-program-slideset__nav">
          <div className="day-program-slideset__dots">
            {programs.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`day-program-slideset__dot${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`Ir al día ${i + 1}`}
                aria-current={i === active}
              />
            ))}
          </div>
        </div>

      </div>

      {/* In-page warning / info panel (desktop). The long travel disclaimer
          (e.g. the Guadalajara note) lives here instead of cluttering the
          header citation. */}
      {current.warning && (
        <div className="weekend-program__warning">
          <span className="weekend-program__warning-icon" aria-hidden="true">
            <WarningIcon />
          </span>
          <p>{current.warning}</p>
        </div>
      )}

      <nav className="weekend-nav weekend-nav--light" aria-label="Programme navigation">
        <a className="weekend-nav-link" href="#accommodation">
          <span>{nav.accommodation}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Warning modal (mobile). Always shows the same traffic disclaimer
          (the Saturday Guadalajara note), independent of the active day. */}
      {traffic.warning && (
        <div
          className={`weekend-warning-shell${warningOpen ? " is-open" : ""}`}
          role={warningOpen ? "dialog" : undefined}
          aria-modal={warningOpen ? "true" : undefined}
          aria-label={warningOpen ? traffic.title : undefined}
          onMouseDown={(event) => {
            if (warningOpen && event.target === event.currentTarget) setWarningOpen(false);
          }}
        >
          <div className="weekend-warning-panel" ref={panelRef}>
            <button
              ref={closeRef}
              className="weekend-warning__close"
              type="button"
              aria-label="Close"
              onClick={() => setWarningOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow weekend-warning__eyebrow">{traffic.eyebrow}</p>
            <p className="weekend-warning__title">{traffic.title}</p>
            <p className="weekend-warning__body">{traffic.warning}</p>

          </div>
        </div>
      )}

      {/* Warning FAB (mobile) */}
      {traffic.warning && (
        <button
          ref={fabRef}
          className={`weekend-warning-fab${programActive && !warningOpen ? " is-visible" : ""}`}
          type="button"
          aria-label={traffic.title}
          aria-haspopup="dialog"
          onClick={() => setWarningOpen(true)}
        >
          <WarningIcon />
        </button>
      )}

    </section>
  );
}

/* Warning / info icon for the disclaimer panel and FAB. */
function WarningIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        d="M32 8 58 52H6L32 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M32 24v14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="46" r="2.5" fill="currentColor" />
    </svg>
  );
}




// The three day cards sit side-by-side on desktop (a 3-column grid). On mobile
// they become a 1-slide slideset: only one card is visible at a time, with
// arrows + dots to navigate and touch swipe support.
function ScheduleCarousel({ items }) {
  const [active, setActive] = useState(0);
  const count = items.length;
  const touchStartX = useRef(null);

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) setActive((a) => Math.min(count - 1, a + 1));
    else setActive((a) => Math.max(0, a - 1));
  };

  return (
    <div className="schedule-carousel" id="weekend-schedule">
      <div
        className="schedule-grid"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={`schedule-slide${index === active ? " is-active" : ""}`}
            aria-hidden={index !== active}
          >
            <ScheduleItem item={item} index={index} />
          </div>
        ))}
      </div>

      {/* Slideset navigation (mobile only) */}
      <div className="schedule-carousel__nav" aria-label="Schedule slides">
        <button
          className="schedule-carousel__arrow"
          type="button"
          aria-label="Previous"
          disabled={active === 0}
          onClick={() => setActive((a) => Math.max(0, a - 1))}
        >
          ←
        </button>
        <div className="schedule-carousel__dots">
          {items.map((_, index) => (
            <button
              key={index}
              className={`schedule-carousel__dot${active === index ? " is-active" : ""}`}
              type="button"
              aria-label={`Slide ${index + 1}`}
              aria-current={active === index ? "true" : undefined}
              onClick={() => setActive(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <button
          className="schedule-carousel__arrow"
          type="button"
          aria-label="Next"
          disabled={active === count - 1}
          onClick={() => setActive((a) => Math.min(count - 1, a + 1))}
        >
          →
        </button>
      </div>
    </div>
  );
}


function ScheduleItem({ item, index }) {
  return (
    <article className="schedule-item reveal">
      <p className="schedule-day">{item.day}</p>
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </article>
  );
}



function DayProgram({ program }) {
  return (
    <div className="day-program reveal">
      <ol className="day-program-timeline">
        {program.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            <time>{item.time}</time>
            <div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
