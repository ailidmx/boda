import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useApp } from "../../context/AppContext.jsx";
import { trackNav } from "./nav-links.js";

// Desktop-only side drawer: a hamburger button always visible on the left of
// the desktop nav bar opens an elegant transparent overlay with the full nav
// laid out in CSS columns (so if the links exceed the viewport height they
// flow into more columns instead of scrolling).
export function SideDrawer({ links, activeKey }) {
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
                {links.map((entry) => {
                  if (Array.isArray(entry)) {
                    const [key, href] = entry;
                    return (
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
                    );
                  }

                  const { key, href, children } = entry;
                  return (
                    <div key={key} className="side-drawer__group">
                      <a
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
                      <div className="side-drawer__sub">
                        {children.map(([childKey, childHref]) => (
                          <a
                            key={childKey}
                            href={childHref}
                            data-analytics={`nav.${childKey}`}
                            className={`side-drawer__sublink${childKey === activeKey ? " is-active" : ""}`}
                            aria-current={childKey === activeKey ? "true" : undefined}
                            onClick={() => {
                              setOpen(false);
                              trackNav(childKey, "side_drawer");
                            }}
                          >
                            {t.nav[childKey]}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default SideDrawer;
