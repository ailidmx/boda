import React, { useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getRsvpScale, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { getGroupMembers, resolveGuestName } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";

// "Nos 2 semaines" — a compact timeline of the whole two weeks (before,
// wedding, after). Each plan is a short card; votable cards carry an inline
// scale vote so guests can answer directly without a separate form. The
// wedding card is a marker (no vote).
function InlineVote({ questionId, guests, answers, scale, language, labels, onVote }) {
  const currentFor = (guestId) =>
    Number(answers[questionId]?.[guestId]) || UNANSWERED_LEVEL;

  return (
    <div className="plan-card__vote">
      <span className="plan-card__vote-label">{labels.label}</span>
      {guests.map((guest) => {
        const name = resolveGuestName(guest);
        const current = currentFor(guest.id);
        return (
          <div className="plan-card__vote-row" key={guest.id}>
            <span className="plan-card__vote-name">{name.firstName}</span>
            <div
              className="plan-card__vote-scale"
              role="group"
              aria-label={`${labels.label} · ${name.fullName}`}
            >
              <button
                type="button"
                className={`plan-card__vote-btn${current === UNANSWERED_LEVEL ? " is-selected" : ""}`}
                aria-label={`${name.fullName}: ${labels.noAnswer}`}
                title={labels.noAnswer}
                onClick={() => onVote(questionId, guest.id, UNANSWERED_LEVEL)}
              >
                —
              </button>
              {scale.map((entry) => (
                <button
                  type="button"
                  key={entry.level}
                  className={`plan-card__vote-btn${current === entry.level ? " is-selected" : ""}`}
                  aria-label={`${name.fullName}: ${entry[language] || entry.es}`}
                  title={entry[language] || entry.es}
                  onClick={() => onVote(questionId, guest.id, entry.level)}
                >
                  {entry.emoji}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Coast() {
  const { t, language, profile } = useApp();
  const { answers, setAnswer } = useRsvp();
  const coast = t.coast || {};
  const voteLabels = coast.vote || {};
  const nightsLabel = coast.nightsLabel || { one: "nuit", other: "nuits" };
  const flow = RSVP_FLOWS.coast;
  const scale = getRsvpScale();

  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  const handleVote = async (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level, flow);
    const guest = guests.find((g) => g.id === guestId);
    const editorGuestId = profile?.guest?.id;
    if (!guest || !editorGuestId) return;
    try {
      await saveRsvpAnswers(guest, { [questionId]: level }, editorGuestId);
    } catch (error) {
      console.warn("[coast] vote save failed", error.code || error.message);
    }
  };

  return (
    <section className="coast-section coast-section--after section" id="after">
      <div id="after-intro" className="coast-copy reveal">
        <div className="section-heading">
          <p className="eyebrow">{coast.eyebrow}</p>
          <h2>{coast.title}</h2>
          <p className="lead">{coast.body}</p>
        </div>

        <div className="plan-cards">
          {coast.plans.map((plan, index) => (
            <article
              className={`plan-card${plan.kind === "wedding" ? " plan-card--wedding" : ""}`}
              key={index}
            >
              <div className="plan-card__meta">
                <span className="plan-card__dates">{plan.dates}</span>
                <span className="plan-card__nights">
                  {plan.nights} {plan.nights === 1 ? nightsLabel.one : nightsLabel.other}
                </span>
              </div>
              <strong className="plan-card__title">
                <span aria-hidden="true">{plan.icon}</span> {plan.title}
              </strong>
              <span className="plan-card__body">{plan.body}</span>
              {plan.questionId && (
                <InlineVote
                  questionId={plan.questionId}
                  guests={guests}
                  answers={answers}
                  scale={scale}
                  language={language}
                  labels={voteLabels}
                  onVote={handleVote}
                />
              )}
            </article>
          ))}
        </div>

        <p className="coast-note">{coast.note}</p>
      </div>

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
