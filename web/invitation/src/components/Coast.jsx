import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
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

import { ExtraStayCard } from "../features/coast/index.js";


export function Coast() {
  const { t, language, interfaceText, profile } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const coast = t.coast || {};
  const rsvpMini = coast.rsvpMini || {};
  const flow = RSVP_FLOWS.coast;

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

  // Whether a member's extra stay is already paid (mirrors the primary stay's
  // `resolveMemberPaid`, but reads the extra-cabin payment flag).
  const resolveXtraPaid = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isXtraCabinPaid ?? source?.isXtraCabinPaid;
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

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level, flow);
  };

  const handleSaveAnswers = async () => {
    if (saveStatus === "working") return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setSaveStatus("working");
    try {
      await saveFlow({ flow, questions, guests, editorGuestId });
      setSaveStatus("saved");
    } catch (error) {
      console.warn("[coast] rsvp save failed", error.code || error.message);
      setSaveStatus("error");
    }
  };

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

  return (
    <section className="coast-section coast-section--after section" id="after">
      {/* Screen 1 · the intro: the two "Et après ?" plans (Roca Azul +
          Mazamitla). */}
      <div id="after-intro" className="coast-copy reveal">
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
      </div>

      {/* Inline nav: from the intro to the extra-stay plan, or straight to the
          mini RSVP when the guest has no extra cabin assigned. */}
      <a
        className="section-nav-link section-nav-link--inline"
        href={hasExtraCabin ? "#after-plan" : "#after-rsvp"}
      >
        <span>{t.nav[hasExtraCabin ? "coastPlan" : "coastRsvp"]}</span>
        <span aria-hidden="true">↓</span>
      </a>

      {/* Screen 2 · the extra stay (Plan 1 · stay at Roca Azul, Sunday→Tuesday).
          Shown only when the active guest has an extra cabin assigned. */}
      {hasExtraCabin && extraCabin && (
        <div id="after-plan" className="coast-plan">
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
            payment={extraPayment}
            coveredLabel={extraCoveredLabel}
          />
        </div>
      )}

      {/* Inline nav: from the extra-stay plan to the mini RSVP. */}
      {hasExtraCabin && extraCabin && (
        <a
          className="section-nav-link section-nav-link--inline"
          href="#after-rsvp"
        >
          <span>{t.nav.coastRsvp}</span>
          <span aria-hidden="true">↓</span>
        </a>
      )}

      {/* Screen 3 · the mini RSVP: Step 1 = stay at Roca Azul, Step 2 =
          Mazamitla, Step 3 = summary. */}
      <div id="after-rsvp" className="coast-rsvp-mini reveal" ref={rsvpRef}>
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

      {/* Desktop-only bottom nav: leads to the RSVP section. */}
      <nav className="section-nav coast-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#rsvp">
          <span>{t.nav.rsvp}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}

export default Coast;
