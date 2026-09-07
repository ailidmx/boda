import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { FlipStepCard } from "./FlipStepCard.jsx";
import { getGroupMembers } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { computeInitialStepIndex } from "../rsvp-responses.js";
import { Button } from "./ui/Button.jsx";

// "Avant ?" — the beach plan BEFORE the wedding (Bahía de Banderas,
// Friday February 12 → Tuesday February 16). Compact plan cards + a
// single-question mini RSVP (`playa`).
export function Avant() {
  const { t, interfaceText, profile } = useApp();
  const { answers, setAnswer, markResume, saveFlow } = useRsvp();
  const avant = t.avant || {};
  const rsvpMini = avant.rsvpMini || {};
  const flow = RSVP_FLOWS.avant;

  const rsvpRef = useRef(null);
  const handleNavigate = () => {
    rsvpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

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

  const initialStep = computeInitialStepIndex(questions, guests, answers);
  const [saveStatus, setSaveStatus] = useState("idle");

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
      console.warn("[avant] rsvp save failed", error.code || error.message);
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
    <section className="coast-section section" id="avant">
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

      <div id="avant-intro" className="coast-copy reveal">
        <div className="section-heading">
          <p className="eyebrow">{avant.eyebrow}</p>
          <h2>{avant.title}</h2>
          <p className="lead">{avant.body}</p>
        </div>
        <div className="plan-cards">
          {avant.plans.map((plan, index) => (
            <article className="plan-card" key={index}>
              <span className="plan-card__dates">{plan.dates}</span>
              <strong className="plan-card__title">{plan.title}</strong>
              <span className="plan-card__body">{plan.body}</span>
            </article>
          ))}
        </div>
        <p className="coast-note">{avant.note}</p>
      </div>

      <a
        className="section-nav-link section-nav-link--inline"
        href="#avant-rsvp"
      >
        <span>{t.nav.avantRsvp}</span>
        <span aria-hidden="true">↓</span>
      </a>

      <div id="avant-rsvp" className="coast-rsvp-mini reveal" ref={rsvpRef}>
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
                      data-analytics="rsvp.modify.avant"
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

      <nav className="section-nav coast-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#after">
          <span>{t.nav.coast}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}

export default Avant;
