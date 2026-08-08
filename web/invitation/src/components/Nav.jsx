import React, { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "../context/AppContext.jsx";
import { LANGUAGE_FLAGS, LANGUAGE_FLAGS_ONLY } from "./ui.jsx";

import { SUPPORTED_LANGUAGES } from "../content.js";
import {
  resolveGuestName,
  resolveGuestPhoto,
  saveGuestPhoto,
} from "../guest-profiles.js";
import { uploadAvatar, validateAvatarFile } from "../cloudinary-upload.js";
import { FEATURES } from "../features.js";




const NAV_LINKS = [
  ["home", "#top"],
  ["story", "#story"],

  ["venue", "#venue"],
  ["weekend", "#weekend"],

  ["attire", "#attire"],

  ["weather", "#weather"],
  ["programme", "#weekend-program"],
  ["teAnimas", "#te-animas"],
  ["travel", "#travel"],
  ["petanque", "#petanque"],
  ["accommodation", "#accommodation"],
  ["food", "#food"],
  ["music", "#music"],
  ["coast", "#coast"],
  ["photos", "#photos"],

  ["guests", "#guests"],
  ["gift", "#gift"],
  ["rsvp", "#rsvp"],
  ["thanks", "#thanks"],
];










function UserMenu() {
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
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [successModal, setSuccessModal] = useState(null); // string message
  const [errorModal, setErrorModal] = useState(null); // string message
  const [modalStatus, setModalStatus] = useState(null); // { type, text }


  const [busy, setBusy] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState(null); // { type, text }
  const menuRef = useRef(null);
  const photoInputRef = useRef(null);



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
    setCurrentPassword("");
    setConfirmPassword("");
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

  // Change the signed-in guest's profile avatar photo from the user menu.
  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (validation) {
      setPhotoStatus({ type: "error", text: validation });
      return;
    }
    setUploading(true);
    setPhotoStatus(null);
    try {
      const url = await uploadAvatar(file);
      await saveGuestPhoto(guest, url, guest.id);
      setPhotoStatus({ type: "success", text: identity.photoSaved || "Photo saved!" });
    } catch (error) {
      console.error("uploadAvatar failed", error);
      const detail = error?.message || "";
      const text =
        detail && !detail.includes("Upload failed")
          ? `${identity.photoError || "Could not upload the photo."} ${detail}`
          : identity.photoError || "Could not upload the photo.";
      setPhotoStatus({ type: "error", text });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };


  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!currentPassword.trim()) {
      setModalStatus({ type: "error", text: nav.passwordReauthRequired });
      return;
    }
    if (password.length < 6) {
      setModalStatus({ type: "error", text: nav.passwordError });
      return;
    }
    if (password !== confirmPassword) {
      setModalStatus({ type: "error", text: nav.passwordMismatch });
      return;
    }
    setBusy(true);
    setModalStatus(null);
    try {
      await changePassword(currentPassword, password);
      setSuccessModal(nav.passwordSuccess);
      setPassword("");
      setCurrentPassword("");
      setConfirmPassword("");
      closeAccountModal();
    } catch (error) {

      if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
        setModalStatus({ type: "error", text: nav.passwordWrongCurrent });
      } else {
        setModalStatus({ type: "error", text: nav.passwordError });
      }
    } finally {
      setBusy(false);
    }
  };

  const applyEmailChange = async () => {
    const result = await changeEmail(draftEmail.trim());
    if (result?.status === "verification-sent") {
      setSuccessModal(nav.emailVerificationSent || identity.emailVerificationSent);
    } else if (result?.status === "unchanged") {
      setSuccessModal(nav.emailUnchanged || nav.emailSuccess);
    } else {
      setSuccessModal(nav.emailSuccess);
    }
    closeAccountModal();
  };


  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const value = draftEmail.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setModalStatus({ type: "error", text: nav.emailInvalid || identity.emailInvalid });
      return;
    }

    // The current password is always required: we re-authenticate FIRST so the
    // session is recent, and only then attempt the email change. This avoids
    // the auth/requires-recent-login error entirely.
    if (!reauthPassword.trim()) {
      setModalStatus({ type: "error", text: nav.emailReauthPasswordRequired || nav.passwordError });
      return;
    }

    setBusy(true);
    setModalStatus(null);
    try {
      // Re-authenticate with the current password, then change the email.
      await reauthenticate(reauthPassword.trim());
      await applyEmailChange();
    } catch (error) {
      const code = error?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setModalStatus({ type: "error", text: nav.passwordWrongCurrent });
      } else if (code === "auth/requires-recent-login") {
        // Should not happen after a successful re-auth, but handle it safely:
        // close the account modal and show a clear error.
        closeAccountModal();
        setErrorModal(nav.emailReauthRequired);
      } else if (
        code === "auth/unauthorized-domain" ||
        code === "auth/operation-not-allowed" ||
        code === "auth/invalid-action-code"
      ) {
        // The verification email could not be sent because the current origin
        // is not in the Firebase "Authorized domains" list (common on
        // localhost). Surface a clear message instead of a generic failure.
        setModalStatus({
          type: "error",
          text: nav.emailDomainError || nav.emailError || identity.emailUpdateError,
        });
      } else {
        setModalStatus({
          type: "error",
          text: nav.emailError || identity.emailUpdateError || nav.passwordError,
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
            {isAdmin && (
              <a
                className="user-menu__item user-menu__item--admin"
                href="/dashboard"
                onClick={() => setOpen(false)}
              >
                <span className="user-menu__item-icon">📊</span>
                {nav.dashboard}
              </a>
            )}
            <div className="user-menu__section" role="group" aria-label="Language">
              <span className="user-menu__section-label">Language</span>
              <div className="user-menu__langs">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    className={`user-menu__lang-option${lang === language ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={lang === language}
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
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
            >
              <span className="user-menu__item-icon">📷</span>
              {uploading
                ? identity.uploading || "Uploading…"
                : identity.changePhoto || identity.addPhoto || "Change photo"}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              disabled={uploading}
              hidden
            />
            {photoStatus && (
              <p className={`user-menu__status user-menu__status--${photoStatus.type}`}>
                {photoStatus.text}
              </p>
            )}
            <button
              className="user-menu__item"
              type="button"
              onClick={() => openAccountModal("email")}
            >
              <span className="user-menu__item-icon">✉</span>
              {nav.changeEmail}
            </button>


            <button
              className="user-menu__item"
              type="button"
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
              onClick={() => setMusicEnabled(!musicEnabled)}
            >
              <span className="user-menu__item-icon">🎵</span>
              <span className="user-menu__item-label">{nav.music}</span>
              <span className={`user-menu__toggle${musicEnabled ? " is-on" : ""}`} aria-hidden="true">
                <span className="user-menu__toggle-knob" />
              </span>
            </button>

            <button
              className="user-menu__item user-menu__item--danger"
              type="button"
              onClick={handleLogout}
            >
              <span className="user-menu__item-icon">↪</span>
              {nav.logout}
            </button>

            <button
              className="user-menu__item"
              type="button"
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
            >
              <span className="user-menu__item-icon">ℹ️</span>
              {nav.about}
            </button>
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
              <form className="user-menu-modal__form" onSubmit={handleEmailSubmit}>
                <p className="user-menu__notice">
                  <strong className="user-menu__notice-title">{nav.emailWarningTitle}</strong>
                  <span>{nav.emailWarningBody}</span>
                </p>

                <div className="user-menu__current-email">
                  <span className="user-menu__current-email-label">{nav.currentEmailLabel}</span>
                  <span className="user-menu__current-email-value">{currentEmail || "-"}</span>
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

                <label htmlFor="account-modal-reauth">{nav.emailReauthLabel}</label>
                <input
                  id="account-modal-reauth"
                  type="password"
                  value={reauthPassword}
                  placeholder={nav.emailReauthPlaceholder}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  autoComplete="current-password"
                />


                {modalStatus && (
                  <p className={`user-menu__status user-menu__status--${modalStatus.type}`}>
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
              <form className="user-menu-modal__form" onSubmit={handlePasswordSubmit}>
                <label htmlFor="account-modal-current-password">{nav.currentPasswordLabel}</label>
                <input
                  id="account-modal-current-password"
                  type="password"
                  value={currentPassword}
                  placeholder={nav.currentPasswordPlaceholder}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />

                <label htmlFor="account-modal-password">{nav.newPasswordLabel}</label>
                <input
                  id="account-modal-password"
                  type="password"
                  value={password}
                  placeholder={nav.newPasswordPlaceholder}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />

                <label htmlFor="account-modal-confirm-password">{nav.confirmPasswordLabel}</label>
                <input
                  id="account-modal-confirm-password"
                  type="password"
                  value={confirmPassword}
                  placeholder={nav.confirmPasswordPlaceholder}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />

                {modalStatus && (
                  <p className={`user-menu__status user-menu__status--${modalStatus.type}`}>
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

      {successModal && (
        <div
          className="user-menu-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
          onClick={() => setSuccessModal(null)}
        >
          <div
            className="user-menu-modal__card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="user-menu-modal__close"
              type="button"
              aria-label={nav.cancel}
              onClick={() => setSuccessModal(null)}
            >
              ✕
            </button>

            <h3 id="success-modal-title" className="user-menu-modal__title">
              {nav.successTitle || "✓"}
            </h3>

            <p className="user-menu__status user-menu__status--success user-menu__status--modal">
              {successModal}
            </p>

            <div className="user-menu-modal__actions">
              <button
                className="user-menu-modal__btn user-menu-modal__btn--primary"
                type="button"
                onClick={() => setSuccessModal(null)}
              >
                {nav.ok || nav.close || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModal && (
        <div
          className="user-menu-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="user-menu-modal__card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="user-menu-modal__close"
              type="button"
              aria-label={nav.cancel}
              onClick={() => setErrorModal(null)}
            >
              ✕
            </button>

            <h3 id="error-modal-title" className="user-menu-modal__title">
              {nav.emailErrorTitle || "⚠️"}
            </h3>

            <p className="user-menu__status user-menu__status--error user-menu__status--modal">
              {errorModal}
            </p>

            <div className="user-menu-modal__actions">
              <button
                className="user-menu-modal__btn user-menu-modal__btn--primary"
                type="button"
                onClick={() => setErrorModal(null)}
              >
                {nav.ok || nav.close || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div
          className="user-menu-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-modal-title"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="user-menu-modal__card user-menu-modal__card--about"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="user-menu-modal__close"
              type="button"
              aria-label={nav.aboutClose || nav.cancel}
              onClick={() => setAboutOpen(false)}
            >
              ✕
            </button>

            <h3 id="about-modal-title" className="user-menu-modal__title">
              {nav.aboutTitle || nav.about}
            </h3>
            <p className="user-menu-modal__subtitle">{nav.aboutSubtitle}</p>

            <div className="user-menu-modal__features">
              {(FEATURES[language] || []).map((feature, index) => (
                <div className="user-menu-modal__feature" key={index}>
                  <span className="user-menu-modal__feature-icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <div className="user-menu-modal__feature-text">
                    <strong className="user-menu-modal__feature-title">{feature.title}</strong>
                    <span className="user-menu-modal__feature-body">{feature.body}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="user-menu-modal__actions">
              <button
                className="user-menu-modal__btn user-menu-modal__btn--primary"
                type="button"
                onClick={() => setAboutOpen(false)}
              >
                {nav.aboutClose || nav.ok || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// Mobile navigation: a custom dropdown that mirrors the desktop nav's golden

// underline treatment. It is borderless and translucent so it feels like a
// floating, integrated menu rather than a boxed control.
function MobileNav({ activeKey }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const activeLabel = t.nav[activeKey] || t.nav.home;

  return (
    <div className="mobile-nav" ref={menuRef}>
      <button
        className="mobile-nav__trigger"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mobile-nav__label">{activeLabel}</span>
        <span className={`mobile-nav__arrow${open ? " is-open" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="mobile-nav__dropdown">
          {NAV_LINKS.map(([key, href]) => (
            <a
              key={key}
              href={href}
              className={`mobile-nav__link${key === activeKey ? " is-active" : ""}`}
              aria-current={key === activeKey ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              {t.nav[key]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const { t } = useApp();

  const navRef = useRef(null);
  const underlineRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [activeKey, setActiveKey] = useState("home");
  const [hoverKey, setHoverKey] = useState(null);

  // Keep CSS shell vars in sync with the real rendered sticky bar heights.
  // This avoids layout gaps when mobile bar heights differ from static rem
  // tokens due to responsive padding, font metrics, or browser UI changes.
  useEffect(() => {
    const root = document.documentElement;

    const updateHeights = () => {
      const countdown = document.querySelector(".countdown-bar");
      const header = document.querySelector(".site-header");
      if (!header) return;

      const countdownHeight = countdown
        ? countdown.getBoundingClientRect().height
        : 0;
      const headerHeight = header.getBoundingClientRect().height;

      root.style.setProperty("--countdown-height", `${countdownHeight}px`);
      root.style.setProperty("--header-height", `${headerHeight}px`);
    };

    updateHeights();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeights);
      const countdown = document.querySelector(".countdown-bar");
      const header = document.querySelector(".site-header");
      if (countdown) observer.observe(countdown);
      if (header) observer.observe(header);
    }

    window.addEventListener("resize", updateHeights);
    window.addEventListener("orientationchange", updateHeights);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeights);
      window.removeEventListener("orientationchange", updateHeights);
    };
  }, []);

  // Mobile-only behavior: once the user leaves the very top, keep the
  // countdown hidden and show only the sticky nav. Countdown reappears only
  // when returning to the absolute top.
  useEffect(() => {
    const root = document.body;
    const media = window.matchMedia("(max-width: 899px)");

    const clearState = () => {
      root.classList.remove("mobile-nav-only");
    };

    const update = () => {
      if (!media.matches) {
        clearState();
        return;
      }

      const y = window.scrollY;
      const nearTop = y <= 1;
      const navOnly = !nearTop;
      root.classList.toggle("mobile-nav-only", navOnly);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      clearState();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);


  const updateArrows = () => {
    const el = navRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = navRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, []);

  // Resolve the real href for a nav key (the key and the section id can
  // differ, e.g. "you" → "#identity"), so the underline always finds the
  // correct link no matter how items are named or reordered.
  const hrefFor = (key) => {
    const entry = NAV_LINKS.find(([k]) => k === key);
    return entry ? entry[1] : null;
  };

  // Position the golden underline under a given nav link (active by default,
  // or the hovered link). Measured via getBoundingClientRect so it stays
  // correct even while the nav is scrolled.
  const positionUnderline = useCallback((key = activeKey) => {
    const underline = underlineRef.current;
    const header = document.querySelector(".site-header");
    const href = hrefFor(key);
    const link = href ? navRef.current?.querySelector(`a[href="${href}"]`) : null;
    if (!underline || !header || !link) return;
    const headerRect = header.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    underline.style.left = `${linkRect.left - headerRect.left}px`;
    underline.style.width = `${linkRect.width}px`;
  }, [activeKey]);




  // Scroll-spy: highlight the section currently in view and auto-scroll the
  // nav horizontally so the active link sits at the leading edge.
  useEffect(() => {
    const ids = NAV_LINKS.map(([key, href]) => ({ key, id: href.slice(1) }));
    const headerOffset = () => {
      const countdown = document.querySelector(".countdown-bar");
      const header = document.querySelector(".site-header");
      const cd = countdown ? countdown.getBoundingClientRect().height : 0;
      const hd = header ? header.getBoundingClientRect().height : 0;
      return cd + hd;
    };

    const onScroll = () => {
      const offset = headerOffset();
      const probe = window.scrollY + offset + 60;
      let current = ids[0].key;
      for (const { key, id } of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= probe) current = key;
      }
      // At the very top of the page, always highlight the first item (e.g.
      // "home"), even if its anchor element isn't present in the DOM yet.
      if (window.scrollY <= offset) current = ids[0].key;
      setActiveKey((prev) => {
        if (prev === current) return prev;
        // Auto-scroll the nav so the newly active link appears first.
        const nav = navRef.current;
        const href = hrefFor(current);
        const link = href ? nav?.querySelector(`a[href="${href}"]`) : null;
        if (nav && link) {
          const target = link.offsetLeft - nav.clientWidth * 0.12;
          nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
        }
        return current;
      });
    };


    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Reposition the underline whenever the active/hovered link changes or the
  // nav scrolls (so it tracks the link even during the smooth auto-scroll).
  useEffect(() => {
    positionUnderline(hoverKey || activeKey);
    const nav = navRef.current;
    if (!nav) return undefined;
    const onNavScroll = () => positionUnderline(hoverKey || activeKey);
    nav.addEventListener("scroll", onNavScroll, { passive: true });
    window.addEventListener("resize", onNavScroll);
    return () => {
      nav.removeEventListener("scroll", onNavScroll);
      window.removeEventListener("resize", onNavScroll);
    };
  }, [activeKey, hoverKey, positionUnderline]);



  const scrollBy = (dir) => {
    navRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (

    <header className="site-header">
      <span className="nav-underline" ref={underlineRef} aria-hidden="true" />
      <div className="desktop-nav-wrap">



        <button
          className={`nav-scroll-btn nav-scroll-btn--left${canLeft ? " is-visible" : ""}`}
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
        <nav className="desktop-nav" ref={navRef} aria-label="Primary">
          {NAV_LINKS.map(([key, href]) => (
            <a
              key={key}
              href={href}
              className={key === activeKey ? "is-active" : undefined}
              aria-current={key === activeKey ? "true" : undefined}
              onMouseEnter={() => {
                setHoverKey(key);
                positionUnderline(key);
              }}
              onMouseLeave={() => {
                setHoverKey(null);
                positionUnderline();
              }}
            >
              {t.nav[key]}
            </a>
          ))}
        </nav>


        <button
          className={`nav-scroll-btn nav-scroll-btn--right${canRight ? " is-visible" : ""}`}
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
        >
          ›
        </button>
      </div>

      <MobileNav activeKey={activeKey} />

      <div className="site-header__actions">
        <UserMenu />
        <a
          className={`header-rsvp${activeKey === "rsvp" ? " is-active" : ""}`}
          href="#rsvp"
          aria-current={activeKey === "rsvp" ? "true" : undefined}
        >
          {t.nav.rsvp}
        </a>
      </div>

    </header>

  );
}
