import React, { useState, useEffect } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Weekend() {
  const { t } = useApp();
  const weekend = t.weekend || {};

  // The detailed programme is one slide per day (Friday, Saturday, Sunday).
  const programs = [weekend.friday, weekend.saturday, weekend.sunday].filter(
    Boolean,
  );

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
          <a className="weekend-nav-link" href="#weekend-program">
            <span>{weekend.navProgram}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </div>

      {/* ── Slides 2–4 · detailed programme, one slide per day ───────── */}
      <DayProgramSlideset programs={programs} />
    </section>
  );

}

// The detailed programme is a full-height slide with its own menu entry
// ("programme"). It is laid out as a flex column: a header (eyebrow + title)
// pinned to the top, the day-program slideset centered, and a footer nav
// pinned to the bottom.
function DayProgramSlideset({ programs }) {
  const { t } = useApp();
  const weekend = t.weekend || {};
  const [active, setActive] = useState(0);
  const count = programs.length;
  const current = programs[active] || {};

  return (
    <section className="weekend-program section" id="weekend-program">
      <div className="weekend-program__header">
        <div className="section-heading reveal">
          <p className="eyebrow">{current.eyebrow}</p>
          <h2>{current.title}</h2>
          {current.warning && <p className="programme-citation">{current.warning}</p>}
        </div>
      </div>


      <div className="day-program-slideset">
        <div className="day-program-slideset__track">
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
          <button
            type="button"
            className="day-program-slideset__arrow"
            onClick={() => setActive((a) => (a - 1 + count) % count)}
            aria-label="Día anterior"
          >
            ←
          </button>
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
          <button
            type="button"
            className="day-program-slideset__arrow"
            onClick={() => setActive((a) => (a + 1) % count)}
            aria-label="Día siguiente"
          >
            →
          </button>
        </div>
      </div>

      <nav className="weekend-nav weekend-nav--light" aria-label="Programme navigation">
        <a className="weekend-nav-link" href="#attire">
          <span>{weekend.navProgram}</span>
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
  const count = items.length;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 3500);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <div className="schedule-carousel" id="weekend-schedule">
      <div className="schedule-grid">
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

