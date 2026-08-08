import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
import { getGroupMembers } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { resolveRsvpAnswer, saveRsvpAnswers } from "../rsvp-responses.js";

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
  const rsvp = t.rsvp || {};
  const scale = rsvp.scale || {};
  const questions = scale.questions || [];

  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  const [answers, setAnswers] = useState(() => {
    const initial = {};
    questions.forEach((q) => {
      initial[q.id] = {};
      guests.forEach((guest) => {
        initial[q.id][guest.id] = resolveRsvpAnswer(guest, q.id);
      });
    });
    return initial;
  });

  const [saveStatus, setSaveStatus] = useState("idle");

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [guestId]: level,
      },
    }));
  };

  const handleSaveAnswers = async () => {
    if (saveStatus === "working") return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setSaveStatus("working");
    try {
      await Promise.all(
        guests.map((guest) => {
          const guestAnswers = {};
          questions.forEach((q) => {
            const level = answers[q.id]?.[guest.id];
            if (level !== undefined) guestAnswers[q.id] = level;
          });
          return saveRsvpAnswers(guest, guestAnswers, editorGuestId);
        }),
      );
      setSaveStatus("saved");
    } catch (error) {
      console.warn("[te-animas] scale save failed", error.code || error.message);
      setSaveStatus("error");
    }
  };

  const saveStatusText =
    saveStatus === "working"
      ? interfaceText.submitWorking
      : saveStatus === "saved"
        ? scale.savedNote
        : saveStatus === "error"
          ? interfaceText.submitError
          : "";

  const steps = [
    ...questions.map((q) => ({
      id: q.id,
      label: q.title,
      render: () => (
        <RsvpQuestion
          questionId={q.id}
          title={q.title}
          subtitle={q.subtitle}
          guests={guests}
          answers={answers[q.id] || {}}
          onChange={(guestId, level) => handleAnswerChange(q.id, guestId, level)}
        />
      ),
    })),
    {
      id: "resumen",
      label: rsvp.recap?.title || "Resumen",
      render: () => (
        <div className="rsvp-recap-step">
          <RsvpRecap questions={questions} guests={guests} answers={answers} />
          <div className="rsvp-scale-save">
            <button
              className="button button-light"
              type="button"
              onClick={handleSaveAnswers}
              disabled={saveStatus === "working"}
            >
              {scale.saveButton}
            </button>
            {saveStatusText ? (
              <small data-form-status>{saveStatusText}</small>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="rsvp-section section story-bg">
      <div className="rsvp-frame reveal">
        <p className="eyebrow">{t.nav.teAnimas}</p>
        <p>{scale.intro}</p>

        {questions.length > 0 && guests.length > 0 && (
          <FlipStepCard
            steps={steps}
            copy={{
              step: interfaceText.stepLabel || "Step",
              next: interfaceText.next || "Next",
              back: interfaceText.back || "Back",
            }}
          />
        )}
      </div>
    </section>
  );
}
