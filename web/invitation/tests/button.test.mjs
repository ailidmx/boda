import assert from "node:assert/strict";
import test from "node:test";
import {
  buttonClasses,
  BUTTON_VARIANTS,
  BUTTON_SIZES,
} from "../src/components/ui/button-classes.js";
import { buttonState } from "../src/components/ui/button-state.js";


// ── Base class ──────────────────────────────────────────────────────────

test("buttonClasses always includes the base .button class", () => {
  assert.equal(buttonClasses(), "button");
  assert.equal(buttonClasses({}), "button");
});

// ── Variant → class mapping ─────────────────────────────────────────────

test("variant maps to the existing .button* class", () => {
  assert.equal(buttonClasses({ variant: "gold" }), "button button--gold");
  assert.equal(buttonClasses({ variant: "dark" }), "button button-dark");
  assert.equal(buttonClasses({ variant: "light" }), "button button-light");
  assert.equal(buttonClasses({ variant: "ghost" }), "button button-ghost");
});

test("unknown variant is ignored (no class appended)", () => {
  assert.equal(buttonClasses({ variant: "bogus" }), "button");
});

// ── Size → class mapping ────────────────────────────────────────────────

test("size maps to the existing .button-small class", () => {
  assert.equal(buttonClasses({ size: "small" }), "button button-small");
});

test("unknown size is ignored", () => {
  assert.equal(buttonClasses({ size: "huge" }), "button");
});

// ── Combined variant + size + className ─────────────────────────────────

test("variant + size + className combine in order", () => {
  assert.equal(
    buttonClasses({ variant: "light", size: "small", className: "photos-upload-btn" }),
    "button button-light button-small photos-upload-btn",
  );
});

// ── Constants expose the exact CSS class names ──────────────────────────

test("variant/size constants map to the exact base.css classes", () => {
  assert.deepEqual(BUTTON_VARIANTS, {
    gold: "button--gold",
    dark: "button-dark",
    light: "button-light",
    ghost: "button-ghost",
  });
  assert.deepEqual(BUTTON_SIZES, { small: "button-small" });
});

// ── Element (`as`) ──────────────────────────────────────────────────────

test("buttonState defaults to a <button> element", () => {
  assert.equal(buttonState().element, "button");
  assert.equal(buttonState({ as: "button" }).element, "button");
});

test("buttonState renders an <a> when as=\"a\"", () => {
  assert.equal(buttonState({ as: "a" }).element, "a");
});

test("buttonState falls back to <button> for unknown as values", () => {
  assert.equal(buttonState({ as: "div" }).element, "button");
});

// ── Disabled ────────────────────────────────────────────────────────────

test("buttonState is disabled when disabled is true", () => {
  assert.equal(buttonState({ disabled: true }).isDisabled, true);
});

test("buttonState is NOT disabled by default", () => {
  assert.equal(buttonState().isDisabled, false);
});

// ── Loading ─────────────────────────────────────────────────────────────

test("buttonState is disabled while loading", () => {
  assert.equal(buttonState({ loading: true }).isDisabled, true);
});

test("loading sets aria-busy on a button", () => {
  assert.equal(buttonState({ loading: true }).aria.busy, true);
  assert.equal(buttonState({ loading: false }).aria.busy, undefined);
});

// ── Accessibility attributes ────────────────────────────────────────────

test("a disabled anchor gets aria-disabled (anchors have no native disabled)", () => {
  assert.equal(buttonState({ as: "a", disabled: true }).aria.disabled, true);
  assert.equal(buttonState({ as: "a", disabled: false }).aria.disabled, undefined);
});

test("a disabled button does NOT get aria-disabled (native disabled is used)", () => {
  assert.equal(buttonState({ disabled: true }).aria.disabled, undefined);
});

test("a loading anchor does NOT get aria-busy (only buttons announce busy)", () => {
  assert.equal(buttonState({ as: "a", loading: true }).aria.busy, undefined);
});

