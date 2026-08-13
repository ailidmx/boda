import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { getRsvpScaleLevel, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { BOOLEAN_YES, BOOLEAN_NO } from "./RsvpQuestion.jsx";


/**
 * Recapitulative summary of all RSVP scale answers.
 *
 * Shows, per GUEST, one card with a row for each question (e.g. Friday,
 * Saturday, Sunday) and that guest's chosen level (emoji + localized message),
 * so the group can review everything before sending. Guests can jump back to a
 * question to change an answer — nothing is final until they submit.
 *
 * This is the SAME component used both in the mini RSVP flows (Te animas,
 * Pétanque, Coast) and in the bottom RSVP form, so any change here is
 * reproduced everywhere automatically.
 *
 * Props:
 *   questions  array  [{ id, title, subtitle }]
 *   guests     array  the group members
 *   answers    object map of questionId → { guestId → level }
 */
export function RsvpRecap({ questions = [], guests = [], answers = {} }) {
  const { language, t } = useApp();
  const recap = t?.rsvp?.recap || {};

  const answeredCount = questions.reduce((count, q) => {
    const qAnswers = answers[q.id] || {};
    return count + Object.values(qAnswers).filter((lvl) => Number(lvl) > 0).length;
  }, 0);
  const totalSlots = questions.length * guests.length;

  return (
    <div className="rsvp-recap">
      <div className="rsvp-recap-head">
        <h3 className="rsvp-recap-title">{recap.title || "Resumen"}</h3>
        <p className="rsvp-recap-progress">
          {answeredCount} / {totalSlots}{" "}
          {recap.answered || "respondidos"}
        </p>
      </div>

      {guests.map((guest) => {
        const name = resolveGuestName(guest);
        const photo = resolveGuestPhoto(guest);
        return (
          <div className="rsvp-recap-guest" key={guest.id}>
            <div className="rsvp-recap-guest-head">
              {photo ? (
                <img
                  className="rsvp-recap-avatar"
                  src={photo}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className="rsvp-recap-avatar rsvp-recap-avatar--fallback">
                  {(name.fullName || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="rsvp-recap-name">{name.fullName}</span>
            </div>

            <ul className="rsvp-recap-list">
              {questions.map((q) => {
                const level = Number(answers[q.id]?.[guest.id]) || UNANSWERED_LEVEL;
                const isBoolean = q.variant === "boolean";
                const entry = isBoolean ? null : getRsvpScaleLevel(level);
                const booleanLabel =
                  isBoolean && level === BOOLEAN_YES
                    ? recap.yes
                    : isBoolean && level === BOOLEAN_NO
                      ? recap.no
                      : null;
                return (
                  <li className="rsvp-recap-row" key={q.id}>
                    <span className="rsvp-recap-question-label">{q.title}</span>
                    {entry ? (
                      <span className="rsvp-recap-answer">
                        <span className="rsvp-recap-text">
                          {entry[language] || entry.es}
                        </span>
                        <span className="rsvp-recap-emoji" aria-hidden="true">
                          {entry.emoji}
                        </span>
                      </span>
                    ) : booleanLabel ? (
                      <span className="rsvp-recap-answer">
                        <span className="rsvp-recap-text">{booleanLabel}</span>
                      </span>
                    ) : (
                      <span className="rsvp-recap-answer rsvp-recap-answer--empty">
                        —
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
