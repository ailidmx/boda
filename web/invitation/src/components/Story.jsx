import React, { useState } from "react";
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

  // Build the slide set for the shared lightbox carousel.
  const chapalaSlides = CHAPALA_HIGHLIGHTS.map((photo, index) => ({
    src: photo.src,
    full: photo.full,
    alt: story.photoAlts[index],
  }));

  return (
    <section className="story-section section">
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
      <div className="story-footer">
        <FunFactCarousel
          facts={anecdotes}
          id="story-anecdotes"
          label={story.anecdotesLabel}
        />
      </div>

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


