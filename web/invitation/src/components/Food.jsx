import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";

export function Food() {
  const { t } = useApp();
  const food = t.food || {};

  return (
    <section className="food-section section">
      <div className="experience-heading reveal">
        <p className="eyebrow">{food.eyebrow}</p>
        <h2>{food.title}</h2>
        <p className="lead">{food.body}</p>
      </div>

      <div className="flavours-heading reveal">
        <p className="eyebrow">{food.flavoursEyebrow}</p>
        <h3>{food.flavoursTitle}</h3>
      </div>

      <SwipeCardCarousel className="flavours-grid" label={food.flavoursTitle}>
        {food.flavours.map((flavour, index) => (
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
                <span>Pizza</span>
              </div>
            )}
            <div>
              <h3>{flavour.title}</h3>
              <p>{flavour.body}</p>
            </div>
          </article>
        ))}
      </SwipeCardCarousel>

      <details className="photo-credits reveal">
        <summary>{food.photoCredits}</summary>
        <p>
          <a href="https://commons.wikimedia.org/wiki/File:Taco_de_carnitas.jpg" target="_blank" rel="noreferrer">Carnitas — Padaguan, CC BY-SA 3.0</a> ·
          <a href="https://commons.wikimedia.org/wiki/File:Taquiza_en_el_DF.jpg" target="_blank" rel="noreferrer">Taquiza — El Mono Español, CC BY-SA 3.0</a> ·
          <a href="https://commons.wikimedia.org/wiki/File:Tejuino_tapat%C3%ADo_y_sus_complementos.jpg" target="_blank" rel="noreferrer">Tejuino — Salvador alc, CC BY-SA 4.0</a> ·
          <a href="https://commons.wikimedia.org/wiki/File:Nopalitos_(cactus_salad).jpg" target="_blank" rel="noreferrer">Nopalitos — Madman2001, CC BY-SA 4.0</a> ·
          <a href="https://commons.wikimedia.org/wiki/File:Guacamole_-_La_Casa_Restaurant_-_January_2023_-_Sarah_Stierch.jpg" target="_blank" rel="noreferrer">Guacamole — Sarah Stierch, CC BY 4.0</a>
        </p>
      </details>

      <div className="food-grid">
        {food.days.map((day, index) => (
          <article className="food-day reveal" key={index}>
            <p className="food-day-label">{day.day}</p>
            <h3>{day.title}</h3>
            <ul>
              {day.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="experience-note reveal">{food.note}</p>

      <article className="drinks-policy reveal">
        <p className="eyebrow">{food.drinks.eyebrow}</p>
        <h3>{food.drinks.title}</h3>
        <p>{food.drinks.body}</p>
        <p className="drinks-policy-note">{food.drinks.note}</p>
      </article>
    </section>
  );
}
