import React, { useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, InitialsSwap, LanguageSwitcher } from "./ui.jsx";

export function AuthGate() {
  const { interfaceText: t, gateError, signIn } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await signIn(username.trim(), password);
    setSubmitting(false);
  };

  return (
    <main className="access-gate">
      <section className="access-card">
        <div className="gate-monogram">
          <InitialsSwap variant="identity-swap--gate" delay="-2.1s" />
        </div>
        <p className="eyebrow">{t.gateEyebrow}</p>
        <h1>
          <CoupleNames variant="identity-swap--gate-names" delay="-4.2s" />
        </h1>
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
          <input
            id="access-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="button button-dark" type="submit" disabled={submitting}>
            {submitting ? t.gateWorking : t.gateButton}
          </button>
          <small data-access-status data-state={gateError ? "error" : ""}>
            {gateError ? t[gateError] : ""}
          </small>
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
