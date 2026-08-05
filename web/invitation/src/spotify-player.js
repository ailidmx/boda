/**
 * Spotify Web Playback SDK + Web API integration for the ultra-thin Winamp
 * style player.
 *
 * Flow:
 *   1. The user is already authenticated to the invitation (Firebase Auth).
 *   2. We run the Spotify OAuth Authorization Code with PKCE flow to obtain an
 *      access token (no client secret needed — safe for a client-side SPA).
 *   3. We load the Web Playback SDK and create a Spotify.Player device.
 *   4. We use the Web API to start playback of the two curated tracks in order.
 *
 * The redirect URI is derived from the current origin at runtime, so it works
 * on production (https://boda-500805.web.app), staging
 * (https://boda-david-y-ayde.web.app) and local dev (https://localhost:5173,
 * served over HTTPS via Vite's basic-ssl plugin). All of these must be
 * registered in the Spotify Developer Dashboard as:
 *   https://boda-500805.web.app/spotify
 *   https://boda-david-y-ayde.web.app/spotify
 *   https://localhost:5173/spotify
 * Firebase Hosting rewrites that path to index.html, so the SPA handles the
 * `?code=` callback on the same page.
 *
 * IMPORTANT: The OAuth flow is intentionally NON-BLOCKING. We never navigate
 * away from the app automatically. Instead, `startSpotifyAuth()` is called
 * only when the user clicks the play button, and any failure is logged to the
 * console and surfaced as a non-fatal player error — the rest of the
 * invitation keeps working.
 */


const CLIENT_ID = "aa783b8507784cbdbf6ff0a4198ebc54";

