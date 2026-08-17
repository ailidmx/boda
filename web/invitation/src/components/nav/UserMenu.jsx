import React, { useEffect, useRef, useState } from "react";

import { useApp } from "../../context/AppContext.jsx";
import { LANGUAGE_FLAGS, LANGUAGE_FLAGS_ONLY } from "../ui.jsx";
import { AboutModal } from "../AboutModal.jsx";

import { SUPPORTED_LANGUAGES } from "../../content.js";
import { resolveGuestName, resolveGuestPhoto } from "../../guest-profiles.js";

// The signed-in guest's account menu: avatar + name + language switcher, plus
// identity/photo/email/password actions, a music toggle, an About link, an
// admin dashboard link, and logout. Also hosts the email/password change modal.
export function UserMenu() {
  const {
    t,
    profile,
    signOut,
    changePassword,
    changeEmail,
    reauthenticate,
    language,
    setLanguage,
    openIdentityPrompt,
    musicEnabled,
    setMusicEnabled,
  } = useApp();
  const nav = t.nav || {};
  const identity = t.identity || {};

  const [open, setOpen] = useState(false);
  const [accountModal, setAccountModal] = useState(null); // null | "email" | "password"
  const [aboutOpen, setAboutOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [menuStatus, setMenuStatus] = useState(null); // { type, text }
  const [modalStatus, setModalStatus] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  const guest = profile?.guest;
  const isAdmin = guest?.isAdmin === true;
  const photo = guest ? resolveGuestPhoto(guest) : null;
  const { firstName } = guest ? resolveGuestName(guest) : { firstName: "" };
  const initials = (firstName || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentEmail = String(profile?.email || "").trim();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
        setMenuStatus(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraftEmail(currentEmail);
  }, [open, currentEmail]);

  useEffect(() => {
    if (!accountModal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setAccountModal(null);
      }
    };
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onEscape);
    };
  }, [accountModal]);

  const openAccountModal = (type) => {
    setOpen(false);
    setAccountModal(type);
    setBusy(false);
    setModalStatus(null);
    setPassword("");
    setDraftEmail(currentEmail);
    setReauthPassword("");
    setNeedsReauth(false);
  };

  const closeAccountModal = () => {
    setAccountModal(null);
    setBusy(false);
    setModalStatus(null);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setModalStatus({ type: "error", text: nav.passwordError });
      return;
    }
    setBusy(true);
    setModalStatus(null);
    try {
      await changePassword(password);
      setMenuStatus({ type: "success", text: nav.passwordSuccess });
      setPassword("");
      closeAccountModal();
    } catch (error) {
      setModalStatus({ type: "error", text: nav.passwordError });
    } finally {
      setBusy(false);
    }
  };

  const applyEmailChange = async () => {
    const result = await changeEmail(draftEmail.trim());
    if (result?.status === "verification-sent") {
      setMenuStatus({
        type: "success",
        text: nav.emailVerificationSent || identity.emailVerificationSent,
      });
    } else if (result?.status === "unchanged") {
      setMenuStatus({
        type: "success",
        text: nav.emailUnchanged || nav.emailSuccess,
      });
    } else {
      setMenuStatus({ type: "success", text: nav.emailSuccess });
    }
    closeAccountModal();
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const value = draftEmail.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setModalStatus({
        type: "error",
        text: nav.emailInvalid || identity.emailInvalid,
      });
      return;
    }

    if (needsReauth && !reauthPassword.trim()) {
      setModalStatus({
        type: "error",
        text: nav.emailReauthPasswordRequired || nav.passwordError,
      });
      return;
    }

    setBusy(true);
    setModalStatus(null);
    try {
      if (needsReauth) {
        await reauthenticate(reauthPassword.trim());
        setNeedsReauth(false);
        setReauthPassword("");
      }
      await applyEmailChange();
    } catch (error) {
      if (error?.code === "auth/requires-recent-login") {
        setNeedsReauth(true);
        setModalStatus({ type: "info", text: nav.emailReauthRequired });
      } else {
        setModalStatus({
          type: "error",
          text:
            nav.emailError || identity.emailUpdateError || nav.passwordError,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu__trigger"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        data-analytics="menu.open"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar">
          {photo ? (
            <img className="user-menu__avatar-img" src={photo} alt="" />
          ) : (
            initials
          )}
        </span>
        <span className="user-menu__name">{firstName}</span>
        <span className="user-menu__lang" aria-hidden="true">
          {LANGUAGE_FLAGS_ONLY[language]}
        </span>

        <span className={`user-menu__chevron${open ? " is-open" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="user-menu__dropdown">
          <>
            <div
              className="user-menu__section"
              role="group"
              aria-label="Language"
            >
              <span className="user-menu__section-label">Language</span>
              <div className="user-menu__langs">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    className={`user-menu__lang-option${lang === language ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={lang === language}
                    data-analytics={`menu.lang.${lang}`}
                    onClick={() => setLanguage(lang)}
                  >
                    {LANGUAGE_FLAGS[lang]}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="user-menu__item"
              type="button"
              data-analytics="menu.identity"
              onClick={() => {
                setOpen(false);
                openIdentityPrompt();
              }}
            >
              <span className="user-menu__item-icon">🪪</span>
              {identity.eyebrow}
            </button>
            <button
              className="user-menu__item"
              type="button"
              data-analytics="menu.photo"
              onClick={() => {
                setOpen(false);
                openIdentityPrompt();
              }}
            >
              <span className="user-menu__item-icon">📷</span>
              {identity.changePhoto}
            </button>
            <button
              className="user-menu__item"
              type="button"
              data-analytics="menu.email"
              onClick={() => openAccountModal("email")}
            >
              <span className="user-menu__item-icon">✉</span>
              {nav.changeEmail}
            </button>

            <button
              className="user-menu__item"
              type="button"
              data-analytics="menu.password"
              onClick={() => openAccountModal("password")}
            >
              <span className="user-menu__item-icon">🔑</span>
              {nav.changePassword}
            </button>

            <button
              className="user-menu__item"
              type="button"
              role="switch"
              aria-checked={musicEnabled}
              data-analytics="menu.music"
              onClick={() => setMusicEnabled(!musicEnabled)}
            >
              <span className="user-menu__item-icon">🎵</span>
              <span className="user-menu__item-label">{nav.music}</span>
              <span
                className={`user-menu__toggle${musicEnabled ? " is-on" : ""}`}
                aria-hidden="true"
              >
                <span className="user-menu__toggle-knob" />
              </span>
            </button>

            <button
              className="user-menu__item"
              type="button"
              data-analytics="menu.about"
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
            >
              <span className="user-menu__item-icon">ℹ️</span>
              {nav.aboutTitle}
            </button>

            {isAdmin && (
              <a
                className="user-menu__item user-menu__item--admin"
                href="/dashboard"
                data-analytics="menu.dashboard"
                onClick={() => setOpen(false)}
              >
                <span className="user-menu__item-icon">📊</span>
                {nav.dashboard}
              </a>
            )}

            <button
              className="user-menu__item user-menu__item--danger"
              type="button"
              data-analytics="menu.logout"
              onClick={handleLogout}
            >
              <span className="user-menu__item-icon">↪</span>
              {nav.logout}
            </button>

            {menuStatus && (
              <p
                className={`user-menu__status user-menu__status--${menuStatus.type}`}
              >
                {menuStatus.text}
              </p>
            )}
          </>
        </div>
      )}

      {accountModal && (
        <div
          className="user-menu-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          onClick={closeAccountModal}
        >
          <div
            className="user-menu-modal__card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="user-menu-modal__close"
              type="button"
              aria-label={nav.cancel}
              onClick={closeAccountModal}
            >
              ✕
            </button>

            <h3 id="account-modal-title" className="user-menu-modal__title">
              {accountModal === "email" ? nav.changeEmail : nav.changePassword}
            </h3>

            {accountModal === "email" ? (
              <form
                className="user-menu-modal__form"
                onSubmit={handleEmailSubmit}
              >
                <p className="user-menu__notice">
                  <strong className="user-menu__notice-title">
                    {nav.emailWarningTitle}
                  </strong>
                  <span>{nav.emailWarningBody}</span>
                </p>

                <div className="user-menu__current-email">
                  <span className="user-menu__current-email-label">
                    {nav.currentEmailLabel}
                  </span>
                  <span className="user-menu__current-email-value">
                    {currentEmail || "-"}
                  </span>
                </div>

                <label htmlFor="account-modal-email">{nav.newEmailLabel}</label>
                <input
                  id="account-modal-email"
                  type="email"
                  value={draftEmail}
                  placeholder={nav.newEmailPlaceholder}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />

                {needsReauth && (
                  <>
                    <label htmlFor="account-modal-reauth">
                      {nav.emailReauthLabel}
                    </label>
                    <input
                      id="account-modal-reauth"
                      type="password"
                      value={reauthPassword}
                      placeholder={nav.emailReauthPlaceholder}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </>
                )}

                {modalStatus && (
                  <p
                    className={`user-menu__status user-menu__status--${modalStatus.type}`}
                  >
                    {modalStatus.text}
                  </p>
                )}

                <div className="user-menu-modal__actions">
                  <button
                    className="user-menu-modal__btn"
                    type="button"
                    onClick={closeAccountModal}
                  >
                    {nav.cancel}
                  </button>
                  <button
                    className="user-menu-modal__btn user-menu-modal__btn--primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? nav.working : nav.save}
                  </button>
                </div>
              </form>
            ) : (
              <form
                className="user-menu-modal__form"
                onSubmit={handlePasswordSubmit}
              >
                <label htmlFor="account-modal-password">
                  {nav.newPasswordLabel}
                </label>
                <input
                  id="account-modal-password"
                  type="password"
                  value={password}
                  placeholder={nav.newPasswordPlaceholder}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />

                {modalStatus && (
                  <p
                    className={`user-menu__status user-menu__status--${modalStatus.type}`}
                  >
                    {modalStatus.text}
                  </p>
                )}

                <div className="user-menu-modal__actions">
                  <button
                    className="user-menu-modal__btn"
                    type="button"
                    onClick={closeAccountModal}
                  >
                    {nav.cancel}
                  </button>
                  <button
                    className="user-menu-modal__btn user-menu-modal__btn--primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? nav.working : nav.save}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export default UserMenu;
