import React from "react";
import { CHAPALA_HIGHLIGHTS } from "../rocaAzulGallery.js";
import { chapalaAnecdotes } from "../chapalaAnecdotes.js";
import { useApp } from "../context/AppContext.jsx";
import { InitialsSwap } from "./ui.jsx";
import { FunFactCarousel } from "./FunFactCarousel.jsx";
import { resolveGuestPhoto } from "../guest-profiles.js";
import { cloudinaryImage } from "../cloudinary.js";

// Default avatar images used for the fun-fact carousel. These are the
// children's photos (hosted on Cloudinary). Guests can replace them with
// their own close-up photo (uploaded via the identity section). The carousel
// cycles through them so each anecdote gets a different avatar.
const DEFAULT_AVATARS = [
  cloudinaryImage("rounndnios.jpg", { width: 200 }),
  cloudinaryImage("nios.jpg", { width: 200 }),
  cloudinaryImage("20260227_144454_bgpfnj.jpg", { width: 200 }),
  cloudinaryImage("PXL_20240210_213129736_matjyo.jpg", { width: 200 }),
];


export function Story() {
  const { t, language, profile } = useApp();
  const story = t.story || {};
  const guest = profile?.guest;
  const guestAvatar = guest ? resolveGuestPhoto(guest) : null;
  const anecdotes = chapalaAnecdotes(language).map((anecdote, index) => ({
    // Title (emoji + bold heading) is shown on its own line, with the
    // anecdote text below it.
    title: `${anecdote.icon} ${anecdote.title}`,
    text: anecdote.text,
    // Alternate between the guest's own avatar (if uploaded) and the default
    // set so the carousel feels varied.
    avatar: guestAvatar || DEFAULT_AVATARS[index % DEFAULT_AVATARS.length],
  }));



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
