import React, { useEffect, useMemo, useRef, useState } from "react";
import { getActiveGuests } from "../guests.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { resolveRsvpAnswer } from "../rsvp-responses.js";
import { useApp } from "../context/AppContext.jsx";

// A guest counts as "confirmed" for an attendance day when their RSVP scale
// level for that day is ≥ 4 (mirrors the dashboard's RSVP_CONFIRMED_MIN_LEVEL).
const RSVP_CONFIRMED_MIN_LEVEL = 4;
const SATURDAY_QUESTION = "saturday";

// Attendance filter for the guest cloud: "all" shows every guest (including
// those who said no), "saturday" shows only guests confirmed for Saturday.
const FILTER_MODES = {
  all: "all",
  saturday: "saturday",
};


// A small palette of warm, festive tones that echo the wedding's Mexican
// aesthetic (terracotta, marigold, sand, ink, olive).
const PALETTE = [
  "var(--terracotta)",
  "var(--marigold)",
  "var(--ink)",
  "var(--olive, #6b6b3a)",
  "var(--sand)",
  "#b5651d",
];

// Sizes (rem) used to give the cloud its organic, hand-set feel.
const SIZES = [0.85, 1, 1.15, 1.35, 1.6, 1.9, 2.3];

// Slight rotations so the tags feel scattered like a real word cloud.
const ROTATIONS = [-6, -3, 0, 3, 6];

// Fisher–Yates shuffle so the order is different on every visit.
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const NAME_MODES = {
  full: "full",
  first: "first",
  last: "last",
};

// Base auto-scroll speed (px per ms). The faces drift gently but at a pace
// that keeps the carousel feeling alive; the speed slider multiplies it.
const BASE_SCROLL_SPEED = 0.12;


// Speed slider range (multiplier applied to BASE_SCROLL_SPEED). The max is
// deliberately high so the carousel can be cranked up to a fast, lively
// marquee when the guest wants it.
const SPEED_MIN = 1;
const SPEED_MAX = 20;
const SPEED_STEP = 1;
const INTERACTION_IDLE_MS = 1400;



function resolveCloudName(guest, mode) {
  const { firstName, middleName, lastName, maternalLastName, fullName } =
    resolveGuestName(guest);
  const first = String(firstName || guest.nombre || "").trim();
  const middle = String(middleName || guest.nombre2 || "").trim();
  const last = String(lastName || guest.apellido || "").trim();
  const maternal = String(maternalLastName || guest.apellido2 || "").trim();

  if (mode === NAME_MODES.first) {
    return first || fullName || "";
  }

  if (mode === NAME_MODES.last) {
    return [last, maternal].filter(Boolean).join(" ");
  }

  return (
    String(fullName || "").trim() ||
    [first, middle, last, maternal].filter(Boolean).join(" ")
  );
}

