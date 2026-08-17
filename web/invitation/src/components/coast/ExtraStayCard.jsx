import React from "react";

import { resolveGuestName, resolveGuestPhoto } from "../../guest-profiles.js";
import { CabinOccupancy } from "../CabinOccupancy.jsx";
import { StayPlanCard } from "../StayPlanCard.jsx";
import { getInitials } from "./data.js";

// Extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday) — shown only when
// the active guest has an extra cabin assigned for the second stay. Reuses the
// same StayPlanCard as the Hébergement section so the pricing, "paid by the
// couple" banner, and on-sale styling match.
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
  resolveXtraPaid,
  onSelectMember,
}) {
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
            <figure className="accommodation-photo" key={index}>
              <img src={photo} alt="" loading="lazy" decoding="async" />
              <figcaption>
                <span>{extraCabinName}</span>
                <small>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(extraCabinPhotos.length).padStart(2, "0")}
                </small>
              </figcaption>
            </figure>
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
      <StayPlanCard
        activeMember={liveActive}
        groupMembers={guests}
        getAssignedCabinId={getXtraCabinId}
        getAssignedRoomId={getXtraRoomId}
        resolveMemberCovered={resolveXtraCovered}
        resolveMemberPaid={resolveXtraPaid}
        option={option}
        language={language}
        showExtraCabinRow={false}
        extraCabin={extraCabin}
        extraRoom={extraRoom}
      />
    </div>
  );
}

export default ExtraStayCard;
