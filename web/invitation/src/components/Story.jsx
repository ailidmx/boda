import React from "react";
import { CHAPALA_HIGHLIGHTS } from "../rocaAzulGallery.js";
import { chapalaAnecdotes } from "../chapalaAnecdotes.js";
import { useApp } from "../context/AppContext.jsx";
import { InitialsSwap } from "./ui.jsx";
import { FunFactCarousel } from "./FunFactCarousel.jsx";

export function Story() {
  const { t, language } = useApp();
  const story = t.story || {};
  const anecdotes = chapalaAnecdotes(language).map(
    (anecdote) => `${anecdote.icon} ${anecdote.title} — ${anecdote.text}`,
  );

  return (
    <section className="story-section section">
      <div className="story-mark">
        <InitialsSwap variant="identity-swap--story" delay="-3.4s" />
      </div>
      <div className="story-copy reveal">
        <p className="eyebrow">{story.eyebrow}</p>
        <h2>{story.title}</h2>
        <p className="lead">{story.body}</p>
        <p className="handwritten">{story.note}</p>
        <div className="chapala-photos" aria-label={story.photosLabel}>
          {CHAPALA_HIGHLIGHTS.map((photo, index) => (
            <a
              key={index}
              className="chapala-photo"
              href={photo.full}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={photo.src}
                alt={story.photoAlts[index]}
                loading="lazy"
                decoding="async"
              />
            </a>
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
    </section>
  );
}