export function GuestCloud() {
  const { t } = useApp();
  const cloud = t.thanks?.guestCloud || {};
  const [nameMode, setNameMode] = useState(NAME_MODES.full);
  // Attendance filter: "all" (everyone, incl. those who said no) or
  // "saturday" (only guests confirmed for Saturday). Defaults to "all" so the
  // cloud shows every guest by default.
  const [filterMode, setFilterMode] = useState(FILTER_MODES.all);

  // Apply the attendance filter to the full guest list. In "saturday" mode we
  // keep only guests whose Saturday RSVP scale level is ≥ the confirmed
  // threshold (level 4+). Guests who haven't answered are excluded in that
  // mode (they are not confirmed).
  const filteredGuests = useMemo(() => {
    const all = getActiveGuests();
    if (filterMode === FILTER_MODES.all) return all;
    return all.filter(
      (guest) =>
        resolveRsvpAnswer(guest, SATURDAY_QUESTION) >= RSVP_CONFIRMED_MIN_LEVEL,
    );
  }, [filterMode]);

  const tags = useMemo(() => {
    const guests = shuffle(filteredGuests);
    return guests
      .map((guest) => {
        const name = resolveCloudName(guest, nameMode).trim();
        if (!name) return null;

        const r = Math.random();
        const r2 = Math.random();
        const r3 = Math.random();

        return {
          id: guest.id,
          name,
          size: SIZES[Math.floor(r * SIZES.length)],
          rotation: ROTATIONS[Math.floor(r2 * ROTATIONS.length)],
          color: PALETTE[Math.floor(r3 * PALETTE.length)],
          weight: r > 0.72 ? 700 : 400,
        };
      })
      .filter(Boolean);
  }, [nameMode, filteredGuests]);

  // ── Avatar carousel ─────────────────────────────────────────────────────
  // Collect every guest that has an uploaded avatar photo (Cloudinary id).
  const avatars = useMemo(() => {
    const guests = shuffle(filteredGuests);
    return guests
      .map((guest) => {
        const photo = resolveGuestPhoto(guest);
        if (!photo) return null;
        const { fullName, firstName } = resolveGuestName(guest);
        const name = (fullName || firstName || guest.firstName || "").trim();
        return { id: guest.id, photo, name: name || "Invitado" };
      })
      .filter(Boolean);
  }, [filteredGuests]);


  const viewportRef = useRef(null);
  // True while the guest is actively dragging the carousel (pointer down).
  const isDraggingRef = useRef(false);
  // True briefly after a wheel/trackpad scroll so the auto-scroll doesn't
  // fight the guest's own scrolling.
  const wheelCooldownRef = useRef(false);
  const wheelTimerRef = useRef(null);

  // Play/pause + speed controls for the avatar carousel.
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(BASE_SCROLL_SPEED * 1);

  // Keep the ref in sync with the chosen speed multiplier.
  useEffect(() => {
    speedRef.current = BASE_SCROLL_SPEED * speed;
  }, [speed]);

  const carouselItems = useMemo(() => {
    if (avatars.length <= 1) return avatars;
    return [...avatars, ...avatars];
  }, [avatars]);

  // User interaction is detected via pointer/wheel events only. We deliberately
  // do NOT listen to `scroll`: the auto-scroll itself fires scroll events every
  // frame, which would otherwise pause the marquee and make it stutter.
  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };
  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };
  const handleWheel = () => {
    wheelCooldownRef.current = true;
    window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      wheelCooldownRef.current = false;
    }, INTERACTION_IDLE_MS);
  };


  // Scroll the marquee by roughly one card width (used by the prev/next nav).
  const scrollByCard = (direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const card = viewport.querySelector(".guest-avatar-card");
    const step = card ? card.getBoundingClientRect().width + 20 : 200;
    viewport.scrollLeft += direction * step;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || avatars.length <= 1) return undefined;

    let rafId = 0;
    let lastTs = 0;

    const tick = (ts) => {
      if (!viewport) return;
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;

      const loopWidth = viewport.scrollWidth / 2;
      if (
        loopWidth > 0 &&
        !isDraggingRef.current &&
        !wheelCooldownRef.current &&
        isPlaying
      ) {
        viewport.scrollLeft += dt * speedRef.current;
        if (viewport.scrollLeft >= loopWidth) {
          viewport.scrollLeft -= loopWidth;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(wheelTimerRef.current);
    };

  }, [avatars.length, isPlaying]);

  const hasCarousel = avatars.length > 0;


  return (
    <section className="guest-cloud-section section" id="guests">
      <div className="guest-cloud-frame">
        <p className="eyebrow">{cloud.eyebrow}</p>
        <h2 className="guest-cloud-title">{cloud.title}</h2>
        {cloud.subtitle && (
          <p className="guest-cloud-subtitle">{cloud.subtitle}</p>
        )}

        <div
          className="guest-cloud-mode"
          role="group"
          aria-label={cloud.modeGroupLabel || "Guest name mode"}
        >
          <button
            type="button"
            className={`guest-cloud-mode__btn${nameMode === NAME_MODES.full ? " is-active" : ""}`}
            onClick={() => setNameMode(NAME_MODES.full)}
          >
            {cloud.modeFull || "Nombre completo"}
          </button>
          <button
            type="button"
            className={`guest-cloud-mode__btn${nameMode === NAME_MODES.first ? " is-active" : ""}`}
            onClick={() => setNameMode(NAME_MODES.first)}
          >
            {cloud.modeFirst || "Nombre"}
          </button>
          <button
            type="button"
            className={`guest-cloud-mode__btn${nameMode === NAME_MODES.last ? " is-active" : ""}`}
            onClick={() => setNameMode(NAME_MODES.last)}
          >
            {cloud.modeLast || "Apellidos"}
          </button>
        </div>

        <div
          className="guest-cloud-filter"
          role="group"
          aria-label={cloud.filterGroupLabel || "Filter by attendance"}
        >
          <button
            type="button"
            className={`guest-cloud-filter__btn${filterMode === FILTER_MODES.all ? " is-active" : ""}`}
            onClick={() => setFilterMode(FILTER_MODES.all)}
          >
            {cloud.filterAll || "Todos los invitados"}
          </button>
          <button
            type="button"
            className={`guest-cloud-filter__btn${filterMode === FILTER_MODES.saturday ? " is-active" : ""}`}
            onClick={() => setFilterMode(FILTER_MODES.saturday)}
          >
            {cloud.filterSaturday || "Solo los que vienen el sábado"}
          </button>
        </div>

        <div className="guest-cloud" aria-label={cloud.title}>

          {tags.map((tag) => (
            <span
              key={tag.id}
              className="guest-cloud-tag"
              style={{
                fontSize: `${tag.size}rem`,
                transform: `rotate(${tag.rotation}deg)`,
                color: tag.color,
                fontWeight: tag.weight,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {hasCarousel && (
        <div
          className="guest-avatar-carousel"
          aria-label={cloud.avatarCarouselLabel || "Nuestros invitados"}
        >
          <div
            ref={viewportRef}
            className="guest-avatar-carousel__viewport"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >

            <div className="guest-avatar-carousel__track">
              {carouselItems.map((av, index) => (
                <figure
                  className="guest-avatar-card"
                  key={`${av.id}-${index < avatars.length ? "a" : "b"}`}
                >
                  <img
                    className="guest-avatar-card__img"
                    src={av.photo}
                    alt={av.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="guest-avatar-card__name">
                    {av.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* Carousel controls: play/pause, speed, and prev/next nav. */}
          <div className="guest-avatar-carousel__controls">
            <button
              type="button"
              className="guest-avatar-carousel__btn guest-avatar-carousel__btn--nav"
              aria-label={cloud.carouselPrevLabel || "Anterior"}
              onClick={() => scrollByCard(-1)}
            >
              ‹
            </button>

            <button
              type="button"
              className="guest-avatar-carousel__btn guest-avatar-carousel__btn--play"
              aria-pressed={isPlaying}
              aria-label={isPlaying ? (cloud.carouselPauseLabel || "Pausar") : (cloud.carouselPlayLabel || "Reproducir")}
              onClick={() => setIsPlaying((p) => !p)}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>

            <div
              className="guest-avatar-carousel__speed"
              role="group"
              aria-label={cloud.carouselSpeedLabel || "Velocidad"}
            >
              <span className="guest-avatar-carousel__speed-label">
                {cloud.carouselSpeedLabel || "Velocidad"}
              </span>
              <input
                type="range"
                className="guest-avatar-carousel__speed-slider"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={SPEED_STEP}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label={cloud.carouselSpeedLabel || "Velocidad"}
              />
              <span className="guest-avatar-carousel__speed-value">
                {speed}×
              </span>
            </div>


            <button
              type="button"
              className="guest-avatar-carousel__btn guest-avatar-carousel__btn--nav"
              aria-label={cloud.carouselNextLabel || "Siguiente"}
              onClick={() => scrollByCard(1)}
            >
              ›
            </button>
          </div>
        </div>
      )}

    
      <nav className="section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#thanks">
          <span>{t.nav.thanks}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
</section>
  );
}
