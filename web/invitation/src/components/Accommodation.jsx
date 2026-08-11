import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EVENT } from "../content.js";

import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
  resolveLiveGuest,
} from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomDescription, getRoomsByCabin } from "../rooms.js";
import { cloudinaryImage } from "../cloudinary.js";
import { RsvpQuestion, BOOLEAN_YES, BOOLEAN_NO } from "./RsvpQuestion.jsx";
import { resolveRsvpAnswer, saveRsvpAnswers } from "../rsvp-responses.js";
import { StayPlanCard } from "./StayPlanCard.jsx";
import { CabinOccupancy } from "./CabinOccupancy.jsx";




const AIRBNB_SEARCH_URL = "https://www.airbnb.mx/s/roca-azul/homes?date_picker_type=calendar&checkin=2027-02-19&checkout=2027-02-21&refinement_paths%5B%5D=%2Fhomes&search_type=search_query";
const AIRBNB_SUGGESTIONS = [
  {
    name: "Casa Roca Azul en Jocotepec, Lago Chapala",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 8,
    bedrooms: 3,
    beds: 5,
    rating: "4.0",
  },
  {
    name: "Casa Vista Roca Azul Jocotepec",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 12,
    bedrooms: 4,
    beds: 6,
    rating: "4.54",
  },
  {
    name: "Roca Azul, vecindario agradable cerca de Ajijic",
    url: "https://www.airbnb.mx/rooms/5617577?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 5,
    bedrooms: 2,
    beds: 3,
    rating: "4.68",
  },
];
const HOTEL_SUGGESTIONS = [
  {
    name: "El Chante Spa Hotel",
    url: "https://www.elchantespa.com/",
    image: "https://www.elchantespa.com/img/bg_chapala.jpg",
    location: "Jocotepec",
    type: "spaHotel",
    price: 2000,
  },
  {
    name: "Cosalá Grand Boutique Resort & Spa",
    url: "https://www.cosalagrand.com/",
    image: "https://images-new.pxsol.com/2A1m2dNdG2XVEBIghDhfc1AMd4n5SfERbAkax-Hop0Q/rs:fill:630:430:1/q:80/plain/https%3A%2F%2Ffiles-p.pxsol.com%2F25150%2Fcompany%2Flibrary%2Fuser%2F14205952368dd68e4f0c0cefe337e8b050b752607dd.png@png",
    location: "San Juan Cosalá",
    type: "boutiqueSpa",
    price: 3700,
  },
  {
    name: "Hotel Balneario San Juan Cosalá",
    url: "https://www.hotelspacosala.com/",
    image: "https://static.wixstatic.com/media/a38016_f23f8b18b81a424381d7a612c2988396.jpg/v1/fill/w_696,h_304,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/a38016_f23f8b18b81a424381d7a612c2988396.jpg",
    location: "San Juan Cosalá",
    type: "thermalHotel",
    price: 3300,
  },
];

function getAssignedRoom(candidate) {
  // Resolve the LIVE Firestore record first so the primary cabin occupancy
  // sees every guest sharing the same room/cabin across ALL invitation groups
  // (the static registry has no `hosting` data). Falls back to the static
  // `room` field when no live record is loaded yet.
  const source = resolveLiveGuest(candidate);
  return source?.hosting?.room || source?.room;
}


function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
}

const MXN_PER_EUR = 20;

function formatPrice(amount, language) {
  const locale = language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

/* Two-line price block: line 1 shows MXN, line 2 shows EUR. When the stay is
   covered by the couple, each line shows the original price struck through
   next to the discounted price to pay (red); otherwise it shows the plain
   price. */
function PriceLines({ original, toPay, language, showSale }) {
  return (
    <>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            {formatPrice(original, language)} MXN
          </span>
        )}
        <strong>{formatPrice(toPay, language)} MXN</strong>
      </span>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            ≈ {formatPrice(original / MXN_PER_EUR, language)} €
          </span>
        )}
        <small>≈ {formatPrice(toPay / MXN_PER_EUR, language)} €</small>
      </span>
    </>
  );
}

function AccommodationPrice({ original, toPay, language, covered = false, coveredLabel, showSale }) {
  const isSale = showSale ?? (covered && toPay < original);
  return (
    <dd className={`accommodation-price${isSale ? " is-sale" : ""}`}>
      <span className="accommodation-price-values">
        <PriceLines
          original={original}
          toPay={toPay}
          language={language}
          showSale={isSale}
        />
      </span>
      {covered && <em>{coveredLabel}</em>}
    </dd>
  );
}


