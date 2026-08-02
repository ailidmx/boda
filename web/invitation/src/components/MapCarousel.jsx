import React, { useState, useEffect } from "react";
import { LightboxCarousel } from "./LightboxCarousel.jsx";

// A slow autoplaying map carousel with prev/next + dots, a play/pause toggle,
// and a click-to-open full-screen lightbox so each map can be viewed large.
// The `variant` prop lets callers place the carousel inline on desktop (e.g.
// right after the venue node) instead of on its own row.
export function MapCarousel({ label, images, variant }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const count = images.length;

  const goTo = (index) => {
    setActiveIndex((index + count) % count);
  };

  // Slow autoplay: advance one map every 5 seconds while playing.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActiveIndex((a) => (a + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [playing, count]);

  // Build the full-size slide set for the lightbox.
  const lightboxSlides = images.map((image) => ({
    src: image.src,
    full: image.full || image.src,
    alt: image.alt,
  }));

  return (
    <div className={`map-carousel-group${variant ? ` map-carousel-group--${variant}` : ""}`}>
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
                <button
                  type="button"
                  className="map-carousel-slide__open"
                  onClick={() => setLightbox({ startIndex: index })}
                  aria-label={`${image.alt} — ver en grande`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
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
        <button
          className="map-carousel-toggle"
          type="button"
          aria-pressed={!playing}
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>

      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={lightboxSlides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={label}
      />
    </div>
  );
}
