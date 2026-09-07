import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { getGroupMembers, resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { Dialog } from "./ui/Dialog.jsx";
import { getPlanGallery } from "../plan-galleries.js";
import { getCabin } from "../cabins.js";
import { MXN_PER_EUR } from "../features/coast/data.js";

const GALLERY_INTERVAL = 5000;

function formatMoney(amount, language) {
  const locale = language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

// Fisher–Yates shuffle so each card's gallery starts in a different order.
// The three Roca Azul cards share one photo set, so shuffling keeps them from
// all showing the identical carousel.
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Inline star rating (1–5) for the multi-destination Bahía de Banderas card.
// Each group member rates the active destination; the level maps straight onto
// the shared `rsvp.answers` scale (star N → level N).
function StarRating({ questionId, guest, answers, onVote }) {
  if (!guest) return null;
  const name = resolveGuestName(guest);
  const current = Number(answers[questionId]?.[guest.id]) || 0;
  return (
    <div className="plan-card__stars">
      <div className="plan-card__stars-row">
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
    </div>
  );
}

// Estimated budget for the extra plans, based on the group's "yes" answers
// (level ≥ 4). Each plan's cost = price × nights × rooms (2 people per room).
// Plans with a `cabinField` (the wedding cabin + the extra "2 días más" cabin)
// use the REAL cabin price from the inventory instead of the hotel estimate:
// guests with a pre-assigned cabin are priced via the cabin's
// `totalPrice2Nights`; guests without one fall back to the vote estimate.
function BudgetEstimate({ plans, guests, answers, budget, nightsLabel, language }) {
  if (!budget?.title) return null;

  const yesGuests = (questionId) =>
    guests.filter((g) => Number(answers[questionId]?.[g.id]) >= 4);

  // Preferred Bahía sub-destination = the one with the most stars across the group.
  const resolveSub = (subs) => {
    let best = subs[0];
    let bestScore = -1;
    for (const d of subs) {
      const score = guests.reduce(
        (s, g) => s + (Number(answers[d.questionId]?.[g.id]) || 0),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  };

  const rooms = (people) => Math.ceil(people / 2);

  // Real price across the DISTINCT cabins assigned via the given field.
  const cabinRealMxn = (field) => {
    const ids = new Set(guests.filter((g) => g[field]).map((g) => g[field]));
    let total = 0;
    for (const id of ids) total += Number(getCabin(id)?.totalPrice2Nights) || 0;
    return total;
  };

  const lines = [];
  for (const plan of plans) {
    if (plan.subDestinations) {
      const participants = yesGuests(plan.questionId);
      if (participants.length === 0) continue;
      const sub = resolveSub(plan.subDestinations);
      lines.push({
        name: plan.title,
        nights: plan.nights,
        participants,
        estimateMxn: sub.priceMxn * plan.nights * rooms(participants.length),
        estimateEur: sub.priceEur * plan.nights * rooms(participants.length),
      });
    } else if (plan.cabinField) {
      // Real cabin stay (wedding + "2 días más"): assigned guests use the real
      // cabin price, the rest (if any) use the vote estimate.
      const cabinGuests = guests.filter((g) => g[plan.cabinField]);
      const voteGuests = plan.questionId
        ? yesGuests(plan.questionId).filter((g) => !g[plan.cabinField])
        : [];
      const participants = [...cabinGuests, ...voteGuests];
      if (participants.length === 0) continue;
      const realMxn = cabinRealMxn(plan.cabinField);
      // The cabin price (`totalPrice2Nights`) and the plan's `priceMxn` are
      // BOTH already for the full 2-night stay, so the estimate for guests
      // without a cabin must NOT multiply by `nights`.
      const estimateMxn =
        plan.priceMxn != null
          ? plan.priceMxn * rooms(voteGuests.length)
          : 0;
      const estimateEur =
        plan.priceEur != null
          ? plan.priceEur * rooms(voteGuests.length)
          : 0;
      lines.push({
        name: plan.title,
        nights: plan.nights,
        participants,
        realMxn,
        realEur: Math.round(realMxn / MXN_PER_EUR),
        estimateMxn,
        estimateEur,
      });
    } else if (plan.questionId && plan.priceMxn != null) {
      const participants = yesGuests(plan.questionId);
      if (participants.length === 0) continue;
      lines.push({
        name: plan.title,
        nights: plan.nights,
        participants,
        estimateMxn: plan.priceMxn * plan.nights * rooms(participants.length),
        estimateEur: plan.priceEur * plan.nights * rooms(participants.length),
      });
    }
  }

  if (lines.length === 0) {
    return <p className="plan-budget-empty reveal">{budget.empty}</p>;
  }

  const lineMxn = (l) => (l.realMxn || 0) + (l.estimateMxn || 0);
  const lineEur = (l) => (l.realEur || 0) + (l.estimateEur || 0);
  const totalMxn = lines.reduce((s, l) => s + lineMxn(l), 0);
  const totalEur = lines.reduce((s, l) => s + lineEur(l), 0);

  return (
    <div className="plan-budget reveal">
      <div className="section-heading">
        <p className="eyebrow">{budget.eyebrow}</p>
        <h3>{budget.title}</h3>
        <p className="plan-budget-intro">{budget.intro}</p>
      </div>
      <ul className="plan-budget-list">
        {lines.map((l) => (
          <li key={l.name} className="plan-budget-row">
            <span className="plan-budget-name">{l.name}</span>
            <div className="plan-budget-meta">
              <span className="plan-budget-nights">
                {l.nights} {l.nights === 1 ? nightsLabel.one : nightsLabel.other}
              </span>
              <span className="plan-budget-amount">
                {formatMoney(lineMxn(l), language)} MXN · {formatMoney(lineEur(l), language)} €
              </span>
            </div>
            <div className="plan-budget-avatars">
              {l.participants.map((g) => {
                const photo = resolveGuestPhoto(g);
                const name = resolveGuestName(g);
                return (
                  <span key={g.id} className="plan-budget-avatar" title={name.fullName}>
                    {photo ? (
                      <img src={photo} alt={name.fullName} loading="lazy" />
                    ) : (
                      <span className="plan-budget-avatar--fallback">
                        {(name.fullName || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="plan-budget-total">
        <span>{budget.total}</span>
        <strong>
          {formatMoney(totalMxn, language)} MXN · {formatMoney(totalEur, language)} €
        </strong>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  nightsLabel,
  wishlistLabel,
  voteButtonLabel,
  cabinAssignedLabel,
  hasCabin,
  guest,
  answers,
  language,
  onOpenGallery,
  onOpenVote,
  onVote,
}) {
  const subDestinations = plan.subDestinations || [];
  const isMultiDestination = subDestinations.length > 0;

  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const activeSub = isMultiDestination ? subDestinations[activeSubIndex] : null;

  const priceMxn = isMultiDestination ? activeSub?.priceMxn : plan.priceMxn;
  const priceEur = isMultiDestination ? activeSub?.priceEur : plan.priceEur;

  const galleryKey = isMultiDestination ? activeSub.gallery : plan.gallery;
  const photos = useMemo(
    () => shuffle(getPlanGallery(galleryKey)),
    [galleryKey],
  );
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
          loading="eager"
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
        <div className="plan-card__meta-left">
          <span className="plan-card__dates">{plan.dates}</span>
          {activeSub && <span className="plan-card__tag">{activeSub.tag}</span>}
        </div>
        <div className="plan-card__meta-right">
          <span className="plan-card__nights">
            <span aria-hidden="true">🌙</span> {plan.nights}{" "}
            {plan.nights === 1 ? nightsLabel.one : nightsLabel.other}
          </span>
        </div>
      </div>

      <strong className="plan-card__title">
        <span aria-hidden="true">{plan.icon}</span> {plan.title}
      </strong>
      <div className="plan-card__body-row">
        <span className="plan-card__body">{plan.body}</span>
        {priceMxn != null && (
          <span className="plan-card__price">
            {formatMoney(priceMxn, language)} MXN / {formatMoney(priceEur, language)} €{" "}
            <sup>*</sup>
          </span>
        )}
      </div>

      {isMultiDestination && (
        <StarRating
          questionId={activeSub.questionId}
          guest={guest}
          answers={answers}
          onVote={onVote}
        />
      )}

      {(plan.wishlist || plan.questionId || plan.cabinField) && (
        <div className="plan-card__actions">
          {plan.wishlist && (
            <a
              className="plan-card__wishlist"
              href={plan.wishlist}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              🏠 {wishlistLabel}
            </a>
          )}
          {plan.cabinField && hasCabin ? (
            <span className="plan-card__cabin-assigned">
              🏡 {cabinAssignedLabel}
            </span>
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
        </div>
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
  const { t, language, interfaceText, profile } = useApp();
  const { answers, setAnswer } = useRsvp();
  const coast = t.coast || {};
  const voteLabels = coast.vote || {};
  const nightsLabel = coast.nightsLabel || { one: "nuit", other: "nuits" };
  const wishlistLabel = coast.wishlistLabel || "Airbnb";
  const budget = coast.budget || {};
  const flow = RSVP_FLOWS.coast;

  const [activeGallery, setActiveGallery] = useState(null);
  const [votingPlan, setVotingPlan] = useState(null);
  const [voteSaveStatus, setVoteSaveStatus] = useState("idle");

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

  const handleVoteChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level, flow);
  };

  const handleSaveVote = async () => {
    if (!votingPlan) return;
    const editorGuestId = profile?.guest?.id;
    const questionId = votingPlan.questionId;
    if (!editorGuestId || !questionId) return;
    setVoteSaveStatus("working");
    try {
      await Promise.all(
        guests.map((guest) => {
          const level = answers[questionId]?.[guest.id];
          if (level === undefined) return Promise.resolve();
          return saveRsvpAnswers(guest, { [questionId]: level }, editorGuestId);
        }),
      );
      setVoteSaveStatus("saved");
      setVotingPlan(null);
    } catch (error) {
      console.warn("[coast] vote save failed", error.code || error.message);
      setVoteSaveStatus("error");
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
              wishlistLabel={wishlistLabel}
              voteButtonLabel={voteLabels.button}
              cabinAssignedLabel={voteLabels.cabinAssigned}
              hasCabin={
                plan.cabinField
                  ? guests.some((g) => g[plan.cabinField])
                  : false
              }
              guest={profile?.guest}
              answers={answers}
              language={language}
              onOpenGallery={setActiveGallery}
              onOpenVote={setVotingPlan}
              onVote={handleVote}
            />
          ))}
        </div>

        <p className="coast-note">{coast.note}</p>
        {coast.priceNote && (
          <p className="coast-price-note">
            <sup>*</sup> {coast.priceNote}
          </p>
        )}
        <BudgetEstimate
          plans={coast.plans}
          guests={guests}
          answers={answers}
          budget={budget}
          nightsLabel={nightsLabel}
          language={language}
        />
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
          <div className="plan-vote-modal__scroll">
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
                handleVoteChange(votingPlan.questionId, guestId, level)
              }
            />
            <div className="plan-vote-modal__actions">
              {voteSaveStatus === "error" && (
                <p className="plan-vote-modal__error" role="alert">
                  {interfaceText.submitError}
                </p>
              )}
              <button
                type="button"
                className="plan-vote-modal__save"
                onClick={handleSaveVote}
                disabled={voteSaveStatus === "working"}
              >
                {voteSaveStatus === "working"
                  ? voteLabels.saving
                  : voteLabels.save}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}

export default Coast;
