import React from "react";
import { useApp } from "../context/AppContext.jsx";

export function Weather() {
  const { t } = useApp();
  const weather = t.weather || {};

  return (
    <section className="weather-section section" id="weather">
      <div className="weather-heading reveal">
        <div>
          <p className="eyebrow">{weather.eyebrow}</p>
          <h2>{weather.title}</h2>
        </div>
        <p className="lead">{weather.body}</p>
        <div className="weather-sun" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="weather-facts">
        {weather.facts.map((fact, index) => (
          <article className="weather-fact reveal" key={index}>
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
            <small>{fact.note}</small>
          </article>
        ))}
      </div>

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

      <p className="weather-disclaimer">{weather.disclaimer}</p>
    </section>
  );
}
