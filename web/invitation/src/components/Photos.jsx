import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

// The PHOTOS section is a single merged section: it opens with the "Notre
// chemin" gallery (dark) and continues into the "PARTAGEZ VOS PHOTOS" upload
// block (light). Both live under the same #photos anchor.
export function Photos() {
  const { t } = useApp();
  const gallery = t.gallery || {};
  const photos = t.photos || {};
  const galleryPhotos = MEDIA.gallery || [];

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
            <a
              className="gallery-item"
              href={src}
              target="_blank"
              rel="noreferrer"
              key={index}
            >
              <img
                src={src}
                alt={gallery.alts[index % gallery.alts.length]}
                loading="lazy"
                decoding="async"
              />
            </a>
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
            <a className="button button-dark photos-upload-btn" href="#rsvp">
              {photos.upload}
            </a>
          </div>

          <div className="photos-during reveal">
            <h3>{photos.duringTitle}</h3>
            <p>{photos.duringBody}</p>
            <a className="button button-dark photos-upload-btn" href="#rsvp">
              {photos.upload}
            </a>
          </div>
        </div>

        <p className="photos-note reveal">{photos.note}</p>
      </div>
    </section>
  );
}
