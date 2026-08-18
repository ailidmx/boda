import React, { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "../context/AppContext.jsx";
import { guestTravelsByPlane } from "../guest-profiles.js";
import {
  getNavLinks,
  flattenNavLinks,
  buildSectionKeyMap,
  trackNav,
  SideDrawer,
  MobileNav,
  UserMenu,
} from "../features/nav/index.js";

export function Nav() {
  const { t, profile } = useApp();

  const navRef = useRef(null);
  const underlineRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [activeKey, setActiveKey] = useState("home");
  const [hoverKey, setHoverKey] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // The effective nav links for this guest (FLIGHTS hidden when not travelling
  // by plane). Used by the desktop nav, the underline, and the scroll-spy.
  const travelsByPlane = guestTravelsByPlane(profile?.guest);
  const links = getNavLinks(travelsByPlane);
  // Flat [key, href] list (parents + children) for the underline + scroll-spy.
  const flatLinks = flattenNavLinks(links);
  // section id → nav key (children map to their parent) for the scroll-spy.
  const sectionKeyMap = buildSectionKeyMap(links);

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
  // correct link no matter how items are named or reordered. Works for both
  // flat entries and parent objects (parents resolve to their own href).
  const hrefFor = (key) => {
    const entry = flatLinks.find(([k]) => k === key);
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
  // nav horizontally so the active link sits at the leading edge. Subsection
  // anchors map to their parent key (via sectionKeyMap) so the parent nav item
  // is highlighted while the guest is inside any of its subsections.
  useEffect(() => {
    const ids = flatLinks.map(([key, href]) => ({
      key: sectionKeyMap[href.slice(1)] || key,
      id: href.slice(1),
    }));

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
          {links.map((entry) => {
            if (Array.isArray(entry)) {
              const [key, href] = entry;
              return (
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
              );
            }

            const { key, href, children } = entry;
            const isOpen = openDropdown === key;
            return (
              <div
                key={key}
                className={`desktop-nav__item${isOpen ? " is-open" : ""}`}
                onMouseEnter={() => {
                  setHoverKey(key);
                  positionUnderline(key);
                }}
                onMouseLeave={() => {
                  setHoverKey(null);
                  positionUnderline();
                }}
              >
                <a
                  href={href}
                  data-analytics={`nav.${key}`}
                  className={key === activeKey ? "is-active" : undefined}
                  aria-current={key === activeKey ? "true" : undefined}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpenDropdown((v) => (v === key ? null : key));
                    trackNav(key, "nav");
                  }}
                >
                  {t.nav[key]}
                  <span className="desktop-nav__caret" aria-hidden="true">
                    ▾
                  </span>
                </a>
                {isOpen && (
                  <div className="desktop-nav__dropdown" role="menu">
                    {children.map(([childKey, childHref]) => (
                      <a
                        key={childKey}
                        href={childHref}
                        role="menuitem"
                        data-analytics={`nav.${childKey}`}
                        className={childKey === activeKey ? "is-active" : undefined}
                        aria-current={childKey === activeKey ? "true" : undefined}
                        onClick={() => {
                          setOpenDropdown(null);
                          trackNav(childKey, "nav");
                        }}
                      >
                        {t.nav[childKey]}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

export default Nav;
