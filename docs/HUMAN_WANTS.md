# HUMAN_WANTS.md — Pending requests & ideas

> **Purpose:** This is the living backlog of things the human wants built or
> changed. It is kept ordered, structured and up-to-date so any AI (or the
> human) can pick the next task and run with it.
>
> **How to use:** Each entry has a status. When a task is done, mark it
> `[x]` (or move it to the "Done" section). When starting a task, move it to
> the top of "In progress". Keep the list tidy — one idea per bullet, clear
> scope, no rambling.

---

## Legend

- `[ ]` — Not started (available to pick up)
- `[~]` — In progress
- `[x]` — Done

---

## 🔴 Urgent / Quick fixes

*(none pending)*

---

## ✨ New features

### [ ] Guest Flight Information / Airport Autocomplete (V1)

Build an elegant way for guests to tell us how they are traveling to
**Guadalajara (GDL)** and when they will arrive. This is **not** a
flight-booking/tracking system — just a clean arrival-information form.

**Full spec:** see `docs/flight-info-spec.md` (kept as a separate doc so this
backlog stays scannable). Summary of the key requirements:

- **Airport database:** free **OurAirports** dataset (no paid/keyed API for V1).
  Import/cache locally via a build/import script that filters, normalizes and
  produces a lightweight JSON index optimized for autocomplete. Keep IATA, ICAO,
  name, city, country, country code, lat/lon, type, scheduled-service flag.
  Prioritize IATA + scheduled-service commercial airports (no tiny airstrips).
- **Reusable `AirportAutocomplete` component:** search by city (`Paris`), IATA
  (`CDG`), name (`Charles de Gaulle`), or partial strings. Case- and
  accent-insensitive, fast, keyboard-accessible, mobile-friendly. Rank exact
  IATA matches first. Display like `Paris — Charles de Gaulle Airport (CDG) · France`.
  Store structured identifiers (IATA), not just display text.
- **Flight journey:** destination is fixed to **GDL**. Guest picks a departure
  airport, then `+ Add connection` (up to **3** connections, removable).
  Example: `LYS → CDG → MEX → GDL`. Guest never chooses GDL manually.
- **Flight numbers:** optional per leg (e.g. `AF 7365`). No validation in V1;
  never reject the form for an unverifiable flight number.
- **Arrival in Guadalajara 🇲🇽:** clearly-identified final section collecting
  arrival date, expected arrival time, and optional final flight number.
  **Arrival date + time are required** for plane travelers. Mobile-friendly.
- **Progressive disclosure:** start with `How are you coming to Guadalajara?`;
  reveal the flight UI only when "Plane" is selected; keep visible fields minimal.
- **Data model:** adapt to existing architecture (no parallel model). Conceptually
  `Airport`, `FlightLeg`, `GuestFlightInfo` (origin, connections, destination=GDL,
  legs, arrivalDate, arrivalTime, finalFlightNumber).
- **Validation:** prevent invalid routes (`CDG → CDG`, repeated consecutive
  airports), max 3 connections, arrival date/time required for plane travelers.
  Inline errors in the site's language/style.
- **Accessibility:** proper combobox semantics (arrow keys, Enter, Escape, focus
  management, `aria-expanded`, `aria-controls`, `aria-activedescendant`).
- **No flight API for V1** (no Aviationstack/FlightAware/Amadeus). Design so
  flight verification can be added later without rewriting the travel model.
- **Deliverables:** import/update mechanism, optimized dataset, reusable
  autocomplete, origin + 0–3 connections, fixed GDL, optional flight numbers,
  arrival date/time, validation, mobile UI, accessibility, persistence via the
  existing guest data architecture, and docs on refreshing the airport dataset.
- **Test at least:** `CDG`, `Paris`, `Charles`, `LYS`, `MEX`, `GDL`,
  `Lyon → GDL`, `LYS → CDG → MEX → GDL`, a 3-connection route, add/remove
  connections, keyboard-only selection, mobile layout, submission without flight
  numbers.

### [ ] Plan new `_rvsp.*` columns in the Google Sheet guests

Add new `_rvsp.*` columns to the "Invitados" sheet so we can retrieve responses
from Firestore with the existing "get answers" script
(`scripts/sync-rsvp-responses.mjs`). Plan the column mapping (questionId →
`_rvsp.*` column) and wire it into the sync script.

---

## 🎨 Design / UI

- [ ] **Full-load architecture with a cinematic intro** — reconsider the lazy
      section-loading architecture. The invitation has a lot of content; the
      idea is to load everything up front so navigation becomes completely
      fluid, and mask the wait with a very cool lighting/transition effect.
      Open question for the human: is this a good idea? (Trade-off: initial
      load time vs. instant section navigation.)

---

