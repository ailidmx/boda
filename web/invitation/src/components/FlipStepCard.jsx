import React, { useEffect, useRef, useState } from "react";

/**
 * A flipable step card used to walk through a multi-step RSVP flow.
 *
 * Each step is rendered as a "face" of the card. Moving forward or backward
 * flips the card around the Y axis (a 3D card turn), matching the flip
 * transition already used elsewhere in the invitation (e.g. the identity
 * wizard). The last step is typically a recap/summary.
 *
 * Props:
 *   steps         array of { id, label, render: (ctx) => ReactNode }
 *   onDone        optional callback fired when the user reaches the last step
 *   copy          optional { next, back, step } localized labels
 *   initialIndex  optional starting step index. When provided, the card
 *                 auto-detects its starting step: it syncs to `initialIndex`
 *                 until the user interacts (clicks next/back), so a flow whose
 *                 answers are already saved opens directly on the current step
 *                 (or the recap when everything is answered). Once the user
 *                 navigates, the card stops following `initialIndex`.
 */
export function FlipStepCard({ steps = [], onDone, copy = {}, initialIndex = 0 }) {
  const [index, setIndex] = useState(initialIndex);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(1);
  const hasInteracted = useRef(false);

  const total = steps.length;
  const isLast = index === total - 1;

  // Auto-detect the starting step until the user interacts. The saved answers
  // hydrate asynchronously, so `initialIndex` may change after mount; we keep
  // following it (without a flip animation) until the user navigates on their
  // own. When the target is the recap, mark the flow as done.
  useEffect(() => {
    if (hasInteracted.current) return;
    const target = Math.min(initialIndex, total - 1);
    if (target !== index) {
      setIndex(target);
      if (target === total - 1 && onDone) onDone();
    }
  }, [initialIndex, total, index, onDone]);

  const goTo = (nextIndex, dir) => {
    if (nextIndex < 0 || nextIndex >= total) return;
    hasInteracted.current = true;
    setFlipDir(dir);
    setFlipping(true);
    // Swap the step mid-flip so the new face appears as the card turns.
    window.setTimeout(() => {
      setIndex(nextIndex);
      setFlipping(false);
      if (nextIndex === total - 1 && onDone) onDone();
    }, 260);
  };


  const next = () => goTo(index + 1, 1);
  const back = () => goTo(index - 1, -1);

  const step = steps[index];

  return (
    <div className="flip-step-card">
      <div className="flip-step-head">
        <span className="flip-step-count">
          {copy.step || "Step"} {index + 1} / {total}
        </span>
        <span className="flip-step-label">{step?.label}</span>
      </div>

      <div
        className={`flip-step-body${flipping ? ` is-flipping${flipDir > 0 ? " is-forward" : " is-back"}` : ""}`}
      >
        <div className="flip-step-face">
          {step ? step.render({ next, back, isLast }) : null}
        </div>
      </div>

      <div className="flip-step-nav">
        <button
          type="button"
          className="flip-step-btn"
          onClick={back}
          disabled={index === 0 || flipping}
        >
          {copy.back || "← Back"}
        </button>
        {!isLast && (
          <button
            type="button"
            className="flip-step-btn flip-step-btn--primary"
            onClick={next}
            disabled={flipping}
          >
            {copy.next || "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}
