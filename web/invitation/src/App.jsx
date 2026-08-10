import React, { Suspense, lazy, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { RsvpProvider } from "./context/RsvpContext.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import { Nav } from "./components/Nav.jsx";
import { Countdown } from "./components/Countdown.jsx";
import { Hero } from "./components/Hero.jsx";
import { LazySection } from "./components/LazySection.jsx";
import { LanguageModal } from "./components/LanguageModal.jsx";
import { IdentityModal } from "./components/IdentityModal.jsx";
import { WinampPlayer } from "./components/WinampPlayer.jsx";
import { useVersionCheck } from "./hooks/useVersionCheck.js";


// Below-the-fold sections are code-split and only mounted (and their JS chunk
// fetched) when they scroll into view. This keeps the initial bundle small and
// the first paint fast on a long one-page invitation.
//
// The components use named exports, so each lazy() maps the module to its
// named export via `.then((m) => ({ default: m.X }))` — React.lazy requires a
// default export.
const Story = lazy(() =>
  import("./components/Story.jsx").then((m) => ({ default: m.Story })),
);

const Venue = lazy(() =>
  import("./components/Venue.jsx").then((m) => ({ default: m.Venue })),
);
const Weekend = lazy(() =>
  import("./components/Weekend.jsx").then((m) => ({ default: m.Weekend })),
);
const WeekendProgram = lazy(() =>
  import("./components/Weekend.jsx").then((m) => ({ default: m.WeekendProgram })),
);
const Petanque = lazy(() =>
  import("./components/Petanque.jsx").then((m) => ({ default: m.Petanque })),
);
const Accommodation = lazy(() =>
  import("./components/Accommodation.jsx").then((m) => ({ default: m.Accommodation })),
);

const Weather = lazy(() =>
  import("./components/Weather.jsx").then((m) => ({ default: m.Weather })),
);
const Food = lazy(() =>
  import("./components/Food.jsx").then((m) => ({ default: m.Food })),
);
const Music = lazy(() =>
  import("./components/Music.jsx").then((m) => ({ default: m.Music })),
);
const Travel = lazy(() =>
  import("./components/Travel.jsx").then((m) => ({ default: m.Travel })),
);
const Attire = lazy(() =>
  import("./components/Attire.jsx").then((m) => ({ default: m.Attire })),
);
const Gift = lazy(() =>
  import("./components/Gift.jsx").then((m) => ({ default: m.Gift })),
);
const Coast = lazy(() =>
  import("./components/Coast.jsx").then((m) => ({ default: m.Coast })),
);
const RSVP = lazy(() =>
  import("./components/RSVP.jsx").then((m) => ({ default: m.RSVP })),
);
const TeAnimas = lazy(() =>
  import("./components/TeAnimas.jsx").then((m) => ({ default: m.TeAnimas })),
);

const Guests = lazy(() =>
  import("./components/GuestCloud.jsx").then((m) => ({ default: m.GuestCloud })),
);
const Photos = lazy(() =>
  import("./components/Photos.jsx").then((m) => ({ default: m.Photos })),
);
const Thanks = lazy(() =>
  import("./components/Thanks.jsx").then((m) => ({ default: m.Thanks })),
);
const Footer = lazy(() =>
  import("./components/Footer.jsx").then((m) => ({ default: m.Footer })),
);


function Invitation() {
  const { authState, profile } = useApp();

  // The FLIGHTS ("Je viens de loin") section is only relevant for guests who
  // travel by plane. When the signed-in guest does NOT travel by plane, the
  // section is hidden entirely: it is removed from the DOM, from the nav menu,
  // and from the "next section" bottom links.
  //
  // The guest's travel status is stored on the guest doc as `travelStatus`
  // ("booked" | "planning" | "local"). Guests who travel by plane are those
  // who are NOT local.
  const travelsByPlane = ["booked", "planning"].includes(
    profile?.guest?.travelStatus,
  );


  // Force guests onto the latest deployed version: periodically compare the
  // running build number against the deployed version.json and hard-reload if
  // a newer release has shipped. Runs for all auth states.
  useVersionCheck();

  // On first load (direct visit, refresh, or a shared link with a hash like
  // `#thanks`), clear any hash from the URL. The sections are lazy-loaded and
  // gated behind sign-in, so the browser cannot scroll to a hash target that
  // does not exist yet — leaving it in place can crash or leave the page stuck
  // mid-scroll. Redirecting to the root (no hash) lets the app boot normally.
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
    <>
      <LanguageModal />
      <IdentityModal />
      <Nav />
      <Countdown />
      <WinampPlayer />

      <main>
        <Hero />
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
        <LazySection id="attire" className="lazy-section">
          <Suspense fallback={null}>
            <Attire />
          </Suspense>
        </LazySection>
        <LazySection id="weather" className="lazy-section">
          <Suspense fallback={null}>
            <Weather />
          </Suspense>
        </LazySection>
        <LazySection id="weekend-program" className="lazy-section">
          <Suspense fallback={null}>
            <WeekendProgram />
          </Suspense>
        </LazySection>
        {/* "Vous vous lancez ?" — placed right after the programme. */}
        <LazySection id="te-animas" className="lazy-section">
          <Suspense fallback={null}>
            <TeAnimas />
          </Suspense>
        </LazySection>
        {/* "Je viens de loin" — placed right after the programme. Only shown
            for guests who travel by plane (see travelsByPlane above). */}
        {travelsByPlane && (
          <LazySection id="travel" className="lazy-section">
            <Suspense fallback={null}>
              <Travel />
            </Suspense>
          </LazySection>
        )}


        <LazySection id="accommodation" className="lazy-section">
          <Suspense fallback={null}>
            <Accommodation />
          </Suspense>
        </LazySection>
        <LazySection id="petanque" className="lazy-section">
          <Suspense fallback={null}>
            <Petanque />
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
        <LazySection id="coast" className="lazy-section">
          <Suspense fallback={null}>
            <Coast />
          </Suspense>
        </LazySection>
        <LazySection id="photos" className="lazy-section">


          <Suspense fallback={null}>
            <Photos />
          </Suspense>
        </LazySection>
        <LazySection id="guests" className="lazy-section">
          <Suspense fallback={null}>
            <Guests />
          </Suspense>
        </LazySection>
        <LazySection id="gift" className="lazy-section">
          <Suspense fallback={null}>
            <Gift />
          </Suspense>
        </LazySection>
        {/* The final RSVP form sits right before the thank-you section. */}
        <LazySection id="rsvp" className="lazy-section">
          <Suspense fallback={null}>
            <RSVP />
          </Suspense>
        </LazySection>
        <LazySection id="thanks" className="lazy-section">


          <Suspense fallback={null}>
            <Thanks />
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
      <RsvpProvider>
        <Invitation />
      </RsvpProvider>
    </AppProvider>
  );
}
