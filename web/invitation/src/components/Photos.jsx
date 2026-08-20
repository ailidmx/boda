import React, { useEffect, useState } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";


// The PHOTOS section is a single merged section: it opens with the "Notre
// chemin" gallery (dark) and continues into the "PARTAGEZ VOS PHOTOS" upload
// block (light). Both live under the same #photos anchor.
export function Photos() {
  const { t } = useApp();
  const gallery = t.gallery || {};
  const photos = t.photos || {};
  const galleryPhotos = MEDIA.gallery || [];

  // Full-screen lightbox state. `lightbox` holds { startIndex } or null.
  const [lightbox, setLightbox] = useState(null);

  // Build the slide set (same src for thumbnail and full view).
  const gallerySlides = galleryPhotos.map((src, index) => ({
    src,
    full: src,
    alt: gallery.alts[index % gallery.alts.length],
  }));

  // The "after the wedding" album stays locked until the wedding date passes.
  const [isMarried, setIsMarried] = useState(
    () => Date.now() >= new Date(EVENT.weddingDate).getTime()
  );


  useEffect(() => {
    const check = () =>
      setIsMarried(Date.now() >= new Date(EVENT.weddingDate).getTime());
    const interval = window.setInterval(check, 60000);
    return () => window.clearInterval(interval);
  }, []);


  return (
    <section className="photos-section section story-bg" id="photos">
      <div className="photos-gallery-block">
        <div className="gallery-heading section-heading reveal">
          <p className="eyebrow">{gallery.eyebrow}</p>
          <h2>{gallery.title}</h2>
          <blockquote className="gallery-lead-citation">{gallery.body}</blockquote>
        </div>


        <div className="photo-gallery">
          {galleryPhotos.map((src, index) => (
            <button
              className="gallery-item"
              type="button"
              onClick={() => setLightbox({ startIndex: index })}
              aria-label={`${gallery.alts[index % gallery.alts.length]} — ver en grande`}
              key={index}
            >
              <img
                src={src}
                alt={gallery.alts[index % gallery.alts.length]}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      </div>


      <div className="photos-upload-block">


        <div className="photos-heading reveal">
          <h2>{photos.title}</h2>
          <p className="lead photos-lead-citation">{photos.lead}</p>
        </div>

        <div className="photos-cards">
          <div className="photos-before reveal">
            <h3>{photos.beforeTitle}</h3>
            <p>{photos.beforeBody}</p>
            <a
              className="button button-dark photos-upload-btn"
              href={photos.beforeLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {photos.upload}
            </a>
          </div>

          <div
            className={`photos-during reveal${isMarried ? "" : " is-locked"}`}
          >
            <h3>{photos.duringTitle}</h3>
            <p>{photos.duringBody}</p>
            {isMarried ? (
              <a
                className="button button-dark photos-upload-btn"
                href={photos.duringLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {photos.upload}
              </a>
            ) : (
              <>
                <span
                  className="button button-dark photos-upload-btn photos-upload-btn--disabled"
                  aria-disabled="true"
                >
                  {photos.uploadLocked}
                </span>
                <p className="photos-locked-note">{photos.duringLocked}</p>
              </>
            )}
          </div>


        </div>

        <p className="photos-note reveal">{photos.note}</p>
      </div>

      {/* Desktop-only bottom nav: leads to the RSVP section. */}
      <nav className="section-nav section-nav--light photos-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#guests">
          <span>{t.nav.guests}</span>

          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={gallerySlides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={gallery.title}
      />
    </section>
  );
}

