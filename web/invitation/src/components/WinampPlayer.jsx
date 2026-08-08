import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import {
  playTracks,
  togglePlay,
  nextTrack,
  previousTrack,
  seek,
  fetchCurrentTrack,
  onPlayerChange,
  getPlayerState,
  getLoopState,
  setLoopEnabled,
  stopPlayback,
} from "../stream-player.js";



/**
 * Ultra-thin Winamp-style pixelated music player.
 *
 * - Only mounts after the guest is authenticated to the invitation.
 * - Uses a self-hosted HTML5 <audio> stream player to play two curated tracks
 *   in order (no external account or OAuth required).
 * - HIDDEN by default: it never auto-starts or auto-plays. The guest must
 *   explicitly enable it from the user menu (toggle). When enabled, the player
 *   is ready but does NOT start playback automatically — the guest presses play
 *   to begin.
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
  const [loop, setLoop] = useState(() => getLoopState());
  const initRef = useRef(false);
  const lastTrackIndex = useRef(-1);

  // Only run when the guest is signed in AND has enabled the music player.
  // When the guest toggles music ON (a user gesture), playback starts
  // automatically. On a fresh page load with music already enabled, the browser
  // may block autoplay — that failure is caught silently and the guest can
  // press play manually.
  useEffect(() => {
    if (authState !== "signedIn" || !musicEnabled || initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    // Pre-fetch the real title/artist for the first track so the banner shows
    // real names even before playback starts.
    const preloadTrackMeta = async () => {
      try {
        const meta = await fetchCurrentTrack();
        if (!cancelled) setTrack(meta);
      } catch {
        // Silent — the banner falls back to the placeholder.
      }
    };
    preloadTrackMeta();

    // The stream player needs no auth — it is immediately ready to play.
    setStatus("ready");

    // Auto-play when the guest enables the player. If the browser blocks it
    // (no user gesture, e.g. on page load), the rejection is caught silently.
    playTracks()
      .then(() => {
        if (!cancelled) setPlaying(true);
      })
      .catch((err) => {
        console.warn("[winamp] autoplay blocked (silent)", err);
      });


    // Subscribe to player state changes (track changes, play/pause, position).
    const unsubscribe = onPlayerChange(() => {
      const state = getPlayerState();
      setPlaying(state.playing);
      setPositionMs(state.positionMs || 0);
      setDurationMs(state.durationMs || 0);
      // Only refresh the banner when the track actually changes.
      if (state.trackIndex !== lastTrackIndex.current) {
        lastTrackIndex.current = state.trackIndex;
        fetchCurrentTrack().then((meta) => {
          if (!cancelled) setTrack(meta);
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authState, musicEnabled]);

  // When the guest disables the music player, stop playback immediately so the
  // audio stops before the component unmounts.
  useEffect(() => {
    if (!musicEnabled) {
      stopPlayback();
    }
  }, [musicEnabled]);

  // Hidden unless the guest explicitly enabled it from the user menu.
  if (authState !== "signedIn" || !musicEnabled) return null;


  const handleToggle = async () => {
    if (status !== "ready") return;
    try {
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

  const handleLoopToggle = () => {
    const next = !loop;
    setLoopEnabled(next);
    setLoop(next);
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
          <button
            type="button"
            className={`winamp-btn winamp-loop${loop ? " is-on" : ""}`}
            onClick={handleLoopToggle}
            disabled={status !== "ready"}
            aria-label={loop ? "Desactivar repetición" : "Activar repetición"}
            aria-pressed={loop}
            title={loop ? "Repetición activada" : "Repetición desactivada"}
          >
            <span aria-hidden="true">🔁</span>
          </button>
        </div>

        {/* Time display: current / remaining */}
        <div className="winamp-time">
          <span className="winamp-time-current">{fmt(positionMs)}</span>
          <span className="winamp-time-sep">/</span>
          <span className="winamp-time-remaining">-{fmt(remainingMs)}</span>
        </div>

        {/* Copyright attribution */}
        {track.copyright && (
          <div className="winamp-copyright">© {track.copyright}</div>
        )}


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
