import React from "react";
import { buttonClasses } from "./button-classes.js";
import { buttonState } from "./button-state.js";
import "./Button.css";



/**
 * Shared `Button` UI primitive for the invitation.
 *
 * Renders the EXISTING `.button` / `.button--gold` / `.button-dark` /
 * `.button-light` / `.button-ghost` / `.button-small` classes from
 * `styles/base.css`. It does NOT change any CSS — it only re-exposes the
 * existing classes through a semantic API.
 *
 * @param {object} props
 * @param {string} [props.as="button"]  Rendered element: "button" or "a".
 * @param {string} [props.variant]      gold | dark | light | ghost.
 * @param {string} [props.size]         small.
 * @param {boolean} [props.disabled]    Disables the control (button only).
 * @param {boolean} [props.loading]     Shows a loading state and disables the control.
 * @param {string} [props.className]    Extra classes appended to the mapped ones.
 * @param {React.ReactNode} [props.children] Button content.
 * @param {object} [props.rest]         Any other props passed through to the element.
 */
export function Button({
  as = "button",
  variant,
  size,
  disabled = false,
  loading = false,
  className,
  children,
  ...rest
}) {
  const { element, isDisabled, aria } = buttonState({ as, disabled, loading });
  const classes = buttonClasses({ variant, size, className });

  if (element === "a") {
    return (
      <a className={classes} aria-disabled={aria.disabled} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type="button"
      disabled={isDisabled}
      aria-busy={aria.busy}
      {...rest}
    >
      {children}
    </button>
  );

}

export default Button;
