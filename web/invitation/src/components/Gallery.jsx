import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

export function Gallery() {
  const { t } = useApp();
  const gallery = t.gallery || {};
  const photos = MEDIA.gallery || [];

  return (
    <section className="gallery-section section" id="gallery">
      <div className="gallery-heading reveal">
        <p className="eyebrow">{gallery.eyebrow}</p>
        <h2>{gallery.title}</h2>
        <p className="lead">{gallery.body}</p>
      </div>

      <div className="photo-gallery">
        {(() => {
          const rows = [];
          for (let i = 0; i < photos.length; i += 3) {
            const chunk = photos.slice(i, i + 3);
            rows.push(
              <div className="gallery-row" key={i}>
                {chunk.map((src, index) => (
                  <a
                    className="gallery-item"
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    key={index}
                  >
                    <img
                      src={src}
                      alt={gallery.alts[(i + index) % gallery.alts.length]}
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                ))}
              </div>,
            );
          }
          return rows;
        })()}
      </div>
    </section>
  );
}
