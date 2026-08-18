import React from "react";

import {
  COAST_AIRBNB_SEARCH_URL,
  COAST_AIRBNB_SUGGESTIONS,
  COAST_HOTEL_SUGGESTIONS,
  MXN_PER_EUR,
  formatPrice,
} from "./data.js";

// Coast accommodation suggestions — mirrors the Accommodation "no cabin"
// pattern: an Airbnb section (one listing per group size) and a hotel section
// (a short selection ordered by price).
export function CoastSuggestions({ suggestions, language }) {
  if (!suggestions?.title) return null;

  return (
    <div className="coast-suggestions reveal">
      <div className="section-heading">
        <p className="eyebrow">{suggestions.eyebrow}</p>
        <h3>{suggestions.title}</h3>
        <blockquote className="coast-suggestions-citation">
          {suggestions.body}
        </blockquote>
      </div>

      <section className="accommodation-airbnb">
        <h4>{suggestions.airbnbTitle}</h4>
        <p>{suggestions.airbnbBody}</p>
        <p className="accommodation-market-price">
          <span>{suggestions.airbnbAreaPrice}</span>
          <strong>≈ {formatPrice(1800, language)} MXN</strong>
          <small>
            ≈ {formatPrice(1800 / MXN_PER_EUR, language)} € ·{" "}
            {suggestions.perNight} · {suggestions.beforeTaxes}
          </small>
        </p>
        <div className="accommodation-airbnb-list">
          {COAST_AIRBNB_SUGGESTIONS.map((listing) => (
            <a
              className="accommodation-stay-card"
              href={listing.url}
              key={listing.name}
              target="_blank"
              rel="noreferrer"
              style={{ "--stay-image": `url("${listing.image}")` }}
            >
              <span
                className="accommodation-airbnb-rating"
                aria-label={`${suggestions.airbnbRating} ${listing.rating}`}
              >
                ★ {listing.rating}
              </span>
              <strong>{listing.name}</strong>
              <span className="accommodation-airbnb-facts">
                {listing.guests} {suggestions.airbnbGuests} ·{" "}
                {listing.bedrooms} {suggestions.airbnbBedrooms} ·{" "}
                {listing.beds} {suggestions.airbnbBeds}
              </span>
              <span className="accommodation-stay-price">
                <span>{suggestions.fromPrice}</span>
                <strong>≈ {formatPrice(listing.price, language)} MXN</strong>
                <small>
                  ≈ {formatPrice(listing.price / MXN_PER_EUR, language)} € ·{" "}
                  {suggestions.perNight}
                </small>
              </span>
              <span className="accommodation-airbnb-link">
                {suggestions.airbnbView} ↗
              </span>
            </a>
          ))}
        </div>
        <a
          className="accommodation-airbnb-search"
          href={COAST_AIRBNB_SEARCH_URL}
          target="_blank"
          rel="noreferrer"
        >
          {suggestions.airbnbSearchAll} ↗
        </a>
      </section>

      <section className="accommodation-airbnb accommodation-hotels">
        <h4>{suggestions.hotelTitle}</h4>
        <p>{suggestions.hotelBody}</p>
        <div className="accommodation-airbnb-list">
          {COAST_HOTEL_SUGGESTIONS.map((hotel) => (
            <a
              className="accommodation-hotel-card accommodation-stay-card"
              href={hotel.url}
              key={hotel.name}
              target="_blank"
              rel="noreferrer"
              style={{ "--stay-image": `url("${hotel.image}")` }}
            >
              <span className="accommodation-hotel-type">
                {suggestions.hotelTypes?.[hotel.type]}
              </span>
              <strong>{hotel.name}</strong>
              <span className="accommodation-airbnb-facts">
                {suggestions.hotelLocation}: {hotel.location}
              </span>
              <span className="accommodation-stay-price">
                <span>{suggestions.fromPrice}</span>
                <strong>≈ {formatPrice(hotel.price, language)} MXN</strong>
                <small>
                  ≈ {formatPrice(hotel.price / MXN_PER_EUR, language)} € ·{" "}
                  {suggestions.perNight}
                </small>
              </span>
              <span className="accommodation-airbnb-link">
                {suggestions.hotelView} ↗
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CoastSuggestions;