// Derive the redirect URI from the current origin so it always matches the
// domain the guest is actually on (prod, staging or localhost). Falls back to
// the production URL when running outside a browser (e.g. SSR/tests).
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/spotify`
    : "https://boda-500805.web.app/spotify";


const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

// The two curated tracks, played in this order. The `id` is the Spotify track
// ID (used to fetch real title/artist metadata from the Web API). The `title`
// and `artist` fields are fallbacks used only if the API call fails.
export const TRACKS = [
  {
    id: "6Ye1gF9hGmdUBHrQCGs7QZ",
    uri: "spotify:track:6Ye1gF9hGmdUBHrQCGs7QZ",
    title: "Track 1",
    artist: "Artist 1",
  },
  {
    id: "3E0ghaDBd1vyrYHVQfO2yZ",
    uri: "spotify:track:3E0ghaDBd1vyrYHVQfO2yZ",
    title: "Track 2",
    artist: "Artist 2",
  },
];


const TOKEN_KEY = "boda-spotify-token";
const REFRESH_KEY = "boda-spotify-refresh";
const VERIFIER_KEY = "boda-spotify-verifier";


// In-memory player + current track state.
let player = null;
let accessToken = "";
let currentTrackIndex = 0;
let isCurrentlyPlaying = false;
let positionMs = 0;
let durationMs = 0;
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
    ready: !!player,
    playing: isCurrentlyPlaying,
    trackIndex: currentTrackIndex,
    track: TRACKS[currentTrackIndex],
    positionMs,
    durationMs,
  };
}

// While playing, poll the player's current state ~4×/s so the progress bar
// and time display stay in sync without relying solely on SDK events.
function startPositionPolling() {
  stopPositionPolling();
  positionTimer = setInterval(async () => {
    if (!player || !isCurrentlyPlaying) return;
    try {
      const state = await player.getCurrentState();
      if (state) {
        positionMs = state.position || 0;
        durationMs = state.duration || 0;
        emit();
      }
    } catch {
      // Ignore transient polling errors.
    }
  }, 250);
}

function stopPositionPolling() {
  if (positionTimer) {
    clearInterval(positionTimer);
    positionTimer = null;
  }
}




/* ── PKCE helpers ─────────────────────────────────────────────────────── */

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/* ── OAuth flow ───────────────────────────────────────────────────────── */

function buildAuthorizeUrl(challenge) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "boda-player",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}


async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token exchange failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (data.refresh_token) {
    window.localStorage.setItem(REFRESH_KEY, data.refresh_token);
  }
  return data.access_token;
}

/**
 * Refresh the access token using the stored refresh token (PKCE flow).
 * @returns {Promise<string>} the new access token
 */
async function refreshAccessToken() {
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  if (!refresh) throw new Error("No refresh token available");
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token refresh failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (data.access_token) {
    window.localStorage.setItem(TOKEN_KEY, data.access_token);
    accessToken = data.access_token;
  }
  if (data.refresh_token) {
    window.localStorage.setItem(REFRESH_KEY, data.refresh_token);
  }
  return data.access_token;
}


/**
 * Whether the guest already has a stored Spotify access token. Used by the UI
 * to decide whether to auto-connect or prompt the user to start the OAuth flow.
 * @returns {boolean}
 */
export function hasSpotifyToken() {
  return !!window.localStorage.getItem(TOKEN_KEY);
}

/**
 * Resolve a Spotify access token WITHOUT navigating away from the app.
 *
 * - If a token is already stored, return it immediately.
 * - If the URL carries a `?code=` (returning from Spotify's authorize page),
 *   exchange it for a token and store it.
 * - Otherwise return null — the caller should call `startSpotifyAuth()` when
 *   the user explicitly asks to connect (e.g. clicks the play button).
 *
 * This is intentionally NON-BLOCKING: it never redirects the page.
 * @returns {Promise<string|null>} the access token, or null if auth is needed
 */
export async function ensureSpotifyToken() {
  const stored = window.localStorage.getItem(TOKEN_KEY);
  if (stored) {
    accessToken = stored;
    return stored;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (code && state === "boda-player") {
    const verifier = window.localStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("Missing PKCE verifier");
    const token = await exchangeCode(code, verifier);
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.removeItem(VERIFIER_KEY);
    // Clean the URL so the code isn't left in the address bar.
    window.history.replaceState({}, document.title, window.location.pathname);
    accessToken = token;
    return token;
  }

  // No token and no callback → auth is needed. Do NOT navigate here; the UI
  // decides when to call startSpotifyAuth().
  return null;
}

/**
 * Start the Spotify OAuth flow in an INDEPENDENT popup window. The main app
 * window is never navigated away from — the guest stays on the invitation
 * while the popup handles the Spotify login. When the popup returns to our
 * redirect URI with a `?code=`, it exchanges the code, posts the token back to
 * the opener via `postMessage`, and closes itself.
 *
 * The main window listens for that message via `onAuthMessage()`.
 * @returns {Promise<void>}
 */
export async function startSpotifyAuth() {
  const verifier = generateVerifier();
  const challenge = await sha256(verifier);
  window.localStorage.setItem(VERIFIER_KEY, verifier);
  const url = buildAuthorizeUrl(challenge);
  console.log("[spotify] opening OAuth popup →", REDIRECT_URI);
  const w = 520;
  const h = 720;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  window.open(
    url,
    "spotify-auth",
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
}

/**
 * Handle the OAuth callback when it happens inside the popup window.
 *
 * The popup loads the same SPA at the redirect URI with a `?code=` query. This
 * function detects that scenario (a popup with a code), exchanges the code for
 * a token, posts the token to the opener window, and closes the popup.
 *
 * Call this early in the app bootstrap (before rendering) so the popup never
 * flashes the full invitation UI.
 * @returns {Promise<boolean>} true if this window handled an auth callback
 */
export async function handleAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const isPopup = !!window.opener && window.opener !== window;

  if (!isPopup || !code || state !== "boda-player") {
    return false;
  }

  try {
    const verifier = window.localStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("Missing PKCE verifier");
    const token = await exchangeCode(code, verifier);
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.removeItem(VERIFIER_KEY);
    accessToken = token;
    // Send the token back to the main window and close the popup.
    window.opener.postMessage(
      { type: "boda-spotify-auth", token },
      window.location.origin,
    );
    window.close();
  } catch (err) {
    console.error("[spotify] popup auth callback failed", err);
    window.opener.postMessage(
      { type: "boda-spotify-auth-error", message: err?.message || "Auth failed" },
      window.location.origin,
    );
    window.close();
  }
  return true;
}

/**
 * Subscribe to auth messages posted by the OAuth popup. Returns an unsubscribe
 * function. The callback receives the access token on success, or an error
 * object on failure.
 * @param {(token: string) => void} onSuccess
 * @param {(error: Error) => void} onError
 * @returns {() => void}
 */
export function onAuthMessage(onSuccess, onError) {
  const handler = (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "boda-spotify-auth") {
      accessToken = event.data.token;
      onSuccess(event.data.token);
    } else if (event.data?.type === "boda-spotify-auth-error") {
      onError(new Error(event.data.message || "Spotify auth failed"));
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}




/* ── Web Playback SDK ─────────────────────────────────────────────────── */

// The Spotify Web Playback SDK script calls `window.onSpotifyWebPlaybackSDKReady`
// as soon as it finishes loading. If that global is not defined at that moment,
// the SDK throws `AnthemError: onSpotifyWebPlaybackSDKReady is not defined`.
//
// To avoid that race, we define the global callback EARLY (at module load time)
// and have it resolve a promise. `createSpotifyPlayer()` awaits that promise
// before wiring up the actual player, so the SDK is always ready before we try
// to construct a Player.
let sdkReadyResolve;
let sdkReadyReject;
const sdkReadyPromise = new Promise((resolve, reject) => {
  sdkReadyResolve = resolve;
  sdkReadyReject = reject;
});

// Define the global callback immediately so the SDK never throws. It just
// resolves the promise; the actual player construction happens in
// `createSpotifyPlayer()` once the SDK is confirmed ready.
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log("[spotify] SDK ready");
  sdkReadyResolve();
};

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkReadyReject(new Error("Failed to load Spotify SDK"));
      reject(new Error("Failed to load Spotify SDK"));
    };
    document.head.appendChild(script);
  });
}

/**
 * Create the Spotify.Player device and wire up its event handlers.
 * @param {string} token
 * @returns {Promise<object>} the player instance
 */
export async function createSpotifyPlayer(token) {
  await loadSdk();
  // Wait for the SDK to signal it's ready (it calls onSpotifyWebPlaybackSDKReady).
  await sdkReadyPromise;

  return new Promise((resolve, reject) => {
    let settled = false;

    const p = new window.Spotify.Player({
      name: "Boda Winamp Player",
      getOAuthToken: (cb) => cb(token),
      volume: 0.8,
    });

    p.addListener("ready", ({ device_id }) => {
      console.log("[spotify] player ready", device_id);
      player = p;
      p._deviceId = device_id;
      if (!settled) {
        settled = true;
        resolve(p);
      }
      emit();
    });

    p.addListener("not_ready", ({ device_id }) => {
      console.warn("[spotify] device not ready", device_id);
    });

    p.addListener("player_state_changed", (state) => {
      if (state) {
        const idx = TRACKS.findIndex(
          (t) => t.uri === state.track_window?.current_track?.uri,
        );
        if (idx >= 0) currentTrackIndex = idx;
        isCurrentlyPlaying = state.paused === false;
        positionMs = state.position || 0;
        durationMs = state.duration || 0;
        // Start/stop the position polling loop based on playback state.
        if (isCurrentlyPlaying) {
          startPositionPolling();
        } else {
          stopPositionPolling();
        }
      }
      emit();
    });


    p.addListener("authentication_error", ({ message }) => {
      console.error("[spotify] auth error", message);
      if (!settled) {
        settled = true;
        reject(new Error(message));
      }
    });

    p.addListener("initialization_error", ({ message }) => {
      console.error("[spotify] init error", message);
      if (!settled) {
        settled = true;
        reject(new Error(message));
      }
    });

    p.addListener("account_error", ({ message }) => {
      console.error("[spotify] account error (Premium required)", message);
      if (!settled) {
        settled = true;
        reject(new Error("Spotify Premium is required"));
      }
    });

    p.connect().then((connected) => {
      if (!connected) {
        console.warn("[spotify] player failed to connect");
        if (!settled) {
          settled = true;
          reject(new Error("Failed to connect to Spotify"));
        }
      }
    });
  });
}


/* ── Playback control (Web API) ───────────────────────────────────────── */

async function api(path, options = {}, retried = false) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  // If the token expired (401), try to refresh it once and retry.
  if (res.status === 401 && !retried) {
    try {
      await refreshAccessToken();
      return api(path, options, true);
    } catch (error) {
      console.warn("[spotify] token refresh failed", error.message);
    }
  }
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Spotify API ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}


/**
 * Start playback of the two tracks in order on the player device.
 */
export async function playTracks() {
  if (!player?._deviceId) throw new Error("Player not ready");
  const uris = TRACKS.map((t) => t.uri);
  await api(`/me/player/play?device_id=${player._deviceId}`, {
    method: "PUT",
    body: JSON.stringify({ uris, offset: { position: 0 } }),
  });
  currentTrackIndex = 0;
  emit();
}

/**
 * Toggle play/pause. "Mute" in the UI maps to pause.
 */
export async function togglePlay() {
  if (!player) return;
  const state = await player.getCurrentState();
  const playing = state?.paused === false;
  if (playing) {
    await player.pause();
  } else {
    await player.resume();
  }
  emit();
}

/**
 * Whether the player is currently playing.
 */
export async function isPlaying() {
  if (!player) return false;
  const state = await player.getCurrentState();
  return state?.paused === false;
}

/**
 * Skip to the next track in the queue.
 */
export async function nextTrack() {
  if (!player) return;
  await player.nextTrack();
  emit();
}

/**
 * Go back to the previous track in the queue.
 */
export async function previousTrack() {
  if (!player) return;
  await player.previousTrack();
  emit();
}

/**
 * Seek to a specific position in the current track.
 * @param {number} ms position in milliseconds
 */
export async function seek(ms) {
  if (!player) return;
  await player.seek(ms);
  // Update immediately so the UI feels responsive.
  positionMs = ms;
  emit();
}



/**
 * Fetch a track's real title + artist from the Web API by its Spotify track ID.
 * This is more reliable than `/me/player/currently-playing`, which only returns
 * data while something is actively playing.
 * @param {string} trackId the Spotify track ID (e.g. "6Ye1gF9hGmdUBHrQCGs7QZ")
 * @returns {Promise<{title: string, artist: string}>}
 */
async function fetchTrackMeta(trackId) {
  if (!accessToken || !trackId) return null;
  try {
    const data = await api(`/tracks/${trackId}`);
    if (data?.name) {
      return {
        title: data.name,
        artist: (data.artists || []).map((a) => a.name).join(", "),
      };
    }
  } catch (error) {
    console.warn("[spotify] could not fetch track metadata", error.message);
  }
  return null;
}

/**
 * Fetch the current track's title + artist from the Web API (used to populate
 * the scrolling banner with real metadata).
 *
 * Strategy:
 *   1. Try the `/tracks/{id}` endpoint using the known track ID — this works
 *      even before playback starts.
 *   2. Fall back to `/me/player/currently-playing` (only returns data while
 *      actively playing).
 *   3. Fall back to the placeholder in TRACKS.
 * @returns {Promise<{title: string, artist: string}>}
 */
export async function fetchCurrentTrack() {
  const track = TRACKS[currentTrackIndex];

  // 1. Fetch by track ID (most reliable).
  const byId = await fetchTrackMeta(track?.id);
  if (byId) return byId;

  // 2. Try the currently-playing endpoint.
  if (accessToken) {
    try {
      const data = await api("/me/player/currently-playing");
      if (data?.item) {
        return {
          title: data.item.name,
          artist: (data.item.artists || []).map((a) => a.name).join(", "),
        };
      }
    } catch (error) {
      console.warn("[spotify] could not fetch currently-playing", error.message);
    }
  }

  // 3. Fall back to the placeholder.
  return track || { title: "…", artist: "…" };
}


