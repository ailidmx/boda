import React, { useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, LanguageSwitcher } from "./ui.jsx";
import { Countdown } from "./Countdown.jsx";
import { getInvitationLinkParams } from "../invitation-link.js";


export function AuthGate() {
  const { interfaceText: t, gateError, signIn } = useApp();
  // Pre-fill the username field from the invitation link's `guest` param (the
  // guest's login email) so they don't have to retype it. Falls back to "".
  const [username, setUsername] = useState(
    () => getInvitationLinkParams().guest || "",
  );
  // Pre-fill the password field from the invitation link's `password` param
  // (the shared login password) so the guest only has to tap "Enter".
  const [password, setPassword] = useState(
    () => getInvitationLinkParams().password || "",
  );

  const [showPassword, setShowPassword] = useState(false);
  // The disclosure checkbox is checked by default so guests can sign in with
  // one less click; they can still uncheck it if they don't agree.
  const [disclosure, setDisclosure] = useState(true);
  const [submitting, setSubmitting] = useState(false);



  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !disclosure) return;
    setSubmitting(true);
    await signIn(username.trim(), password);
    setSubmitting(false);
  };


  return (
    <main className="access-gate">
      <section className="access-card">
        <Countdown contained />
        <h1>

          <CoupleNames variant="identity-swap--gate-names" delay="-4.2s" />
        </h1>
        <p className="eyebrow">{t.gateEyebrow}</p>
        <p>{t.gateBody}</p>


        <form onSubmit={handleSubmit}>
          <label htmlFor="access-username">{t.gateUsernameLabel}</label>
          <input
            id="access-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder={t.gateUsernamePlaceholder}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoFocus
          />
          <label htmlFor="access-password">{t.gateLabel}</label>
          <div className="password-field">
            <input
              id="access-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>


          {/* Required disclosure — the guest must agree that their name and
              photo may be shown to other guests before they can sign in. */}
          <label className="gate-disclosure">
            <input
              type="checkbox"
              checked={disclosure}
              onChange={(event) => setDisclosure(event.target.checked)}
            />
            <span>{t.gateDisclosure}</span>
          </label>

          <button
            className="button button-dark"
            type="submit"
            disabled={submitting || !disclosure}
          >
            {submitting ? t.gateWorking : t.gateButton}
          </button>
          {gateError && (
            <small data-access-status data-state="error">
              {t[gateError]}
            </small>
          )}
        </form>

        <p className="gate-lost-key">{t.gateLost}</p>
        <div className="gate-contacts">
          <a
            className="gate-contact-link"
            href={EVENT.contacts.david.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            {EVENT.contacts.david.label} ↗
          </a>
          <a
            className="gate-contact-link"
            href={EVENT.contacts.ayde.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            {EVENT.contacts.ayde.label} ↗
          </a>
        </div>
        <div className="gate-languages" aria-label="Language">
          <LanguageSwitcher />
        </div>
      </section>
    </main>
  );
}
