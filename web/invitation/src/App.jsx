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
import { InstallPromptProvider } from "./hooks/useInstallPrompt.js";
import { trackInvitationVisit } from "./analytics.js";
import {
  getInvitationLinkParams,
  computeTimeToAnswer,
  normalizeSource,
} from "./invitation-link.js";
import { guestTravelsByPlane } from "./guest-profiles.js";

// Keep the app shell and Hero eager. Long-tail sections are fetched before
// they approach the viewport. Named-export adapters preserve the existing
// component modules without wrapper files.
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

  // The FLIGHTS ("Je viens de loin") section is only relevant for guests who
  // travel by plane. When the signed-in guest does NOT travel by plane, the
  // section is hidden entirely: it is removed from the DOM, from the nav menu,
  // and from the "next section" bottom links.
  //
  // The guest's travel status is stored on the guest doc as the boolean
  // `travelsByPlane` (true = flies in). See guestTravelsByPlane().
  const travelsByPlane = guestTravelsByPlane(profile?.guest);

  // Force guests onto the latest deployed version: periodically compare the
  // running build number against the deployed version.json and hard-reload if
  // a newer release has shipped. Runs for all auth states.
  useVersionCheck();

  // Log every click to Analytics (delegated listener). Runs for all auth
  // states so we also capture clicks on the sign-in gate.
  useClickTracking();

  // Treat every section view as a page view (Analytics `page_view` + a
  // Firestore `page_views` record per guest). Only meaningful once signed in,
  // when the sections are rendered.
  usePageViewTracking({ guestId: profile?.guest?.id });

  // Log an `invitation_visit` event once per page load when the guest arrived
  // via an invitation link carrying the analytics query params (guest email,
  // UTM source/medium/campaign, sent_at). This lets us measure which channel
  // (email / WhatsApp / other) drives logins and how quickly guests answer
  // after the invitation is sent. Fires for ALL auth states (a guest arriving
  // via a link is tracked even before they sign in). The params were captured
  // eagerly in `main.jsx` before the URL was cleaned, so they survive here.
  useEffect(() => {
    const params = getInvitationLinkParams();
    if (!params.guest && !params.source && !params.medium && !params.campaign) {
      return; // not an invitation-link visit — nothing to track
    }
    trackInvitationVisit({
      guest: params.guest,
      source: normalizeSource(params.source),
      medium: params.medium,
      campaign: params.campaign,
      timeToAnswer: computeTimeToAnswer(params.sentAt),
    });
  }, []);

  // On first load (direct visit, refresh, or a shared link with a hash like
  // `#thanks`), clear any hash from the URL. The sections are gated behind
  // sign-in, so the browser cannot scroll to a hash target that does not exist
  // yet — leaving it in place can crash or leave the page stuck mid-scroll.
  // Redirecting to the root (no hash) lets the app boot normally.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  if (authState === "loading") {
    return <div className="app-loading" aria-label="Loading" />;
  }

  if (authState === "signedOut") {
    return <AuthGate />;
  }

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
        {travelsByPlane && (
          <ProgressiveSection id="travel"><Travel /></ProgressiveSection>
        )}
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
    <InstallPromptProvider>
      <AppProvider>
        <RsvpProvider>
          <Invitation />
        </RsvpProvider>
      </AppProvider>
    </InstallPromptProvider>
  );
}
