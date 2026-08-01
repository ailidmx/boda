import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { MapCarousel } from "./MapCarousel.jsx";
import { cloudinaryImage } from "../cloudinary.js";

const MAP_IMAGES = {
  venue: [
    {
      src: cloudinaryImage("Captura_de_pantalla_2026-07-31_a_la_s_11.58.29_a.m._eqyghk.png", { width: 1200 }),
      alt: "Mapa 1 · ruta hacia Roca Azul",
    },
    {
      src: cloudinaryImage("Captura_de_pantalla_2026-07-31_a_la_s_11.59.01_a.m._fedfdr.png", { width: 1200 }),
      alt: "Mapa 2 · ruta hacia Roca Azul",
    },
    {
      src: cloudinaryImage("Captura_de_pantalla_2026-07-31_a_la_s_11.59.30_a.m._t05ski.png", { width: 1200 }),
      alt: "Mapa 3 · ruta hacia Roca Azul",
    },
  ],
  beach: [
    {
      src: cloudinaryImage("Captura_de_pantalla_2026-07-31_a_la_s_11.59.57_a.m._lenxjn.png", { width: 1200 }),
      alt: "Mapa · ruta hacia Barra de Navidad",
    },
  ],
};

function RouteNode({ item }) {
  return (
    <article className="route-node">
      <strong>{item.place}</strong>
      <span>{item.duration}</span>
      <small>{item.detail}</small>
    </article>
  );
}

export function Travel() {
  const { t } = useApp();
  const travel = t.travel || {};
  const routes = travel.routes || {};

  return (
    <section className="travel-section section">
      <div className="travel-heading reveal">
        <p className="eyebrow">{travel.eyebrow}</p>
        <h2>{travel.title}</h2>
        <p className="lead">{travel.body}</p>
      </div>

      <div className="travel-layout">
        <ol className="travel-points reveal">
          {travel.points.map((point, index) => (
            <li key={index}>
              <span>0{index + 1}</span>
              <p>{point}</p>
            </li>
          ))}
        </ol>
        <div className="travel-card reveal">
          <span className="travel-route">EUROPE</span>
          <span className="route-line" aria-hidden="true" />
          <span className="travel-route">GDL</span>
          <a className="button button-dark" href="#rsvp">
            {travel.cta}
          </a>
          <small>{travel.ctaNote}</small>
        </div>
      </div>

      <div className="route-map reveal" aria-labelledby="route-map-title">
        <div className="route-map-heading">
          <p className="eyebrow">{routes.eyebrow}</p>
          <h3 id="route-map-title">{routes.title}</h3>
          <p>{routes.note}</p>
        </div>

        <section className="route-subsection">
          <div className="route-subsection-heading">
            <h4>{routes.originsLabel}</h4>
            <p>{routes.maps.venueLabel}</p>
          </div>
          <div className="route-map-diagram">
            <section className="route-group route-origins">
              {routes.origins.map((item, index) => (
                <RouteNode key={index} item={item} />
              ))}
            </section>
            <div className="route-venue">
              <span aria-hidden="true">◆</span>
              <strong>{routes.venue}</strong>
            </div>
          </div>
          <MapCarousel label={routes.maps.venueLabel} images={MAP_IMAGES.venue} />
        </section>

        <section className="route-subsection">
          <div className="route-subsection-heading">
            <h4>{routes.destinationsLabel}</h4>
            <p>{routes.maps.beachLabel}</p>
          </div>
          <div className="route-map-diagram">
            <div className="route-venue">
              <span aria-hidden="true">◆</span>
              <strong>{routes.venue}</strong>
            </div>
            <section className="route-group route-destinations">
              {routes.destinations.map((item, index) => (
                <RouteNode key={index} item={item} />
              ))}
            </section>
          </div>
          <MapCarousel label={routes.maps.beachLabel} images={MAP_IMAGES.beach} />
        </section>
      </div>
    </section>
  );
}
