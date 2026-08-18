import React, { useEffect, useRef, useState } from "react";

import { useApp } from "../../context/AppContext.jsx";
import { guestTravelsByPlane } from "../../guest-profiles.js";
import { getNavLinks, PART_I_END, trackNav } from "./nav-links.js";

// Mobile navigation: two split dropdowns (Part I = main invitation sections,
// Part II = travel and everything after) plus a REPONDRE CTA. The dropdowns
// are borderless and translucent so they feel like a floating, integrated
// menu rather than a boxed control.
//
// Part I always ends at "teAnimas". Part II starts at the first link after it
// — normally "travel", but when the guest does not travel by plane (and the
// FLIGHTS link is hidden) it starts at "petanque" instead.
export function MobileNav({ activeKey }) {
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

export default MobileNav;
