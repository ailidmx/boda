import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveLiveGuest,
  resolveGuestName,
  resolveGuestPhoto,
} from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomsByCabin } from "../rooms.js";
import { cloudinaryImage } from "../cloudinary.js";
import { ExtraStayCard } from "../features/coast/index.js";

/**
 * Extra stay (Domingo → Martes, "Roca Azul · 2 días más") — shown right after
 * the primary Hébergement section, only when the active guest has an extra
 * cabin assigned (`hosting.xtraCabin`). It mirrors the Hébergement block by
 * reusing the shared `ExtraStayCard` (which drives the same `StayPlanCard`
 * pricing as the primary cabin).
 */
export function ExtraStaySection() {
  const { t, profile, language } = useApp();
  const accommodation = t.accommodation || {};
  const rsvp = t.rsvp || {};
  const option = accommodation.guestOption || {};
  const rsvpPayment = rsvp.payment || {};

  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  // Extra stay resolvers (mirror the primary cabin's, but read the
  // `xtraCabin` / `xtraRoom` / `isXtraCabinPaidByNovios` fields).
  const getXtraCabinId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    const mXtraCabin = mHosting.xtraCabin || source?.xtraCabin;
    const mXtraRoom = mHosting.xtraRoom || source?.xtraRoom;
    const mRoom = mXtraRoom ? getRoom(mXtraRoom) : null;
    return mRoom?.cabin || mXtraCabin;
  };
  const getXtraRoomId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    return source?.hosting?.xtraRoom || source?.xtraRoom;
  };
  const resolveXtraCovered = (member) => {
    const source = resolveLiveGuest(member);
    return (
      source?.hosting?.isXtraCabinPaidByNovios ??
      source?.isXtraCabinPaidByNovios
    );
  };
  const resolveXtraPaid = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isXtraCabinPaid ?? source?.isXtraCabinPaid;
  };

  const [activeMemberId, setActiveMemberId] = useState(null);
  const activeMember = activeMemberId
    ? guests.find((m) => m.id === activeMemberId) || profile?.guest
    : profile?.guest;
  const liveActive = resolveLiveGuest(activeMember) || activeMember;
  const extraCabinId = getXtraCabinId(liveActive);
  const extraCabin = getCabin(extraCabinId);

  // No pre-assigned extra cabin → render nothing.
  if (!extraCabin) return null;

  const extraRoom = getXtraRoomId(liveActive);
  const extraStay = { eyebrow: rsvpPayment.extraCabinTitle || option.eyebrow };
  const extraCabinName = extraCabin?.name?.replace(/\s+/g, " ") || extraCabinId;

  const rawXtraCloudinaryIds = extraCabin?.cloudinaryIds;
  const xtraCloudinaryIdList = Array.isArray(rawXtraCloudinaryIds)
    ? rawXtraCloudinaryIds
    : typeof rawXtraCloudinaryIds === "string"
      ? rawXtraCloudinaryIds.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
  const extraCabinPhotos = xtraCloudinaryIdList.map((id) =>
    cloudinaryImage(`boda/${id}`, { width: 1200 }),
  );
  const extraPaidByCouple = resolveXtraCovered(liveActive);

  // Extra cabin occupancy (grouped by room, like the primary Hébergement).
  const extraCabinRooms = extraCabin ? getRoomsByCabin(extraCabin.id) : [];
  const extraCabinOccupants = extraCabin
    ? getActiveGuests()
        .filter((candidate) => getXtraCabinId(candidate) === extraCabin.id)
        .map((candidate) => {
          const source = resolveLiveGuest(candidate);
          const xtraRoomId = source?.hosting?.xtraRoom || source?.xtraRoom;
          return {
            id: candidate.id,
            name: resolveGuestName(candidate).fullName,
            photo: resolveGuestPhoto(candidate),
            roomId: xtraRoomId,
            covered:
              source?.hosting?.isXtraCabinPaidByNovios ??
              source?.isXtraCabinPaidByNovios,
          };
        })
        .filter((candidate) => candidate.name)
    : [];
  const extraRoomOccupants = extraCabinRooms.map((cabinRoom) => ({
    room: cabinRoom,
    occupants: extraCabinOccupants.filter((o) => o.roomId === cabinRoom.id),
  }));

  return (
    <section className="accommodation-section section story-bg" id="extra-stay">
      <div className="coast-plan">
        <ExtraStayCard
          guests={guests}
          activeMember={activeMember}
          profileGuest={profile?.guest}
          liveActive={liveActive}
          extraCabin={extraCabin}
          extraCabinName={extraCabinName}
          extraCabinPhotos={extraCabinPhotos}
          extraPaidByCouple={extraPaidByCouple}
          extraRoomOccupants={extraRoomOccupants}
          extraRoom={extraRoom}
          extraStay={extraStay}
          option={option}
          language={language}
          getXtraCabinId={getXtraCabinId}
          getXtraRoomId={getXtraRoomId}
          resolveXtraCovered={resolveXtraCovered}
          resolveXtraPaid={resolveXtraPaid}
          onSelectMember={setActiveMemberId}
        />
      </div>
    </section>
  );
}

export default ExtraStaySection;
