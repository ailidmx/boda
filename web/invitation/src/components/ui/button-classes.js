/**
 * Pure class-mapping helper for the shared `Button` UI primitive.
 *
 * Maps the semantic `variant` / `size` props onto the EXISTING `.button*`
 * classes defined in `styles/base.css`. This module is intentionally free of
 * JSX and React so it can be unit-tested with `node:test` without a JSX
 * transpiler.
 *
 * Do NOT change the CSS — this only re-exposes the existing classes.
 */

// Semantic variant → existing `.button*` class. The base `.button` class is
// always applied by the Button component itself.
export const BUTTON_VARIANTS = {
  gold: "button--gold",
  dark: "button-dark",
  light: "button-light",
  ghost: "button-ghost",
};

// Semantic size → existing `.button*` class.
export const BUTTON_SIZES = {
  small: "button-small",
};

/**
 * Build the full className string for a Button.
 *
 * @param {object} options
 * @param {string} [options.variant]  One of `BUTTON_VARIANTS` keys (gold/dark/light/ghost).
 * @param {string} [options.size]     One of `BUTTON_SIZES` keys (small).
 * @param {string} [options.className] Extra classes to append (e.g. section-specific).
 * @returns {string} Space-separated class list, always starting with `button`.
 */
export function buttonClasses({ variant, size, className } = {}) {
  const classes = ["button"];

  if (variant && BUTTON_VARIANTS[variant]) {
    classes.push(BUTTON_VARIANTS[variant]);
  }

  if (size && BUTTON_SIZES[size]) {
    classes.push(BUTTON_SIZES[size]);
  }

  if (className) {
    classes.push(className);
  }

  return classes.join(" ");
}
