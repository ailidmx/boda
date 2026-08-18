import assert from "node:assert/strict";
import test from "node:test";
import {
  DIALOG_DEFAULTS,
  dialogBehavior,
  dialogClasses,
} from "../src/components/ui/dialog-state.js";


// ── Behavior defaults (preserve existing modal behavior) ────────────────

test("ESC-to-close and overlay-click-to-close default to OFF", () => {
  assert.deepEqual(DIALOG_DEFAULTS, {
    closeOnEscape: false,
    closeOnOverlayClick: false,
  });
});

test("dialogBehavior applies the defaults when flags are omitted", () => {
  assert.deepEqual(dialogBehavior(), {
    closeOnEscape: false,
    closeOnOverlayClick: false,
  });
  assert.deepEqual(dialogBehavior({}), {
    closeOnEscape: false,
    closeOnOverlayClick: false,
  });
});

test("dialogBehavior preserves explicit opt-in flags", () => {
  assert.deepEqual(dialogBehavior({ closeOnEscape: true }), {
    closeOnEscape: true,
    closeOnOverlayClick: false,
  });
  assert.deepEqual(dialogBehavior({ closeOnOverlayClick: true }), {
    closeOnEscape: false,
    closeOnOverlayClick: true,
  });
  assert.deepEqual(
    dialogBehavior({ closeOnEscape: true, closeOnOverlayClick: true }),
    { closeOnEscape: true, closeOnOverlayClick: true },
  );
});

test("dialogBehavior treats explicit false as false (not defaulted)", () => {
  assert.deepEqual(dialogBehavior({ closeOnEscape: false }), {
    closeOnEscape: false,
    closeOnOverlayClick: false,
  });
});

// ── Class composition (each modal keeps its own classes) ────────────────

test("dialogClasses passes through the modal's own class names", () => {
  assert.deepEqual(
    dialogClasses({
      overlayClassName: "identity-modal-overlay",
      cardClassName: "identity-modal-card",
      closeClassName: "identity-modal-close",
    }),
    {
      overlay: "identity-modal-overlay",
      card: "identity-modal-card",
      close: "identity-modal-close",
    },
  );
});

test("dialogClasses supports multiple classes on one element", () => {
  assert.deepEqual(
    dialogClasses({
      overlayClassName: "user-menu-modal__overlay about-modal__overlay",
      cardClassName: "user-menu-modal__card about-modal__card",
      closeClassName: "user-menu-modal__close",
    }),
    {
      overlay: "user-menu-modal__overlay about-modal__overlay",
      card: "user-menu-modal__card about-modal__card",
      close: "user-menu-modal__close",
    },
  );
});

test("dialogClasses defaults missing class names to empty strings", () => {
  assert.deepEqual(dialogClasses(), {
    overlay: "",
    card: "",
    close: "",
  });
  assert.deepEqual(dialogClasses({ overlayClassName: "x" }), {
    overlay: "x",
    card: "",
    close: "",
  });
});
