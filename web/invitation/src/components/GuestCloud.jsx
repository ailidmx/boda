import React, { useEffect, useMemo, useRef, useState } from "react";
import { getActiveGuests } from "../guests.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { useApp } from "../context/AppContext.jsx";

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

const BASE_SCROLL_SPEED = 0.028;
const FAST_SCROLL_SPEED = 0.085;
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
    String(fullName || "").trim()
    || [first, middle, last, maternal].filter(Boolean).join(" ")
  );
}

export function GuestCloud() {
  const { t } = useApp();
  const cloud = t.thanks?.guestCloud || {};
  const [nameMode, setNameMode] = useState(NAME_MODES.full);

  const tags = useMemo(() => {
    const guests = shuffle(getActiveGuests());
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
  }, [nameMode]);

  // ── Avatar carousel ─────────────────────────────────────────────────────
  // Collect every guest that has an uploaded avatar photo (Cloudinary id).
  const avatars = useMemo(() => {
    const guests = shuffle(getActiveGuests());
    return guests
      .map((guest) => {
        const photo = resolveGuestPhoto(guest);
        if (!photo) return null;
        const { fullName, firstName } = resolveGuestName(guest);
        const name = (fullName || firstName || guest.firstName || "").trim();
        return { id: guest.id, photo, name: name || "Invitado" };
      })
      .filter(Boolean);
  }, []);

  const viewportRef = useRef(null);
  const userInteractingRef = useRef(false);
  const speedRef = useRef(BASE_SCROLL_SPEED);
  const idleTimerRef = useRef(null);

  const carouselItems = useMemo(() => {
    if (avatars.length <= 1) return avatars;
    return [...avatars, ...avatars];
  }, [avatars]);

  const markInteracting = () => {
    userInteractingRef.current = true;
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      userInteractingRef.current = false;
    }, INTERACTION_IDLE_MS);
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
      if (loopWidth > 0 && userInteractingRef.current === false) {
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
      window.clearTimeout(idleTimerRef.current);
    };
  }, [avatars.length]);

  const hasCarousel = avatars.length > 0;

  return (
    <section className="guest-cloud-section section" id="guests">
      <div className="guest-cloud-frame">
        <p className="eyebrow">{cloud.eyebrow}</p>
        <h2 className="guest-cloud-title">{cloud.title}</h2>
        {cloud.subtitle && (
          <p className="guest-cloud-subtitle">{cloud.subtitle}</p>
        )}

        <div className="guest-cloud-mode" role="group" aria-label={cloud.modeGroupLabel || "Guest name mode"}>
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
          onMouseEnter={() => {
            speedRef.current = FAST_SCROLL_SPEED;
          }}
          onMouseLeave={() => {
            speedRef.current = BASE_SCROLL_SPEED;
          }}
        >
          <div
            ref={viewportRef}
            className="guest-avatar-carousel__viewport"
            onScroll={markInteracting}
            onPointerDown={markInteracting}
            onTouchStart={markInteracting}
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
        </div>
      )}
    </section>
  );
}
