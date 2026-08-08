import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { getRsvpScale, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";

// Boolean answer levels (kept as integers 0–5 to stay compatible with the
// shared `saveRsvpAnswers` Firestore schema).
export const BOOLEAN_YES = 1;
export const BOOLEAN_NO = 2;

/**
 * A single RSVP question.
 *
 * Renders the question title/subtitle, a column listing every guest of the
 * group (avatar + name), and for each guest a selector. Fully controlled: the
 * parent owns the `answers` state and passes `onChange`.
 *
 * Two variants:
 *   - "scale"   (default) a 0–5 likelihood selector with an integrated legend
 *               (the scale messages + emoji), used by "¡Te animas!".
 *   - "boolean" a Yes/No toggle (levels 1 = yes, 2 = no, 0 = unanswered),
 *               used by the pétanque tournament mini-RSVP.
 *
 * Props:
 *   questionId  string  stable id used to key answers (e.g. "attendance")
 *   title       string  the question heading
 *   subtitle    string  optional helper text under the title
 *   guests      array   the group members (static guests from guests.js)
 *   answers     object  map of guestId → level (0–5)
 *   onChange    fn      (guestId, level) => void
 *   variant     string  "scale" | "boolean" (default "scale")
 *   yesLabel    string  localized label for the Yes option (boolean variant)
 *   noLabel     string  localized label for the No option (boolean variant)
 */
export function RsvpQuestion({
  questionId,
  title,
  subtitle,
  guests = [],
  answers = {},
  onChange,
  variant = "scale",
  yesLabel = "Oui",
  noLabel = "Non",
}) {
  const { language } = useApp();
  const scale = getRsvpScale();
  const isBoolean = variant === "boolean";

  const handleSelect = (guestId, level) => {
    console.log("[rsvp-question] select", { questionId, guestId, level, hasOnChange: Boolean(onChange) });
    if (onChange) onChange(guestId, level);
  };

  return (
    <div className="rsvp-question" data-question-id={questionId}>
      <div className="rsvp-question-head">
        <h3 className="rsvp-question-title">{title}</h3>
        {subtitle ? <p className="rsvp-question-subtitle">{subtitle}</p> : null}
      </div>

      {/* Legend: the 5 scale levels with emoji + localized message */}
      {!isBoolean && (
        <div className="rsvp-scale-legend" aria-label="Escala de respuesta">
          {scale.map((entry) => (
            <div className="rsvp-scale-legend-item" key={entry.level}>
              <span className="rsvp-scale-legend-emoji" aria-hidden="true">
                {entry.emoji}
              </span>
              <span className="rsvp-scale-legend-text">
                {entry[language] || entry.es}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Guest rows */}
      <ul className="rsvp-question-guests">
        {guests.map((guest) => {
          const name = resolveGuestName(guest);
          const photo = resolveGuestPhoto(guest);
          const current = Number(answers[guest.id]) || UNANSWERED_LEVEL;
          return (
            <li className="rsvp-question-guest" key={guest.id}>
              <div className="rsvp-guest-identity">
                {photo ? (
                  <img
                    className="rsvp-guest-avatar"
                    src={photo}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="rsvp-guest-avatar rsvp-guest-avatar--fallback">
                    {(name.fullName || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="rsvp-guest-name">{name.fullName}</span>
              </div>

              {isBoolean ? (
                <div
                  className="rsvp-boolean-selector"
                  role="group"
                  aria-label={name.fullName}
                >
                  <button
                    type="button"
                    className={`rsvp-boolean-btn ${
                      current === BOOLEAN_YES ? "is-selected" : ""
                    }`}
                    aria-pressed={current === BOOLEAN_YES}
                    onClick={() => handleSelect(guest.id, BOOLEAN_YES)}
                  >
                    {yesLabel}
                  </button>
                  <button
                    type="button"
                    className={`rsvp-boolean-btn ${
                      current === BOOLEAN_NO ? "is-selected" : ""
                    }`}
                    aria-pressed={current === BOOLEAN_NO}
                    onClick={() => handleSelect(guest.id, BOOLEAN_NO)}
                  >
                    {noLabel}
                  </button>
                </div>
              ) : (
                <div className="rsvp-scale-selector" role="group" aria-label={name.fullName}>
                  {/* 0 = unanswered */}
                  <button
                    type="button"
                    className={`rsvp-scale-btn rsvp-scale-btn--zero ${
                      current === UNANSWERED_LEVEL ? "is-selected" : ""
                    }`}
                    aria-pressed={current === UNANSWERED_LEVEL}
                    aria-label={`${name.fullName}: sin responder`}
                    onClick={() => handleSelect(guest.id, UNANSWERED_LEVEL)}
                  >
                    —
                  </button>
                  {scale.map((entry) => (
                    <button
                      type="button"
                      key={entry.level}
                      className={`rsvp-scale-btn ${
                        current === entry.level ? "is-selected" : ""
                      }`}
                      aria-pressed={current === entry.level}
                      aria-label={`${name.fullName}: ${entry[language] || entry.es}`}
                      title={entry[language] || entry.es}
                      onClick={() => handleSelect(guest.id, entry.level)}
                    >
                      {entry.emoji}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

