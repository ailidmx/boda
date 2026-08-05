import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import {
  ensureSpotifyToken,
  startSpotifyAuth,
  createSpotifyPlayer,
  playTracks,
  togglePlay,
  nextTrack,
  previousTrack,
  seek,
  fetchCurrentTrack,
  onPlayerChange,
  getPlayerState,
  onAuthMessage,
  hasSpotifyToken,
} from "../spotify-player.js";







/**
 * Ultra-thin Winamp-style pixelated music player.
 *
 * - Only mounts after the guest is authenticated to the invitation.
 * - Uses the Spotify Web Playback SDK + Web API to play two curated tracks in
 *   order.
 * - HIDDEN by default: it never auto-starts or auto-plays. The guest must
 *   explicitly enable it from the user menu (toggle). When enabled, the player
 *   connects to Spotify but does NOT start playback automatically — the guest
 *   presses play to begin.
 * - A very thin, pixelated banner scrolls the artist + song name horizontally.
 *
 * SILENT FAILURE: Any failure is logged to the console and swallowed — the
 * invitation keeps working and the player simply stays quiet (no blocking
 * error UI).
 */
export function WinampPlayer() {
  const { authState, musicEnabled } = useApp();
  // idle | connecting | ready | error
  const [status, setStatus] = useState("idle");
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState({ title: "…", artist: "…" });
  const [bannerOpen, setBannerOpen] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const initRef = useRef(false);
  const lastTrackIndex = useRef(-1);
  // Set to true when the user explicitly presses play while no token exists.
  // After the OAuth popup returns a token, we connect AND start playback.
  const pendingPlayRef = useRef(false);




  // Only run when the guest is signed in AND has enabled the music player.
  // No auto-play: we connect the player but never start playback on our own.
  useEffect(() => {
    if (authState !== "signedIn" || !musicEnabled || initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    // Connect the player once we have a token. Does NOT auto-play.
    const connect = async (token) => {
      if (cancelled) return;
      setStatus("connecting");
      await createSpotifyPlayer(token);
      if (cancelled) return;
      const meta = await fetchCurrentTrack();
      if (!cancelled) {
        setTrack(meta);
        setStatus("ready");
      }
    };

    // Pre-fetch the real title/artist for the first track so the banner shows
    // real names even before playback starts (or if the API is slow).
    const preloadTrackMeta = async () => {
      try {
        const meta = await fetchCurrentTrack();
        if (!cancelled) setTrack(meta);
      } catch {
        // Silent — the banner falls back to the placeholder.
      }
    };
    preloadTrackMeta();

    (async () => {

      try {
        // If we already have a stored token (or are returning from a previous
        // auth), use it directly.
        const token = await ensureSpotifyToken();
        if (cancelled) return;

        if (token) {
          await connect(token);
          return;
        }

        // No token yet → do NOT auto-trigger the OAuth flow. The guest must
        // explicitly press play, which will start the auth popup on demand.
        setStatus("ready");
      } catch (err) {
        // SILENT failure: log it, but never block the app or show an error UI.
        console.error("[winamp] init failed (silent)", err);
        if (!cancelled) setStatus("error");
      }
    })();


    // Receive the token from the OAuth popup and connect. If the user pressed
    // play (pendingPlayRef), start playback after connecting.
    const unsubscribeAuth = onAuthMessage(
      (token) => {
        connect(token)
          .then(async () => {
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              await playTracks();
              setPlaying(true);
            }
          })
          .catch((err) => {
            console.error("[winamp] connect after popup auth failed (silent)", err);
            if (!cancelled) setStatus("error");
          });
      },
      (err) => {
        console.error("[winamp] popup auth failed (silent)", err);
        if (!cancelled) setStatus("error");
      },
    );


    // Subscribe to player state changes (track changes, play/pause, position).
    const unsubscribe = onPlayerChange(() => {
      const state = getPlayerState();
      setPlaying(state.playing);
      setPositionMs(state.positionMs || 0);
      setDurationMs(state.durationMs || 0);
      // Only refresh the banner when the track actually changes, and fetch the
      // real title/artist from the Web API (the module's placeholder track is
      // just a fallback).
      if (state.trackIndex !== lastTrackIndex.current) {
        lastTrackIndex.current = state.trackIndex;
        fetchCurrentTrack().then((meta) => {
          if (!cancelled) setTrack(meta);
        });
      }
    });



    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribe();
    };
  }, [authState, musicEnabled]);



  // Hidden unless the guest explicitly enabled it from the user menu.
  if (authState !== "signedIn" || !musicEnabled) return null;


  const handleToggle = async () => {
    if (status !== "ready") return;
    try {
      // If there's no Spotify token yet, the player isn't connected. Start the
      // OAuth flow on demand — the popup posts the token back and we connect +
      // play. This is the ONLY place the OAuth flow is triggered (never on
      // mount, never automatically).
      if (!hasSpotifyToken()) {
        pendingPlayRef.current = true;
        setStatus("connecting");
        await startSpotifyAuth();
        return;
      }
      await togglePlay();
      setPlaying((p) => !p);
    } catch (err) {
      console.error("[winamp] toggle failed (silent)", err);
    }
  };


  const bannerText = `${track.artist} — ${track.title}`;

  // Format ms → m:ss (e.g. 125000 → "2:05").
  const fmt = (ms) => {
    if (!ms || ms < 0) return "0:00";
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remainingMs = Math.max(0, (durationMs || 0) - positionMs);
  const progressPct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  const handlePrev = async () => {
    if (status !== "ready") return;
    try {
      await previousTrack();
    } catch (err) {
      console.error("[winamp] prev failed (silent)", err);
    }
  };

  const handleNext = async () => {
    if (status !== "ready") return;
    try {
      await nextTrack();
    } catch (err) {
      console.error("[winamp] next failed (silent)", err);
    }
  };

  const handleSeek = (e) => {
    if (status !== "ready" || !durationMs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * durationMs).catch((err) => {
      console.error("[winamp] seek failed (silent)", err);
    });
  };

  return (
    <>
      {/* Thin pixelated scrolling banner + controls */}
      <div
        className={`winamp-banner${bannerOpen ? " is-open" : ""}`}
        onClick={() => setBannerOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-label="Mostrar u ocultar la canción actual"
      >
        <div className="winamp-banner-track">
          <span className="winamp-banner-text">{bannerText}</span>
          <span className="winamp-banner-text" aria-hidden="true">{bannerText}</span>
        </div>

        {/* Winamp-style transport controls */}
        <div className="winamp-controls" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="winamp-btn"
            onClick={handlePrev}
            disabled={status !== "ready"}
            aria-label="Canción anterior"
            title="Anterior"
          >
            <span aria-hidden="true">⏮</span>
          </button>
          <button
            type="button"
            className="winamp-btn"
            onClick={handleToggle}
            disabled={status !== "ready"}
            aria-label={playing ? "Pausar" : "Reproducir"}
            title={playing ? "Pausar" : "Reproducir"}
          >
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
          </button>
          <button
            type="button"
            className="winamp-btn"
            onClick={handleNext}
            disabled={status !== "ready"}
            aria-label="Siguiente canción"
            title="Siguiente"
          >
            <span aria-hidden="true">⏭</span>
          </button>
        </div>

        {/* Time display: current / remaining */}
        <div className="winamp-time">
          <span className="winamp-time-current">{fmt(positionMs)}</span>
          <span className="winamp-time-sep">/</span>
          <span className="winamp-time-remaining">-{fmt(remainingMs)}</span>
        </div>

        {/* Thin pixelated progress bar (click to seek) */}
        <div
          className="winamp-progress"
          onClick={handleSeek}
          role="slider"
          aria-label="Progreso de la canción"
          aria-valuemin={0}
          aria-valuemax={durationMs || 0}
          aria-valuenow={positionMs}
          tabIndex={0}
        >
          <div className="winamp-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </>
  );
}


