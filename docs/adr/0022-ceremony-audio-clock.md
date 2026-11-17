# ADR-0022: Audio-synced ceremony player (browser-local audio as the clock)

- **Status:** Proposed
- **Date:** 2026-11-15
- **Branch:** `feat/admin-ceremonia-player`

## Context

PR #130 added an admin-only `/dashboard/ceremonia` tab with a provisional
two-spiral animation. The prototype advanced its own time with
`requestAnimationFrame` and a "speed" multiplier (×1…×30), so the drawing had no
relation to the real track: pausing, seeking or changing the rate made the
choreography drift, and the "encuentros" were fractions of an invented timeline.

The couple wants to rehearse the ceremony against the **actual song**
(Boban Marković Orkestar, "Intro / Cororo / Branjski Cicek / Nikolin Cocek",
*Live in Belgrade*). The reference 01:44 (104 s) was supplied by the user; its
musical meaning is **not** established.

Constraints:

- The track is copyrighted. Neither the repository nor Firebase Hosting may
  contain it, and the app must not download it from Spotify/YouTube.
- The dashboard is vanilla JS + Vite with no component-test harness (ADR-0019)
  and no new dependencies (AGENTS §7.8).
- Persistence must not pretend to be cross-device.

## Decision

1. **The admin imports a local audio file** (MP3/WAV/M4A/AAC/OGG/WebM, ≤ 48 MB)
   through a file input. It is stored in **IndexedDB**
   (`web/dashboard/src/ceremonia/audioStore.js`) and played through an
   `<audio>` element with an object URL. Nothing is uploaded, committed or
   exported as audio.
2. **`audio.currentTime` is the single source of truth.** Each frame reads it and
   derives both dancers' normalized progress with pure functions; there is no
   independent animation clock while audio is loaded. Seek/pause/rate changes are
   applied to the element only. A clearly-labelled synthetic clock remains as a
   fallback for rehearsal without audio.
3. **Choreography is a versioned schema** (`ceremonia/schema.js`, currently v4),
   sanitized on every read/write, with v1 (`duration`/`turns`/`speed`/`meetings`
   fractions) migrated to cues in seconds, a one-time v2 → v3 migration that
   drops the placeholder 10:30 timeline and Aydé's artificial 8 % hold, and a
   v3 → v4 migration that replaces constant-angle default timelines with the
   uniform walk. Cues, keyframes and settings live in `localStorage`; **audio
   never does**.
4. **Meetings are provisional suggestions**, computed as "both dancers within a
   tolerance at the same time" (`ceremonia/motion.js`). A path crossing is not a
   meeting; a human must promote a suggestion to a cue.
5. **01:44 ships as an editable `user-reference` cue**, explicitly pending
   interpretation.
6. **A local ffmpeg helper** (`npm run audio:extract`) converts a file the couple
   already owns into `tmp/ceremony-audio/` (gitignored) and refuses to write
   inside `web/`, so a copyrighted track cannot leak into a deploy.
7. **The walk is arc-length parametrized (constant linear speed).** A constant
   angle per second makes the dancers crawl as the caracol shrinks (`v = ω·r`),
   so the default timeline is `uniformSpeedKeyframes`: equal time slices cover
   equal distance, and the angular speed rises near the center like a planet on
   an eccentric orbit. The panel stores it as ordinary keyframes, so a human can
   still choreograph something else.
8. **Self-rotation and emoji heads.** Each dancer is an emoji head (🤵🏽 / 👰🏽)
   inside its own rotation group, with a small marker so the spin is visible;
   the head spins one turn per body circumference walked (`spinDegrees`), i.e.
   it rolls without slipping. The name label stays outside the rotation.
9. **Real scale is data, not pixels.** `stage.radiusMeters` (the measured El Faro
   circle is 10 m across → **5 m**) converts the path to meters;
   `stage.targetSpeedMps` feeds `solveTurnsForSpeed`, and `stage.walkSeconds`
   (default **270 s**) is the walk window — a ~96 m caracol cannot fill 11:44 at
   a human pace, so the dancers hold at the centre afterwards.

## Consequences

- The player is useful only after the admin imports their own file; that is
  intentional and stated in the UI.
- Storage is per browser and per device. The JSON export (v2) is the backup
  mechanism; there is no cross-device sync, and none is implied.
- Waveform/beat analysis is **not** implemented: `decodeAudioData` on a
  10-minute stereo track costs hundreds of MB, and no offline tooling is bundled.
  Detections, when added, must be presented as pending suggestions.
- The pure modules are covered by `web/dashboard/tests/ceremonia.test.mjs`
  (interpolation, easing, spiral geometry, meeting detection, migration,
  round-trip); the DOM wiring stays untested, consistent with ADR-0019.
- `renderCeremoniaPlayer(host)` keeps its one-argument signature, so
  `dashboard.js` needed no change beyond the panel that PR #130 already added.
