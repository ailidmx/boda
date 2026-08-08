import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import { resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";


function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the guest roster used for the cinematic credits roll and the crossed
 * avatar marquee. Every active guest contributes their full name and (when
 * available) their avatar photo, so the marquee always shows faces.
 */
function buildGuestRoster() {
  return getActiveGuests()
    .map((guest) => {
      const { fullName } = resolveGuestName(guest);
      const photo = resolveGuestPhoto(guest);
      const name = (fullName || "").trim();
      if (!name) return null;
      return { name, photo };
    })
    .filter(Boolean);
}

/**
 * Resolve an avatar for a featured credit (padrino / helper). We try to match
 * the credit's name against the guest registry so the person's real photo is
 * used when available; otherwise we fall back to a monogram tile.
 * @param {string} name  the featured person's display name
 * @returns {{ photo: string|null, initials: string }}
 */
function resolveFeaturedAvatar(name) {
  const target = normalizeName(name);
  const match = getActiveGuests().find((guest) => {
    const { fullName } = resolveGuestName(guest);
    return normalizeName(fullName) === target;
  });
  const photo = match ? resolveGuestPhoto(match) : null;
  return { photo, initials: initialsOf(name) };
}

/**
 * A single avatar in the crossed marquee: photo when available, otherwise a
 * colourful monogram tile.
 */
function Avatar({ guest, index }) {
  return (
    <span className="thanks-avatar" aria-hidden="true">
      {guest.photo ? (
        <img src={guest.photo} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="thanks-avatar-mono">{initialsOf(guest.name)}</span>
      )}
    </span>
  );
}

/**
 * A featured credit (padrino / helper) with its avatar: photo when the person
 * is found in the guest registry, otherwise a monogram tile.
 */
function FeaturedCredit({ credit }) {
  const { photo, initials } = useMemo(() => resolveFeaturedAvatar(credit.name), [credit.name]);
  return (
    <li className="thanks-credit thanks-credit--featured">
      <span className="thanks-credit-avatar" aria-hidden="true">
        {photo ? (
          <img src={photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="thanks-avatar-mono">{initials}</span>
        )}
      </span>
      <span className="thanks-credit-text">
        <strong className="thanks-name">{credit.name}</strong>
        <span className="thanks-role">{credit.role}</span>
      </span>
    </li>
  );
}

export function Thanks() {
  const { t } = useApp();
  const thanks = t.thanks || {};
  const credits = thanks.credits || [];
  const humor = thanks.humor || [];

  // The list of guests (full names) for the credits roll.
  const roster = useMemo(() => buildGuestRoster(), []);

  // Featured partners (padrinos / helpers) with their avatars, used for the
  // "Sponsoring affiliate program partners" view of the avatar marquee.
  const featuredAvatars = useMemo(
    () =>
      credits
        .map((credit) => {
          const { photo, initials } = resolveFeaturedAvatar(credit.name);
          return { name: credit.name, photo, initials };
        })
        .filter((item) => item.name),
    [credits]
  );

  // Which credits to show in the vertical roll: the featured partners
  // (default) or every active guest.
  const [avatarMode, setAvatarMode] = useState("featured");

  // The horizontal crossed marquee always shows every active guest.
  const half = Math.ceil(roster.length / 2);
  const rowA = roster.slice(0, half);
  const rowB = roster.slice(half);


  // Pause the credits roll while the user is interacting with it.
  const [paused, setPaused] = useState(false);


  return (
    <section className="thanks-section section" id="thanks">
      <div className="thanks-grain" aria-hidden="true" />
      <div className="thanks-vignette" aria-hidden="true" />
      <div className="thanks-frame">
        <div className="section-heading thanks-heading">
          <p className="eyebrow">{thanks.eyebrow}</p>

          <blockquote className="thanks-quote">
            <h2>{thanks.title}</h2>
            <p className="thanks-subtitle">{thanks.subtitle}</p>
          </blockquote>
        </div>

        {/* ── Credits roll toggle ────────────────────────────────── */}
        <div className="thanks-avatar-toggle" role="group" aria-label={thanks.avatarToggleLabel || thanks.title}>
          <button
            type="button"
            className={`thanks-avatar-toggle-btn${avatarMode === "featured" ? " is-active" : ""}`}
            aria-pressed={avatarMode === "featured"}
            onClick={() => setAvatarMode("featured")}
          >
            {thanks.avatarToggleFeatured}
          </button>
          <button
            type="button"
            className={`thanks-avatar-toggle-btn${avatarMode === "all" ? " is-active" : ""}`}
            aria-pressed={avatarMode === "all"}
            onClick={() => setAvatarMode("all")}
          >
            {thanks.avatarToggleAll}
          </button>
        </div>

        {/* ── Cinematic credits roll ─────────────────────────────── */}
        <div
          className={`thanks-credits-stage${paused ? " is-paused" : ""}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          aria-label={thanks.creditsLabel || thanks.title}
        >
          <div className="thanks-credits-roll">
            {[0, 1].map((dup) => (
              <ul className="thanks-credits" key={dup} aria-hidden={dup === 1}>
                {/* Featured helpers / padrinos first, with their role + avatar. */}
                {credits.map((credit, index) => (
                  <FeaturedCredit credit={credit} key={`c-${index}`} />
                ))}
                {/* Then every active guest, full name (only in "all" mode). */}
                {avatarMode === "all" &&
                  roster.map((guest, index) => (
                    <li className="thanks-credit" key={`g-${index}`}>
                      <span className="thanks-credit-text">
                        <strong className="thanks-name">{guest.name}</strong>
                      </span>
                    </li>
                  ))}
              </ul>
            ))}
          </div>
        </div>

        {/* ── Crossed avatar marquee ─────────────────────────────── */}

        <div className="thanks-avatars" aria-label={thanks.avatarsLabel || thanks.title}>

          <div className="thanks-avatars-row thanks-avatars-row--a">
            {[0, 1].map((dup) => (
              <div className="thanks-avatars-track" key={dup} aria-hidden={dup === 1}>
                {rowA.map((guest, index) => (
                  <Avatar guest={guest} index={index} key={`a-${dup}-${index}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="thanks-avatars-row thanks-avatars-row--b">
            {[0, 1].map((dup) => (
              <div className="thanks-avatars-track" key={dup} aria-hidden={dup === 1}>
                {rowB.map((guest, index) => (
                  <Avatar guest={guest} index={index} key={`b-${dup}-${index}`} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Humor: vertical auto-scrolling carousel ────────────── */}
        <div className="thanks-humor" aria-label={thanks.humorLabel || thanks.title}>
          <div className="thanks-humor-track">
            {[0, 1].map((dup) => (
              <div className="thanks-humor-set" key={dup} aria-hidden={dup === 1}>
                {humor.map((line, index) => (
                  <blockquote className="thanks-humor-line" key={`h-${dup}-${index}`}>
                    <p>{line}</p>
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
