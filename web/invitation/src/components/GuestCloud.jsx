import React, { useMemo } from "react";
import { getActiveGuests } from "../guests.js";
import { resolveGuestName } from "../guest-profiles.js";
import { useApp } from "../context/AppContext.jsx";

// A small palette of warm, festive tones that echo the wedding's Mexican
// aesthetic (terracotta, marigold, sand, ink, olive).
const PALETTE = [
  "var(--terracotta)",
  "var(--marigold)",
  "var(--ink)",
  "var(--olive, #6b6b3a)",
  "var(--sand)",
  "#b5651d",
];

// Sizes (rem) used to give the cloud its organic, hand-set feel.
const SIZES = [0.85, 1, 1.15, 1.35, 1.6, 1.9, 2.3];

// Slight rotations so the tags feel scattered like a real word cloud.
const ROTATIONS = [-6, -3, 0, 3, 6];

// Fisher–Yates shuffle so the order is different on every visit.
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function GuestCloud() {
  const { t } = useApp();
  const cloud = t.thanks?.guestCloud || {};

  const tags = useMemo(() => {
    const guests = shuffle(getActiveGuests());
    return guests.map((guest) => {
      const { firstName } = resolveGuestName(guest);
      const name = (firstName || guest.firstName || "").trim();
      if (!name) return null;

      const r = Math.random();
      const r2 = Math.random();
      const r3 = Math.random();

      return {
        id: guest.id,
        name,
        size: SIZES[Math.floor(r * SIZES.length)],
        rotation: ROTATIONS[Math.floor(r2 * ROTATIONS.length)],
        color: PALETTE[Math.floor(r3 * PALETTE.length)],
        weight: r > 0.72 ? 700 : 400,
      };
    }).filter(Boolean);
  }, []);


  return (
    <section className="guest-cloud-section section" id="guests">
      <div className="guest-cloud-frame">
        <p className="eyebrow">{cloud.eyebrow}</p>
        <h2 className="guest-cloud-title">{cloud.title}</h2>
        {cloud.subtitle && <p className="guest-cloud-subtitle">{cloud.subtitle}</p>}

        <div className="guest-cloud" aria-label={cloud.title}>
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="guest-cloud-tag"
              style={{
                fontSize: `${tag.size}rem`,
                transform: `rotate(${tag.rotation}deg)`,
                color: tag.color,
                fontWeight: tag.weight,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
