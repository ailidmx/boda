import React, { useMemo, useState } from "react";
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

  const hasCarousel = avatars.length > 0;

  // Render a single avatar card (used twice for the seamless marquee loop).
  const renderAvatar = (av, key) => (
    <figure className="guest-avatar-card" key={key}>
      <img
        className="guest-avatar-card__img"
        src={av.photo}
        alt={av.name}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="guest-avatar-card__name">{av.name}</figcaption>
    </figure>
  );

  return (
    <div className="guest-cloud-section story-bg">
      <div className="guest-cloud-frame">

        <div className="section-heading guest-cloud-heading">
          <p className="eyebrow">{cloud.eyebrow}</p>
          <h2 className="guest-cloud-title">{cloud.title}</h2>
          {cloud.subtitle && (
            <p className="guest-cloud-subtitle">{cloud.subtitle}</p>
          )}
        </div>

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
        >
          <div className="guest-avatar-carousel__viewport">
            <div className="guest-avatar-carousel__track">
              <div className="guest-avatar-carousel__half">
                {avatars.map((av) => renderAvatar(av, `${av.id}-a`))}
              </div>
              <div className="guest-avatar-carousel__half">
                {avatars.map((av) => renderAvatar(av, `${av.id}-b`))}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="section-nav guest-cloud-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#gift">
          <span>{cloud.navNext}</span>
        </a>
      </nav>
    </div>
  );
}

