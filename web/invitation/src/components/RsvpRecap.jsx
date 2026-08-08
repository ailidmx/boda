import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { getRsvpScaleLevel, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { BOOLEAN_YES, BOOLEAN_NO } from "./RsvpQuestion.jsx";


/**
 * Recapitulative summary of all RSVP scale answers.
 *
 * Shows, per question, each guest's chosen level (emoji + localized message),
 * so the group can review everything before sending. Guests can jump back to a
 * question to change an answer — nothing is final until they submit.
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

      {questions.map((q) => {
        const qAnswers = answers[q.id] || {};
        return (
          <div className="rsvp-recap-question" key={q.id}>
            <h4 className="rsvp-recap-question-title">{q.title}</h4>
            <ul className="rsvp-recap-list">
              {guests.map((guest) => {
                const name = resolveGuestName(guest);
                const photo = resolveGuestPhoto(guest);
                const level = Number(qAnswers[guest.id]) || UNANSWERED_LEVEL;
                const isBoolean = q.variant === "boolean";
                const entry = isBoolean ? null : getRsvpScaleLevel(level);
                const booleanLabel =
                  isBoolean && level === BOOLEAN_YES
                    ? recap.yes
                    : isBoolean && level === BOOLEAN_NO
                      ? recap.no
                      : null;
                return (
                  <li className="rsvp-recap-row" key={guest.id}>
                    <span className="rsvp-recap-identity">
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
                    </span>
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
