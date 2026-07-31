import React, { useState } from "react";

export function MapCarousel({ label, images }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = images.length;

  const goTo = (index) => {
    setActiveIndex((index + count) % count);
  };

  return (
    <div className="map-carousel-group">
      <h4>{label}</h4>
      <div className="map-carousel">
        <button
          className="map-carousel-arrow map-carousel-arrow--prev"
          type="button"
          aria-label="Previous"
          onClick={() => goTo(activeIndex - 1)}
        >
          ‹
        </button>
        <div className="map-carousel-viewport">
          <div className="map-carousel-track">
            {images.map((image, index) => (
              <figure
                className="map-carousel-slide"
                key={index}
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <button
          className="map-carousel-arrow map-carousel-arrow--next"
          type="button"
          aria-label="Next"
          onClick={() => goTo(activeIndex + 1)}
        >
          ›
        </button>
        <div className="map-carousel-dots">
          {images.map((_, index) => (
            <button
              className="map-carousel-dot"
              type="button"
              aria-label={`Map ${index + 1}`}
              aria-current={index === activeIndex}
              key={index}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
