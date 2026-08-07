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
  return candidate?.hosting?.room || candidate?.room;
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
  const { t, profile, language } = useApp();
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
  const [occupancyOpen, setOccupancyOpen] = useState(false);
  const [sectionActive, setSectionActive] = useState(false);
  const sectionRef = useRef(null);
  const noteFabRef = useRef(null);
  const noteCloseRef = useRef(null);
  const occupancyCloseRef = useRef(null);


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

  useEffect(() => {
    if (!occupancyOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    occupancyCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOccupancyOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [occupancyOpen]);


  return (
    <section className="accommodation-section section" ref={sectionRef}>
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
        <p className="eyebrow">{option.eyebrow}</p>
        <h3>{hasNoCabin ? option.independentTitle : option.onSiteTitle}</h3>
        {hasNoCabin ? (
          <p className="accommodation-personal-note">
            {option.independentBody}
          </p>
        ) : (
          <>
            <p className="accommodation-citation">{option.onSiteBody}</p>
            {paidByCouple && (
              <p className="accommodation-covered-note">
                <strong>{option.onSiteCoveredBody}</strong>
              </p>
            )}
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

        {!hasNoCabin && cabin && (
          <div className="accommodation-plan-card">
            <h4>{option.planCardTitle}</h4>

            {activeCabinPerPerson > 0 && (
              <div className="accommodation-plan-row">
                <span className="accommodation-plan-label">
                  {option.planCardPerPerson}
                </span>
                <PlanPrice
                  original={activeCabinPerPerson}
                  toPay={paidByCouple ? 0 : activeCabinPerPerson}
                  language={language}
                  covered={paidByCouple}
                />
                {paidByCouple && <em>{option.planCardSaleLabel}</em>}
              </div>
            )}


            {groupMembers.length > 1 && (
              <div className="accommodation-plan-row">
                <span className="accommodation-plan-label">
                  {option.planCardGroupTotal}
                </span>
                <PlanPrice
                  original={groupTotal}
                  toPay={priceToPay}
                  language={language}
                  covered={anyCovered}
                />
                {anyCovered && <em>{option.planCardSaleLabel}</em>}
              </div>
            )}

            <p className="accommodation-plan-disclaimer">
              {option.planCardEurDisclaimer} · {option.planCardEstimate}
            </p>

          </div>
        )}

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

        {!hasNoCabin && (
          <dl className="accommodation-option-details">



            <div>
              <dt>{option.cabinLabel}</dt>
              <dd>{cabinName}</dd>
            </div>
            {roomDescription && (
              <div>
                <dt>{option.roomLabel}</dt>
                <dd>{roomDescription}</dd>
              </div>
            )}
            {cabin?.capacity && (
              <div>
                <dt>{option.cabinCapacityLabel}</dt>
                <dd>{cabin.capacity} {option.peopleLabel}</dd>
              </div>
            )}
            {room?.capacity && (
              <div>
                <dt>{option.roomCapacityLabel}</dt>
                <dd>{room.capacity} {option.peopleLabel}</dd>
              </div>
            )}
            {cabin?.totalPrice2Nights && (
              <div>
                <dt>{option.cabinPriceLabel}</dt>
                <AccommodationPrice
                  original={cabin.totalPrice2Nights}
                  toPay={cabinPriceToPay}
                  language={language}
                  covered={cabinPriceToPay === 0}
                  showSale={anyCabinCovered && cabinPriceToPay < cabin.totalPrice2Nights}
                  coveredLabel={option.coveredPriceLabel}
                />
              </div>
            )}



            {activeCabinPerPerson > 0 && (
              <div>
                <dt>{option.personPriceLabel}</dt>
                <AccommodationPrice
                  original={activeCabinPerPerson}
                  toPay={paidByCouple ? 0 : activeCabinPerPerson}
                  language={language}
                  covered={paidByCouple}
                  coveredLabel={option.coveredPriceLabel}
                />
              </div>
            )}


            {cabinArrangement && (
              <div>
                <dt>{option.cabinOccupancyLabel}</dt>
                <dd>{cabinArrangement}</dd>
              </div>
            )}
            {roomArrangement && (
              <div>
                <dt>{option.roomOccupancyLabel}</dt>
                <dd>{roomArrangement}</dd>
              </div>
            )}
            {paymentLabel && (
              <div>
                <dt>{option.paymentLabel}</dt>
                <dd>{paymentLabel}</dd>
              </div>
            )}
            {extraCabin && (
              <div>
                <dt>{option.extraCabinLabel}</dt>
                <dd>
                  {getCabin(extraCabin)?.name || extraCabin}
                  {extraRoom && getRoomDescription(getRoom(extraRoom), language)
                    ? ` · ${getRoomDescription(getRoom(extraRoom), language)}`
                    : ""}
                </dd>
              </div>
            )}
          </dl>
        )}

        {!hasNoCabin && roomOccupants.length > 0 && (
          <>
            {createPortal(

              <div
                className={`accommodation-occupancy-shell${occupancyOpen ? " is-open" : ""}`}
                role={occupancyOpen ? "dialog" : undefined}
                aria-modal={occupancyOpen ? "true" : undefined}
                aria-labelledby={occupancyOpen ? "accommodation-occupancy-title" : undefined}
                onMouseDown={(event) => {
                  if (occupancyOpen && event.target === event.currentTarget) setOccupancyOpen(false);
                }}
              >
                <div className="accommodation-occupancy-panel">
                  <button
                    ref={occupancyCloseRef}
                    className="accommodation-occupancy-close"
                    type="button"
                    aria-label="Close"
                    onClick={() => setOccupancyOpen(false)}
                  >
                    ×
                  </button>
                  <p className="eyebrow accommodation-occupancy-eyebrow">
                    {option.wholeCabinTitle}
                  </p>
                  <h3 id="accommodation-occupancy-title">{cabinName}</h3>
                  <p className="accommodation-occupancy-body">{option.wholeCabinBody}</p>
                  <div className="accommodation-room-list">
                    {roomOccupants.map(({ room: cabinRoom, occupants }) => (
                      <article
                        className={cabinRoom.id === assignedRoom ? "is-current" : undefined}
                        key={cabinRoom.id}
                      >
                        <header>
                          <strong>{getRoomDescription(cabinRoom, language)}</strong>
                          <span>
                            {cabinRoom.capacity} {option.peopleLabel} ·{
                              " "
                            }{option.occupancy?.[cabinRoom.isShared ? "compartida" : "privada"]}
                          </span>
                        </header>
                        <div className="accommodation-room-occupants">
                          {occupants.length > 0 ? occupants.map((occupant) => (
                            <div className="accommodation-room-person" key={occupant.id}>
                              <span className="accommodation-room-avatar" aria-hidden="true">
                                {occupant.photo
                                  ? <img src={occupant.photo} alt="" loading="lazy" />
                                  : getInitials(occupant.name)}
                              </span>
                              <span>
                                {occupant.name}
                                {occupant.id === activeMember?.id && <small>{option.youLabel}</small>}
                              </span>
                            </div>
                          )) : (
                            <span className="accommodation-room-empty">{option.emptyRoom}</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>,
              document.body,
            )}
          </>
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

        <div className="accommodation-actions">
          {!hasNoCabin && roomOccupants.length > 0 && (
            <button
              type="button"
              className="accommodation-occupancy-trigger"
              aria-haspopup="dialog"
              onClick={() => setOccupancyOpen(true)}
            >
              {option.wholeCabinTitle}
            </button>
          )}
          <a className="button button-dark" href="#rsvp">
            {option.button}
          </a>
        </div>
        <nav className="accommodation-subnav accommodation-subnav--back" aria-label={option.backLabel}>

          <a href="#accommodation-overview">
            <span aria-hidden="true">↑</span>
            <span>{option.backLabel}</span>
          </a>
        </nav>
      </div>

      {/* Desktop-only bottom nav linking to the next section (Food / "A TABLE"). */}
      <nav className="section-nav accommodation-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#food">
          <span>{accommodation.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}

