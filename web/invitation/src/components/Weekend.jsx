import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Weekend() {
  const { t } = useApp();
  const weekend = t.weekend || {};

  return (
    <section className="weekend-section section">
      <div className="weekend-banner">
        <img src={MEDIA.weekendBanner} alt="" loading="lazy" decoding="async" />
        <div className="weekend-banner-content">
          <div className="section-heading reveal">
            <p className="eyebrow">{weekend.eyebrow}</p>
            <h2>{weekend.title}</h2>
            <p>{weekend.intro}</p>
          </div>
        </div>
      </div>

      <div className="schedule-grid">
        {weekend.items.map((item, index) => (
          <ScheduleItem key={index} item={item} />
        ))}
      </div>

      <div className="saturday-program reveal">
        <div className="saturday-program-heading">
          <p className="eyebrow">{weekend.saturday.eyebrow}</p>
          <h3>{weekend.saturday.title}</h3>
          <p className="arrival-warning">{weekend.saturday.warning}</p>
        </div>
        <ol className="saturday-timeline">
          {weekend.saturday.items.map((item, index) => (
            <li key={index}>
              <time>{item.time}</time>
              <div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScheduleItem({ item, index }) {
  return (
    <article className="schedule-item reveal">
      <span className="schedule-number">0{index + 1}</span>
      <p className="schedule-day">{item.day}</p>
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </article>
  );
}
