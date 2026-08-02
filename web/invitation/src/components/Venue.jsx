import React, { useState, useEffect, useRef } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { ROCA_AZUL_GALLERY, wixUrl, wixOriginal } from "../rocaAzulGallery.js";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";

// Large, decorative icons for each facility card (Albercas, Deporte,
// Jardines, Cabañas). Kept inline so they inherit currentColor and stay
// crisp at any size.
const FACILITY_ICONS = [
  // Albercas — waves / pool
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M8 20c6 0 6 4 12 4s6-4 12-4 6 4 12 4 6-4 12-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M8 32c6 0 6 4 12 4s6-4 12-4 6 4 12 4 6-4 12-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M8 44c6 0 6 4 12 4s6-4 12-4 6 4 12 4 6-4 12-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>,
  // Deporte — tennis ball / sport
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M32 10c-8 8-8 36 0 44M32 10c8 8 8 36 0 44" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M10 32h44" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>,
  // Jardines — tree / garden
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M32 8c-8 10-14 16-14 24a14 14 0 0 0 28 0c0-8-6-14-14-24Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M32 46v12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M22 58h20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>,
  // Cabañas — cabin / house
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M8 30 32 10l24 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 27v26h36V27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 53V38h12v15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

// A photo card whose facility content (title + list) appears as an elegant
// overlay on hover (desktop) or on tap (mobile). The photo and its group are
// merged so each card is self-contained and equal-sized.
function FacilityCard({ group, image, icon, index, onOpen }) {
  return (
    <article className="facility-card reveal" key={index}>
      <button
        type="button"
        className="facility-card__media"
        onClick={() => onOpen(index)}
        aria-label={`${group.title} — ver fotos`}
      >
        <img
          src={MEDIA.venue[image.key]}
          alt={image.alt}
          loading="lazy"
          decoding="async"
        />
      </button>
      <div className="facility-card__overlay">
        <span className="facility-card__icon" aria-hidden="true">
          {icon}
        </span>
        <h3>{group.title}</h3>
        <ul>
          {group.items.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

// The presentation video card. It shows a square-cropped YouTube thumbnail
// (no black letterbox bars) and swaps to the real player on click, so the
// vignette keeps the square form of the surrounding cards.
function VideoCard({ title }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="facility-card facility-card--video reveal">
      {playing ? (
        <div className="video-frame">
          <iframe
            src="https://www.youtube.com/embed/oGOgfQGz9tw?rel=0&autoplay=1"
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          className="video-poster"
          onClick={() => setPlaying(true)}
          aria-label={title}
        >
          <img
            src="https://img.youtube.com/vi/oGOgfQGz9tw/hqdefault.jpg"
            alt={title}
            loading="lazy"
            decoding="async"
          />
          <span className="video-play" aria-hidden="true">▶</span>
        </button>
      )}
    </article>
  );
}

// Small autoplaying photo strip rendered as a card in the facility row, just
// before the video. Clicking a photo opens the shared full-screen lightbox.
function RocaGallery({ images, alts, label, onOpen }) {

  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const count = images.length;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 3000);
    return () => clearInterval(id);
  }, [playing, count]);

  // Keep the active photo in view as the strip autoplays. We scroll the
  // gallery container itself (scrollLeft) rather than using scrollIntoView,
  // which would also scroll the whole page back to this section.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.children[active];
    if (!item) return;
    const target = item.offsetLeft - (track.clientWidth - item.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
  }, [active]);

  return (
    <div className="roca-gallery-wrap reveal">
      <article className="facility-card facility-card--gallery">
        <div className="roca-gallery" ref={trackRef} aria-label={label}>
          {images.map((id, index) => (
            <button
              key={id}
              type="button"
              className="roca-gallery-item"
              onClick={() => onOpen(index)}
              aria-label={`${alts[index % alts.length]} — ver en grande`}
            >
              <img
                src={wixUrl(id, 500)}
                alt={alts[index % alts.length]}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
        {/* Play/pause + counter live inside the card so the card keeps the
            same height as the other cards in the row. */}
        <div className="roca-gallery-controls">
          <button
            type="button"
            className="roca-gallery-toggle"
            aria-pressed={!playing}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="roca-gallery-count">
            {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>
      </article>
    </div>
  );
}



// The six cards (4 facility cards + photo carousel + video) are shown as a
// slideset of two slides, each holding three cards in a single row. Only one
// slide is visible at a time, with prev/next + dot navigation below. The
// slideset autoplays slowly (6s per slide) and offers a play/pause toggle.
function FacilitySlideset({ slides }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const count = slides.length;

  // Slow autoplay: advance one slide every 6 seconds while playing.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 6000);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <div className="facility-slideset">
      <div className="facility-slideset__track">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`facility-slide${i === active ? " is-active" : ""}`}
            aria-hidden={i !== active}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="facility-slideset__nav">
        <button
          type="button"
          className="facility-slideset__arrow"
          onClick={() => setActive((a) => (a - 1 + count) % count)}
          aria-label="Anterior"
        >
          ←
        </button>
        <div className="facility-slideset__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`facility-slideset__dot${i === active ? " is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              aria-current={i === active}
            />
          ))}
        </div>
        <button
          type="button"
          className="facility-slideset__arrow"
          onClick={() => setActive((a) => (a + 1) % count)}
          aria-label="Siguiente"
        >
          →
        </button>
        <button
          type="button"
          className="facility-slideset__toggle"
          aria-pressed={!playing}
          aria-label={playing ? "Pausar" : "Reproducir"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
    </div>
  );
}



