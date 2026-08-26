import React, { lazy, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { RsvpProvider } from "./context/RsvpContext.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import { Nav } from "./components/Nav.jsx";
import { Countdown } from "./components/Countdown.jsx";
import { Hero } from "./components/Hero.jsx";
import { FullLoadGate } from "./components/FullLoadGate.jsx";
import { ProgressiveSection } from "./components/ProgressiveSection.jsx";
import { LanguageModal } from "./components/LanguageModal.jsx";
import { IdentityModal } from "./components/IdentityModal.jsx";
import { WinampPlayer } from "./components/WinampPlayer.jsx";
import { useVersionCheck } from "./hooks/useVersionCheck.js";
import { useClickTracking } from "./hooks/useClickTracking.js";
import { usePageViewTracking } from "./hooks/usePageViewTracking.js";
import { trackInvitationVisit } from "./analytics.js";
import { getInvitationLinkParams, computeTimeToAnswer, normalizeSource } from "./invitation-link.js";
import { guestTravelsByPlane } from "./guest-profiles.js";

// Keep the app shell and Hero eager; progressively fetch the long-tail sections
// before they approach the viewport. Named-export adapters preserve the
// existing component modules without introducing wrapper files.
const Story = lazy(() => import("./components/Story.jsx").then((m) => ({ default: m.Story })));
const Venue = lazy(() => import("./components/Venue.jsx").then((m) => ({ default: m.Venue })));
const Weekend = lazy(() => import("./components/Weekend.jsx").then((m) => ({ default: m.Weekend })));
const WeekendProgram = lazy(() => import("./components/Weekend.jsx").then((m) => ({ default: m.WeekendProgram })));
const Petanque = lazy(() => import("./components/Petanque.jsx").then((m) => ({ default: m.Petanque })));
const Accommodation = lazy(() => import("./components/Accommodation.jsx").then((m) => ({ default: m.Accommodation })));
const Weather = lazy(() => import("./components/Weather.jsx").then((m) => ({ default: m.Weather })));
const Food = lazy(() => import("./components/Food.jsx").then((m) => ({ default: m.Food })));
const Guisos = lazy(() => import("./components/Guisos.jsx").then((m) => ({ default: m.Guisos })));
const Music = lazy(() => import("./components/Music.jsx").then((m) => ({ default: m.Music })));
const Travel = lazy(() => import("./components/Travel.jsx").then((m) => ({ default: m.Travel })));
const Attire = lazy(() => import("./components/Attire.jsx").then((m) => ({ default: m.Attire })));
const DressCode = lazy(() => import("./components/Attire.jsx").then((m) => ({ default: m.DressCode })));
const Gift = lazy(() => import("./components/Gift.jsx").then((m) => ({ default: m.Gift })));
const Coast = lazy(() => import("./components/Coast.jsx").then((m) => ({ default: m.Coast })));
const RSVP = lazy(() => import("./components/RSVP.jsx").then((m) => ({ default: m.RSVP })));
const TeAnimas = lazy(() => import("./components/TeAnimas.jsx").then((m) => ({ default: m.TeAnimas })));
const GuestCloud = lazy(() => import("./components/GuestCloud.jsx").then((m) => ({ default: m.GuestCloud })));
const Photos = lazy(() => import("./components/Photos.jsx").then((m) => ({ default: m.Photos })));
const Thanks = lazy(() => import("./components/Thanks.jsx").then((m) => ({ default: m.Thanks })));
const Footer = lazy(() => import("./components/Footer.jsx").then((m) => ({ default: m.Footer })));

function Invitation() {
  const { authState, profile } = useApp();
  const travelsByPlane = guestTravelsByPlane(profile?.guest);

  useVersionCheck();
  useClickTracking();
  usePageViewTracking({ guestId: profile?.guest?.id });

  useEffect(() => {
    const params = getInvitationLinkParams();
    if (!params.guest && !params.source && !params.medium && !params.campaign) return;
    trackInvitationVisit({
      guest: params.guest,
      source: normalizeSource(params.source),
      medium: params.medium,
      campaign: params.campaign,
      timeToAnswer: computeTimeToAnswer(params.sentAt),
    });
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (authState === "loading") return <div className="app-loading" aria-label="Loading" />;
  if (authState === "signedOut") return <AuthGate />;

  return (
    <FullLoadGate>
      <LanguageModal />
      <IdentityModal />
      <Nav />
      <Countdown />
      <WinampPlayer />

      <main>
        <Hero />
        <ProgressiveSection id="story"><Story /></ProgressiveSection>
        <ProgressiveSection id="venue"><Venue /></ProgressiveSection>
        <ProgressiveSection id="weekend"><Weekend /></ProgressiveSection>
        <ProgressiveSection id="attire"><Attire /></ProgressiveSection>
        <ProgressiveSection id="dress-code"><DressCode /></ProgressiveSection>
        <ProgressiveSection id="weather"><Weather /></ProgressiveSection>
        <ProgressiveSection id="weekend-program"><WeekendProgram /></ProgressiveSection>
        <ProgressiveSection id="te-animas"><TeAnimas /></ProgressiveSection>
        {travelsByPlane && <ProgressiveSection id="travel"><Travel /></ProgressiveSection>}
        <ProgressiveSection id="accommodation"><Accommodation /></ProgressiveSection>
        <ProgressiveSection id="petanque"><Petanque /></ProgressiveSection>
        <ProgressiveSection id="food"><Food /></ProgressiveSection>
        <ProgressiveSection id="guisos"><Guisos /></ProgressiveSection>
        <ProgressiveSection id="music"><Music /></ProgressiveSection>
        <ProgressiveSection id="coast"><Coast /></ProgressiveSection>
        <ProgressiveSection id="rsvp"><RSVP /></ProgressiveSection>
        <ProgressiveSection id="gift"><Gift /></ProgressiveSection>
        <ProgressiveSection id="photos"><Photos /></ProgressiveSection>
        <ProgressiveSection id="guests"><GuestCloud /></ProgressiveSection>
        <ProgressiveSection id="thanks"><Thanks /></ProgressiveSection>
      </main>
      <ProgressiveSection id="footer"><Footer /></ProgressiveSection>
    </FullLoadGate>
  );
}

export function App() {
  return (
    <AppProvider>
      <RsvpProvider><Invitation /></RsvpProvider>
    </AppProvider>
  );
}
