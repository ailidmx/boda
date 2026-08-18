/**
 * Pure state helper for the shared `Button` UI primitive.
 *
 * Computes the rendered element, the disabled state, and the accessibility
 * attributes from the semantic `as` / `disabled` / `loading` props. This
 * module is intentionally free of JSX and React so it can be unit-tested with
 * `node:test` without a JSX transpiler.
 *
 * Do NOT change the CSS — this only re-exposes the existing classes.
 */

/**
 * @param {object} options
 * @param {string} [options.as="button"]  Rendered element: "button" or "a".
 * @param {boolean} [options.disabled]    Disables the control (button only).
 * @param {boolean} [options.loading]     Shows a loading state and disables the control.
 * @returns {{ element: "button"|"a", isDisabled: boolean, aria: object }}
 */
export function buttonState({ as = "button", disabled = false, loading = false } = {}) {
  const isDisabled = disabled || loading;
  const element = as === "a" ? "a" : "button";

  return {
    element,
    isDisabled,
    // Accessibility attributes applied to the rendered element. A disabled
    // anchor gets `aria-disabled` (anchors have no native `disabled`); a
    // loading button gets `aria-busy` so assistive tech announces the state.
    aria: {
      disabled: element === "a" && isDisabled ? true : undefined,
      busy: element === "button" && loading ? true : undefined,
    },
  };
}