export function Venue() {
  const { t } = useApp();
  const facilities = t.facilities || {};


  // Full-screen lightbox state. `lightbox` holds { images, startIndex } or null.
  const [lightbox, setLightbox] = useState(null);

  // Build the venue gallery slide set (full-res URLs for the lightbox).
  const venueSlides = ROCA_AZUL_GALLERY.map((id, index) => ({
    src: wixUrl(id, 500),
    full: wixOriginal(id),
    alt: facilities.rocaGalleryAlts[index % facilities.rocaGalleryAlts.length],
  }));

  // Build the facility photo slide set (the 4 facility photos).
  const facilitySlides = facilities.gallery.map((image, index) => ({
    src: MEDIA.venue[image.key],
    full: MEDIA.venue[image.key],
    alt: image.alt,
  }));

  return (
    <section className="facilities-section section">
      {/* ── Single slide · heading + photo-cards + gallery ───────────── */}
      <div className="venue-slide venue-slide--one">
        <div className="experience-heading reveal">
          {/* Row 1: eyebrow on the left, venue link on the right */}
          <div className="experience-heading-row">
            <p className="eyebrow">{facilities.eyebrow}</p>
            <a
              className="venue-location-link reveal"
              href="https://maps.app.goo.gl/2KvGys1BMDbpiZkF7"
              target="_blank"
              rel="noreferrer"
            >
              {EVENT.venue} · {EVENT.place} ↗
            </a>
          </div>
          {/* Row 2: title on the left, citation on the right */}
          <div className="experience-heading-row experience-heading-row--main">
            <h2>{facilities.title}</h2>
            <p className="lead facilities-lead">{facilities.body}</p>
          </div>
        </div>


        {/* The six cards (4 facility cards + photo carousel + video) are shown
            as a slideset of two slides, each holding three cards in a single
            row. Only one slide is visible at a time, with prev/next + dot
            navigation below. */}
        <FacilitySlideset
          slides={[
            // Slide 1: the first three facility cards (Albercas, Deporte,
            // Jardines) in one row.
            facilities.groups.slice(0, 3).map((group, index) => (
              <FacilityCard
                key={index}
                group={group}
                image={facilities.gallery[index]}
                icon={FACILITY_ICONS[index % FACILITY_ICONS.length]}
                index={index}
                onOpen={(i) => setLightbox({ images: facilitySlides, startIndex: i })}
              />
            )),
            // Slide 2: the last facility card (Cabañas) + the photo carousel
            // + the video, in one row.
            <>
              {facilities.groups.slice(3).map((group, index) => {
                const i = index + 3;
                return (
                  <FacilityCard
                    key={i}
                    group={group}
                    image={facilities.gallery[i]}
                    icon={FACILITY_ICONS[i % FACILITY_ICONS.length]}
                    index={i}
                    onOpen={(idx) => setLightbox({ images: facilitySlides, startIndex: idx })}
                  />
                );
              })}
              {/* Photo slideset card (cabañas photos), one photo visible at a time */}
              <RocaGallery
                images={ROCA_AZUL_GALLERY}
                alts={facilities.rocaGalleryAlts}
                label={facilities.rocaGalleryLabel}
                onOpen={(i) => setLightbox({ images: venueSlides, startIndex: i })}
              />
              {/* The presentation video, back in a card within the grid. It
                  shows a square thumbnail and swaps to the player on click. */}
              <VideoCard title={facilities.videoTitle} />
            </>,
          ]}
        />








        <a
          className="venue-gallery-source"
          href="https://www.clubrocaazul.com/"
          target="_blank"
          rel="noreferrer"
        >
          {facilities.gallerySource} ↗
        </a>

        <div className="venue-privacy reveal">
          <span className="venue-privacy__icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
              <rect x="14" y="26" width="36" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
              <path d="M22 26v-6a10 10 0 0 1 20 0v6" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="32" cy="38" r="3" fill="currentColor" />
              <path d="M32 41v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h3>{facilities.privacyTitle}</h3>
            {/* Render each sentence of the privacy note on its own line. */}
            {facilities.privacyBody.split(". ").map((sentence, i, arr) => (
              <p key={i}>{i < arr.length - 1 ? `${sentence}.` : sentence}</p>
            ))}
          </div>

        </div>
        <p className="facilities-note">{facilities.note}</p>

        <nav className="venue-nav venue-nav--dark" aria-label="Venue navigation">
          <a className="venue-nav-link" href="#weekend">
            <span>{facilities.navContinue}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </div>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={lightbox ? lightbox.images : []}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={facilities.rocaGalleryLabel}
      />
    </section>
  );
}
