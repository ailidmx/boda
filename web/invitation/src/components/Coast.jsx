import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
import { BARRA_PHOTOS } from "../barraGallery.js";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
  resolveLiveGuest,
} from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomsByCabin } from "../rooms.js";
import { StayPlanCard } from "./StayPlanCard.jsx";
import { CabinOccupancy } from "./CabinOccupancy.jsx";



import { getActiveGuests } from "../guests.js";
import { resolveRsvpAnswer } from "../rsvp-responses.js";




// ── Coast accommodation suggestions ────────────────────────────────────────
// Reuses the same card pattern as the Accommodation "no cabin" suggestions.
// Airbnb: one distinct listing per group size (4, 6, 8, 10, 12 people) for the
// nights of 23–28 February 2027. Hotels: a short selection ordered by price.
const COAST_AIRBNB_SEARCH_URL =
  "https://www.airbnb.mx/s/Barra-de-Navidad--Jalisco/homes?date_picker_type=calendar&checkin=2027-02-23&checkout=2027-02-28&refinement_paths%5B%5D=%2Fhomes&search_type=search_query";
const COAST_AIRBNB_SUGGESTIONS = [
  {
    name: "Casa del Sol · Barra de Navidad",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 4,
    bedrooms: 2,
    beds: 2,
    rating: "4.7",
    price: 1800,
  },
  {
    name: "Departamento Vista al Mar",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 6,
    bedrooms: 3,
    beds: 3,
    rating: "4.6",
    price: 2400,
  },
  {
    name: "Casa Palapa frente a la playa",
    url: "https://www.airbnb.mx/rooms/5617577?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 8,
    bedrooms: 4,
    beds: 4,
    rating: "4.8",
    price: 3200,
  },
  {
    name: "Villa Marea Alta",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 10,
    bedrooms: 5,
    beds: 5,
    rating: "4.5",
    price: 4000,
  },
  {
    name: "Casa Grande Barra de Navidad",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 12,
    bedrooms: 6,
    beds: 6,
    rating: "4.7",
    price: 4800,
  },
];
const COAST_HOTEL_SUGGESTIONS = [
  {
    name: "Hotel Barra de Navidad",
    url: "https://www.hotelbarradenavidad.com/",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "budgetHotel",
    price: 1200,
  },
  {
    name: "Hotel Delfín",
    url: "https://www.hoteldelfinbarra.com/",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "beachHotel",
    price: 1800,
  },
  {
    name: "Grand Bay Hotel",
    url: "https://www.grandbayhotel.com/",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "boutiqueHotel",
    price: 2500,
  },
];



const MXN_PER_EUR = 20;

