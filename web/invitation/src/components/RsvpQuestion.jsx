import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext.jsx";
import { getRsvpScale, UNANSWERED_LEVEL } from "../rsvp-scale.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";


// Boolean answer levels (kept as integers 0–5 to stay compatible with the
// shared `saveRsvpAnswers` Firestore schema).
export const BOOLEAN_YES = 1;
export const BOOLEAN_NO = 2;

// The scale legend is shown inline on desktop. On mobile it is collapsed into
// a FAB-activated modal (mirroring the Story "facts" explorer) so the question
// stays compact. This label is used for both the inline legend and the modal.
const SCALE_LEGEND_LABEL = "Escala de respuesta";

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

  // Mobile legend modal state (scale variant only).
  const [legendOpen, setLegendOpen] = useState(false);
  const [legendActive, setLegendActive] = useState(false);
  const rootRef = useRef(null);
  const legendFabRef = useRef(null);
  const legendPanelRef = useRef(null);
  const legendCloseRef = useRef(null);

  // Show the mobile legend FAB only while this question occupies a meaningful
  // part of the viewport. CSS keeps it hidden at desktop widths.
  useEffect(() => {
    if (isBoolean) return undefined;
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;

    const mobile = window.matchMedia("(max-width: 899px)");
    let latestEntry = null;
    const syncVisibility = () => {
      const visible = mobile.matches && latestEntry?.isIntersecting;
      setLegendActive(Boolean(visible));
      if (!mobile.matches) setLegendOpen(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(root);
    mobile.addEventListener?.("change", syncVisibility);
    return () => {
      observer.disconnect();
      mobile.removeEventListener?.("change", syncVisibility);
    };
  }, [isBoolean]);

  // Treat the mobile legend as a real modal: lock background scrolling,
  // support Escape, focus the close button, then return focus to the FAB.
  useEffect(() => {
    if (!legendOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const trigger = legendFabRef.current;
    document.body.style.overflow = "hidden";
    legendCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLegendOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [
        ...(legendPanelRef.current?.querySelectorAll("button:not([disabled])") ||
          []),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [legendOpen]);

  const handleSelect = (guestId, level) => {
    console.log(
      "[rsvp-question] select",
      { questionId, guestId, level, hasOnChange: Boolean(onChange) },
    );
    if (onChange) onChange(guestId, level);
  };

  // The 5 scale levels with emoji + localized message. Shared by the inline
  // legend (desktop) and the mobile FAB modal so both stay in sync.
  const renderLegend = () => (
    <div className="rsvp-scale-legend" aria-label={SCALE_LEGEND_LABEL}>
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
  );

  return (
    <div
      className="rsvp-question"
      data-question-id={questionId}
      ref={rootRef}
    >
      <div className="rsvp-question-head">
        <h3 className="rsvp-question-title">{title}</h3>
        {subtitle ? <p className="rsvp-question-subtitle">{subtitle}</p> : null}
      </div>

      {/* Legend: the 5 scale levels with emoji + localized message. Inline on
          desktop; on mobile it is hidden and shown via the FAB modal below. */}
      {!isBoolean && (
        <div className="rsvp-scale-legend-inline">{renderLegend()}</div>
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
                    data-analytics={`rsvp.answer.${questionId}.yes`}
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
                    data-analytics={`rsvp.answer.${questionId}.no`}
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
                <div
                  className="rsvp-scale-selector"
                  role="group"
                  aria-label={name.fullName}
                >
                  {/* 0 = unanswered */}
                  <button
                    type="button"
                    data-analytics={`rsvp.answer.${questionId}.0`}
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
                      data-analytics={`rsvp.answer.${questionId}.${entry.level}`}
                      className={`rsvp-scale-btn ${
                        current === entry.level ? "is-selected" : ""
                      }`}
                      aria-pressed={current === entry.level}
                      aria-label={`${name.fullName}: ${
                        entry[language] || entry.es
                      }`}
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

      {/* Legend modal + FAB (scale variant only). Both are portaled to <body>
          so they escape the flip card's `perspective` ancestor. Without this,
          `position: fixed` would be resolved against that transformed ancestor
          and the modal/FAB would stick to the section instead of the viewport. */}
      {!isBoolean &&
        createPortal(
          <>
            <div
              className={`rsvp-legend-modal${
                legendOpen ? " is-open" : ""
              }`}
              role={legendOpen ? "dialog" : undefined}
              aria-modal={legendOpen ? "true" : undefined}
              aria-label={legendOpen ? SCALE_LEGEND_LABEL : undefined}
              onMouseDown={(event) => {
                if (legendOpen && event.target === event.currentTarget) {
                  setLegendOpen(false);
                }
              }}
            >
              <div className="rsvp-legend-panel" ref={legendPanelRef}>
                <button
                  ref={legendCloseRef}
                  className="rsvp-legend-close"
                  type="button"
                  aria-label="Close"
                  onClick={() => setLegendOpen(false)}
                >
                  ×
                </button>
                <h4 className="rsvp-legend-title">{SCALE_LEGEND_LABEL}</h4>
                {renderLegend()}
              </div>
            </div>

            <button
              ref={legendFabRef}
              className={`rsvp-legend-fab${
                legendActive && !legendOpen ? " is-visible" : ""
              }`}
              type="button"
              aria-label={SCALE_LEGEND_LABEL}
              aria-haspopup="dialog"
              data-analytics="fab.rsvp.legend"
              onClick={() => setLegendOpen(true)}
            >
              <span className="rsvp-legend-fab-icon" aria-hidden="true">
                ?
              </span>
            </button>
          </>,
          document.body,
        )}

    </div>
  );
}

