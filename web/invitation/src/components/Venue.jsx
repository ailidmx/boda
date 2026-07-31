import React from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { ROCA_AZUL_GALLERY, wixUrl } from "../rocaAzulGallery.js";
import { useApp } from "../context/AppContext.jsx";

export function Venue() {
  const { t } = useApp();
  const facilities = t.facilities || {};

  return (
    <section className="facilities-section section" id="venue">
      <div className="experience-heading reveal">
        <p className="eyebrow">{facilities.eyebrow}</p>
        <h2>{facilities.title}</h2>
        <p className="lead facilities-lead">{facilities.body}</p>
      </div>

      <a
        className="venue-location-link reveal"
        href="https://maps.app.goo.gl/2KvGys1BMDbpiZkF7"
        target="_blank"
        rel="noreferrer"
      >
        {EVENT.venue} · {EVENT.place} ↗
      </a>

      <div className="venue-gallery">
        {facilities.gallery.map((image, index) => (
          <figure className="venue-gallery-card reveal" key={index}>
            <img
              src={MEDIA.venue[image.key]}
              alt={image.alt}
              loading="lazy"
              decoding="async"
            />
            <figcaption>{image.title}</figcaption>
          </figure>
        ))}
      </div>

      <a
        className="venue-gallery-source"
        href="https://www.clubrocaazul.com/"
        target="_blank"
        rel="noreferrer"
      >
        {facilities.gallerySource} ↗
      </a>

      <div className="venue-video reveal">
        <div className="video-frame">
          <iframe
            src="https://www.youtube.com/embed/oGOgfQGz9tw"
            title={facilities.videoTitle}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      <div className="roca-gallery" aria-label={facilities.rocaGalleryLabel}>
        {ROCA_AZUL_GALLERY.map((id, index) => (
          <a
            key={id}
            className="roca-gallery-item"
            href={wixUrl(id, 1600)}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={wixUrl(id, 500)}
              alt={facilities.rocaGalleryAlts[index % facilities.rocaGalleryAlts.length]}
              loading="lazy"
              decoding="async"
            />
          </a>
        ))}
      </div>

      <div className="facilities-grid">
        {facilities.groups.map((group, index) => (
          <article className="facility-group reveal" key={index}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="venue-privacy reveal">
        <h3>{facilities.privacyTitle}</h3>
        <p>{facilities.privacyBody}</p>
      </div>
      <p className="facilities-note">{facilities.note}</p>
    </section>
  );
}
