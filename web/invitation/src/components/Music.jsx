import React from "react";
import { EVENT } from "../content.js";
import { MEDIA } from "../media.js";
import { useApp } from "../context/AppContext.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";
import { StarVote } from "./StarVote.jsx";



export function Music() {
  const { t } = useApp();
  const music = t.music || {};
  // The final chosen background theme is "arty". The temporary theme selector
  // was removed; the section always uses the ARTY variant.
  const theme = "arty";
  const playlists = [
    ["general", EVENT.playlists.general],
    ["karaoke", EVENT.playlists.karaoke],
    ["shared", EVENT.playlists.shared],
  ];

  return (
    <section
      className={`music-section section story-bg music-theme--${theme}`}
      id="music"
    >

      <div className="experience-heading reveal">
        <p className="eyebrow">{music.eyebrow}</p>
        <h2>{music.title}</h2>
        <p className="lead">{music.body}</p>
      </div>


      <SwipeCardCarousel className="music-lineup" label={music.title}>
        {music.acts.map((act, index) => {
          const photo = act.image ? MEDIA.music[act.image] : null;
          return (
            <article className="music-act reveal" key={index}>
              {photo && (
                <div className="music-act__photo">
                  <img src={photo} alt={act.name} loading="lazy" />
                  {act.logo && (
                    <img
                      className="music-act__logo"
                      src={MEDIA.music[act.logo]}
                      alt={`${act.name} logo`}
                      loading="lazy"
                    />
                  )}
                </div>
              )}

              <span className="music-act__number">0{index + 1}</span>
              <p className="music-act__moment">{act.moment}</p>
              <div className="music-act__inner">
                <h3>{act.name}</h3>
                <small>{act.note}</small>
              </div>
              {/* The links row is always rendered as a placeholder so every
                  card keeps the same height and the bottom area is ready for
                  the links/videos/logos that will be added once the contracts
                  are validated. */}
              <div className="music-act__links">
                {act.link && (
                  <a
                    className="text-link"
                    href={act.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {music.listenLabel || "Listen"} ↗
                  </a>
                )}
                {act.website && (
                  <a
                    className="text-link"
                    href={act.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {music.websiteLabel || "Website"} ↗
                  </a>
                )}
              </div>

              <StarVote cardType="music" cardKey={act.name} />

            </article>

          );
        })}
      </SwipeCardCarousel>


      <div className="playlist-section reveal">
        <div className="playlist-heading">
          <p className="eyebrow">{music.playlists.eyebrow}</p>
          <h3>{music.playlists.title}</h3>
          <p className="playlist-citation">{music.playlists.body}</p>
        </div>
        <SwipeCardCarousel className="playlist-grid" label={music.playlists.title}>
          {playlists.map(([playlist, url], index) => (
            <article className="playlist-card" key={playlist}>
              <span className="playlist-number">0{index + 1}</span>
              <div className="spotify-mark" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <h4>{music.playlists[playlist]?.title}</h4>
              <p>{music.playlists[playlist]?.body}</p>
              <a
                className="text-link"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {music.playlists[playlist]?.button} ↗
              </a>
            </article>
          ))}
        </SwipeCardCarousel>
      </div>

      {/* Desktop-only bottom nav: leads to the "Et après ?" (coast) section.
          The music section sits on a dark ink background, so the nav uses the
          light variant to keep the link visible. */}
      <nav
        className="section-nav section-nav--light music-section-nav"
        aria-label="Continue"
      >

        <a className="section-nav-link" href="#coast">
          <span>{t.nav.coast}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );
}
