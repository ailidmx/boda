import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { RsvpQuestion, BOOLEAN_YES } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";

import { PETANQUE_PLACEHOLDERS } from "../petanqueGallery.js";
import { MEDIA } from "../media.js";
import { getGroupMembers } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { computeInitialStepIndex } from "../rsvp-responses.js";
import { Button } from "./ui/Button.jsx";




/**
 * Pétanque — a tribute to the traditional French ball game that has brought
 * the couple together with a wonderful community of friends and clubmates in
 * Mexico and around the world. Sits between the detailed programme and the
 * accommodation section.
 *
 * At the end of the tribute there is a compact RSVP question section for the
 * friendly Friday pétanque tournament. It reuses the shared RSVP components
 * ("¡Te animas!" look) with the boolean variant: one row per guest of the
 * invitation group, each with a Yes/No toggle for the two questions (join the
 * tournament, and bring your own boules). Answers are persisted per guest to
 * their own `rsvp_responses` doc via `saveRsvpAnswers`.
 *
 * The "own boules" question is conditional: it is only shown for guests who
 * answered "yes" to the participation question. If a guest changes their
 * participation answer away from "yes", their boules answer is reset to
 * unanswered (0) automatically.
 */
export function Petanque() {
  const { t, language, profile, interfaceText } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const petanque = t.petanqueTribute || {};
  const nav = t.nav || {};
  const rsvpMini = petanque.rsvpMini || {};
  const flow = RSVP_FLOWS.petanque;

  // Full-screen lightbox state for the pétanque photo set.
  const [lightbox, setLightbox] = useState(null);

  // The group's guests (the signed-in guest + the other members of their
  // invitation group). These are the people the mini questions apply to.
  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  // The two boolean questions. Levels: 0 = unanswered, 1 = yes, 2 = no.
  const questions = useMemo(() => {
    const qs = [];
    if (rsvpMini.fields?.participation) {
      qs.push({
        id: "petanqueParticipation",
        title: rsvpMini.fields.participation,
        subtitle: rsvpMini.intro,
        variant: "boolean",
      });
    }
    if (rsvpMini.fields?.ownBoules) {
      qs.push({
        id: "petanqueOwnBoules",
        title: rsvpMini.fields.ownBoules,
        subtitle: rsvpMini.fields.ownBoulesHint,
        variant: "boolean",
      });
    }

    return qs;
  }, [rsvpMini]);

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | working | saved | error

  // Only guests who said "yes" to the tournament should see the boules
  // question. This list is derived from the current participation answers.
  const boulesGuests = useMemo(
    () =>
      guests.filter(
        (guest) => answers.petanqueParticipation?.[guest.id] === BOOLEAN_YES,
      ),
    [guests, answers.petanqueParticipation],
  );

  // The questions actually shown. If nobody in the group said "yes" to the
  // tournament, the "own boules" question is hidden entirely (it would have
  // no rows to show) and the section jumps straight to the next question.
  const visibleQuestions = useMemo(
    () =>
      boulesGuests.length === 0
        ? questions.filter((q) => q.id !== "petanqueOwnBoules")
        : questions,
    [questions, boulesGuests.length],
  );

  // Auto-detect the starting step: the first visible question that is not fully
  // answered by every group member, or the recap when everything is answered.
  // The "own boules" question only applies to the guests who said "yes" to the
  // tournament, so it is only considered answered once THOSE guests have
  // answered it — otherwise a guest who said "no" to participation (and thus
  // has no boules answer) would block the flow from ever reaching the recap.
  const initialStep = computeInitialStepIndex(visibleQuestions, guests, answers, {
    petanqueOwnBoules: boulesGuests,
  });



  const handleAnswerChange = (questionId, guestId, level) => {

    setAnswer(questionId, guestId, level, RSVP_FLOWS.petanque);
    // If participation is no longer "yes", clear the boules answer for that
    // guest so it doesn't linger as a stale "yes"/"no".
    if (questionId === "petanqueParticipation" && level !== BOOLEAN_YES) {
      setAnswer("petanqueOwnBoules", guestId, 0, RSVP_FLOWS.petanque);
    }
  };


  const handleSaveAnswers = async () => {
    if (saveStatus === "working") return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setSaveStatus("working");
    try {
      // Persist each guest's answers to their own rsvp_responses doc.
      await saveFlow({ flow, questions: visibleQuestions, guests, editorGuestId });
      setSaveStatus("saved");
    } catch (error) {
      console.warn("[petanque] rsvp save failed", error.code || error.message);
      setSaveStatus("error");
    }
  };

  // Runs before the card advances forward. When leaving the LAST question step
  // (i.e. entering the recap), persist the answers automatically so the guest
  // never reaches the recap thinking they saved when they didn't. Always
  // returns true so the recap is shown with the save result (working/saved/
  // error) in its reserved message area.
  const handleBeforeNext = async (currentIndex) => {
    if (currentIndex === visibleQuestions.length - 1) {
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

  const slides = PETANQUE_PLACEHOLDERS.map((photo, index) => ({
    src: photo.src,
    full: photo.full,
    alt: petanque.photoAlts?.[index],
  }));

  return (
    <section className="petanque-section section story-bg" id="petanque">
      {/* Large, blurred, far-away GDL club logo as an integrated background
          motif. The solid blue background is stripped via Cloudinary so the
          logo floats transparently over the section's blue base. */}
      <img
        className="petanque-logo-bg"
        src={MEDIA.petanqueLogo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />

      <div className="petanque-copy reveal">

        <div className="section-heading">
          <p className="eyebrow">{petanque.eyebrow}</p>
          <h2>{petanque.title}</h2>
          <p className="lead petanque-lead">{petanque.intro}</p>
        </div>

        <p className="petanque-body">{petanque.body}</p>
        <p className="petanque-homage handwritten">{petanque.homage}</p>

        <div className="petanque-photos" aria-label={petanque.photosLabel}>
          {PETANQUE_PLACEHOLDERS.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="petanque-photo"
              onClick={() => setLightbox({ startIndex: index })}
              aria-label={`${petanque.photoAlts?.[index] || ""} — ver en grande`}
            >
              <img
                src={photo.src}
                alt={petanque.photoAlts?.[index] || ""}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>

      </div>

      {/* Mini RSVP question section: friendly Friday pétanque tournament.
          Presented as flipable step cards: Step 1 = participation, Step 2 =
          own boules (only if someone said yes), Step 3 = resumen. Rendered as
          a direct child of the section so it spans the full section width
          instead of being constrained by the centered copy column. */}
      {rsvpMini.title && guests.length > 0 && visibleQuestions.length > 0 && (
        <div className="petanque-rsvp-mini">
            <div className="petanque-rsvp-mini-head">
              <p className="eyebrow">{rsvpMini.eyebrow}</p>
              <h3>{rsvpMini.title}</h3>
              <p className="petanque-rsvp-mini-intro">{rsvpMini.intro}</p>
              {rsvpMini.organizerLabel && rsvpMini.organizerWhatsapp && (
                <a
                  className="petanque-organizer-link"
                  href={rsvpMini.organizerWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {rsvpMini.organizerLabel}
                </a>
              )}
            </div>

            <FlipStepCard
              onDone={() => markResume(flow)}
              initialIndex={initialStep}
              hideBackOnLast
              hideNextOn={[visibleQuestions.length - 1]}
              countSteps={visibleQuestions.length}
              onBeforeNext={handleBeforeNext}
              navRight={({ index, next }) => {
                // On the last question step, replace the "Next" button with the
                // gold "Save my responses" CTA, on the same line as Back.
                // Clicking it advances to the recap; `onBeforeNext` persists
                // the answers first and the result shows in the recap.
                if (index !== visibleQuestions.length - 1) return null;
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

              steps={[

                {
                  id: "participation",
                  label: rsvpMini.fields?.participation,
                  render: () => (
                    <RsvpQuestion
                      questionId="petanqueParticipation"
                      title={rsvpMini.fields?.participation}
                      subtitle={rsvpMini.intro}
                      variant="boolean"
                      yesLabel={rsvpMini.yesLabel}
                      noLabel={rsvpMini.noLabel}
                      guests={guests}
                      answers={answers.petanqueParticipation || {}}
                      onChange={(guestId, level) =>
                        handleAnswerChange("petanqueParticipation", guestId, level)
                      }
                    />
                  ),
                },
                ...(boulesGuests.length > 0
                  ? [
                      {
                        id: "boules",
                        label: rsvpMini.fields?.ownBoules,
                        render: () => (
                          <RsvpQuestion
                            questionId="petanqueOwnBoules"
                            title={rsvpMini.fields?.ownBoules}
                            subtitle={rsvpMini.fields?.ownBoulesHint}
                            variant="boolean"
                            yesLabel={rsvpMini.yesLabel}
                            noLabel={rsvpMini.noLabel}
                            guests={boulesGuests}
                            answers={answers.petanqueOwnBoules || {}}
                            onChange={(guestId, level) =>
                              handleAnswerChange("petanqueOwnBoules", guestId, level)
                            }
                          />
                        ),
                      },
                    ]
                  : []),

                {
                  id: "resumen",
                  label: rsvpMini.recapTitle || "Resumen",
                  render: ({ back }) => (
                    <div className="rsvp-recap-step">
                      <RsvpRecap
                        questions={visibleQuestions}
                        guests={guests}
                        answers={answers}
                      />
                      <div className="petanque-rsvp-save">
                        <Button
                          variant="gold"
                          data-analytics="rsvp.modify.petanque"
                          onClick={back}
                        >
                          {rsvpMini.modifyButton || rsvpMini.button}
                        </Button>

                        {/* Dedicated, always-present save-status placeholder.
                            It reserves space and announces the result
                            (working / saved / error) via aria-live so the
                            guest always sees the outcome of the save. */}
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
              copy={{
                step: interfaceText.stepLabel || "Step",
                next: interfaceText.next || "Next",
                back: interfaceText.back || "Back",
              }}
            />


        </div>
      )}

      {/* Desktop-only bottom nav: leads to the food section. */}
      <nav className="petanque-nav" aria-label="Continue">
        <a className="petanque-nav-link" href="#food">
          <span>{petanque.navNext || nav.food}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={slides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={petanque.photosLabel}
      />
    </section>
  );
}
