import React, { Suspense, lazy } from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import { Nav } from "./components/Nav.jsx";
import { Countdown } from "./components/Countdown.jsx";
import { Hero } from "./components/Hero.jsx";
import { LazySection } from "./components/LazySection.jsx";

// Below-the-fold sections are code-split and only mounted (and their JS chunk
// fetched) when they scroll into view. This keeps the initial bundle small and
// the first paint fast on a long one-page invitation.
const IdentitySection = lazy(() => import("./components/IdentitySection.jsx"));
const Story = lazy(() => import("./components/Story.jsx"));

const Venue = lazy(() => import("./components/Venue.jsx"));
const Weekend = lazy(() => import("./components/Weekend.jsx"));
const Accommodation = lazy(() => import("./components/Accommodation.jsx"));
const Weather = lazy(() => import("./components/Weather.jsx"));
const Food = lazy(() => import("./components/Food.jsx"));
const Music = lazy(() => import("./components/Music.jsx"));
const Travel = lazy(() => import("./components/Travel.jsx"));
const Attire = lazy(() => import("./components/Attire.jsx"));
const Gift = lazy(() => import("./components/Gift.jsx"));
const Coast = lazy(() => import("./components/Coast.jsx"));
const RSVP = lazy(() => import("./components/RSVP.jsx"));
const Gallery = lazy(() => import("./components/Gallery.jsx"));
const Photos = lazy(() => import("./components/Photos.jsx"));
const Footer = lazy(() => import("./components/Footer.jsx"));

function Invitation() {
  const { authState } = useApp();

  if (authState === "loading") {
    return <div className="app-loading" aria-label="Loading" />;
  }

  if (authState === "signedOut") {
    return <AuthGate />;
  }

  return (
    <>
      <Nav />
      <Countdown />
      <main>
        <Hero />
        <LazySection id="identity" className="lazy-section">
          <Suspense fallback={null}>
            <IdentitySection />
          </Suspense>
        </LazySection>
        <LazySection id="story" className="lazy-section">
          <Suspense fallback={null}>
            <Story />
          </Suspense>
        </LazySection>

        <LazySection id="venue" className="lazy-section">
          <Suspense fallback={null}>
            <Venue />
          </Suspense>
        </LazySection>
        <LazySection id="weekend" className="lazy-section">
          <Suspense fallback={null}>
            <Weekend />
          </Suspense>
        </LazySection>
        <LazySection id="accommodation" className="lazy-section">
          <Suspense fallback={null}>
            <Accommodation />
          </Suspense>
        </LazySection>
        <LazySection id="weather" className="lazy-section">
          <Suspense fallback={null}>
            <Weather />
          </Suspense>
        </LazySection>
        <LazySection id="food" className="lazy-section">
          <Suspense fallback={null}>
            <Food />
          </Suspense>
        </LazySection>
        <LazySection id="music" className="lazy-section">
          <Suspense fallback={null}>
            <Music />
          </Suspense>
        </LazySection>
        <LazySection id="travel" className="lazy-section">
          <Suspense fallback={null}>
            <Travel />
          </Suspense>
        </LazySection>
        <LazySection id="attire" className="lazy-section">
          <Suspense fallback={null}>
            <Attire />
          </Suspense>
        </LazySection>
        <LazySection id="gift" className="lazy-section">
          <Suspense fallback={null}>
            <Gift />
          </Suspense>
        </LazySection>
        <LazySection id="coast" className="lazy-section">
          <Suspense fallback={null}>
            <Coast />
          </Suspense>
        </LazySection>
        <LazySection id="rsvp" className="lazy-section">
          <Suspense fallback={null}>
            <RSVP />
          </Suspense>
        </LazySection>
        <LazySection id="gallery" className="lazy-section">
          <Suspense fallback={null}>
            <Gallery />
          </Suspense>
        </LazySection>
        <LazySection id="photos" className="lazy-section">
          <Suspense fallback={null}>
            <Photos />
          </Suspense>
        </LazySection>
      </main>
      <LazySection id="footer" className="lazy-section">
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </LazySection>
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <Invitation />
    </AppProvider>
  );
}
