/**
 * Ceremonia Player — versioned choreography schema.
 *
 * Pure module: no DOM, no storage, no network. It is imported by the dashboard
 * panel AND by the Node unit tests, so every value that reaches the UI or the
 * exported JSON goes through `sanitizeChoreography`.
 *
 * Audio is NOT part of this schema: the imported file lives in IndexedDB
 * (see `./audioStore.js`). Only metadata/cues/keyframes are stored here, so an
 * exported JSON never contains music.
 */

export const SCHEMA_VERSION = 2;

/** Fallback timeline length when there is no audio file yet (seconds = 11:43). */
export const DEFAULT_DURATION = 703;

/** Spiral density (turns per caracol). Geometry, not a playback speed. */
export const DEFAULT_TURNS = 5.8;

/** The user-provided reference marker: 01:44. Its musical meaning is unknown. */
export const USER_REFERENCE_SEC = 104;

/** v2 shipped this artificial hold before Aydé started moving (8% of the track). */
const LEGACY_AYDE_HOLD = 0.08;

export const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut"];
export const CUE_KINDS = ["cue", "user-reference", "suggested"];

export const LIMITS = {
  cues: 200,
  keyframes: 50,
  label: 80,
  duration: 3 * 60 * 60,
  rate: [0.5, 1.5],
  tolerance: [4, 60],
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, LIMITS.label);
}

/** Two keyframes: 0 → 1, so a dancer still moves when no audio is loaded. */
export function defaultKeyframes(duration = DEFAULT_DURATION, delay = 0) {
  const end = clamp(finite(duration, DEFAULT_DURATION), 1, LIMITS.duration);
  const start = clamp(delay, 0, end);
  const frames = [{ t: 0, p: 0, ease: "linear" }];
  // A real hold only when the caller asks for one; a 0 delay must not create a
  // duplicate keyframe at t=0 (that made Aydé look frozen in v2).
  if (start > 0.01) frames.push({ t: start, p: 0, ease: "easeInOut" });
  frames.push({ t: end, p: 1, ease: "easeOut" });
  return frames;
}

export function defaultCues() {
  return [
    {
      id: "user-reference-104",
      t: USER_REFERENCE_SEC,
      label: "Referencia del usuario · 01:44 — pendiente de interpretar",
      kind: "user-reference",
    },
  ];
}

export function createDefaults(duration = DEFAULT_DURATION) {
  return {
    version: SCHEMA_VERSION,
    track: {
      artist: "Boban Marković Orkestar",
      title: "Intro / Cororo / Branjski Cicek / Nikolin Cocek",
      album: "Live in Belgrade",
      url: "https://open.spotify.com/track/4nnctBoCCv2K2ydb9ZIgjb",
      referenceSec: USER_REFERENCE_SEC,
    },
    duration,
    turns: DEFAULT_TURNS,
    dancers: {
      david: { keyframes: defaultKeyframes(duration, 0) },
      ayde: { keyframes: defaultKeyframes(duration, 0) },
    },
    cues: defaultCues(),
    settings: { rate: 1, loop: false, tolerancePx: 14 },
  };
}

function sanitizeCue(raw, duration, index) {
  if (!raw || typeof raw !== "object") return null;
  const t = finite(raw.t, NaN);
  if (!Number.isFinite(t)) return null;
  const kind = CUE_KINDS.includes(raw.kind) ? raw.kind : "cue";
  const label = cleanText(raw.label, `Cue ${index + 1}`);
  if (!label) return null;
  const id = cleanText(raw.id, `cue-${index + 1}`).replace(/\s+/g, "-");
  return {
    id,
    t: Math.round(clamp(t, 0, duration) * 100) / 100,
    label,
    kind,
  };
}

function sanitizeKeyframes(raw, duration, fallback) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const t = finite(item.t, NaN);
    const p = finite(item.p, NaN);
    if (!Number.isFinite(t) || !Number.isFinite(p)) continue;
    seen.push({
      t: Math.round(clamp(t, 0, duration) * 100) / 100,
      p: Math.round(clamp(p, 0, 1) * 1000) / 1000,
      ease: EASINGS.includes(item.ease) ? item.ease : "linear",
    });
    if (seen.length >= LIMITS.keyframes) break;
  }
  if (!seen.length) return fallback;
  seen.sort((a, b) => a.t - b.t);
  return seen;
}

/**
 * v2 shipped an artificial 8 % hold on Aydé's timeline, which made her look
 * frozen for the first ~56 s of an 11:43 track. Recognise that exact default
 * and replace it with the neutral one (both dancers start together).
 */
function isLegacyAydeHold(keyframes, duration) {
  if (!Array.isArray(keyframes) || keyframes.length !== 3) return false;
  const [first, hold, last] = keyframes;
  const expected = Math.round(duration * LEGACY_AYDE_HOLD * 100) / 100;
  return (
    first?.t === 0 &&
    first?.p === 0 &&
    Math.abs(hold?.t - expected) <= 0.06 &&
    hold?.p === 0 &&
    Math.abs(last?.t - duration) <= 0.06 &&
    last?.p === 1
  );
}

