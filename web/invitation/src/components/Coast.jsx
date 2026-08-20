import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
import { BARRA_PHOTOS } from "../barraGallery.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
  resolveLiveGuest,
} from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomsByCabin } from "../rooms.js";
import { cloudinaryImage } from "../cloudinary.js";
import { getActiveGuests } from "../guests.js";
import { computeInitialStepIndex } from "../rsvp-responses.js";
import { Button } from "./ui/Button.jsx";

import {
  ExtraStayCard,
  CoastSuggestions,
  CoastBudget,
} from "../features/coast/index.js";


export function Coast() {
  const { t, language, interfaceText, profile } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const coast = t.coast || {};
  const suggestions = coast.suggestions || {};
  const rsvpMini = coast.rsvpMini || {};
  const flow = RSVP_FLOWS.coast;

  const barraRef = useRef(null);
  // The mini RSVP card. Used to scroll the flow back into view on every step
  // change (next/back/modify) so the guest always lands at the top of the
  // card instead of being left mid-page.
  const rsvpRef = useRef(null);
  const handleNavigate = () => {
    rsvpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  // The active member shown in the extra-stay card. Defaults to the signed-in

  // guest; the guest selector (member tabs) lets the user switch between the
  // members of their invitation group, mirroring the Accommodation section.
  const [activeMemberId, setActiveMemberId] = useState(null);
  const activeMember = activeMemberId
    ? guests.find((m) => m.id === activeMemberId) || profile?.guest
    : profile?.guest;
  const liveActive = resolveLiveGuest(activeMember) || activeMember;
  const extraCabinId = getXtraCabinId(liveActive);
  const hasExtraCabin = Boolean(extraCabinId);
  const extraCabin = getCabin(extraCabinId);
  const extraRoom = getXtraRoomId(liveActive);
  const option = t.accommodation?.guestOption || {};
  const extraStay = coast.extraStay || {};

  // Payment block labels for the extra stay, mirroring the final RSVP's
  // PaymentSummary. We reuse the RSVP payment copy (per-person / per-group /
  // cabin title) so the extra-stay pricing reads identically to the final
  // RSVP, and the "covered by the couple" label from the accommodation option.
  const rsvpPayment = t.rsvp?.payment || {};
  const extraPayment = {
    ...rsvpPayment,
    cabinTitle: rsvpPayment.extraCabinTitle || option.onSiteTitle,
  };
  const extraCoveredLabel = option.payment?.covered || "";

  // Extra cabin display name (normalised whitespace, like the primary cabin).

  const extraCabinName = extraCabin?.name?.replace(/\s+/g, " ") || extraCabinId;

  // Photos come from the DB (Cloudinary IDs). cloudinaryIds may be an array
  // (new format) or a comma-separated string (legacy format).
  const rawXtraCloudinaryIds = extraCabin?.cloudinaryIds;
  const xtraCloudinaryIdList = Array.isArray(rawXtraCloudinaryIds)
    ? rawXtraCloudinaryIds
    : typeof rawXtraCloudinaryIds === "string"
      ? rawXtraCloudinaryIds.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
  const extraCabinPhotos = xtraCloudinaryIdList.map((id) =>
    cloudinaryImage(`boda/${id}`, { width: 1200 }),
  );

  // Whether the active guest's extra stay is covered by the couple.
  const extraPaidByCouple = resolveXtraCovered(liveActive);

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

  // Auto-detect the starting step: the first question that is not fully
  // answered by every group member, or the recap when everything is answered.
  const initialStep = computeInitialStepIndex(questions, guests, answers);

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | working | saved | error

  // Full-screen lightbox for the Barra de Navidad photo strip. `barraLightbox`
  // holds the start index or null. The lightbox itself is swipeable.
  const [barraLightbox, setBarraLightbox] = useState(null);

  // ── Barra de Navidad budget estimate ─────────────────────────────────────
  // A hotel night in Barra de Navidad runs ~1,200–2,500 MXN per person. The
  // beach plan (Plan 2 · La plage) is 4 nights (Tue–Sat). We estimate the
  // group total from how many group members rated the beach plan as
  // interested (level ≥ 3 on the 0–5 scale).
  const BARRA_NIGHTS = 4;
  const BARRA_MIN_PER_NIGHT = 1200;
  const BARRA_MAX_PER_NIGHT = 2500;
  const INTEREST_THRESHOLD = 3;
  const interestedCount = useMemo(
    () =>
      guests.filter(
        (guest) => (answers.playa?.[guest.id] ?? 0) >= INTEREST_THRESHOLD,
      ).length,
    [guests, answers.playa],
  );
  const barraMinTotal = BARRA_MIN_PER_NIGHT * BARRA_NIGHTS * interestedCount;
  const barraMaxTotal = BARRA_MAX_PER_NIGHT * BARRA_NIGHTS * interestedCount;
  const budget = coast.budget || {};

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level, RSVP_FLOWS.coast);
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

  // Runs before the card advances forward. When leaving the LAST question step
  // (i.e. entering the recap), persist the answers automatically so the guest
  // never reaches the recap thinking they saved when they didn't. Always
  // returns true so the recap is shown with the save result (working/saved/
  // error) in its reserved message area.
  const handleBeforeNext = async (currentIndex) => {
    if (currentIndex === questions.length - 1) {
      await handleSaveAnswers();
    }
    return true;
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
              <button
                className="barra-photo"
                type="button"
                key={index}
                onClick={() => setBarraLightbox(index)}
                aria-label={`${coast.barraPhotosLabel} · ${index + 1} — ver en grande`}
              >
                <img
                  src={photo.src}
                  alt={`${coast.barraPhotosLabel} · ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </button>
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

      {/* Extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday) — shown only
          when the active guest has an extra cabin assigned for the second
          stay. Reuses the same StayPlanCard as the Hébergement section so the
          pricing, "paid by the couple" banner, and on-sale styling match. */}
      {hasExtraCabin && extraCabin && (
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
          onSelectMember={setActiveMemberId}
          payment={extraPayment}
          coveredLabel={extraCoveredLabel}
        />

      )}

      {/* Coast accommodation suggestions — mirrors the Accommodation "no
          cabin" pattern: an Airbnb section (one listing per group size) and a
          hotel section (a short selection ordered by price). */}
      <CoastSuggestions suggestions={suggestions} language={language} />

      {/* Mini RSVP — a 3-step flipable card (like "¡Te animas!" and pétanque):
          Step 1 = stay at Roca Azul, Step 2 = the beach plan, Step 3 = summary.
          Each guest rates how likely they are to join each "Et après ?" plan
          (0–5). Answers are saved per guest to Firestore via saveRsvpAnswers. */}
      <div className="coast-rsvp-mini reveal" ref={rsvpRef}>
        <div className="coast-rsvp-mini-head">
          <p className="eyebrow">{rsvpMini.eyebrow}</p>
          <h3>{rsvpMini.title}</h3>
          <p className="coast-rsvp-mini-intro">{rsvpMini.intro}</p>
        </div>

        <FlipStepCard
          onDone={() => markResume(flow)}
          initialIndex={initialStep}
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
              render: ({ goToStart }) => (
                <div className="rsvp-recap-step">
                  <RsvpRecap
                    questions={questions}
                    guests={guests}
                    answers={answers}
                    recapTitle={rsvpMini.recapTitle}
                    recapProgress={rsvpMini.recapProgress}
                  />
                  <div className="coast-rsvp-save">
                    <Button
                      variant="ghost"
                      data-analytics="rsvp.modify.coast"
                      onClick={goToStart}
                    >
                      {rsvpMini.modifyButton}
                    </Button>
                    {/* Dedicated, always-present save-status placeholder.
                        It reserves space and announces the result
                        (working / saved / error) via aria-live so the guest
                        always sees the outcome of the save. */}
                    <p
                      className={`rsvp-status${
                        saveStatus === "saved"
                          ? " rsvp-status--success"
                          : saveStatus === "error"
                            ? " rsvp-status--error"
                            : ""
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      {saveStatusText}
                    </p>
                  </div>

                </div>
              ),
            },
          ]}
          countSteps={questions.length}
          onNavigate={handleNavigate}
          hideBackOnLast
          hideNextOn={[questions.length - 1]}
          onBeforeNext={handleBeforeNext}
          navRight={({ index, next }) => {
            // On the last question step, replace the "Next" button with the
            // gold "Save my responses" CTA, on the same line as Back.
            // Clicking it advances to the recap; `onBeforeNext` persists the
            // answers first and the result shows in the recap.
            if (index !== questions.length - 1) return null;
            return (
              <button
                className="flip-step-btn flip-step-btn--primary"
                type="button"
                onClick={() => next()}
                disabled={saveStatus === "working"}
              >
                {rsvpMini.button}
              </button>
            );
          }}

          copy={{
            step: interfaceText.stepLabel || "Step",
            next: interfaceText.next || "Next",
            back: interfaceText.back || "Back",
          }}
        />
      </div>

      {/* Barra de Navidad budget estimate — a "budget to plan" block that
          turns the per-night per-person rate (1,200–2,500 MXN) into a group
          total for the 4 beach nights, based on how many group members rated
          the beach plan as interested (level ≥ 3). */}
      <CoastBudget
        budget={budget}
        language={language}
        barraMinTotal={barraMinTotal}
        barraMaxTotal={barraMaxTotal}
        interestedCount={interestedCount}
      />


      {/* Desktop-only bottom nav: leads to the photos section. */}
      <nav className="section-nav coast-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#rsvp">
          <span>{t.nav.rsvp}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Full-screen lightbox for the Barra de Navidad photo strip. The
          lightbox itself is swipeable (touch, arrows, dots). */}
      <LightboxCarousel
        open={barraLightbox !== null}
        onClose={() => setBarraLightbox(null)}
        images={BARRA_PHOTOS}
        startIndex={barraLightbox ?? 0}
        label={coast.barraPhotosLabel}
      />
    </section>
  );
}
