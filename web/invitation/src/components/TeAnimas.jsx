import React, { useMemo, useRef, useState } from "react";

import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
import { getGroupMembers, guestTravelsByPlane } from "../guest-profiles.js";

import { getActiveGuests } from "../guests.js";
import { computeInitialStepIndex } from "../rsvp-responses.js";


/**
 * "¡Te animas!" — a dedicated section for the RSVP scale questions
 * (friday / saturday / sunday). Each guest in the invitation group rates how
 * likely they are to be present on each day, on the 0–5 likelihood scale.
 *
 * The flow is presented as flipable step cards: Step 1 = Friday, Step 2 =
 * Saturday, Step 3 = Sunday, Step 4 = Resumen. Answers are persisted per guest
 * to their own `rsvp_responses` doc.
 */
export function TeAnimas() {
  const { t, profile, interfaceText } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const rsvp = t.rsvp || {};
  const scale = rsvp.scale || {};
  const questions = scale.questions || [];
  const flow = RSVP_FLOWS.teAnimas;

  // The section that follows "¡Te animas!" depends on whether the guest
  // travels by plane: guests who fly continue to the FLIGHTS section, everyone
  // else skips straight to the accommodation section. The guest's travel
  // status is stored as the boolean `travelsByPlane` (true = flies in). See
  // guestTravelsByPlane().
  const travelsByPlane = guestTravelsByPlane(profile?.guest);

  const nextHref = travelsByPlane ? "#travel" : "#accommodation";
  const nextLabel = travelsByPlane ? t.nav.travel : t.nav.accommodation;



  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  const [saveStatus, setSaveStatus] = useState("idle");
  const sectionRef = useRef(null);

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level, RSVP_FLOWS.teAnimas);
  };


  // Persist the scale answers. Returns true on success so the caller can
  // advance to the review step, false on failure (the error stays visible).
  const handleSaveAnswers = async () => {
    if (saveStatus === "working") return false;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return false;
    setSaveStatus("working");
    try {
      await saveFlow({ flow, questions, guests, editorGuestId });
      setSaveStatus("saved");
      return true;
    } catch (error) {
      console.warn("[te-animas] scale save failed", error.code || error.message);
      setSaveStatus("error");
      return false;
    }
  };

  // Runs before the card advances forward. When leaving the LAST question step
  // (i.e. entering the recap), persist the answers automatically so the guest
  // never reaches the recap thinking they saved when they didn't. Always
  // returns true so the recap is shown with the save result (working/saved/
  // error) in its reserved message area.
  const handleBeforeNext = async (currentIndex) => {
    if (currentIndex === lastQuestionIndex) {
      await handleSaveAnswers();
    }
    return true;
  };


  // Scroll the RSVP back into view on every step change (next/back/modify) so
  // the guest always lands at the top of the flow instead of being left
  // mid-page.
  const handleNavigate = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  const saveStatusText =
    saveStatus === "working"
      ? interfaceText.submitWorking
      : saveStatus === "saved"
        ? scale.savedNote
        : saveStatus === "error"
          ? interfaceText.submitError
          : "";

  const lastQuestionIndex = questions.length - 1;

  const steps = [
    ...questions.map((q, i) => {
      const isLastQuestion = i === lastQuestionIndex;
      return {
        id: q.id,
        label: q.title,
        render: () => (
          <div className="rsvp-recap-step">
            <RsvpQuestion
              questionId={q.id}
              title={q.title}
              subtitle={q.subtitle}
              guests={guests}
              answers={answers[q.id] || {}}
              onChange={(guestId, level) => handleAnswerChange(q.id, guestId, level)}
            />

            {/* The success/error confirmation appears right here on the last
                question step after "Enregistrer mes réponses" is pressed. */}
            {isLastQuestion &&
            (saveStatus === "saved" || saveStatus === "error") ? (
              <small
                data-form-status={saveStatus === "saved" ? "success" : "error"}
              >
                {saveStatusText}
              </small>
            ) : null}

          </div>
        ),
      };
    }),
    {
      id: "resumen",
      label: rsvp.recap?.title || "Resumen",
      render: ({ goToStart }) => (
        <div className="rsvp-recap-step">
          <RsvpRecap questions={questions} guests={guests} answers={answers} />

          {/* Dedicated, always-present save-status placeholder. It reserves
              space and announces the result (working / saved / error) via
              aria-live so the guest always sees the outcome of the save. */}
          <p className="rsvp-status" role="status" aria-live="polite">
            {saveStatusText}
          </p>

          <div className="rsvp-scale-save">
            <button
              className="rsvp-scale-modify"
              type="button"
              data-analytics="rsvp.modify.teAnimas"
              onClick={goToStart}
            >
              {rsvp.recap?.modifyButton || "Modifier mes réponses"}
            </button>
          </div>

        </div>
      ),


    },
  ];




  // Auto-detect the starting step: the first question that is not fully
  // answered by every group member, or the recap when everything is answered.
  const initialStep = computeInitialStepIndex(questions, guests, answers);


  return (
    <section ref={sectionRef} className="rsvp-section section story-bg reveal">
      <p className="eyebrow">{t.nav.teAnimas}</p>
      <p>{scale.intro}</p>

      {questions.length > 0 && guests.length > 0 && (
        <FlipStepCard
          steps={steps}
          initialIndex={initialStep}
          onDone={() => markResume(flow)}
          hideBackOnLast
          hideNextOn={[lastQuestionIndex]}
          countSteps={questions.length}
          onNavigate={handleNavigate}
          onBeforeNext={handleBeforeNext}
          navRight={({ index, next }) => {
            // On the last question step, replace the "Next" button with the
            // gold "Enregistrer mes réponses" CTA, on the same line as Back.
            // Clicking it advances to the recap; `onBeforeNext` persists the
            // answers first and the result shows in the recap's message area.
            if (index !== lastQuestionIndex) return null;
            return (
              <button
                className="flip-step-btn flip-step-btn--primary"
                type="button"
                onClick={() => next()}
                disabled={saveStatus === "working"}
              >
                {scale.saveButton}
              </button>
            );
          }}
          copy={{
            step: interfaceText.stepLabel || "Step",
            next: interfaceText.next || "Next",
            back: interfaceText.back || "Back",
          }}
        />



      )}



      <nav className="te-animas-nav" aria-label="Continue">
        <a className="te-animas-nav-link" href={nextHref}>
          <span>{nextLabel}</span>
          <span aria-hidden="true">→</span>
        </a>
      </nav>
    </section>
  );
}

