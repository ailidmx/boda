// ── Dialog primitive: pure behavior + class helpers ─────────────────────
// JSX-free, DOM-free module so the Dialog's decisions are unit-testable
// without a browser. The Dialog component (Dialog.jsx) consumes these.
//
// The Dialog is a BEHAVIORAL wrapper: it renders the overlay + card + close
// button structure and owns the shared modal behavior (scroll-lock, ESC,
// overlay-click, focus management) while letting each modal keep its own
// visual classes via `overlayClassName` / `cardClassName` / `closeClassName`.
// This preserves each modal's exact appearance — no CSS is changed.

// Behavior defaults. ESC-to-close and overlay-click-to-close are OPT-IN so
// migrating an existing modal never changes its current behavior: a modal
// that didn't close on ESC/overlay-click keeps not doing so until it opts in.
export const DIALOG_DEFAULTS = {
  closeOnEscape: false,
  closeOnOverlayClick: false,
};

// Resolve the behavior flags, applying the documented defaults.
export function dialogBehavior({ closeOnEscape, closeOnOverlayClick } = {}) {
  return {
    closeOnEscape: closeOnEscape ?? DIALOG_DEFAULTS.closeOnEscape,
    closeOnOverlayClick:
      closeOnOverlayClick ?? DIALOG_DEFAULTS.closeOnOverlayClick,
  };
}

// Normalize the class-name props. Each modal passes its own existing classes
// (e.g. `.identity-modal-overlay` / `.identity-modal-card` / `.identity-modal-close`),
// so the rendered markup keeps the exact same classes as before.
export function dialogClasses({
  overlayClassName,
  cardClassName,
  closeClassName,
} = {}) {
  return {
    overlay: overlayClassName || "",
    card: cardClassName || "",
    close: closeClassName || "",
  };
}
