import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getRsvpScale, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { getGroupMembers, resolveGuestName } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { getPlanGallery } from "../plan-galleries.js";

// How often the card background advances to the next photo (ms).
const GALLERY_INTERVAL = 5000;

// "Nos 2 semaines" — a compact timeline of the whole two weeks. Each plan is a
// short card whose background is a photo gallery that auto-plays (random start,
// navigation dots); clicking the card opens the same photos in the lightbox.
// Votable cards also carry an inline scale vote.
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

function PlanCard({
  plan,
  nightsLabel,
  guests,
  answers,
  scale,
  language,
  voteLabels,
  onVote,
  onOpenGallery,
}) {
  const photos = getPlanGallery(plan.gallery);
  const hasGallery = photos.length > 0;

  // Random start index + auto-advance through the gallery photos.
  const [index, setIndex] = useState(() =>
    hasGallery ? Math.floor(Math.random() * photos.length) : 0,
  );

  useEffect(() => {
    if (!hasGallery || photos.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, GALLERY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [hasGallery, photos.length]);

  const open = () => {
    if (!hasGallery) return;
    onOpenGallery({ label: plan.title, photos, index });
  };

  return (
    <article
      className={`plan-card${plan.kind === "wedding" ? " plan-card--wedding" : ""}${hasGallery ? " plan-card--gallery" : ""}`}
      onClick={open}
      role={hasGallery ? "button" : undefined}
      tabIndex={hasGallery ? 0 : undefined}
      aria-label={hasGallery ? plan.title : undefined}
      onKeyDown={
        hasGallery
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }
          : undefined
      }
    >
      {hasGallery && (
        <img
          className="plan-card__bg"
          src={photos[index].src}
          alt=""
          loading="lazy"
          decoding="async"
          key={index}
        />
      )}

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
          onVote={onVote}
        />
      )}

      {hasGallery && photos.length > 1 && (
        <div className="plan-card__dots" role="group" aria-label={plan.title}>
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`plan-card__dot${i === index ? " is-active" : ""}`}
              aria-label={`Foto ${i + 1}`}
              aria-current={i === index}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </article>
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
            <PlanCard
              key={index}
              plan={plan}
              nightsLabel={nightsLabel}
              guests={guests}
              answers={answers}
              scale={scale}
              language={language}
              voteLabels={voteLabels}
              onVote={handleVote}
              onOpenGallery={setActiveGallery}
            />
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

      <LightboxCarousel
        open={activeGallery !== null}
        onClose={() => setActiveGallery(null)}
        images={activeGallery?.photos || []}
        startIndex={activeGallery?.index ?? 0}
        label={activeGallery?.label || ""}
        autoPlay
      />
    </section>
  );
}

export default Coast;
