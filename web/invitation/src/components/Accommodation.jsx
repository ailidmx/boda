import React, { useEffect, useRef, useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
} from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomDescription, getRoomsByCabin } from "../rooms.js";

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

function AccommodationPrice({ amount, language, covered = false, coveredLabel }) {
  return (
    <dd className={`accommodation-price${covered ? " is-covered" : ""}`}>
      <span className="accommodation-price-values">
        <strong>{formatPrice(amount, language)} MXN</strong>
        <small>≈ {formatPrice(amount / MXN_PER_EUR, language)} €</small>
      </span>
      {covered && <em>{coveredLabel}</em>}
    </dd>
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
  const hosting = activeMember?.hosting || {};
  const assignedCabin =
    hosting.cabin || activeMember?.cabin || activeMember?.cabinLabel || activeMember?.unit || activeMember?.room;
  const assignedRoom = hosting.room || activeMember?.room;
  const extraCabin = hosting.xtraCabin || activeMember?.xtraCabin;
  const extraRoom = hosting.xtraRoom || activeMember?.xtraRoom;
  const room = assignedRoom ? getRoom(assignedRoom) : null;
  const roomDescription = getRoomDescription(room, language);
  const cabinId = room?.cabin || assignedCabin;
  const cabin = getCabin(cabinId);
  const cabinName = cabin?.name?.replace(/\s+/g, " ") || cabinId;
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
  const hasNoCabin = Boolean(
    activeMember && (activeMember.hasCabin === false || !assignedCabin),
  );
  const option = accommodation.guestOption || {};
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
  const [noteOpen, setNoteOpen] = useState(false);
  const [sectionActive, setSectionActive] = useState(false);
  const sectionRef = useRef(null);
  const noteFabRef = useRef(null);
  const noteCloseRef = useRef(null);

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

  return (
    <section className="accommodation-section section" ref={sectionRef}>
      <div className="accommodation-copy reveal" id="accommodation-overview">
        <p className="eyebrow">{accommodation.eyebrow}</p>
        <h2>{accommodation.title}</h2>
        {accommodation.citation && (
          <p className="accommodation-citation">{accommodation.citation}</p>
        )}
        <p className="lead">{accommodation.body}</p>

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
        {groupMembers.length > 1 && (
          <div className="accommodation-member-tabs" role="tablist" aria-label={option.membersLabel || "Group members"}>
            {groupMembers.map((member) => {
              const { firstName } = resolveGuestName(member);
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
                  <span className="accommodation-member-tab-name">{firstName}</span>
                  {member.id === guest?.id && <small>{option.youLabel}</small>}
                </button>
              );
            })}
          </div>
        )}
        <h3>{hasNoCabin ? option.independentTitle : option.onSiteTitle}</h3>
        {hasNoCabin ? (
          <p className="accommodation-personal-note">
            {accommodation.noCabinRecommendation}
          </p>
        ) : (
          <p>{option.onSiteBody}</p>
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
                  amount={cabin.totalPrice2Nights}
                  language={language}
                  coveredLabel={option.coveredPriceLabel}
                />
              </div>
            )}
            {cabin?.pricePerPerson2Nights && (
              <div>
                <dt>{option.personPriceLabel}</dt>
                <AccommodationPrice
                  amount={cabin.pricePerPerson2Nights}
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
          <section className="accommodation-cabin-occupancy">
            <h4>{option.wholeCabinTitle}</h4>
            <p>{option.wholeCabinBody}</p>
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
          </section>
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

        <a className="button button-dark" href="#rsvp">
          {option.button}
        </a>
        <nav className="accommodation-subnav accommodation-subnav--back" aria-label={option.backLabel}>
          <a href="#accommodation-overview">
            <span aria-hidden="true">↑</span>
            <span>{option.backLabel}</span>
          </a>
        </nav>
      </div>
    </section>
  );
}
