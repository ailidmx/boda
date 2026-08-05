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

        {/* The three day cards autoplay as a carousel with a pause/play button. */}
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
  const programTrackRef = useRef(null);
  const count = programs.length;
  const current = programs[active] || {};

  useEffect(() => {
    programTrackRef.current
      ?.querySelector(".day-program-slide.is-active")
      ?.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);

  return (
    <section className="weekend-program section">
      <div className="weekend-program__header">
        <div className="section-heading reveal">
          <p className="eyebrow">{current.eyebrow}</p>
          <div className="weekend-program__title-row">
            <button
              type="button"
              className={`day-program-slideset__arrow${active === 0 ? " is-hidden" : ""}`}
              onClick={() => setActive((a) => (a - 1 + count) % count)}
              aria-label="Día anterior"
              tabIndex={active === 0 ? -1 : 0}
            >
              ←
            </button>
            <h2>{current.title}</h2>
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
          {current.warning && <p className="programme-citation">{current.warning}</p>}
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

      <nav className="weekend-nav weekend-nav--light" aria-label="Programme navigation">
        <a className="weekend-nav-link" href="#accommodation">
          <span>{nav.accommodation}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}




// The three day cards autoplay one at a time, with a pause/play button and a
// slide counter. Clicking a card jumps to the matching detailed programme.
function ScheduleCarousel({ items }) {
  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState(0);
  const touchStartRef = useRef(null);
  const count = items.length;

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setActive((current) => (
      deltaX < 0
        ? (current + 1) % count
        : (current - 1 + count) % count
    ));
  };

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 6000);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <div className="schedule-carousel" id="weekend-schedule">
      <div
        className="schedule-grid"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStartRef.current = null; }}
      >
        {items.map((item, index) => (
          <ScheduleItem
            key={index}
            item={item}
            index={index}
            active={index === active}
          />
        ))}
      </div>
      <div className="schedule-carousel-controls">
        <button
          type="button"
          className="schedule-carousel-toggle"
          aria-pressed={!playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="schedule-carousel-count">
          {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function ScheduleItem({ item, index, active }) {
  return (
    <article className={`schedule-item reveal${active ? " is-active" : ""}`}>
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
