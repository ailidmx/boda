import React, { useState, useEffect, useRef } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { ROCA_AZUL_GALLERY, wixUrl, wixOriginal } from "../rocaAzulGallery.js";
import { useApp } from "../context/AppContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";

const YOUTUBE_IFRAME_API = "https://www.youtube.com/iframe_api";
let youtubeApiPromise;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousReadyHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try {
          previousReadyHandler?.();
        } finally {
          resolve(window.YT);
        }
      };

      let script = document.querySelector(`script[src="${YOUTUBE_IFRAME_API}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = YOUTUBE_IFRAME_API;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("error", () => reject(new Error("YouTube API failed to load")), { once: true });
    });
  }

  return youtubeApiPromise;
}

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

function PrivacyLockIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="14" y="26" width="36" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M22 26v-6a10 10 0 0 1 20 0v6" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="38" r="3" fill="currentColor" />
      <path d="M32 41v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
function VideoCard({ title, onPlaybackChange }) {
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef(null);
  const origin = encodeURIComponent(window.location.origin);

  useEffect(() => {
    if (!playing || !iframeRef.current) return undefined;

    let disposed = false;
    let player;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (disposed || !iframeRef.current) return;
        player = new YT.Player(iframeRef.current, {
          events: {
            onStateChange: ({ data }) => {
              if (data === YT.PlayerState.PLAYING) {
                onPlaybackChange(true);
              } else if (
                data === YT.PlayerState.PAUSED
                || data === YT.PlayerState.ENDED
                || data === YT.PlayerState.CUED
              ) {
                onPlaybackChange(false);
              }
            },
            onError: () => onPlaybackChange(false),
          },
        });
      })
      .catch(() => onPlaybackChange(false));

    return () => {
      disposed = true;
      player?.destroy?.();
    };
  }, [playing, onPlaybackChange]);

  return (
    <article className="facility-card facility-card--video reveal">
      {playing ? (
        <div className="video-frame">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/oGOgfQGz9tw?rel=0&autoplay=1&enablejsapi=1&origin=${origin}`}
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
          onClick={() => {
            onPlaybackChange(true);
            setPlaying(true);
          }}
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



// Desktop groups the six cards into two pages of three. Mobile shows one card
// per slide (4:3) so each facility reads clearly on a small screen.
function FacilitySlideset({ items, playbackPaused = false }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 899px)").matches);
  const pageSize = mobile ? 1 : 3;
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  const count = pages.length;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Changing breakpoint changes the number of pages. Return to the first page
  // so no stale desktop index can point beyond the mobile/desktop page set.
  useEffect(() => {
    setActive(0);
  }, [mobile]);

  // Slow autoplay: give guests time to read each pair of facility cards.
  useEffect(() => {
    if (!playing || playbackPaused) return undefined;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 10000);
    return () => clearInterval(id);
  }, [playing, playbackPaused, count]);

  return (
    <div className="facility-slideset">
      <div className="facility-slideset__track">
        {pages.map((page, i) => (
          <div
            key={i}
            className={`facility-slide${i === active ? " is-active" : ""}`}
            aria-hidden={i !== active}
          >
            {page}
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
          {pages.map((_, i) => (
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
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [venueActive, setVenueActive] = useState(false);
  const [venueVideoPlaying, setVenueVideoPlaying] = useState(false);
  const sectionRef = useRef(null);
  const privacyFabRef = useRef(null);
  const privacyPanelRef = useRef(null);
  const privacyCloseRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    let latestEntry = null;
    const syncVisibility = () => {
      setVenueActive(Boolean(latestEntry?.isIntersecting));
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!privacyOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const trigger = privacyFabRef.current;
    document.body.style.overflow = "hidden";
    privacyCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPrivacyOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(privacyPanelRef.current?.querySelectorAll("button:not([disabled])") || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [privacyOpen]);

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

  const facilityItems = [
    ...facilities.groups.map((group, index) => (
      <FacilityCard
        key={`facility-${index}`}
        group={group}
        image={facilities.gallery[index]}
        icon={FACILITY_ICONS[index % FACILITY_ICONS.length]}
        index={index}
        onOpen={(i) => setLightbox({ images: facilitySlides, startIndex: i })}
      />
    )),
    <RocaGallery
      key="roca-gallery"
      images={ROCA_AZUL_GALLERY}
      alts={facilities.rocaGalleryAlts}
      label={facilities.rocaGalleryLabel}
      onOpen={(i) => setLightbox({ images: venueSlides, startIndex: i })}
    />,
    <VideoCard
      key="venue-video"
      title={facilities.videoTitle}
      onPlaybackChange={setVenueVideoPlaying}
    />,
  ];

  return (
    <section className="facilities-section section story-bg" ref={sectionRef}>
      {/* ── Arty background scene · symbolic geography of Roca Azul ────
          A decorative layer behind the content: a glowing sun, layered
          mountain silhouettes and a lake reflection. Purely visual
          (pointer-events: none) and hidden from assistive tech. */}
      <div className="venue-scene" aria-hidden="true">
        <span className="venue-scene__sun" />
        <span className="venue-scene__sun-disc" />
        <span className="venue-scene__mountains venue-scene__mountains--far" />
        <span className="venue-scene__mountains venue-scene__mountains--near" />
        <span className="venue-scene__lake" />
        <span className="venue-scene__motif venue-scene__motif--left" />
        <span className="venue-scene__motif venue-scene__motif--right" />
      </div>


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


        <FacilitySlideset items={facilityItems} playbackPaused={venueVideoPlaying} />








        <a
          className="venue-gallery-source"
          href="https://www.clubrocaazul.com/"
          target="_blank"
          rel="noreferrer"
        >
          {facilities.gallerySource} ↗
        </a>

        <div
          className={`venue-privacy-shell${privacyOpen ? " is-mobile-open" : ""}`}
          role={privacyOpen ? "dialog" : undefined}
          aria-modal={privacyOpen ? "true" : undefined}
          aria-label={privacyOpen ? facilities.privacyTitle : undefined}
          onMouseDown={(event) => {
            if (privacyOpen && event.target === event.currentTarget) setPrivacyOpen(false);
          }}
        >
          <div className="venue-privacy reveal" ref={privacyPanelRef}>
            <button
              ref={privacyCloseRef}
              className="venue-privacy__close"
              type="button"
              aria-label="Close"
              onClick={() => setPrivacyOpen(false)}
            >
              ×
            </button>
            <div className="venue-privacy__header">
              <span className="venue-privacy__icon" aria-hidden="true">
                <PrivacyLockIcon />
              </span>
              <h3>{facilities.privacyTitle}</h3>
            </div>
            <div className="venue-privacy__body">
              {/* Render each sentence of the privacy note on its own line. */}
              {facilities.privacyBody.split(". ").map((sentence, i, arr) => (
                <p key={i}>{i < arr.length - 1 ? `${sentence}.` : sentence}</p>
              ))}
            </div>
          </div>
        </div>

        <button
          ref={privacyFabRef}
          className={`venue-privacy-fab${venueActive && !privacyOpen ? " is-visible" : ""}`}
          type="button"
          aria-label={facilities.privacyTitle}
          aria-haspopup="dialog"
          onClick={() => setPrivacyOpen(true)}
        >
          <PrivacyLockIcon />
        </button>

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
