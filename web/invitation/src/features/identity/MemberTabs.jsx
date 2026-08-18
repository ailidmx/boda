import React from "react";

import { resolveGuestName, resolveGuestPhone } from "../../guest-profiles.js";
import { Avatar } from "./Avatar.jsx";
import { flagForPhone } from "./phone-format.js";

// Horizontal tab selector shown only when the invitation group has more than
// one member. Each tab shows the member's avatar, first name and phone flag.
export function MemberTabs({ members, activeId, onSelect, copy, lang, tabsRef }) {
  return (
    <div
      ref={tabsRef}
      className="identity-tabs"
      role="tablist"
      aria-label={copy.membersLabel || "Members"}
    >
      {members.map((member) => {
        const { firstName } = resolveGuestName(member);
        const phone = resolveGuestPhone(member);
        const isActive = member.id === activeId;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-member-tab-id={member.id}
            className={`identity-tab${isActive ? " is-active" : ""}`}
            onClick={() => onSelect(member.id)}
          >
            <Avatar guest={member} size={32} />
            <span className="identity-tab-name">{firstName}</span>
            <span className="identity-tab-flag" aria-hidden="true">
              {flagForPhone(phone, lang)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default MemberTabs;
