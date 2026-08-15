import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { RsvpProvider } from "./context/RsvpContext.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import { Nav } from "./components/Nav.jsx";
import { Countdown } from "./components/Countdown.jsx";
import { Hero } from "./components/Hero.jsx";
import { FullLoadGate } from "./components/FullLoadGate.jsx";
import { LanguageModal } from "./components/LanguageModal.jsx";
import { IdentityModal } from "./components/IdentityModal.jsx";
import { WinampPlayer } from "./components/WinampPlayer.jsx";
import { useVersionCheck } from "./hooks/useVersionCheck.js";
import { useClickTracking } from "./hooks/useClickTracking.js";
import { usePageViewTracking } from "./hooks/usePageViewTracking.js";
import { guestTravelsByPlane } from "./guest-profiles.js";

// Full-load architecture: every section is imported eagerly and mounted up
// front. The FullLoadGate preloads all section chunks behind a cinematic
// Matrix loader, so once the guest is signed in the whole invitation is
// available instantly and navigation is completely fluid (no lazy chunks
// fetched while scrolling).
import { Story } from "./components/Story.jsx";
import { Venue } from "./components/Venue.jsx";
import { Weekend, WeekendProgram } from "./components/Weekend.jsx";
import { Petanque } from "./components/Petanque.jsx";
import { Accommodation } from "./components/Accommodation.jsx";
import { Weather } from "./components/Weather.jsx";
import { Food } from "./components/Food.jsx";
import { Guisos } from "./components/Guisos.jsx";
import { Music } from "./components/Music.jsx";
import { SongRequest } from "./components/SongRequest.jsx";
import { Travel } from "./components/Travel.jsx";
import { Attire, DressCode } from "./components/Attire.jsx";
import { Gift } from "./components/Gift.jsx";
import { Coast } from "./components/Coast.jsx";
import { RSVP } from "./components/RSVP.jsx";
import { TeAnimas } from "./components/TeAnimas.jsx";
import { GuestCloud } from "./components/GuestCloud.jsx";
import { Photos } from "./components/Photos.jsx";
import { Thanks } from "./components/Thanks.jsx";
import { Footer } from "./components/Footer.jsx";

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
        <section id="story" className="lazy-section">
          <Story />
        </section>

        <section id="venue" className="lazy-section">
          <Venue />
        </section>
        <section id="weekend" className="lazy-section">
          <Weekend />
        </section>
        <section id="attire" className="lazy-section">
          <Attire />
        </section>
        <section id="dress-code" className="lazy-section">
          <DressCode />
        </section>
        <section id="weather" className="lazy-section">
          <Weather />
        </section>
        <section id="weekend-program" className="lazy-section">
          <WeekendProgram />
        </section>
        {/* "Vous vous lancez ?" — placed right after the programme. */}
        <section id="te-animas" className="lazy-section">
          <TeAnimas />
        </section>
        {/* "Je viens de loin" — placed right after the programme. Only shown
            for guests who travel by plane (see travelsByPlane above). */}
        {travelsByPlane && (
          <section id="travel" className="lazy-section">
            <Travel />
          </section>
        )}

        <section id="accommodation" className="lazy-section">
          <Accommodation />
        </section>
        <section id="petanque" className="lazy-section">
          <Petanque />
        </section>
        <section id="food" className="lazy-section">
          <Food />
        </section>
        {/* "¿Qué guisos?" — menu vote, placed right after the food section. */}
        <section id="guisos" className="lazy-section">
          <Guisos />
        </section>
        <section id="music" className="lazy-section">
          <Music />
        </section>
        {/* "Pide tu canción" — interactive song-request section, placed right
            after the music section. */}
        <section id="song-request" className="lazy-section">
          <SongRequest />
        </section>
        <section id="coast" className="lazy-section">
          <Coast />
        </section>
        {/* The final RSVP form sits right before the INVITES section. */}
        <section id="rsvp" className="lazy-section">
          <RSVP />
        </section>

        {/* "Cadeaux" (gift) sits right after the RSVP and before the
            thank-you section. */}
        <section id="gift" className="lazy-section">
          <Gift />
        </section>
        <section id="photos" className="lazy-section">
          <Photos />
        </section>
        <section id="guests" className="lazy-section">
          <GuestCloud />
        </section>
        <section id="thanks" className="lazy-section">
          <Thanks />
        </section>
      </main>

      <section id="footer" className="lazy-section">
        <Footer />
      </section>
    </FullLoadGate>
  );
}

export function App() {
  return (
    <AppProvider>
      <RsvpProvider>
        <Invitation />
      </RsvpProvider>
    </AppProvider>
  );
}
