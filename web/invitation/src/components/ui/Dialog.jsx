import React, { useEffect, useRef } from "react";

import { dialogBehavior, dialogClasses } from "./dialog-state.js";

// Shared modal/dialog primitive. It renders the overlay + card + close-button
// structure and owns the common modal behavior (background scroll-lock, ESC to
// close, overlay-click to close, focus management) so individual modals don't
// each re-implement it.
//
// This is a BEHAVIORAL wrapper: each modal keeps its own visual classes via
// `overlayClassName` / `cardClassName` / `closeClassName`, so migrating an
// existing modal preserves its exact appearance — no CSS is changed.
//
// Behavior is opt-in to preserve existing behavior on migration:
//   - `closeOnEscape` (default false) — close when the guest presses Escape.
//   - `closeOnOverlayClick` (default false) — close when the guest clicks the
//     dimmed overlay (the card itself never closes on click).
// Focus management (focus the dialog on open, restore focus on close) is
// always on — it is a pure accessibility improvement with no visual change.
export function Dialog({
  open,
  onClose,
  ariaLabelledBy,
  closeLabel,
  overlayClassName,
  cardClassName,
  closeClassName,
  closeOnEscape,
  closeOnOverlayClick,
  children,
  ...rest
}) {
  const overlayRef = useRef(null);
  const { closeOnEscape: esc, closeOnOverlayClick: overlayClick } =
    dialogBehavior({ closeOnEscape, closeOnOverlayClick });
  const { overlay, card, close } = dialogClasses({
    overlayClassName,
    cardClassName,
    closeClassName,
  });

  // Lock background scroll while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape (opt-in).
  useEffect(() => {
    if (!open || !esc) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, esc, onClose]);

  // Focus management: move focus into the dialog on open and restore it to the
  // previously focused element on close. `tabIndex={-1}` lets the overlay be
  // focused programmatically without adding it to the tab order.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    overlayRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      onClick={overlayClick ? onClose : undefined}
      {...rest}
    >
      <div
        className={card}
        onClick={overlayClick ? (event) => event.stopPropagation() : undefined}
      >
        <button
          type="button"
          className={close}
          aria-label={closeLabel}
          onClick={onClose}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
