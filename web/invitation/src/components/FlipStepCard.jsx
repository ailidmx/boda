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
 *   hideBackOnLast  optional boolean. When true, the "Back" button is hidden
 *                 on the last step (e.g. a read-only recap that only offers a
 *                 "Modify my answers" action inside its own content).
 *   hideNextOn    optional array of step indices where the "Next" button is
 *                 hidden. Used when a step provides its own primary action to
 *                 advance (e.g. a "Save" button on the last question step).
 *   countSteps    optional number of steps to show in the "Étape X / Y"
 *                 counter. Defaults to steps.length. When a step index is
 *                 >= countSteps (e.g. a recap), the counter shows just the
 *                 step label instead of a numbered step.
 *   navRight      optional function (ctx) => ReactNode rendered on the right
 *                 side of the nav. When it returns a truthy value it replaces
 *                 the "Next" button for that step (e.g. a "Save" CTA on the
 *                 last question step). Return null to fall back to "Next".
 *   onNavigate    optional callback (nextIndex) => void fired on every step
 *                 change (next/back/goToStart), used e.g. to scroll the flow
 *                 back into view.
 *   onBeforeNext  optional async (currentIndex) => boolean hook. Called before
 *                 the card advances forward — both when the user clicks "Next"
 *                 and when the flow auto-advances (e.g. the last question just
 *                 got answered and the card should move to the recap). Return
 *                 `false` to cancel the advance; return `true` (or undefined)
 *                 to proceed. Used to persist answers before the recap shows.
 */
export function FlipStepCard({ steps = [], onDone, copy = {}, initialIndex = 0, hideBackOnLast = false, hideNextOn = [], countSteps, navRight, onNavigate, onBeforeNext }) {


  const [index, setIndex] = useState(initialIndex);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(1);
  const hasInteracted = useRef(false);
  const transitioning = useRef(false);

  const total = steps.length;
  const isLast = index === total - 1;

  // Auto-detect the starting step until the user interacts. The saved answers
  // hydrate asynchronously, so `initialIndex` may change after mount; we keep
  // following it (without a flip animation) until the user navigates on their
  // own. When the target is the recap, mark the flow as done.
  //
  // When the target advances FORWARD (e.g. the last question just got answered
  // and the flow should move to the recap), run the optional `onBeforeNext`
  // hook first so the form can persist answers before the recap is shown. This
  // prevents the "we think we saved but we didn't" case where answering the
  // final question auto-jumps to the recap without saving.
  useEffect(() => {
    if (hasInteracted.current) return;
    const target = Math.min(initialIndex, total - 1);
    if (target === index) return;
    if (transitioning.current) return;
    transitioning.current = true;
    hasInteracted.current = true;
    const proceed = () => {
      setIndex(target);
      if (target === total - 1 && onDone) onDone();
      transitioning.current = false;
    };
    if (target > index && onBeforeNext) {
      Promise.resolve(onBeforeNext(index)).then((ok) => {
        if (ok === false) {
          transitioning.current = false;
          return;
        }
        proceed();
      });
    } else {
      proceed();
    }
  }, [initialIndex, total, index, onDone, onBeforeNext]);

  const goTo = (nextIndex, dir) => {
    if (nextIndex < 0 || nextIndex >= total) return;
    hasInteracted.current = true;
    setFlipDir(dir);
    setFlipping(true);
    if (onNavigate) onNavigate(nextIndex);
    // Swap the step mid-flip so the new face appears as the card turns.
    window.setTimeout(() => {
      setIndex(nextIndex);
      setFlipping(false);
      if (nextIndex === total - 1 && onDone) onDone();
    }, 260);
  };



  const next = async () => {
    if (onBeforeNext) {
      const ok = await onBeforeNext(index);
      if (ok === false) return;
    }
    goTo(index + 1, 1);
  };
  const back = () => goTo(index - 1, -1);
  // Jump straight back to the first step (e.g. a "Modify my answers" action
  // on a recap step). Uses a backward flip so it reads as going back.
  const goToStart = () => goTo(0, -1);


  const step = steps[index];
  const stepCount = countSteps ?? total;
  const isRecap = index >= stepCount;
  const rightAction = navRight ? navRight({ next, back, goToStart, isLast, index }) : null;

  return (
    <div className="flip-step-card">
      <div className="flip-step-head">
        <span className="flip-step-count">
          {isRecap
            ? step?.label
            : `${copy.step || "Step"} ${index + 1} / ${stepCount}`}
        </span>
        {!isRecap && <span className="flip-step-label">{step?.label}</span>}
      </div>

      <div
        className={`flip-step-body${flipping ? ` is-flipping${flipDir > 0 ? " is-forward" : " is-back"}` : ""}`}
      >
        <div className="flip-step-face">
          {step ? step.render({ next, back, goToStart, isLast }) : null}
        </div>

      </div>

      <div className="flip-step-nav">
        {!(hideBackOnLast && isLast) && (
          <button
            type="button"
            className="flip-step-btn"
            onClick={back}
            disabled={index === 0 || flipping}
          >
            {copy.back || "← Back"}
          </button>
        )}
        {rightAction ? (
          rightAction
        ) : (
          !isLast && !hideNextOn.includes(index) && (
            <button
              type="button"
              className="flip-step-btn flip-step-btn--primary"
              onClick={next}
              disabled={flipping}
            >
              {copy.next || "Next →"}
            </button>
          )
        )}

      </div>
    </div>
  );
}

