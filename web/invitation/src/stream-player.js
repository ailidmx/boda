/**
 * Custom stream player for the ultra-thin Winamp-style music player.
 *
 * Replaces the previous Spotify Web Playback SDK integration with a self-hosted
 * HTML5 <audio> player. The two curated tracks are served as static MP3 files
 * from the invitation's own hosting (public/audio/), so no external account,
 * OAuth flow, or third-party SDK is required — the guest just presses play.
 *
 * The module exposes the same API surface the WinampPlayer UI expects:
 *   onPlayerChange, getPlayerState, playTracks, togglePlay, nextTrack,
 *   previousTrack, seek, fetchCurrentTrack.
 */

// The two curated tracks, played in this order. `src` is the static MP3 path
// (served from the public/ folder at the site root). `title`/`artist` are the
// display names shown in the scrolling banner; `copyright` is the attribution
// shown in the player.
export const TRACKS = [
  {
    src: "audio/bbib1.mp3",
    title: "BISERI SRBIJE PART 1",
    artist: "BOBAN MARKOVIC ORKESTAR",
    copyright: "BOBAN MARKOVIC ORKESTAR",
  },
  {
    src: "audio/bbib2.mp3",
    title: "BISERI SRBIJE PART 2",
    artist: "BOBAN MARKOVIC ORKESTAR",
    copyright: "BOBAN MARKOVIC ORKESTAR",
  },
];

// In-memory player + current track state.
let audio = null;
let currentTrackIndex = 0;
let isCurrentlyPlaying = false;
let positionMs = 0;
let durationMs = 0;
let loopEnabled = true;
let listeners = new Set();
let positionTimer = null;


function emit() {
  listeners.forEach((fn) => fn());
}

export function onPlayerChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPlayerState() {
  return {
    ready: !!audio,
    playing: isCurrentlyPlaying,
    trackIndex: currentTrackIndex,
    track: TRACKS[currentTrackIndex],
    positionMs,
    durationMs,
  };
}

/**
 * Whether looping is currently enabled (the playlist wraps around).
 * @returns {boolean}
 */
export function getLoopState() {
  return loopEnabled;
}

/**
 * Enable or disable looping. When disabled, playback stops at the end of the
 * last track instead of wrapping back to the first.
 * @param {boolean} enabled
 */
export function setLoopEnabled(enabled) {
  loopEnabled = !!enabled;
  emit();
}


// Lazily create the shared <audio> element and wire up its events. It is
// created on first use (when the guest enables the player) and reused for both
// tracks so playback is seamless.
function ensureAudio() {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = "metadata";

  audio.addEventListener("timeupdate", () => {
    positionMs = audio.currentTime * 1000;
    emit();
  });

  audio.addEventListener("loadedmetadata", () => {
    durationMs = (audio.duration || 0) * 1000;
    emit();
  });

  audio.addEventListener("play", () => {
    isCurrentlyPlaying = true;
    startPositionPolling();
    emit();
  });

  audio.addEventListener("pause", () => {
    isCurrentlyPlaying = false;
    stopPositionPolling();
    emit();
  });

  audio.addEventListener("ended", () => {
    // Auto-advance to the next track when one finishes. If looping is off and
    // we're on the last track, stop instead of wrapping around.
    if (loopEnabled || currentTrackIndex < TRACKS.length - 1) {
      nextTrack();
    } else {
      isCurrentlyPlaying = false;
      stopPositionPolling();
      emit();
    }
  });


  audio.addEventListener("error", () => {
    console.error("[stream] audio error", audio.error);
    isCurrentlyPlaying = false;
    stopPositionPolling();
    emit();
  });

  return audio;
}

// While playing, poll the current time ~4×/s so the progress bar and time
// display stay in sync even when the browser doesn't fire timeupdate often.
function startPositionPolling() {
  stopPositionPolling();
  positionTimer = setInterval(() => {
    if (!audio || audio.paused) return;
    positionMs = audio.currentTime * 1000;
    durationMs = (audio.duration || 0) * 1000;
    emit();
  }, 250);
}

function stopPositionPolling() {
  if (positionTimer) {
    clearInterval(positionTimer);
    positionTimer = null;
  }
}

/**
 * Start playback of the two tracks in order, beginning at the first track.
 */
export async function playTracks() {
  const el = ensureAudio();
  currentTrackIndex = 0;
  el.src = TRACKS[0].src;
  positionMs = 0;
  durationMs = 0;
  await el.play();
  emit();
}

/**
 * Stop playback entirely and reset to the first track. Used when the guest
 * disables the music player so audio stops immediately before the component
 * unmounts.
 */
export function stopPlayback() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
  }
  currentTrackIndex = 0;
  isCurrentlyPlaying = false;
  positionMs = 0;
  durationMs = 0;
  stopPositionPolling();
  emit();
}

/**
 * Toggle play/pause.
 */
export async function togglePlay() {

  const el = ensureAudio();
  if (el.paused) {
    // If no source is loaded yet, start from the first track.
    if (!el.src) {
      currentTrackIndex = 0;
      el.src = TRACKS[0].src;
    }
    await el.play();
  } else {
    el.pause();
  }
  emit();
}

/**
 * Skip to the next track in the queue (wraps to the first track).
 */
export async function nextTrack() {
  const el = ensureAudio();
  currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
  el.src = TRACKS[currentTrackIndex].src;
  positionMs = 0;
  durationMs = 0;
  await el.play();
  emit();
}

/**
 * Go back to the previous track in the queue (wraps to the last track).
 */
export async function previousTrack() {
  const el = ensureAudio();
  currentTrackIndex =
    (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
  el.src = TRACKS[currentTrackIndex].src;
  positionMs = 0;
  durationMs = 0;
  await el.play();
  emit();
}

/**
 * Seek to a specific position in the current track.
 * @param {number} ms position in milliseconds
 */
export async function seek(ms) {
  const el = ensureAudio();
  if (!el.src) return;
  el.currentTime = ms / 1000;
  positionMs = ms;
  emit();
}

/**
 * Fetch the current track's title + artist for the scrolling banner.
 * @returns {Promise<{title: string, artist: string}>}
 */
export async function fetchCurrentTrack() {
  return TRACKS[currentTrackIndex] || { title: "…", artist: "…" };
}
