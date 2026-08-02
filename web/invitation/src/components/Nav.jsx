import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { LANGUAGE_FLAGS, LANGUAGE_FLAGS_ONLY } from "./ui.jsx";

import { SUPPORTED_LANGUAGES } from "../content.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";


const NAV_LINKS = [
  ["home", "#top"],
  ["you", "#identity"],
  ["story", "#story"],
  ["venue", "#venue"],
  ["weekend", "#weekend"],
  ["programme", "#weekend-program"],
  ["attire", "#attire"],
  ["accommodation", "#accommodation"],
  ["travel", "#travel"],
  ["gift", "#gift"],
  ["photos", "#photos"],
  ["thanks", "#thanks"],
  ["guests", "#guests"],
];






function UserMenu() {
  const { t, profile, signOut, changePassword, language, setLanguage } = useApp();
  const nav = t.nav || {};
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("menu"); // "menu" | "password"
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  const guest = profile?.guest;
  const photo = guest ? resolveGuestPhoto(guest) : null;
  const { firstName } = guest ? resolveGuestName(guest) : { firstName: "" };
  const initials = (firstName || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();


  useEffect(() => {
    if (!open) return;
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
        setMode("menu");
        setStatus(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleLogout = async () => {
    await signOut();
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setStatus({ type: "error", text: nav.passwordError });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await changePassword(password);
      setStatus({ type: "success", text: nav.passwordSuccess });
      setPassword("");
      setMode("menu");
    } catch (error) {
      setStatus({ type: "error", text: nav.passwordError });
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
          {mode === "menu" ? (
            <>
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
                  setMode("password");
                  setStatus(null);
                }}
              >
                <span className="user-menu__item-icon">🔑</span>
                {nav.changePassword}
              </button>
              <button
                className="user-menu__item user-menu__item--danger"
                type="button"
                onClick={handleLogout}
              >
                <span className="user-menu__item-icon">↪</span>
                {nav.logout}
              </button>
            </>
          ) : (

            <form className="user-menu__password" onSubmit={handlePasswordSubmit}>
              <label htmlFor="user-menu-password">{nav.newPasswordLabel}</label>
              <input
                id="user-menu-password"
                type="password"
                value={password}
                placeholder={nav.newPasswordPlaceholder}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {status && (
                <p className={`user-menu__status user-menu__status--${status.type}`}>
                  {status.text}
                </p>
              )}
              <div className="user-menu__password-actions">
                <button
                  className="user-menu__item"
                  type="button"
                  onClick={() => {
                    setMode("menu");
                    setStatus(null);
                  }}
                >
                  {nav.cancel}
                </button>
                <button
                  className="user-menu__item user-menu__item--primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? nav.working : nav.save}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const { t, profile } = useApp();
  const isNovio = profile?.guest?.isNovio;
  const navRef = useRef(null);
  const underlineRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [activeKey, setActiveKey] = useState("home");
  const [hoverKey, setHoverKey] = useState(null);


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
  const positionUnderline = (key = activeKey) => {
    const underline = underlineRef.current;
    const header = document.querySelector(".site-header");
    const href = hrefFor(key);
    const link = href ? navRef.current?.querySelector(`a[href="${href}"]`) : null;
    if (!underline || !header || !link) return;
    const headerRect = header.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    underline.style.left = `${linkRect.left - headerRect.left}px`;
    underline.style.width = `${linkRect.width}px`;
  };



  // Scroll-spy: highlight the section currently in view and auto-scroll the
  // nav horizontally so the active link sits at the leading edge.
  useEffect(() => {
    const ids = NAV_LINKS.map(([key, href]) => ({ key, id: href.slice(1) }));
    const headerOffset = () => {
      const countdown = document.querySelector(".countdown");
      const header = document.querySelector(".site-header");
      const cd = countdown ? countdown.offsetHeight : 0;
      const hd = header ? header.offsetHeight : 0;
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
  }, [activeKey, hoverKey]);


  const scrollBy = (dir) => {
    navRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };



  const handleMobileNav = (event) => {
    const href = event.target.value;
    if (href) window.location.hash = href;
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
          {isNovio && (
            <a className="nav-dashboard-link" href="/dashboard">
              📊 {t.nav.dashboard}
            </a>
          )}
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

      <div className="site-header__actions">
        <UserMenu />
        <a className="header-rsvp" href="#rsvp">
          {t.nav.rsvp}
        </a>
      </div>



      <select
        className="mobile-nav-select"
        aria-label="Navigation"
        defaultValue=""
        onChange={handleMobileNav}
      >
        <option value="" disabled>
          {t.nav.you}
        </option>
        {NAV_LINKS.map(([key, href]) => (
          <option key={key} value={href}>
            {t.nav[key]}
          </option>
        ))}
        {isNovio && <option value="/dashboard">📊 {t.nav.dashboard}</option>}
      </select>
    </header>
  );
}
