import React from "react";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";

/**
 * Cabins showcase.
 *
 * The novios (couple) see the full catalogue of all four cabins plus the
 * private tour video. Any other guest with lodging in one of the showcased
 * cabins sees only their own cabin (plus the shared tour video). Guests
 * without a cabin in the catalogue see nothing here.
 */
export function Cabins() {
  const { t, profile } = useApp();
  const showcase = t.accommodation?.cabinsShowcase;
  if (!showcase) return null;

  const guest = profile?.guest;
  const isNovio = Boolean(guest?.isNovio);

  // Full catalogue: the main unit (azalea) plus the additional units.
  const allCabins = [showcase, ...(showcase.additionalUnits || [])];

  // For non-novios, resolve the single cabin assigned to this guest.
  let cabinsToShow = allCabins;
  if (!isNovio) {
    const key = getGuestCabinKey(guest);
    const own = key ? allCabins.find((cabin) => cabin.key === key) : null;
    if (!own) return null;
    cabinsToShow = [own];
  }

  return (
    <section className="cabins-showcase section" id="cabins">
      {cabinsToShow.map((cabin) => (
        <CabinUnit key={cabin.key} cabin={cabin} eyebrow={showcase.eyebrow} />
      ))}
      <div className="cabins-private-video reveal">
        <p className="eyebrow">{showcase.privateVideoEyebrow}</p>
        <h3>{showcase.privateVideoTitle}</h3>
        <div className="video-frame">
          <iframe
            src="https://www.youtube.com/embed/zf0zhZihub4"
            title={showcase.privateVideoTitle}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function CabinUnit({ cabin, eyebrow }) {
  const photos = MEDIA.cabins[cabin.key] || [];
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
