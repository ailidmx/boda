import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { MapCarousel } from "./MapCarousel.jsx";
import { MAP_IMAGES } from "../mapImages.js";

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

        {/* ── GO TO ROCA AZUL: origins → venue ─────────────────────── */}
        <section className="route-subsection route-subsection--to-venue">
          <div className="route-subsection-heading">
            <h4>{routes.toVenueLabel}</h4>
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
          {/* The venue map carousel sits inline on desktop, right after the
              yellow venue node, so the route and its maps read together. */}
          <MapCarousel
            variant="inline"
            label={routes.maps.venueLabel}
            images={MAP_IMAGES.venue}
          />
        </section>

        {/* ── GO TO THE PLAYA: venue → destinations ────────────────── */}
        <section className="route-subsection route-subsection--to-beach">
          <div className="route-subsection-heading">
            <h4>{routes.toBeachLabel}</h4>
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