/* Price block used inside the plan card rows. When the stay is covered by the
   couple it shows the original price struck through next to the discounted
   price to pay (red); otherwise it shows the plain price. */
function PlanPrice({ original, toPay, language, covered = false }) {
  const showSale = covered && toPay < original;
  return (
    <div className={`accommodation-plan-price${showSale ? " is-sale" : ""}`}>
      <PriceLines
        original={original}
        toPay={toPay}
        language={language}
        showSale={showSale}
      />
    </div>
  );
}



export function Accommodation() {
  const { t, profile, language, interfaceText } = useApp();
  const accommodation = t.accommodation || {};
  const guest = profile?.guest;
  const activeGuests = getActiveGuests();
  const groupMembers = guest ? getGroupMembers(guest, activeGuests) : [];
  const [activeMemberId, setActiveMemberId] = useState(null);
  const activeMember = activeMemberId
    ? groupMembers.find((m) => m.id === activeMemberId) || guest
    : guest;
  // Merge the active member's live Firestore record so the per-person cabin,
  // room, and payment flags are consistent with the group totals below (which
  // also use resolveLiveGuest). This keeps the per-person row stable when
  // switching between members of the same group.
  const liveActive = resolveLiveGuest(activeMember) || activeMember;
  const hosting = liveActive?.hosting || {};
  const assignedCabin =
    hosting.cabin || liveActive?.cabin || liveActive?.cabinLabel || liveActive?.unit || liveActive?.room;
  const assignedRoom = hosting.room || liveActive?.room;
  const extraCabin = hosting.xtraCabin || liveActive?.xtraCabin;
  const extraRoom = hosting.xtraRoom || liveActive?.xtraRoom;
  const room = assignedRoom ? getRoom(assignedRoom) : null;
  const roomDescription = getRoomDescription(room, language);
  const cabinId = room?.cabin || assignedCabin;
  const cabin = getCabin(cabinId);
  const cabinName = cabin?.name?.replace(/\s+/g, " ") || cabinId;

  // Photos come from the DB (Cloudinary IDs). cloudinaryIds may be an array
  // (new format) or a comma-separated string (legacy format).
  const rawCloudinaryIds = cabin?.cloudinaryIds;
  const cloudinaryIdList = Array.isArray(rawCloudinaryIds)
    ? rawCloudinaryIds
    : typeof rawCloudinaryIds === "string"
      ? rawCloudinaryIds.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
  const cabinPhotos = cloudinaryIdList.map((id) =>
    cloudinaryImage(`boda/${id}`, { width: 1200 }),
  );


  const cabinRooms = getRoomsByCabin(cabin?.id || room?.cabin || cabinId);

  const roomOccupants = cabinRooms.map((cabinRoom) => ({
    room: cabinRoom,
    occupants: activeGuests
      .filter((candidate) => getAssignedRoom(candidate) === cabinRoom.id)
      .map((candidate) => ({
        id: candidate.id,
        name: resolveGuestName(candidate).fullName,
        photo: resolveGuestPhoto(candidate),
      }))
      .filter((candidate) => candidate.name),
  }));

  // ── Group accommodation helpers ────────────────────────────────────────
  // Resolve a member's cabin object from their own data, merging the live
  // Firestore record (which carries the effective cabin, room, and payment
  // flags) with the static registry. This is fully independent of which
  // member is currently selected in the tabs, so the group total never
  // changes when switching members.
  const resolveMemberCabin = (member) => {
    const source = resolveLiveGuest(member);
    const mHosting = source?.hosting || {};
    const mAssignedCabin =
      mHosting.cabin ||
      source?.cabin ||
      source?.cabinLabel ||
      source?.unit ||
      source?.room;
    const mAssignedRoom = mHosting.room || source?.room;
    const mRoom = mAssignedRoom ? getRoom(mAssignedRoom) : null;
    const mCabinId = mRoom?.cabin || mAssignedCabin;
    return mCabinId ? getCabin(mCabinId) : null;
  };

  // Whether a member's stay is covered by the couple.
  const resolveMemberCovered = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isCabinPaidByNovios ?? source?.isCabinPaidByNovios;
  };

  // Whether a member's primary stay is already paid.
  const resolveMemberPaid = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isCabinPaid ?? source?.isCabinPaid;
  };

  // Resolve the cabin id assigned to a candidate for the primary stay.
  const getAssignedCabinId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    const mAssignedCabin =
      mHosting.cabin ||
      source?.cabin ||
      source?.cabinLabel ||
      source?.unit ||
      source?.room;
    const mAssignedRoom = mHosting.room || source?.room;
    const mRoom = mAssignedRoom ? getRoom(mAssignedRoom) : null;
    return mRoom?.cabin || mAssignedCabin;
  };

  // Resolve the room id assigned to a candidate for the primary stay.
  const getAssignedRoomId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    return source?.hosting?.room || source?.room;
  };

  // ── Dynamic per-person pricing ─────────────────────────────────────────
  // The per-person price is no longer stored: it is derived from the cabin's
  // total price for two nights divided by the number of occupants. When the
  // cabin is under capacity, the price is split among the actual occupants
  // (e.g. 10 people in a 12-person cabin each pay total/10). When the cabin is
  // at or over capacity, the price is split by the max capacity (e.g. 12 or 20
  // people in a 12-person cabin each pay total/12).
  const cabinPerPersonPrice = (cabinObj, occupantCount) => {
    if (!cabinObj?.totalPrice2Nights) return 0;
    const capacity = cabinObj.capacity || 1;
    const divisor = Math.min(occupantCount, capacity);
    return divisor > 0 ? cabinObj.totalPrice2Nights / divisor : 0;
  };

  // Number of active guests assigned to a given cabin (across all rooms).
  const cabinOccupantCount = (cabinId) =>
    activeGuests.filter((candidate) => {
      const candidateRoom = getAssignedRoom(candidate);
      const candidateCabinId = candidateRoom
        ? getRoom(candidateRoom)?.cabin
        : resolveLiveGuest(candidate)?.hosting?.cabin
          || resolveLiveGuest(candidate)?.cabin
          || resolveLiveGuest(candidate)?.cabinLabel
          || resolveLiveGuest(candidate)?.unit
          || resolveLiveGuest(candidate)?.room;
      return candidateCabinId === cabinId;
    }).length;

  // ── Cabin total price across all occupants ─────────────────────────────
  // A cabin can be shared by guests from different invitation groups (e.g. a
  // couple-covered member and a paying member in the same cabin). The cabin
  // total price must therefore reflect who actually shares the cabin and who
  // is covered by the couple — not just the active member — so a shared cabin
  // where some occupants pay shows the amount those occupants still owe.
  const cabinOccupants = roomOccupants.flatMap(({ occupants }) => occupants);
  const cabinOccupantCovered = (occupantId) => {
    const occupant = activeGuests.find((g) => g.id === occupantId);
    const source = resolveLiveGuest(occupant);
    return source?.hosting?.isCabinPaidByNovios ?? source?.isCabinPaidByNovios;
  };
  // Dynamic per-person price for the active member's cabin.
  const activeCabinPerPerson = cabinPerPersonPrice(cabin, cabinOccupants.length);
  // Sum of per-person prices for the cabin occupants who are NOT covered.
  const cabinPriceToPay = cabinOccupants.reduce((sum, occupant) => {
    if (cabinOccupantCovered(occupant.id)) return sum;
    return sum + activeCabinPerPerson;
  }, 0);
  // True when at least one cabin occupant is covered by the couple.
  const anyCabinCovered = cabinOccupants.some((o) => cabinOccupantCovered(o.id));




  const hasNoCabin = Boolean(

    activeMember && (activeMember.hasCabin === false || !assignedCabin),
  );
  const option = accommodation.guestOption || {};
  const cabinsShowcase = accommodation.cabinsShowcase || {};
  const privateVideoEyebrow = cabinsShowcase.privateVideoEyebrow;
  const privateVideoTitle = cabinsShowcase.privateVideoTitle;
  const cabinArrangement = cabin?.isPrivate === true
    ? option.occupancy?.privada
    : cabin?.isPrivate === false
      ? option.occupancy?.compartida
      : option.occupancy?.[activeMember?.occupancy];
  const roomArrangement = room
    ? option.occupancy?.[room.isShared ? "compartida" : "privada"]
    : null;
  const paidByCouple =
    hosting.isCabinPaidByNovios ?? activeMember?.isCabinPaidByNovios;
  const isPaid = hosting.isCabinPaid ?? activeMember?.isCabinPaid;
  const paymentLabel = paidByCouple
    ? option.payment?.covered
    : isPaid || activeMember?.payment === "pagada"
      ? option.payment?.paid
      : option.payment?.pending;

  // ── Group accommodation totals ─────────────────────────────────────────
  // Theoretical total: sum of every member's dynamic per-person price. This is
  // the first calculation and never changes when switching members.
  const groupTotal = groupMembers.reduce((sum, member) => {
    const memberCabin = resolveMemberCabin(member);
    const memberCount = memberCabin ? cabinOccupantCount(memberCabin.id) : 0;
    return sum + cabinPerPersonPrice(memberCabin, memberCount);
  }, 0);

  // Amount already covered by the couple across the group's members.
  const coveredTotal = groupMembers.reduce((sum, member) => {
    const memberCabin = resolveMemberCabin(member);
    const memberCovered = resolveMemberCovered(member);
    const memberCount = memberCabin ? cabinOccupantCount(memberCabin.id) : 0;
    return sum + (memberCovered ? cabinPerPersonPrice(memberCabin, memberCount) : 0);
  }, 0);


  // Second calculation: what the group still pays after the couple's share.
  const priceToPay = Math.max(0, groupTotal - coveredTotal);

  // True when at least one group member has a stay covered by the couple.
  const anyCovered = groupMembers.some(resolveMemberCovered);

  const [noteOpen, setNoteOpen] = useState(false);
  const [sectionActive, setSectionActive] = useState(false);
  const sectionRef = useRef(null);
  const noteFabRef = useRef(null);
  const noteCloseRef = useRef(null);


  // ── Accommodation recap question ───────────────────────────────────────
  // A boolean question per group member: confirm the accommodation option.
  // The question text is conditional — members with a cabin confirm their
  // on-site option, members without one express interest in a freed cabin.
  const recap = accommodation.recap || {};
  // Each member answers a different question depending on whether they have a
  // cabin: those with one confirm their on-site stay (accommodationConfirm),
  // those without one ask to be notified if a lodging frees up
  // (cabinWaitingList). Each answer is therefore stored under its own field.
  const recapQuestionIdFor = (member) =>
    resolveMemberCabin(member) ? 'accommodationConfirm' : 'cabinWaitingList';
  const [recapAnswers, setRecapAnswers] = useState(() => {
    const initial = {};
    groupMembers.forEach((member) => {
      initial[member.id] = resolveRsvpAnswer(member, recapQuestionIdFor(member));
    });
    return initial;
  });
  const [recapSaveStatus, setRecapSaveStatus] = useState('idle');
  // Stepped RSVP mini: step 1 is the per-person question, step 2 is the
  // resumen (summary). The user flips between the two views.
  // Auto-detect the initial step: if every group member already has an answer,
  // open directly on the resumen (summary) so returning guests see their recap.
  const [recapStep, setRecapStep] = useState(() => {
    const allAnswered = groupMembers.every(
      (member) => resolveRsvpAnswer(member, recapQuestionIdFor(member)) > 0,
    );
    return allAnswered ? 'summary' : 'question';
  });


  const handleRecapChange = (guestId, level) => {
    setRecapAnswers((prev) => ({ ...prev, [guestId]: level }));
  };


  const handleRecapSave = async () => {
    if (recapSaveStatus === 'working') return;
    const editorGuestId = guest?.id;
    if (!editorGuestId) return;
    setRecapSaveStatus('working');
    try {
      await Promise.all(
        groupMembers.map((member) =>
          saveRsvpAnswers(
            member,
            { [recapQuestionIdFor(member)]: recapAnswers[member.id] },
            editorGuestId,
          ),
        ),
      );
      setRecapSaveStatus('saved');
      // After a successful save, flip to the resumen (summary) view so the
      // success confirmation is visible to the user instead of staying on the
      // question view where it would be hidden.
      setRecapStep('summary');
    } catch (error) {
      console.warn('[accommodation] recap save failed', error.code || error.message);
      setRecapSaveStatus('error');
    }
  };



  const recapStatusText =
    recapSaveStatus === 'working'
      ? interfaceText?.submitWorking
      : recapSaveStatus === 'saved'
        ? recap.success
        : recapSaveStatus === 'error'
          ? recap.error
          : '';



  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    const mobile = window.matchMedia("(max-width: 899px)");
    let latestEntry = null;
    const syncVisibility = () => {
      setSectionActive(Boolean(mobile.matches && latestEntry?.isIntersecting));
      if (!mobile.matches) setNoteOpen(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(section);
    mobile.addEventListener?.("change", syncVisibility);
    return () => {
      observer.disconnect();
      mobile.removeEventListener?.("change", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!noteOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const trigger = noteFabRef.current;
    document.body.style.overflow = "hidden";
    noteCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setNoteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [noteOpen]);

  // The recap (per-person accommodation confirmation) is rendered in two
  // places: inside the form-wrap on desktop, and as the last element of the
  // whole accommodation section on mobile. The content is identical; only the
  // wrapper differs so CSS can show/hide each copy per breakpoint.
  const recapContent = (
    <>
      <div className="accommodation-recap-head">
        <p className="eyebrow">{recap.eyebrow}</p>
        <h3>{recap.title}</h3>
        <p className="accommodation-recap-intro">{recap.intro}</p>
      </div>

      {/* Stepped RSVP mini: step 1 is the per-person question, step 2 is
          the resumen (summary). The user flips between the two views. */}
      <div className="flip-step-card">
        {recapStep === "question" ? (

          <div className="flip-step-card-body">
            <div className="accommodation-recap-rows">
              {groupMembers.map((member) => {
                const name = resolveGuestName(member).fullName;
                const memberPhoto = resolveGuestPhoto(member);
                const memberCabin = resolveMemberCabin(member);
                const hasCabin = Boolean(memberCabin);
                const cabinName =
                  memberCabin?.name?.replace(/\s+/g, " ") || "";
                const questionText = hasCabin
                  ? recap.hasCabinQuestionCabin.replace("{cabin}", cabinName)
                  : recap.noCabinQuestion;
                const current = recapAnswers[member.id] || 0;
                // Per-person price for this member's cabin (dynamic,
                // split among the cabin's actual occupants).
                const memberCount = memberCabin
                  ? cabinOccupantCount(memberCabin.id)
                  : 0;
                const memberPerPerson = cabinPerPersonPrice(memberCabin, memberCount);
                const memberCovered = resolveMemberCovered(member);
                return (
                  <div className="accommodation-recap-row" key={member.id}>
                    <div className="accommodation-recap-person">
                      <span className="accommodation-member-tab-avatar" aria-hidden="true">
                        {memberPhoto
                          ? <img src={memberPhoto} alt="" loading="lazy" />
                          : getInitials(name)}
                      </span>
                      <span className="accommodation-recap-person-text">
                        <strong>{name}</strong>
                        <span>{questionText}</span>
                      </span>
                    </div>
                    {hasCabin && memberPerPerson > 0 && (
                      <div className="accommodation-recap-price">
                        <small>{recap.priceLabel}</small>
                        <span className={`accommodation-recap-price-value${memberCovered ? " is-covered" : ""}`}>
                          {memberCovered ? (
                            <>
                              <s>{formatPrice(memberPerPerson, language)} MXN</s>
                              <s>≈ {formatPrice(memberPerPerson / MXN_PER_EUR, language)} €</s>
                              <strong>{recap.coveredLabel}</strong>
                            </>
                          ) : (
                            <>
                              <strong>{formatPrice(memberPerPerson, language)} MXN</strong>
                              <small>≈ {formatPrice(memberPerPerson / MXN_PER_EUR, language)} €</small>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                    {memberCovered && (
                      <div className="accommodation-recap-covered-banner">
                        <span aria-hidden="true">✓</span>
                        {recap.coveredLabel}
                      </div>
                    )}
                    <div className="accommodation-recap-toggle">

                      <button
                        type="button"
                        className={`rsvp-boolean-btn${current === BOOLEAN_YES ? ' is-selected' : ''}`}
                        aria-pressed={current === BOOLEAN_YES}
                        onClick={() => handleRecapChange(member.id, BOOLEAN_YES)}
                      >
                        {recap.yesLabel}
                      </button>
                      <button
                        type="button"
                        className={`rsvp-boolean-btn${current === BOOLEAN_NO ? ' is-selected' : ''}`}
                        aria-pressed={current === BOOLEAN_NO}
                        onClick={() => handleRecapChange(member.id, BOOLEAN_NO)}
                      >
                        {recap.noLabel}
                      </button>
                    </div>
                  </div>
                );
              })}

            </div>
            <div className="accommodation-recap-save">
              <button
                className="button button--gold"
                type="button"
                onClick={handleRecapSave}
                disabled={recapSaveStatus === 'working'}
              >
                {recap.button}
              </button>
              {recapStatusText ? <small data-form-status>{recapStatusText}</small> : null}
            </div>
          </div>
        ) : (
          <div className="flip-step-card-body">
            <div className="accommodation-recap-summary">
              <p className="accommodation-recap-summary-intro">
                {recap.summaryIntro}
              </p>
              <ul className="accommodation-recap-summary-list">
                {groupMembers.map((member) => {
                  const name = resolveGuestName(member).fullName;
                  const memberPhoto = resolveGuestPhoto(member);
                  const memberCabin = resolveMemberCabin(member);
                  const hasCabin = Boolean(memberCabin);
                  const cabinName =
                    memberCabin?.name?.replace(/\s+/g, " ") || "";
                  const questionText = hasCabin
                    ? recap.hasCabinQuestionCabin.replace("{cabin}", cabinName)
                    : recap.noCabinQuestion;
                  const current = recapAnswers[member.id];
                  // Per-person price for this member's cabin (dynamic,
                  // split among the cabin's actual occupants).
                  const memberCount = memberCabin
                    ? cabinOccupantCount(memberCabin.id)
                    : 0;
                  const memberPerPerson = cabinPerPersonPrice(memberCabin, memberCount);
                  const memberCovered = resolveMemberCovered(member);
                  return (
                    <li className="accommodation-recap-summary-row" key={member.id}>
                      <span className="accommodation-recap-summary-person">
                        <span className="accommodation-member-tab-avatar" aria-hidden="true">
                          {memberPhoto
                            ? <img src={memberPhoto} alt="" loading="lazy" />
                            : getInitials(name)}
                        </span>
                        <span className="accommodation-recap-summary-person-text">
                          <strong>{name}</strong>
                          <small>{questionText}</small>
                        </span>
                      </span>
                      {hasCabin && memberPerPerson > 0 && (
                        <span className={`accommodation-recap-summary-price${memberCovered ? " is-covered" : ""}`}>
                          {memberCovered ? (
                            <>
                              <s>{formatPrice(memberPerPerson, language)} MXN</s>
                              <s>≈ {formatPrice(memberPerPerson / MXN_PER_EUR, language)} €</s>
                              <small>{recap.coveredLabel}</small>
                            </>
                          ) : (
                            <>
                              <strong>{formatPrice(memberPerPerson, language)} MXN</strong>
                              <small className="is-eur">≈ {formatPrice(memberPerPerson / MXN_PER_EUR, language)} €</small>
                            </>
                          )}
                        </span>
                      )}

                      <span
                        className={`accommodation-recap-summary-value${

                          current === BOOLEAN_YES ? " is-yes" : " is-no"
                        }`}
                      >
                        {current === BOOLEAN_YES ? recap.yesLabel : recap.noLabel}
                      </span>
                    </li>
                  );
                })}

              </ul>
              {recapSaveStatus === "saved" && (
                <p className="accommodation-recap-confirmation" role="status">
                  <span aria-hidden="true">✓</span>
                  {recap.success}
                </p>
              )}
              {recapSaveStatus === "error" && (
                <p className="accommodation-recap-confirmation is-error" role="alert">
                  {recap.error}
                </p>
              )}

              <div className="accommodation-recap-save">
                <button
                  className="button button--gold"
                  type="button"
                  onClick={() => setRecapStep("question")}
                >
                  {recap.modifyButton}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (

    <section className="accommodation-section section story-bg" ref={sectionRef}>

      <div className="accommodation-copy reveal" id="accommodation-overview">
        <p className="eyebrow">{accommodation.eyebrow}</p>
        <h2>{accommodation.title}</h2>
        {accommodation.citation && (
          <p className="accommodation-citation">{accommodation.citation}</p>
        )}
        <p className="lead">{accommodation.body}</p>

        {privateVideoTitle && (
          <div className="cabins-private-video reveal">
            <h3>{privateVideoTitle}</h3>
            <div className="video-frame">
              <iframe
                src="https://www.youtube.com/embed/zf0zhZihub4"
                title={privateVideoTitle}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div className="accommodation-facts">
          {accommodation.facts.map((fact, index) => (
            <article key={index}>
              <strong>{fact.value}</strong>
              {fact.euroValue && (
                <small className="accommodation-fact-conversion">
                  {fact.euroValue}
                </small>
              )}
              <span>{fact.label}</span>
            </article>
          ))}
          <p className="accommodation-facts-note">{accommodation.specialNote}</p>
        </div>

        <div
          className={`accommodation-note-shell${noteOpen ? " is-mobile-open" : ""}`}
          role={noteOpen ? "dialog" : undefined}
          aria-modal={noteOpen ? "true" : undefined}
          aria-labelledby={noteOpen ? "accommodation-note-title" : undefined}
          onMouseDown={(event) => {
            if (noteOpen && event.target === event.currentTarget) setNoteOpen(false);
          }}
        >
          <div className="accommodation-note-panel">
            <button
              ref={noteCloseRef}
              className="accommodation-note-close"
              type="button"
              aria-label="Close"
              onClick={() => setNoteOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow accommodation-note-eyebrow">
              {accommodation.eyebrow}
            </p>
            <h3 id="accommodation-note-title">{accommodation.noteTitle}</h3>
            <p className="accommodation-note">{accommodation.specialNote}</p>
          </div>
        </div>
        <button
          ref={noteFabRef}
          className={`accommodation-note-fab${sectionActive && !noteOpen ? " is-visible" : ""}`}
          type="button"
          aria-label={accommodation.noteTitle}
          aria-haspopup="dialog"
          onClick={() => setNoteOpen(true)}
        >
          <span aria-hidden="true">i</span>
        </button>
        <div className="accommodation-contacts">
          <span>{accommodation.contactPrompt}</span>
          {Object.values(EVENT.contacts).map((contact, index) => (
            <a
              key={index}
              className="accommodation-contact-link"
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              {contact.label} ↗
            </a>
          ))}
        </div>

        <nav className="accommodation-subnav" aria-label={option.linkLabel}>
          <a href="#accommodation-option">
            <span>{option.linkLabel}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </nav>

      </div>

      <div className="accommodation-form-wrap" id="accommodation-option">
        <div className="accommodation-form-head">
          <p className="eyebrow">{option.eyebrow}</p>
          {groupMembers.length > 1 && (
            <div className="accommodation-member-tabs" role="tablist" aria-label={option.membersLabel || "Group members"}>
              {groupMembers.map((member) => {
                const { firstName } = resolveGuestName(member);
                const memberPhoto = resolveGuestPhoto(member);
                const isActive = member.id === (activeMember?.id || guest?.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`accommodation-member-tab${isActive ? " is-active" : ""}`}
                    onClick={() => setActiveMemberId(member.id)}
                  >
                    <span className="accommodation-member-tab-avatar" aria-hidden="true">
                      {memberPhoto
                        ? <img src={memberPhoto} alt="" loading="lazy" />
                        : getInitials(resolveGuestName(member).fullName)}
                    </span>
                    <span className="accommodation-member-tab-name">{firstName}</span>
                    {member.id === guest?.id && <small>{option.youLabel}</small>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <h3>{hasNoCabin ? option.independentTitle : option.onSiteTitle}</h3>

        {hasNoCabin ? (
          <p className="accommodation-personal-note">
            {option.independentBody}
          </p>
        ) : (
          <>
            <p className="accommodation-citation">{option.onSiteBody}</p>
            <p className="accommodation-covered-note">
              <strong>{paidByCouple ? option.onSiteCoveredBody : option.onSitePayBody}</strong>
            </p>
            {cabinName && (
              <p className="accommodation-cabin-badge">{cabinName}</p>
            )}
          </>
        )}



        {!hasNoCabin && cabinPhotos.length > 0 && (
          <div className="accommodation-photo-carousel" aria-label={cabinName}>
            {cabinPhotos.map((photo, index) => (
              <figure className="accommodation-photo" key={index}>
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  <span>{cabinName}</span>
                  <small>
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(cabinPhotos.length).padStart(2, "0")}
                  </small>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {!hasNoCabin && cabin && roomOccupants.length > 0 && (

          <div className="accommodation-occupancy-top">
            <CabinOccupancy
              cabinName={cabinName}
              rooms={roomOccupants}
              assignedRoomId={assignedRoom}
              activeMemberId={activeMember?.id}
              option={option}
              language={language}
            />
          </div>
        )}

        {!hasNoCabin && cabin && (
          <StayPlanCard
            activeMember={activeMember}
            groupMembers={groupMembers}
            getAssignedCabinId={getAssignedCabinId}
            getAssignedRoomId={getAssignedRoomId}
            resolveMemberCovered={resolveMemberCovered}
            resolveMemberPaid={resolveMemberPaid}
            option={option}
            language={language}
            showExtraCabinRow
            extraCabin={extraCabin}
            extraRoom={extraRoom}
          />
        )}


        {hasNoCabin && (

          <section className="accommodation-airbnb">
            <h4>{option.airbnbTitle}</h4>
            <p>{option.airbnbBody}</p>
            <p className="accommodation-market-price">
              <span>{option.airbnbAreaPrice}</span>
              <strong>≈ {formatPrice(350, language)} MXN</strong>
              <small>≈ {formatPrice(350 / MXN_PER_EUR, language)} € · {option.perNight} · {option.beforeTaxes}</small>
            </p>
            <div className="accommodation-airbnb-list">
              {AIRBNB_SUGGESTIONS.map((listing) => (
                <a
                  className="accommodation-stay-card"
                  href={listing.url}
                  key={listing.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ "--stay-image": `url("${listing.image}")` }}
                >
                  <span className="accommodation-airbnb-rating" aria-label={`${option.airbnbRating} ${listing.rating}`}>
                    ★ {listing.rating}
                  </span>
                  <strong>{listing.name}</strong>
                  <span className="accommodation-airbnb-facts">
                    {listing.guests} {option.airbnbGuests} · {listing.bedrooms}{" "}
                    {option.airbnbBedrooms} · {listing.beds} {option.airbnbBeds}
                  </span>
                  <span className="accommodation-airbnb-link">{option.airbnbView} ↗</span>
                </a>
              ))}
            </div>
            <a
              className="accommodation-airbnb-search"
              href={AIRBNB_SEARCH_URL}
              target="_blank"
              rel="noreferrer"
            >
              {option.airbnbSearchAll} ↗
            </a>
          </section>
        )}

        {hasNoCabin && (
          <section className="accommodation-airbnb accommodation-hotels">
            <h4>{option.hotelTitle}</h4>
            <p>{option.hotelBody}</p>
            <div className="accommodation-airbnb-list">
              {HOTEL_SUGGESTIONS.map((hotel) => (
                <a
                  className="accommodation-hotel-card accommodation-stay-card"
                  href={hotel.url}
                  key={hotel.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ "--stay-image": `url("${hotel.image}")` }}
                >
                  <span className="accommodation-hotel-type">
                    {option.hotelTypes?.[hotel.type]}
                  </span>
                  <strong>{hotel.name}</strong>
                  <span className="accommodation-airbnb-facts">
                    {option.hotelLocation}: {hotel.location}
                  </span>
                  <span className="accommodation-stay-price">
                    <span>{option.fromPrice}</span>
                    <strong>≈ {formatPrice(hotel.price, language)} MXN</strong>
                    <small>≈ {formatPrice(hotel.price / MXN_PER_EUR, language)} € · {option.perNight}</small>
                  </span>
                  <span className="accommodation-airbnb-link">{option.hotelView} ↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {recap.title && groupMembers.length > 0 && (
          <div className="accommodation-recap accommodation-recap--inline">
            {recapContent}
          </div>
        )}
      </div>


      {/* Desktop-only bottom nav linking to the next section (Pétanque). */}
      <nav className="section-nav accommodation-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#petanque">
          <span>{accommodation.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Mobile-only recap: rendered as the last element of the accommodation
          section so it sits below the form-wrap on small screens. Hidden on
          desktop (the inline copy inside the form-wrap is shown instead). */}
      {recap.title && groupMembers.length > 0 && (
        <div className="accommodation-recap accommodation-recap--section">
          {recapContent}
        </div>
      )}
    </section>
  );
}


