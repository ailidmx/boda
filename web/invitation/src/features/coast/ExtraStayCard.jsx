import React, { useState } from "react";

import { resolveGuestName, resolveGuestPhoto } from "../../guest-profiles.js";
import { CabinOccupancy } from "../../components/CabinOccupancy.jsx";
import { PaymentSummary } from "../../components/PaymentSummary.jsx";
import { LightboxCarousel } from "../../components/LightboxCarousel.jsx";
import { getInitials } from "./data.js";

// Extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday) — shown only when
// the active guest has an extra cabin assigned for the second stay. The
// payment block reuses the same PaymentSummary as the final RSVP so the
// pricing, avatars, cabin·room labels, "paid by the couple" banner, and
// on-sale styling match exactly.
export function ExtraStayCard({
  guests,
  activeMember,
  profileGuest,
  liveActive,
  extraCabin,
  extraCabinName,
  extraCabinPhotos,
  extraPaidByCouple,
  extraRoomOccupants,
  extraRoom,
  extraStay,
  option,
  language,
  getXtraCabinId,
  getXtraRoomId,
  resolveXtraCovered,
  onSelectMember,
  payment,
  coveredLabel,
}) {
  // Full-screen lightbox for the extra cabin's photo carousel. `photoLightbox`
  // holds the start index or null. The lightbox itself is swipeable.
  const [photoLightbox, setPhotoLightbox] = useState(null);

  // The lightbox slide set (same src for thumbnail and full view).
  const photoSlides = extraCabinPhotos.map((src) => ({ src, full: src }));

  return (
    <div className="coast-extra-stay reveal">
      <p className="eyebrow">{extraStay?.eyebrow}</p>

      {guests.length > 1 && (
        <div
          className="accommodation-member-tabs"
          role="tablist"
          aria-label={option.membersLabel || "Group members"}
        >
          {guests.map((member) => {
            const { firstName } = resolveGuestName(member);
            const memberPhoto = resolveGuestPhoto(member);
            const isActive =
              member.id === (activeMember?.id || profileGuest?.id);
            return (
              <button
                key={member.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`accommodation-member-tab${isActive ? " is-active" : ""}`}
                onClick={() => onSelectMember(member.id)}
              >
                <span
                  className="accommodation-member-tab-avatar"
                  aria-hidden="true"
                >
                  {memberPhoto ? (
                    <img src={memberPhoto} alt="" loading="lazy" />
                  ) : (
                    getInitials(resolveGuestName(member).fullName)
                  )}
                </span>
                <span className="accommodation-member-tab-name">
                  {firstName}
                </span>
                {member.id === profileGuest?.id && (
                  <small>{option.youLabel}</small>
                )}
              </button>
            );
          })}
        </div>
      )}
      <h3>{option.onSiteTitle}</h3>
      {option.onSiteBody && (
        <p className="accommodation-citation">{option.onSiteBody}</p>
      )}
      {extraPaidByCouple && (
        <p className="accommodation-covered-note">
          <strong>{option.onSiteCoveredBody}</strong>
        </p>
      )}
      {extraCabinName && (
        <p className="accommodation-cabin-badge">{extraCabinName}</p>
      )}
      {extraCabinPhotos.length > 0 && (
        <div
          className="accommodation-photo-carousel"
          aria-label={extraCabinName}
        >
          {extraCabinPhotos.map((photo, index) => (
            <button
              className="accommodation-photo"
              type="button"
              key={index}
              onClick={() => setPhotoLightbox(index)}
              aria-label={`${extraCabinName} · ${index + 1} — ver en grande`}
            >
              <img src={photo} alt="" loading="lazy" decoding="async" />
              <figcaption>
                <span>{extraCabinName}</span>
                <small>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(extraCabinPhotos.length).padStart(2, "0")}
                </small>
              </figcaption>
            </button>
          ))}
        </div>
      )}
      {extraRoomOccupants.length > 0 && (
        <div className="accommodation-occupancy-top">
          <CabinOccupancy
            cabinName={extraCabinName}
            rooms={extraRoomOccupants}
            assignedRoomId={extraRoom}
            activeMemberId={liveActive?.id}
            option={option}
            language={language}
          />
        </div>
      )}
      <PaymentSummary
        activeMember={liveActive}
        groupMembers={guests}
        getAssignedCabinId={getXtraCabinId}
        getAssignedRoomId={getXtraRoomId}
        resolveMemberCovered={resolveXtraCovered}
        language={language}
        payment={payment}
        coveredLabel={coveredLabel}
      />

      {/* Full-screen lightbox for the extra cabin's photo carousel. The
          lightbox itself is swipeable (touch, arrows, dots). */}
      <LightboxCarousel
        open={photoLightbox !== null}
        onClose={() => setPhotoLightbox(null)}
        images={photoSlides}
        startIndex={photoLightbox ?? 0}
        label={extraCabinName}
      />
    </div>
  );
}

export default ExtraStayCard;
