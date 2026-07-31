import React from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import { Nav } from "./components/Nav.jsx";
import { Countdown } from "./components/Countdown.jsx";
import { Hero } from "./components/Hero.jsx";
import { Story } from "./components/Story.jsx";
import { Venue } from "./components/Venue.jsx";
import { Weekend } from "./components/Weekend.jsx";
import { Accommodation } from "./components/Accommodation.jsx";
import { Weather } from "./components/Weather.jsx";
import { Food } from "./components/Food.jsx";
import { Music } from "./components/Music.jsx";
import { Travel } from "./components/Travel.jsx";
import { Attire } from "./components/Attire.jsx";
import { Gift } from "./components/Gift.jsx";
import { Coast } from "./components/Coast.jsx";
import { RSVP } from "./components/RSVP.jsx";
import { Gallery } from "./components/Gallery.jsx";
import { Photos } from "./components/Photos.jsx";
import { Footer } from "./components/Footer.jsx";

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
        <Story />
        <Venue />
        <Weekend />
        <Accommodation />
        <Weather />
        <Food />
        <Music />
        <Travel />
        <Attire />
        <Gift />
        <Coast />
        <RSVP />
        <Gallery />
        <Photos />
      </main>
      <Footer />
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
