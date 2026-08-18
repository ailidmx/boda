import React from "react";

import { resolveGuestName, resolveGuestPhoto } from "../../guest-profiles.js";

// A guest avatar: photo when available, otherwise initials derived from the
// first name. Used by the member cards and the member tabs.
export function Avatar({ guest, size = 64 }) {
  const photo = resolveGuestPhoto(guest);
  const { firstName } = resolveGuestName(guest);
  const initials = (firstName || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photo) {
    return (
      <span className="identity-avatar" style={{ width: size, height: size }}>
        <img src={photo} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span
      className="identity-avatar identity-avatar--initials"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

export default Avatar;
