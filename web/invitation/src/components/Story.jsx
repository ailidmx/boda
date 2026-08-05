import React, { useEffect, useRef, useState } from "react";
import { CHAPALA_HIGHLIGHTS } from "../rocaAzulGallery.js";
import { chapalaAnecdotes } from "../chapalaAnecdotes.js";
import { useApp } from "../context/AppContext.jsx";
import { InitialsSwap } from "./ui.jsx";
import { FunFactCarousel } from "./FunFactCarousel.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";




// The fun-fact carousel always shows the same children's photo as the avatar,
// so every anecdote is consistently illustrated with the kids' picture.
const KIDS_AVATAR =
  "https://res.cloudinary.com/k2ajcgxv/image/upload/v1785536631/nios.jpg";





export function Story() {
  const { t, language } = useApp();
  const story = t.story || {};
  const anecdotes = chapalaAnecdotes(language).map((anecdote, index) => ({
    // Title (emoji + bold heading) is shown on its own line, with the
    // anecdote text below it.
    title: `${anecdote.icon} ${anecdote.title}`,
    text: anecdote.text,
    // Always use the same children's photo so the carousel consistently shows
    // the kids' avatar rather than the logged-in guest's own photo.
    avatar: KIDS_AVATAR,

  }));


  // Full-screen lightbox state for the Chapala photo set.
  const [lightbox, setLightbox] = useState(null);
  const [factsOpen, setFactsOpen] = useState(false);
  const [storyActive, setStoryActive] = useState(false);
  const sectionRef = useRef(null);
  const factsFabRef = useRef(null);
  const factsPanelRef = useRef(null);
  const factsCloseRef = useRef(null);

  // Show the mobile FAB only while the Story section occupies a meaningful
  // part of the viewport. CSS keeps it hidden at desktop widths.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    const mobile = window.matchMedia("(max-width: 899px)");
    let latestEntry = null;
    const syncVisibility = () => {
      const visible = mobile.matches && latestEntry?.isIntersecting;
      setStoryActive(Boolean(visible));
      if (!mobile.matches) setFactsOpen(false);
    };
    const observer = new IntersectionObserver(([entry]) => {
      latestEntry = entry;
      syncVisibility();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    observer.observe(section);
    mobile.addEventListener?.("change", syncVisibility);
    return () => {
      observer.disconnect();
      mobile.removeEventListener?.("change", syncVisibility);
    };
  }, []);

  // Treat the mobile explorer as a real modal: lock background scrolling,
  // support Escape, focus the close button, then return focus to the FAB.
  useEffect(() => {
    if (!factsOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const trigger = factsFabRef.current;
    document.body.style.overflow = "hidden";
    factsCloseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setFactsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [...(factsPanelRef.current?.querySelectorAll("button:not([disabled])") || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [factsOpen]);

  // Build the slide set for the shared lightbox carousel.
  const chapalaSlides = CHAPALA_HIGHLIGHTS.map((photo, index) => ({
    src: photo.src,
    full: photo.full,
    alt: story.photoAlts[index],
  }));

  return (
    <section className="story-section section" ref={sectionRef}>
      <div className="story-mark">
        <InitialsSwap variant="identity-swap--story" delay="-3.4s" />
      </div>
      <div className="story-copy reveal">
        <p className="eyebrow">{story.eyebrow}</p>
        <h2>{story.title}</h2>
        <p className="lead story-lead">{story.body}</p>

        <p className="handwritten">{story.note}</p>
        <div className="chapala-photos" aria-label={story.photosLabel}>
          {CHAPALA_HIGHLIGHTS.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="chapala-photo"
              onClick={() => setLightbox({ startIndex: index })}
              aria-label={`${story.photoAlts[index]} — ver en grande`}
            >
              <img
                src={photo.src}
                alt={story.photoAlts[index]}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      </div>
      <div
        className={`story-footer${factsOpen ? " is-mobile-open" : ""}`}
        role={factsOpen ? "dialog" : undefined}
        aria-modal={factsOpen ? "true" : undefined}
        aria-label={factsOpen ? story.anecdotesLabel : undefined}
        onMouseDown={(event) => {
          if (factsOpen && event.target === event.currentTarget) setFactsOpen(false);
        }}
      >
        <div className="story-facts-panel" ref={factsPanelRef}>
          <button
            ref={factsCloseRef}
            className="story-facts-close"
            type="button"
            aria-label="Close"
            onClick={() => setFactsOpen(false)}
          >
            ×
          </button>
          <FunFactCarousel
            facts={anecdotes}
            id="story-anecdotes"
            label={story.anecdotesLabel}
            headerAvatar={KIDS_AVATAR}
          />
        </div>
      </div>

      <button
        ref={factsFabRef}
        className={`story-facts-fab${storyActive && !factsOpen ? " is-visible" : ""}`}
        type="button"
        aria-label={story.anecdotesLabel}
        aria-haspopup="dialog"
        onClick={() => setFactsOpen(true)}
      >
        <img src={KIDS_AVATAR} alt="" />
      </button>

      <nav className="section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#venue">
          <span>{story.navNext}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>

      {/* Shared full-screen lightbox carousel */}
      <LightboxCarousel
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        images={chapalaSlides}
        startIndex={lightbox ? lightbox.startIndex : 0}
        label={story.photosLabel}
      />
    </section>
  );
}
