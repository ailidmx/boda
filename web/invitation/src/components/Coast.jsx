import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getGroupMembers, resolveGuestName } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { Dialog } from "./ui/Dialog.jsx";
import { getPlanGallery } from "../plan-galleries.js";

const GALLERY_INTERVAL = 5000;

// Inline star rating (1–5) for the multi-destination Bahía de Banderas card.
// Each group member rates the active destination; the level maps straight onto
// the shared `rsvp.answers` scale (star N → level N).
function StarRating({ questionId, guests, answers, onVote }) {
  return (
    <div className="plan-card__stars">
      {guests.map((guest) => {
        const name = resolveGuestName(guest);
        const current = Number(answers[questionId]?.[guest.id]) || 0;
        return (
          <div className="plan-card__stars-row" key={guest.id}>
            <span className="plan-card__stars-name">{name.firstName}</span>
            <div className="plan-card__stars-list" role="group" aria-label={name.fullName}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`plan-card__star${star <= current ? " is-on" : ""}`}
                  aria-label={`${name.fullName}: ${star} estrellas`}
                  aria-pressed={current === star}
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(questionId, guest.id, current === star ? 0 : star);
                  }}
                >
                  ★
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
  voteButtonLabel,
  guests,
  answers,
  onOpenGallery,
  onOpenVote,
  onVote,
}) {
  const subDestinations = plan.subDestinations || [];
  const isMultiDestination = subDestinations.length > 0;

  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const activeSub = isMultiDestination ? subDestinations[activeSubIndex] : null;

  const photos = isMultiDestination
    ? getPlanGallery(activeSub.gallery)
    : getPlanGallery(plan.gallery);
  const hasGallery = photos.length > 0;

  const [index, setIndex] = useState(0);

  // Auto-advance the active gallery; reset when switching destination.
  useEffect(() => {
    setIndex(0);
  }, [activeSubIndex]);

  useEffect(() => {
    if (!hasGallery || photos.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, GALLERY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [hasGallery, photos.length]);

  const open = () => {
    if (!hasGallery) return;
    onOpenGallery({
      label: activeSub ? `${activeSub.name} · ${activeSub.tag}` : plan.title,
      photos,
      index,
    });
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

      {isMultiDestination && (
        <div className="plan-card__tabs" role="tablist" aria-label={plan.title}>
          {subDestinations.map((d, i) => (
            <button
              key={d.gallery}
              type="button"
              role="tab"
              aria-selected={i === activeSubIndex}
              className={`plan-card__tab${i === activeSubIndex ? " is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveSubIndex(i);
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="plan-card__meta">
        <span className="plan-card__dates">{plan.dates}</span>
        <div className="plan-card__meta-right">
          <span className="plan-card__nights">
            <span aria-hidden="true">🌙</span> {plan.nights}{" "}
            {plan.nights === 1 ? nightsLabel.one : nightsLabel.other}
          </span>
        </div>
      </div>

      {isMultiDestination && (
        <div className="plan-card__tags">
          {subDestinations.map((d) => (
            <span
              key={d.gallery}
              className={`plan-card__tag${d.gallery === activeSub.gallery ? " is-active" : ""}`}
            >
              {d.tag}
            </span>
          ))}
        </div>
      )}

      <strong className="plan-card__title">
        <span aria-hidden="true">{plan.icon}</span> {plan.title}
      </strong>
      <span className="plan-card__body">{plan.body}</span>

      {isMultiDestination ? (
        <StarRating
          questionId={activeSub.questionId}
          guests={guests}
          answers={answers}
          onVote={onVote}
        />
      ) : plan.questionId ? (
        <button
          type="button"
          className="plan-card__vote-cta"
          onClick={(e) => {
            e.stopPropagation();
            onOpenVote(plan);
          }}
        >
          {voteButtonLabel}
        </button>
      ) : null}

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
  const { t, profile } = useApp();
  const { answers, setAnswer } = useRsvp();
  const coast = t.coast || {};
  const voteLabels = coast.vote || {};
  const nightsLabel = coast.nightsLabel || { one: "nuit", other: "nuits" };
  const flow = RSVP_FLOWS.coast;

  const [activeGallery, setActiveGallery] = useState(null);
  const [votingPlan, setVotingPlan] = useState(null);

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
              voteButtonLabel={voteLabels.button}
              guests={guests}
              answers={answers}
              onOpenGallery={setActiveGallery}
              onOpenVote={setVotingPlan}
              onVote={handleVote}
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

      <Dialog
        open={votingPlan !== null}
        onClose={() => setVotingPlan(null)}
        closeOnEscape
        closeOnOverlayClick
        closeLabel={t.nav.close || "Cerrar"}
        aria-label={votingPlan?.title || ""}
        overlayClassName="plan-vote-modal"
        cardClassName="plan-vote-modal__card"
        closeClassName="plan-vote-modal__close"
      >
        {votingPlan && (
          <>
            <div className="plan-vote-modal__summary">
              <p className="eyebrow">
                <span aria-hidden="true">{votingPlan.icon}</span> {votingPlan.dates}
              </p>
              <p className="plan-vote-modal__body">{votingPlan.body}</p>
              <p className="plan-vote-modal__nights">
                <span aria-hidden="true">🌙</span> {votingPlan.nights}{" "}
                {votingPlan.nights === 1 ? nightsLabel.one : nightsLabel.other}
              </p>
            </div>
            <RsvpQuestion
              questionId={votingPlan.questionId}
              title={votingPlan.title}
              subtitle={votingPlan.dates}
              variant="scale"
              guests={guests}
              answers={answers[votingPlan.questionId] || {}}
              onChange={(guestId, level) =>
                handleVote(votingPlan.questionId, guestId, level)
              }
            />
          </>
        )}
      </Dialog>
    </section>
  );
}

export default Coast;