## 🤖 CI / Deploy / Notifications

*(none pending)*

---

## 📊 Analytics

- [ ] **E-commerce-style funnel analytics** — treat hosting / extra hosting /
      player parts as "items added to cart" (they have a sale price and an
      original price). Consider the "sale" done when the user confirms all
      responses, but also track differently those who answer positively to the
      Friday / Saturday / Sunday questions.
  - Track time spent on each section of the invitation to know which is the
    most attractive.
  - Every click is clearly identified and logged in analytics, easily handled
    by a report so we can see exactly what's happening at a very detailed scale.

---

## 🔌 Google Sheets / Gmail integrations

*(none pending)*

---

## ✅ Done

- [x] **Song-request band-type selector (`bandType`)** — the "Pide tu canción"
      section now shows a band-type selector (marimba / mariachi / norteño /
      frenchBand) only when the guest picks the "live band" intent. Wired
      `bandType` through `payload-builders.js`, `validation.js`,
      `firestore.rules`, `song-requests.js`, `content.js` (es/fr/en), and
      `SongRequest.jsx` + `song-request.css`. 35 unit + 39 rules tests pass;
      build passes; **rules deployed to production** (fixes the CANT SAVE issue).
- [x] **VUELOS section background fixed to "Vol de nuit / Ciel étoilé"** — the
      optional Vuelos (Travel) section now always uses the night-flight / starry
      sky background (`travel-bg--ciel`). The temporary background selector
      ("Choisis l'ambiance de ton voyage") was removed and hidden; the section
      no longer offers a choice and always renders the chosen mood.
- [x] **Google Sheets script — RSVP responses** — `scripts/sync-rsvp-responses.mjs`
      reads LIVE RSVP answers from Firestore (each guest's `rsvp.answers` map,
      questionId → scale 0–5) and fills the `_rvsp.*` columns in the "Invitados"
      sheet tab. Rows matched by `UID`. Dry-run by default; `--execute` to write.
      Verified: 262 guests matched, 0 unmatched.
- [x] **Gmail API script — invitation emails** —
      `integraciones/google_sheets/invitation_emails.gs` sends a personalised
      invitation email to each guest in their language (es/fr/en), triggered from
      a button in Google Sheets. Uses the guest's **profile code** (Base64URL),
      sends from `bodadavidyayde@gmail.com` with CC to the couple, marks `sent`.
      Setup in `integraciones/google_sheets/README_invitation_emails.md`.
- [x] **Telegram notification on every production deploy** — the GitHub Actions
      deploy workflow (`.github/workflows/deploy-invitation.yml`) sends a French
      Telegram message after every production deploy (push to `master` or
      `workflow_dispatch`), with status, branch, commit, actor, run link, and PR
      title/description. Uses `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` secrets.
      **Note:** from now on, PRs must be written in **French**.
- [x] **Version visible in the app footer** — the footer shows the current
      build/version number as a tiny line under the footer meta (reads
      `__BUILD_NUMBER__` injected by `vite.config.js`; production only).
- [x] **Interactive song-request section (next to Music)** — guests can add
      songs to the playlist with an intent (hear / sing Cabrio / karaoke / live
      band). MusicBrainz autocomplete (debounced, cached, deduped), stored in
      Firestore `song_requests`, trilingual copy, dashboard-readable. Unit tests
      in `tests/song-search.test.mjs` (14 pass).
- [x] **Piquant note as a FAB-activated modal** — the "À propos du piquant" note
      in Guisos opens in a modal via a floating action button (🌶️ + label).
- [x] **Programme détaillée background theme selector** — the detailed programme
      section lets guests choose between **papel picado** bunting and the
      **prehispanic** parchment motif (pill group under the heading, trilingual).
- [x] **"À propos" (About) modal — center + enlarge on desktop** — opens centered
      and wide (`width: min(64rem, 100%)`); feature text wraps cleanly.
- [x] **Force food card logos to be squared** — the Doña Carmen badge is now a
      rounded square instead of a circle, matching the music card logos.
- [x] **Music section — autoplay stream + FAB toggle** — the stream autoplays on
      scroll into the section; a FAB toggles it off/on (animated equalizer bars).
- [x] **Guisos reorder panel — pre-sort by star ratings + drag & drop** — opens
      pre-sorted by the guest's own ratings; drag & drop or up/down arrows.
- [x] **Check i18n for all vote features** (Music, Food, Guisos) — added the
      missing English `vote` block and fixed `StarVote.jsx` to read
      `t?.food?.vote` so all three languages work.
- [x] **Deploy Firestore rules** so guisos can be saved and reordered correctly —
      `guiso_rankings` rules validated (39 rules tests pass) and deployed to the
      live database `boda-us-central1`.
