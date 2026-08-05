import React, { useEffect, useRef, useState } from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { getGroupTag } from "../invitation-profile.js";
import { useApp } from "../context/AppContext.jsx";
import { resolveGuestName } from "../guest-profiles.js";
import { CoupleNames, HeroDate } from "./ui.jsx";

function heroImages() {
  const media = MEDIA.hero;
  return Array.isArray(media) ? media : media ? [media] : [];
}

export function Hero() {
  const { t, profile } = useApp();
  const guest = profile?.guest;
  const images = heroImages();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const intervalRef = useRef(null);

  const showSlide = (index) => {
    setActiveIndex((index + images.length) % images.length);
  };

  const stopRotation = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRotation = () => {
    stopRotation();
    if (paused || images.length < 2) return;
    intervalRef.current = window.setInterval(
      () => setActiveIndex((prev) => (prev + 1) % images.length),
      6500,
    );
  };

  useEffect(() => {
    startRotation();
    return stopRotation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, images.length]);

  const groupTag = guest
    ? getGroupTag(guest.invitationGroup || guest.group).label
    : "";
  const fullName = guest ? resolveGuestName(guest).fullName : "";
  const customMessage = String(
    profile?.custom?.message
      || profile?.guest?.customContent?.message
      || profile?.guest?.message
      || "",
  ).trim();
  const customMessageAuthor = String(
    profile?.custom?.messageAuth
      || profile?.custom?.messageAuthor
      || profile?.guest?.customContent?.messageAuth
      || profile?.guest?.customContent?.messageAuthor
      || profile?.guest?.messageAuth
      || profile?.guest?.messageAuthor
      || "",
  ).trim();
  const hasCustomHeroMessage = Boolean(customMessage);

  return (
    <section className="hero" id="top">
      <div className={`hero-art${images.length ? " has-photo" : ""}`}>
        {images.length ? (
          <>
            <div
              className="hero-slides"
              role="img"
              aria-label={t.hero.imageAlt}
            >
              {images.map((image, index) => {
                const src = typeof image === "string" ? image : image.src;
                const position =
                  typeof image === "string" ? "" : image.position || "";
                return (
                  <img
                    key={index}
                    className={`hero-photo${index === activeIndex ? " is-active" : ""}`}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    style={position ? { objectPosition: position } : undefined}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                );
              })}
            </div>
            {images.length > 1 && (
              <div className="hero-slideshow-controls">
                <div className="hero-slide-dots">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className="hero-slide-dot"
                      type="button"
                      data-hero-slide={index}
                      aria-label={`${t.hero.selectImage} ${index + 1}`}
                      aria-current={index === activeIndex}
                      onClick={() => {
                        showSlide(index);
                        startRotation();
                      }}
                    />
                  ))}
                </div>
                <button
                  className="hero-pause-button"
                  type="button"
                  data-hero-pause
                  aria-pressed={paused}
                  onClick={() => {
                    setPaused((prev) => !prev);
                  }}
                >
                  {paused ? t.hero.play : t.hero.pause}
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="hero-image-note">{t.hero.imageNote}</span>
        )}
        <div className="sun-disc" />
        <div className="motif motif-left" />
        <div className="motif motif-right" />
      </div>

      <div className="hero-content">
        {guest && (
          <p className="hero-guest-name">
                {fullName}
          </p>
        )}
        <p className="hero-eyebrow">{t.hero.eyebrow}</p>
        <h1>
          <CoupleNames variant="identity-swap--hero" delay="-1.2s" />
        </h1>
        <p className="hero-date">
          <HeroDate />
        </p>
        <p className="hero-place">
          {EVENT.venue}
          <br />
          {EVENT.place}
        </p>
        {guest && <p className="hero-group-name">{groupTag}</p>}
        {hasCustomHeroMessage ? (
          <p className="hero-invitation hero-invitation--custom">
            <span className="hero-invitation__message">{customMessage}</span>
            {customMessageAuthor && (
              <span className="hero-invitation__author">{customMessageAuthor}</span>
            )}
          </p>
        ) : (
          <p className="hero-invitation">{t.hero.invitation}</p>
        )}
        <span className="hero-date-label">{EVENT.dateShort}</span>
      </div>

      <nav className="section-nav section-nav--light hero-section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#story">
          <span>{t.hero.navStory}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
