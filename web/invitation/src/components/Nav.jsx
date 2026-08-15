import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";


import { useApp } from "../context/AppContext.jsx";
import { LANGUAGE_FLAGS, LANGUAGE_FLAGS_ONLY } from "./ui.jsx";
import { AboutModal } from "./AboutModal.jsx";

import { SUPPORTED_LANGUAGES } from "../content.js";
import {
  resolveGuestName,
  resolveGuestPhoto,
  guestTravelsByPlane,
} from "../guest-profiles.js";
import { trackAction, ACTION_TYPES } from "../analytics.js";
import { dispatchNavigate } from "../hooks/usePageViewTracking.js";

// Dispatch a navigation event (so the page-view tracker attributes the cause)
// and log a categorized navigation action. `sectionId` is the target section
// id; `navigationType` is how the guest navigated (nav / side_drawer /
// mobile_menu / fab).
function trackNav(sectionId, navigationType = "nav") {
  dispatchNavigate({ sectionId, navigationType });
  trackAction(ACTION_TYPES.NAVIGATION, `nav.${sectionId}`, {
    section_id: sectionId,
    navigation_type: navigationType,
  });
}




// The full ordered list of nav links. The FLIGHTS ("travel") entry is only
// relevant for guests who travel by plane, so it is filtered out for everyone
// else (see getNavLinks below).
const NAV_LINKS = [
  ["home", "#top"],
  ["story", "#story"],

  ["venue", "#venue"],
  ["weekend", "#weekend"],
  ["tematica", "#attire"],
  ["dressCode", "#dress-code"],

  ["weather", "#weather"],

  ["programme", "#weekend-program"],
  ["teAnimas", "#te-animas"],
  ["travel", "#travel"],
  ["accommodation", "#accommodation"],
  ["petanque", "#petanque"],
  ["food", "#food"],
  ["guisos", "#guisos"],
  ["music", "#music"],
  ["coast", "#after"],
  ["rsvp", "#rsvp"],
  ["gift", "#gift"],
  ["photos", "#photos"],
  ["guests", "#guests"],
  ["thanks", "#thanks"],

];



// Resolve the effective nav links for the signed-in guest. The FLIGHTS
// ("travel") link is hidden for guests who do not travel by plane, matching
// the section being removed from the DOM.
function getNavLinks(travelsByPlane) {
  return travelsByPlane
    ? NAV_LINKS
    : NAV_LINKS.filter(([key]) => key !== "travel");
}


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

// Mobile navigation: two split dropdowns (Part I = main invitation sections,

// Part II = travel and everything after) plus a REPONDRE CTA. The dropdowns
// are borderless and translucent so they feel like a floating, integrated
// menu rather than a boxed control.
//
// Part I always ends at "teAnimas". Part II starts at the first link after it
// — normally "travel", but when the guest does not travel by plane (and the
// FLIGHTS link is hidden) it starts at "petanque" instead.
const PART_I_END = "teAnimas";



