import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getRsvpScale, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { getGroupMembers, resolveGuestName } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { getPlanGallery } from "../plan-galleries.js";

// "Nos 2 semaines" — a compact timeline of the whole two weeks (before,
// wedding, after). Each plan is a short card with a photo gallery behind it
// (click to open the lightbox); votable cards also carry an inline scale vote.
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
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(questionId, guest.id, UNANSWERED_LEVEL);
                }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(questionId, guest.id, entry.level);
                  }}
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

  const [activeGallery, setActiveGallery] = useState(null); // { label, photos, index }

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

  const openGallery = (plan) => {
    const photos = getPlanGallery(plan.gallery);
    if (!photos.length) return;
    setActiveGallery({ label: plan.title, photos, index: 0 });
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
          {coast.plans.map((plan, index) => {
            const photos = getPlanGallery(plan.gallery);
            const hasGallery = photos.length > 0;
            return (
              <article
                className={`plan-card${plan.kind === "wedding" ? " plan-card--wedding" : ""}${hasGallery ? " plan-card--gallery" : ""}`}
                key={index}
                style={hasGallery ? { "--plan-image": `url("${photos[0].src}")` } : undefined}
                onClick={() => openGallery(plan)}
                role={hasGallery ? "button" : undefined}
                tabIndex={hasGallery ? 0 : undefined}
                aria-label={hasGallery ? plan.title : undefined}
                onKeyDown={
                  hasGallery
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openGallery(plan);
                        }
                      }
                    : undefined
                }
              >
                <div className="plan-card__meta">
                  <span className="plan-card__dates">{plan.dates}</span>
                  <div className="plan-card__meta-right">
                    <span className="plan-card__nights">
                      <span aria-hidden="true">🌙</span> {plan.nights}{" "}
                      {plan.nights === 1 ? nightsLabel.one : nightsLabel.other}
                    </span>
                    {hasGallery && (
                      <span className="plan-card__gallery-badge" aria-hidden="true">
                        📷 {photos.length}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>

        <p className="coast-note">{coast.note}</p>
      </div>

      <nav className="section-nav coast-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#rsvp">
          <span>{t.nav.rsvp}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      <LightboxCarousel
        open={activeGallery !== null}
        onClose={() => setActiveGallery(null)}
        images={activeGallery?.photos || []}
        startIndex={activeGallery?.index ?? 0}
        label={activeGallery?.label || ""}
      />
    </section>
  );
}

export default Coast;
