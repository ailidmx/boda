import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";

import "./styles/countdown.css";
import "./styles/nav.css";
import "./styles/hero.css";

import "./styles/invitation-profile.css";
import "./styles/story.css";
import "./styles/funfact.css";
import "./styles/gallery.css";
import "./styles/photos.css";
import "./styles/weekend.css";
import "./styles/petanque.css";
import "./styles/weather.css";
import "./styles/food.css";
import "./styles/music.css";
import "./styles/star-vote.css";
import "./styles/cardcarousel.css";

import "./styles/venue.css";
import "./styles/lightbox.css";
import "./styles/accommodation.css";
import "./styles/travel.css";

import "./styles/mapcarousel.css";
import "./styles/attire.css";
import "./styles/gift.css";
import "./styles/coast.css";
import "./styles/rsvp.css";
import "./styles/footer.css";
import "./styles/thanks.css";
import "./styles/guestcloud.css";
import "./styles/authgate.css";
import "./styles/langmodal.css";
import "./styles/identity.css";
import "./styles/identitymodal.css";
import "./styles/winamp.css";

import "./styles/responsive.css";

import { App } from "./App.jsx";

// Register the service worker for offline support + PWA installability.

// Only in production: in dev the Vite server handles HMR and we don't want a
// service worker caching stale modules during development.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[SW] registration failed:", err);
    });
  });
}

const container = document.querySelector("#app");

// The dashboard is now a separate build served under /dashboard/* (via the
// Vite proxy in dev, and Firebase Hosting rewrites in production). This
// invitation build only renders the React invitation.
const root = createRoot(container);

root.render(<App />);