function MobileNav({ activeKey }) {
  const { t, profile } = useApp();
  const [openMenu, setOpenMenu] = useState(null); // null | "part1" | "part2"
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  const travelsByPlane = guestTravelsByPlane(profile?.guest);
  const links = getNavLinks(travelsByPlane);
  const part1EndIndex = links.findIndex(([key]) => key === PART_I_END);


  const part1 = links.slice(0, part1EndIndex + 1);
  const part2 = links.slice(part1EndIndex + 1);


  const renderDropdown = (menuKey, label, links) => (
    <div className="mobile-nav__group">
      <button
        className="mobile-nav__trigger"
        type="button"
        aria-haspopup="true"
        aria-expanded={openMenu === menuKey}
        onClick={() => setOpenMenu((v) => (v === menuKey ? null : menuKey))}
      >
        <span className="mobile-nav__label">{label}</span>
        <span
          className={`mobile-nav__arrow${openMenu === menuKey ? " is-open" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {openMenu === menuKey && (
        <div className="mobile-nav__dropdown">
          {links.map(([key, href]) => (
            <a
              key={key}
              href={href}
              data-analytics={`nav.${key}`}
              className={`mobile-nav__link${key === activeKey ? " is-active" : ""}`}
              aria-current={key === activeKey ? "true" : undefined}
              onClick={() => {
                setOpenMenu(null);
                trackNav(key, "mobile_menu");
              }}
            >
              {t.nav[key]}
            </a>
          ))}

        </div>
      )}
    </div>
  );

  return (
    <div className="mobile-nav" ref={menuRef}>
      {renderDropdown("part1", t.nav.menu1, part1)}
      {renderDropdown("part2", t.nav.menu2, part2)}
    </div>
  );
}

// Desktop-only side drawer: a hamburger button always visible on the left of
// the desktop nav bar opens an elegant transparent overlay with the full nav
// laid out in CSS columns (so if the links exceed the viewport height they
// flow into more columns instead of scrolling).
function SideDrawer({ links, activeKey }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <button
        className={`side-drawer__toggle${open ? " is-open" : ""}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.nav.menu1}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="side-drawer__bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="side-drawer__overlay"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.menu1}
            onClick={() => setOpen(false)}
          >
            <div
              className="side-drawer__panel"
              ref={drawerRef}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="side-drawer__head">
                <span className="side-drawer__title">{t.nav.menu1}</span>
                <button
                  className="side-drawer__close"
                  type="button"
                  aria-label={t.nav.close}
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <nav className="side-drawer__links" aria-label={t.nav.menu1}>
                {links.map(([key, href]) => (
                  <a
                    key={key}
                    href={href}
                    data-analytics={`nav.${key}`}
                    className={`side-drawer__link${key === activeKey ? " is-active" : ""}`}
                    aria-current={key === activeKey ? "true" : undefined}
                    onClick={() => {
                      setOpen(false);
                      trackNav(key, "side_drawer");
                    }}
                  >
                    {t.nav[key]}
                  </a>
                ))}

              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}




export function Nav() {

  const { t, profile } = useApp();

  const navRef = useRef(null);
  const underlineRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [activeKey, setActiveKey] = useState("home");
  const [hoverKey, setHoverKey] = useState(null);

  // The effective nav links for this guest (FLIGHTS hidden when not travelling
  // by plane). Used by the desktop nav, the underline, and the scroll-spy.
  const travelsByPlane = guestTravelsByPlane(profile?.guest);
  const links = getNavLinks(travelsByPlane);




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
    const entry = links.find(([k]) => k === key);
    return entry ? entry[1] : null;
  };


  // Position the golden underline under a given nav link (active by default,
  // or the hovered link). Measured via getBoundingClientRect so it stays
  // correct even while the nav is scrolled.
  const positionUnderline = useCallback(
    (key = activeKey) => {
      const underline = underlineRef.current;
      const header = document.querySelector(".site-header");
      const href = hrefFor(key);
      const link = href
        ? navRef.current?.querySelector(`a[href="${href}"]`)
        : null;
      if (!underline || !header || !link) return;
      const headerRect = header.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      underline.style.left = `${linkRect.left - headerRect.left}px`;
      underline.style.width = `${linkRect.width}px`;
    },
    [activeKey],
  );

  // Scroll-spy: highlight the section currently in view and auto-scroll the
  // nav horizontally so the active link sits at the leading edge.
  useEffect(() => {
    const ids = links.map(([key, href]) => ({ key, id: href.slice(1) }));

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
        <SideDrawer links={links} activeKey={activeKey} />
        <button
          className={`nav-scroll-btn nav-scroll-btn--left${canLeft ? " is-visible" : ""}`}
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
        <nav className="desktop-nav" ref={navRef} aria-label="Primary">

          {links.map(([key, href]) => (

            <a
              key={key}
              href={href}
              data-analytics={`nav.${key}`}
              className={key === activeKey ? "is-active" : undefined}
              aria-current={key === activeKey ? "true" : undefined}
              onClick={() => trackNav(key, "nav")}
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
        <a
          className="mobile-nav__cta"
          href="#rsvp"
          data-analytics="nav.rsvp"
          onClick={() => trackNav("rsvp", "nav")}
        >
          <span className="mobile-nav__cta-icon" aria-hidden="true">✓</span>
          <span className="mobile-nav__cta-label">{t.nav.rsvp}</span>
        </a>
        <UserMenu />
        <a
          className="header-rsvp"
          href="#rsvp"
          data-analytics="nav.rsvp"
          onClick={() => trackNav("rsvp", "nav")}
        >
          {t.nav.rsvp}
        </a>
      </div>


    </header>
  );
}