/**
 * Accepts ANY stored/imported payload (v1, v2, garbage) and returns a valid v2
 * choreography. Never throws, never returns null.
 */
export function sanitizeChoreography(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const duration = clamp(
    finite(source.duration, DEFAULT_DURATION),
    1,
    LIMITS.duration,
  );
  const defaults = createDefaults(duration);

  const trackSource =
    source.track && typeof source.track === "object" ? source.track : {};
  const settingsSource =
    source.settings && typeof source.settings === "object" ? source.settings : {};
  const dancersSource =
    source.dancers && typeof source.dancers === "object" ? source.dancers : {};

  const aydeSource = dancersSource.ayde?.keyframes;
  const aydeKeyframes = isLegacyAydeHold(aydeSource, duration)
    ? defaultKeyframes(duration, 0)
    : sanitizeKeyframes(aydeSource, duration, defaultKeyframes(duration, 0));

  const cuesSource = Array.isArray(source.cues)
    ? source.cues
    : migrateV1Meetings(source);
  const cues = [];
  for (const [index, cue] of cuesSource.entries()) {
    if (cues.length >= LIMITS.cues) break;
    const clean = sanitizeCue(cue, duration, index);
    if (clean && !cues.some((c) => c.id === clean.id)) cues.push(clean);
  }
  if (!cues.length) cues.push(...defaultCues());

  return {
    version: SCHEMA_VERSION,
    track: {
      artist: cleanText(trackSource.artist, defaults.track.artist),
      title: cleanText(trackSource.title, defaults.track.title),
      album: cleanText(trackSource.album, defaults.track.album),
      url: cleanText(trackSource.url, defaults.track.url),
      referenceSec: clamp(
        finite(trackSource.referenceSec, USER_REFERENCE_SEC),
        0,
        duration,
      ),
    },
    duration,
    turns: clamp(finite(source.turns, DEFAULT_TURNS), 1, 20),
    dancers: {
      david: {
        keyframes: sanitizeKeyframes(
          dancersSource.david?.keyframes,
          duration,
          defaultKeyframes(duration, 0),
        ),
      },
      ayde: {
        keyframes: aydeKeyframes,
      },
    },
    cues,
    settings: {
      rate: clamp(
        finite(settingsSource.rate, 1),
        Math.max(0.25, LIMITS.rate[0]),
        Math.min(4, LIMITS.rate[1]),
      ),
      loop: Boolean(settingsSource.loop),
      tolerancePx: clamp(
        finite(settingsSource.tolerancePx, 14),
        LIMITS.tolerance[0],
        LIMITS.tolerance[1],
      ),
    },
  };
}

/**
 * v1 stored `meetings` as normalized progress fractions (0..1) with no audio
 * clock. Map them to cues in seconds and mark them as migrated so nothing is
 * presented as a verified meeting.
 */
export function migrateV1Meetings(raw) {
  const fraction = Array.isArray(raw?.meetings) ? raw.meetings : [];
  const duration = clamp(
    finite(raw?.duration, DEFAULT_DURATION),
    1,
    LIMITS.duration,
  );
  return fraction
    .filter((value) => typeof value === "number" && value >= 0 && value <= 1)
    .slice(0, LIMITS.cues)
    .map((value, index) => ({
      id: `hito-migrado-${index + 1}`,
      t: Math.round(value * duration * 100) / 100,
      label: `Hito migrado (v1) · ${Math.round(value * 100)} %`,
      kind: "cue",
    }));
}

/** Plain JSON for export/download — no Blob, no functions, no audio. */
export function serializeChoreography(state) {
  return JSON.stringify(sanitizeChoreography(state), null, 2);
}

/**
 * Change the timeline length while keeping the choreography's shape.
 *
 * Keyframe times scale proportionally (the relative rhythm survives), cues keep
 * their absolute time but are clamped to the new end, and the user reference
 * cannot end up past the end. Used both by the "Duración total" field and when
 * the imported audio reports its real length.
 */
export function rescaleChoreography(state, nextDuration) {
  const clean = sanitizeChoreography(state);
  const next =
    Math.round(clamp(finite(nextDuration, clean.duration), 1, LIMITS.duration) * 100) /
    100;
  const ratio = next / clean.duration;
  const scale = (keyframes) =>
    keyframes.map((keyframe) => ({
      ...keyframe,
      t: Math.round(keyframe.t * ratio * 100) / 100,
    }));

  return sanitizeChoreography({
    ...clean,
    duration: next,
    dancers: {
      david: { keyframes: scale(clean.dancers.david.keyframes) },
      ayde: { keyframes: scale(clean.dancers.ayde.keyframes) },
    },
    cues: clean.cues.map((cue) => ({ ...cue, t: Math.min(cue.t, next) })),
    track: {
      ...clean.track,
      referenceSec: Math.min(clean.track.referenceSec, next),
    },
  });
}

/** `${minutes}:${seconds}`; the ceremony is minutes long, never hours. */
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(finite(seconds, 0)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