function formatPrice(amount, language) {
  const locale = language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

export function Coast() {

  const { t, language, interfaceText, profile } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const coast = t.coast || {};
  const suggestions = coast.suggestions || {};
  const rsvpMini = coast.rsvpMini || {};
  const flow = RSVP_FLOWS.coast;


  const barraRef = useRef(null);

  // The group's guests (the signed-in guest + the other members of their
  // invitation group). These are the people the mini questions apply to.
  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  // ── Extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday) ────────────
  // The second stay is stored on the guest's hosting record as an extra cabin
  // (xtraCabin / xtraRoom). We reuse the same StayPlanCard used in the
  // Accommodation section so the pricing, "paid by the couple" banner, and
  // on-sale styling are identical.
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
    return source?.hosting?.isXtraCabinPaidByNovios ?? source?.isXtraCabinPaidByNovios;
  };

  const resolveXtraPaid = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isXtraCabinPaid ?? source?.isXtraCabinPaid;
  };

  const liveActive = resolveLiveGuest(profile?.guest) || profile?.guest;
  const extraCabinId = getXtraCabinId(liveActive);
  const hasExtraCabin = Boolean(extraCabinId);
  const extraCabin = getCabin(extraCabinId);
  const extraRoom = getXtraRoomId(liveActive);
  const option = t.accommodation?.guestOption || {};
  const extraStay = coast.extraStay || {};

  // ── Extra cabin occupancy ────────────────────────────────────────────────
  // Occupancy is computed by parsing the whole guests collection and finding
  // every guest who shares the SAME extra cabin (xtraCabin), not just those
  // with a matching room id. Each occupant carries their room, their
  // "paid by the couple" flag (isXtraCabinPaidByNovios), avatar and name so
  // the modal shows the complete picture of who shares the extra cabin.
  //
  // NOTE: the live `xtraCabin`/`xtraRoom`/`isXtraCabinPaidByNovios` data lives
  // in the Firestore `guests` collection. It is loaded for ALL guests at
  // startup via `loadAllGuests()` (see AppContext), so guests from other
  // invitation groups who share this extra cabin are included too.
  const extraCabinRooms = extraCabin ? getRoomsByCabin(extraCabin.id) : [];

  // All active guests assigned to this extra cabin (by resolved xtraCabin id).
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
            covered: source?.hosting?.isXtraCabinPaidByNovios ?? source?.isXtraCabinPaidByNovios,
          };
        })
        .filter((candidate) => candidate.name)
    : [];

  // Group those occupants by the extra cabin's rooms. Guests whose room id is
  // not one of the cabin's registered rooms (or who have no room) are grouped
  // under a synthetic "unassigned" entry so they are never dropped.
  const extraRoomOccupants = extraCabinRooms.map((cabinRoom) => ({
    room: cabinRoom,
    occupants: extraCabinOccupants.filter((o) => o.roomId === cabinRoom.id),
  }));
  const unassignedExtraOccupants = extraCabinOccupants.filter(
    (o) => !extraCabinRooms.some((r) => r.id === o.roomId),
  );
  if (unassignedExtraOccupants.length > 0) {
    extraRoomOccupants.push({
      room: { id: "__unassigned__", capacity: unassignedExtraOccupants.length, isShared: true },
      occupants: unassignedExtraOccupants,
    });
  }

  // Debug traces for the extra cabin occupancy calculation.
  console.log("[coast][extra-cabin-occupancy]", {
    activeGuestId: liveActive?.id,
    extraCabinId,
    extraCabinName: extraCabin?.name,
    extraRoom,
    totalActiveGuests: getActiveGuests().length,
    matchedOccupants: extraCabinOccupants.map((o) => ({
      id: o.id,
      name: o.name,
      roomId: o.roomId,
      covered: o.covered,
    })),
    rooms: extraRoomOccupants.map(({ room, occupants }) => ({
      roomId: room.id,
      occupantCount: occupants.length,
      occupantIds: occupants.map((o) => o.id),
    })),
  });




  // The two scale questions about the "Et après ?" plans. Levels: 0–5.
  const questions = useMemo(
    () =>
      (rsvpMini.questions || []).map((q) => ({
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        variant: "scale",
      })),
    [rsvpMini],
  );

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | working | saved | error

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level);
  };

  const handleSaveAnswers = async () => {
    if (saveStatus === "working") return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setSaveStatus("working");
    try {
      // Persist each guest's answers to their own rsvp_responses doc.
      await saveFlow({ flow, questions, guests, editorGuestId });
      setSaveStatus("saved");
    } catch (error) {
      console.warn("[coast] rsvp save failed", error.code || error.message);
      setSaveStatus("error");
    }
  };

  const saveStatusText =
    saveStatus === "working"
      ? interfaceText.submitWorking
      : saveStatus === "saved"
        ? rsvpMini.success
        : saveStatus === "error"
          ? rsvpMini.error
          : "";

  // Scroll the Barra de Navidad photo strip by one photo (or ~80% of the
  // viewport when no photo is measurable). Used by the prev/next controls.
  const scrollBarra = (direction) => {
    const el = barraRef.current;
    if (!el) return;
    const photo = el.querySelector(".barra-photo");
    const step = photo
      ? photo.getBoundingClientRect().width + 0.8 * 16
      : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };


  return (
    <section className="coast-section section" id="after">
      {/* Beach story backdrop — a layered scene that reads top-to-bottom:
          sky with a sun (top right) → horizon with birds & boats → sparkling
          sea → sandy beach. Purely decorative; sits behind the content. */}
      <div className="coast-scene" aria-hidden="true">
        <span className="coast-scene__sun" />
        <svg className="coast-scene__birds" viewBox="0 0 200 60" preserveAspectRatio="none">
          <path d="M10 30 Q20 12 30 30 Q40 12 50 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M70 22 Q78 8 86 22 Q94 8 102 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M120 34 Q127 22 134 34 Q141 22 148 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg className="coast-scene__boats" viewBox="0 0 260 90" preserveAspectRatio="none">
          <g className="coast-scene__boat coast-scene__boat--1">
            <path d="M10 55 Q30 70 60 55 L52 40 L18 40 Z" fill="currentColor" opacity="0.9" />
            <path d="M35 40 L35 18 L52 40 Z" fill="currentColor" opacity="0.85" />
          </g>
          <g className="coast-scene__boat coast-scene__boat--2">
            <path d="M150 60 Q170 74 198 60 L190 46 L158 46 Z" fill="currentColor" opacity="0.8" />
            <path d="M174 46 L174 26 L190 46 Z" fill="currentColor" opacity="0.75" />
          </g>
        </svg>
        <span className="coast-scene__sparkle coast-scene__sparkle--1" />
        <span className="coast-scene__sparkle coast-scene__sparkle--2" />
        <span className="coast-scene__sparkle coast-scene__sparkle--3" />
        <span className="coast-scene__sparkle coast-scene__sparkle--4" />
        <span className="coast-scene__sparkle coast-scene__sparkle--5" />
        <span className="coast-scene__sparkle coast-scene__sparkle--6" />
        <span className="coast-scene__sparkle coast-scene__sparkle--7" />
        <span className="coast-scene__sparkle coast-scene__sparkle--8" />
        <span className="coast-scene__beach" />
      </div>

      <div className="coast-copy reveal">

        <div className="section-heading">
          <p className="eyebrow">{coast.eyebrow}</p>
          <h2>{coast.title}</h2>
          <p className="lead">{coast.body}</p>
        </div>
        <div className="coast-ideas">
          {coast.plans.map((plan, index) => (
            <article key={index}>
              <strong>{plan.title}</strong>
              <span>{plan.body}</span>
            </article>
          ))}
        </div>
        <p className="coast-note">{coast.note}</p>
        <div className="barra-carousel" aria-label={coast.barraPhotosLabel}>
          <div className="barra-photos" ref={barraRef}>
            {BARRA_PHOTOS.map((photo, index) => (
              <figure className="barra-photo" key={index}>
                <img
                  src={photo.src}
                  alt={`${coast.barraPhotosLabel} · ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
          <div className="barra-carousel__nav" aria-label={`${coast.barraPhotosLabel} navigation`}>
            <button
              className="barra-carousel__arrow"
              type="button"
              aria-label="Previous"
              onClick={() => scrollBarra(-1)}
            >
              ‹
            </button>
            <button
              className="barra-carousel__arrow"
              type="button"
              aria-label="Next"
              onClick={() => scrollBarra(1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Mini RSVP — a 3-step flipable card (like "¡Te animas!" and pétanque):
          Step 1 = stay at Roca Azul, Step 2 = the beach plan, Step 3 = summary.
          Each guest rates how likely they are to join each "Et après ?" plan
          (0–5). Answers are saved per guest to Firestore via saveRsvpAnswers. */}
      <div className="coast-rsvp-mini reveal">
        <div className="coast-rsvp-mini-head">
          <p className="eyebrow">{rsvpMini.eyebrow}</p>
          <h3>{rsvpMini.title}</h3>
          <p className="coast-rsvp-mini-intro">{rsvpMini.intro}</p>
        </div>

        <FlipStepCard
          onDone={() => markResume(flow)}
          steps={[
            ...questions.map((question) => ({
              id: question.id,
              label: question.title,
              render: () => (
                <RsvpQuestion
                  questionId={question.id}
                  title={question.title}
                  subtitle={question.subtitle}
                  variant="scale"
                  guests={guests}
                  answers={answers[question.id] || {}}
                  onChange={(guestId, level) =>
                    handleAnswerChange(question.id, guestId, level)
                  }
                />
              ),
            })),
            {
              id: "resumen",
              label: rsvpMini.recapTitle || "Summary",
              render: () => (
                <div className="rsvp-recap-step">
                  <RsvpRecap
                    questions={questions}
                    guests={guests}
                    answers={answers}
                    recapTitle={rsvpMini.recapTitle}
                    recapProgress={rsvpMini.recapProgress}
                  />
                  <div className="coast-rsvp-save">
                    <button
                      className="button button-dark"
                      type="button"
                      onClick={handleSaveAnswers}
                      disabled={saveStatus === "working"}
                    >
                      {rsvpMini.button}
                    </button>
                    {saveStatusText && <small>{saveStatusText}</small>}
                  </div>
                </div>
              ),
            },
          ]}
          copy={{
            step: interfaceText.stepLabel || "Step",
            next: interfaceText.next || "Next",
            back: interfaceText.back || "Back",
          }}
        />
      </div>

      {/* Extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday) — shown only
          when the active guest has an extra cabin assigned for the second
          stay. Reuses the same StayPlanCard as the Hébergement section so the
          pricing, "paid by the couple" banner, and on-sale styling match. */}
      {hasExtraCabin && extraCabin && (
        <div className="coast-extra-stay reveal">
          <p className="eyebrow">{extraStay.eyebrow}</p>
          <h3>{extraStay.title}</h3>
          {extraRoomOccupants.length > 0 && (
            <div className="accommodation-occupancy-top">
              <CabinOccupancy
                cabinName={extraCabin?.name?.replace(/\s+/g, " ") || extraCabinId}
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
      )}


      {/* Coast accommodation suggestions — mirrors the Accommodation "no
          cabin" pattern: an Airbnb section (one listing per group size) and a
          hotel section (a short selection ordered by price). */}
      {suggestions.title && (
        <div className="coast-suggestions reveal">
          <div className="section-heading">
            <p className="eyebrow">{suggestions.eyebrow}</p>
            <h3>{suggestions.title}</h3>
            <blockquote className="coast-suggestions-citation">{suggestions.body}</blockquote>
          </div>


          <section className="accommodation-airbnb">
            <h4>{suggestions.airbnbTitle}</h4>
            <p>{suggestions.airbnbBody}</p>
            <p className="accommodation-market-price">
              <span>{suggestions.airbnbAreaPrice}</span>
              <strong>≈ {formatPrice(1800, language)} MXN</strong>
              <small>≈ {formatPrice(1800 / MXN_PER_EUR, language)} € · {suggestions.perNight} · {suggestions.beforeTaxes}</small>
            </p>
            <div className="accommodation-airbnb-list">
              {COAST_AIRBNB_SUGGESTIONS.map((listing) => (
                <a
                  className="accommodation-stay-card"
                  href={listing.url}
                  key={listing.name}
                  target="_blank"
                  rel="noreferrer"
                  style={{ "--stay-image": `url("${listing.image}")` }}
                >
                  <span className="accommodation-airbnb-rating" aria-label={`${suggestions.airbnbRating} ${listing.rating}`}>
                    ★ {listing.rating}
                  </span>
                  <strong>{listing.name}</strong>
                  <span className="accommodation-airbnb-facts">
                    {listing.guests} {suggestions.airbnbGuests} · {listing.bedrooms}{" "}
                    {suggestions.airbnbBedrooms} · {listing.beds} {suggestions.airbnbBeds}
                  </span>
                  <span className="accommodation-stay-price">
                    <span>{suggestions.fromPrice}</span>
                    <strong>≈ {formatPrice(listing.price, language)} MXN</strong>
                    <small>≈ {formatPrice(listing.price / MXN_PER_EUR, language)} € · {suggestions.perNight}</small>
                  </span>
                  <span className="accommodation-airbnb-link">{suggestions.airbnbView} ↗</span>
                </a>
              ))}
            </div>
            <a
              className="accommodation-airbnb-search"
              href={COAST_AIRBNB_SEARCH_URL}
              target="_blank"
              rel="noreferrer"
            >
              {suggestions.airbnbSearchAll} ↗
            </a>
          </section>

          <section className="accommodation-airbnb accommodation-hotels">
            <h4>{suggestions.hotelTitle}</h4>
            <p>{suggestions.hotelBody}</p>
            <div className="accommodation-airbnb-list">
              {COAST_HOTEL_SUGGESTIONS.map((hotel) => (
                <a
                  className="accommodation-hotel-card accommodation-stay-card"
                  href={hotel.url}
                  key={hotel.name}
                  target="_blank"
                  rel="noreferrer"
                  style={{ "--stay-image": `url("${hotel.image}")` }}
                >
                  <span className="accommodation-hotel-type">
                    {suggestions.hotelTypes?.[hotel.type]}
                  </span>
                  <strong>{hotel.name}</strong>
                  <span className="accommodation-airbnb-facts">
                    {suggestions.hotelLocation}: {hotel.location}
                  </span>
                  <span className="accommodation-stay-price">
                    <span>{suggestions.fromPrice}</span>
                    <strong>≈ {formatPrice(hotel.price, language)} MXN</strong>
                    <small>≈ {formatPrice(hotel.price / MXN_PER_EUR, language)} € · {suggestions.perNight}</small>
                  </span>
                  <span className="accommodation-airbnb-link">{suggestions.hotelView} ↗</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Desktop-only bottom nav: leads to the photos section. */}
      <nav className="section-nav coast-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#photos">
          <span>{t.nav.photos}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
