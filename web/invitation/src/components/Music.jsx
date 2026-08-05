import React from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";

export function Music() {
  const { t } = useApp();
  const music = t.music || {};
  const playlists = [
    ["general", EVENT.playlists.general],
    ["karaoke", EVENT.playlists.karaoke],
    ["shared", EVENT.playlists.shared],
  ];

  return (
    <section className="music-section section">
      <div className="experience-heading reveal">
        <p className="eyebrow">{music.eyebrow}</p>
        <h2>{music.title}</h2>
        <p className="lead">{music.body}</p>
      </div>

      <SwipeCardCarousel className="music-lineup" label={music.title}>
        {music.acts.map((act, index) => (
          <article className="music-act reveal" key={index}>
            <span>0{index + 1}</span>
            <p>{act.moment}</p>
            <h3>{act.name}</h3>
            <small>{act.note}</small>
          </article>
        ))}
      </SwipeCardCarousel>

      <div className="playlist-section reveal">
        <div className="playlist-heading">
          <p className="eyebrow">{music.playlists.eyebrow}</p>
          <h3>{music.playlists.title}</h3>
          <p>{music.playlists.body}</p>
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
    </section>
  );
}
