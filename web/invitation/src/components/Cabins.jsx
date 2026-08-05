import React, { useEffect, useState } from "react";
import { MEDIA } from "../media.js";
import { cloudinaryImage } from "../cloudinary.js";
import { useApp } from "../context/AppContext.jsx";
import { loadCabinsShowcase } from "../cabins.js";

/**
 * Cabins showcase.
 *
 * The novios (couple) see the full catalogue of all four cabins plus the
 * private tour video. Any other guest with lodging in one of the showcased
 * cabins sees only their own cabin (plus the shared tour video). Guests
 * without a cabin in the catalogue see nothing here.
 *
 * The showcase descriptions and photo IDs are loaded from the Firestore
 * `cabins` collection (source of truth). Until the DB is populated, the
 * component falls back to the static trilingual content in content.js and the
 * build-time media manifest.
 */
export function Cabins() {
  const { t, profile } = useApp();
  const staticShowcase = t.accommodation?.cabinsShowcase;
  const [dbShowcase, setDbShowcase] = useState(null);

  // Load the DB-sourced showcase once. When the DB has showcase data it
  // overrides the static content; otherwise we keep the static fallback.
  useEffect(() => {
    let cancelled = false;
    loadCabinsShowcase(t.lang || "es").then((units) => {
      if (cancelled) return;
      if (units && units.length > 0) setDbShowcase(units);
    });
    return () => { cancelled = true; };
  }, [t.lang]);

  const showcase = dbShowcase || staticShowcase;
  if (!showcase) return null;

  const guest = profile?.guest;
  const isNovio = Boolean(guest?.isNovio);

  // Full catalogue: the main unit (azalea) plus the additional units.
  // DB-sourced showcase is a flat array; static content nests the main unit
  // with `additionalUnits`. Normalize both into a flat list.
  const allCabins = Array.isArray(showcase)
    ? showcase
    : [showcase, ...(showcase.additionalUnits || [])];

  // For non-novios, resolve the single cabin assigned to this guest.
  let cabinsToShow = allCabins;
  if (!isNovio) {
    const key = getGuestCabinKey(guest);
    const own = key ? allCabins.find((cabin) => cabin.key === key) : null;
    if (!own) return null;
    cabinsToShow = [own];
  }

  // The section eyebrow lives in the static content (it is section-level,
  // not per-cabin), so always read it from there.
  const eyebrow = staticShowcase?.eyebrow;

  return (
    <section className="cabins-showcase section" id="cabins">
      {cabinsToShow.map((cabin) => (
        <CabinUnit key={cabin.key} cabin={cabin} eyebrow={eyebrow} />
      ))}
    </section>
  );
}

function CabinUnit({ cabin, eyebrow }) {
  // Photos come from the DB (Cloudinary IDs) when available; otherwise fall
  // back to the build-time media manifest.
  const photos = cabin.cloudinaryIds?.length
    ? cabin.cloudinaryIds.map((id) => cloudinaryImage(`boda/${id}`, { width: 1200 }))
    : MEDIA.cabins[cabin.key] || [];
  const video = MEDIA.cabinVideos[cabin.key];

  return (
    <article className="cabin-unit">
      <div className="cabin-profile reveal">
        <div className="cabin-profile-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{cabin.title}</h2>
          <p className="lead">{cabin.intro}</p>
        </div>
        <div className="cabin-profile-details">
          <div className="cabin-profile-facts">
            <strong>{cabin.capacity}</strong>
            <span>{cabin.roomsLabel}</span>
            <span>{cabin.bedsLabel}</span>
          </div>
          <ul>
            {(cabin.rooms || []).map((room, index) => (
              <li key={index}>{room}</li>
            ))}
          </ul>
          <p>{cabin.amenities}</p>
        </div>
      </div>
      <div className="cabin-gallery" aria-label={cabin.galleryLabel}>
        {photos.map((photo, index) => (
          <figure className="cabin-gallery-photo reveal" key={index}>
            <img
              src={photo}
              alt={cabin.photoAlts?.[index] || cabin.title}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span>{cabin.title}</span>
              <small>
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </small>
            </figcaption>
          </figure>
        ))}
        {video ? (
          <figure className="cabin-gallery-photo cabin-gallery-video reveal">
            <video
              controls
              playsInline
              preload="metadata"
              poster={photos[0]}
              aria-label={cabin.videoLabel}
            >
              <source src={video} type="video/mp4" />
            </video>
            <figcaption>
              <span>{cabin.title}</span>
              <small>{cabin.videoLabel}</small>
            </figcaption>
          </figure>
        ) : null}
      </div>
      <p className="cabin-profile-note reveal">{cabin.note}</p>
    </article>
  );
}

// Maps a guest's assigned unit to the corresponding cabin-showcase key.
// Returns null when the guest has no cabin or their unit is not in the
// showcase catalogue (e.g. hortencia, lavanda, casona, cabaña_4…6).
function getGuestCabinKey(guest) {
  if (!guest?.hasCabin) return null;
  const unit = String(guest.unit || "").toLowerCase();
  if (unit === "azalea") return "azalea";
  if (unit === "dalia") return "dalia";
  if (unit === "margarita") return "margarita";
  if (/^cabaña_(3[1-4])$/.test(unit)) return "wooden";
  return null;
}
