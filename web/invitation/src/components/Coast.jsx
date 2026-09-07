import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getGroupMembers } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { Dialog } from "./ui/Dialog.jsx";
import { getPlanGallery } from "../plan-galleries.js";

// How often the card background advances to the next photo (ms).
const GALLERY_INTERVAL = 5000;

// "Avant et après" — a compact timeline of the whole two weeks. Each plan is a
// short card whose background is a photo gallery that auto-plays (random start,
// navigation dots); clicking the card opens the same photos in the lightbox.
// Votable cards carry a "Vote" button that opens a modal with the card summary
// and the full scale vote.
function PlanCard({ plan, nightsLabel, voteButtonLabel, onOpenGallery, onOpenVote }) {
  const subDestinations = plan.subDestinations || [];
  const photos = subDestinations.length
    ? subDestinations.flatMap((d) => getPlanGallery(d.gallery))
    : getPlanGallery(plan.gallery);
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

      {subDestinations.length > 0 && (
        <div className="plan-card__subs">
          {subDestinations.map((d) => {
            const dPhotos = getPlanGallery(d.gallery);
            const enabled = dPhotos.length > 0;
            return (
              <button
                key={d.gallery}
                type="button"
                className="plan-card__sub"
                disabled={!enabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!enabled) return;
                  onOpenGallery({ label: `${d.name} · ${d.tag}`, photos: dPhotos, index: 0 });
                }}
              >
                <span className="plan-card__sub-tag">{d.tag}</span>
                <span className="plan-card__sub-name">{d.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {plan.questionId && (
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
  const { t, profile } = useApp();
  const { answers, setAnswer } = useRsvp();
  const coast = t.coast || {};
  const voteLabels = coast.vote || {};
  const nightsLabel = coast.nightsLabel || { one: "nuit", other: "nuits" };
  const flow = RSVP_FLOWS.coast;

  const [activeGallery, setActiveGallery] = useState(null); // { label, photos, index }
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
              onOpenGallery={setActiveGallery}
              onOpenVote={setVotingPlan}
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
