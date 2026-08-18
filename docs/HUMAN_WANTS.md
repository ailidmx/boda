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

### [x] Guest Flight Information / Airport Autocomplete (V1)

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

### [x] Plan new `_rvsp.*` columns in the Google Sheet guests

Done via `scripts/sync-rsvp-responses.mjs`, which reads LIVE RSVP answers from
Firestore (`rsvp.answers`, questionId → scale 0–5) and fills the `_rvsp.*`
columns in the "Invitados" tab (matched by `UID`). Column mapping:
`_rvsp.friday`, `_rvsp.saturday`, `_rvsp.sunday`, `_rvsp.confirmCabin`,
`_rvsp.cabinWaitingList`, `_rvsp.xtra`, `_rvsp.playa`, `_rvsp.petanca`,
`_rvsp.needBalls`. Verified: 262 guests matched, 0 unmatched.

---

## 🎨 Design / UI

- [x] **Full-load architecture with a cinematic Matrix intro** — replaced the
      lazy section-loading architecture with a full-load one: every section is
      now statically imported and mounted up front (see `App.jsx`), so once the
      guest is signed in the whole invitation is available instantly and
      navigation is completely fluid. The wait is masked by a cinematic
      **Matrix-style loader** (`MatrixLoader.jsx` + `FullLoadGate.jsx` +
      `styles/matrix-loader.css`): a canvas draws digital rain whose characters
      are modulated by the base portrait's luminance (sampled once), so the
      couple's face is "reconstructed" out of streaming code as loading
      progresses. It shows a real percentage (driven by preloading the hero
      images) plus a live "MB de amour" counter (actual bytes transferred from
      `performance` resource entries). On completion it runs a reveal sequence
      (rain accelerates → brief glitch → green collapses → full-color portrait,
      ~900ms). Base image: `matrix_bbs1p1` (Cloudinary account root). ~30fps,
      pauses when the tab is hidden, respects `prefers-reduced-motion`.
      Production build passes.


---

## 🤖 CI / Deploy / Notifications

*(none pending)*

---

## 📊 Analytics

- [x] **E-commerce-style funnel analytics** — treat hosting / extra hosting /
      player parts as "items added to cart" (they have a sale price and an
      original price). Consider the "sale" done when the user confirms all
      responses, but also track differently those who answer positively to the
      Friday / Saturday / Sunday questions.
  - **Done (part 1):** added `web/invitation/src/analytics.js` — a thin, safe
    wrapper around the already-initialized Firebase Analytics instance
    (`firebase.js`, measurementId `G-ZDQX91613Z`). Exposes `trackEvent`,
    `trackFunnelStep`, `trackCartItem`, `trackPurchase`, `trackSectionTime`,
    `trackClick`, and the pure `buildStayCartItems` helper. All helpers are
    no-ops when Analytics is unavailable (safe in Node/tests).
  - **Done (part 1):** wired the RSVP funnel into `RSVP.jsx`. When the "À payer"
    block renders, it logs a `view_cart` funnel step plus an `add_to_cart`
    event per priced stay item (primary cabin + extra cabin, with `price` and
    `original_price`). On the final submit success it logs a `purchase` event
    with the total the guest commits to paying. Cart items are built by the
    shared `buildStayCartItems` helper. 5 new unit tests
    (`tests/analytics.test.mjs`, wired into `npm test`); build passes.
  - **Done (part 2): section-time tracking** — added `hooks/useSectionTime.js`
    (IntersectionObserver-based) and wired it into `LazySection`, so every
    section logs a `section_time` event (seconds in view) when it leaves the
    viewport and on page hide / tab switch. Works automatically for all
    sections (they all render through `LazySection`).
  - **Done (part 2): click tracking** — added `hooks/useClickTracking.js`
    (delegated `document` click listener) wired into `Invitation` (App.jsx).
    Every click is logged via `trackClick` with a stable identifier resolved
    from `data-analytics` → element `id` → `tag.class.text`, plus the enclosing
    section id as context. `resolveClickId` is unit-tested.
  - **Done (part 3): report script** — added `scripts/analytics-funnel-report.mjs`
    (npm script `analytics:report`). It queries the GA4 Data API and writes
    `reports/analytics-funnel-report.md` with the funnel overview
    (`view_cart` / `add_to_cart` / `purchase`), time spent per section
    (`section_time`), and clicks per element (`click`). It no-ops with clear
    setup instructions until `GA4_PROPERTY_ID` + `GOOGLE_APPLICATION_CREDENTIALS`
    are provided (and `@google-analytics/data` installed), so it is CI-safe.
  - Track time spent on each section of the invitation to know which is the
    most attractive.
  - Every click is clearly identified and logged in analytics, easily handled
    by a report so we can see exactly what's happening at a very detailed scale.

---

## 🔌 Google Sheets / Gmail integrations

*(none pending)*

---

## ✅ Done

- [x] **Guest Flight Information / Airport Autocomplete (V1)** — guests who fly
      in can record their journey to Guadalajara (GDL) inside the Travel section.
      Built a reusable `AirportAutocomplete` (combobox semantics, keyboard
      accessible, accent-insensitive search by city/IATA/name, exact-IATA ranked
      first) backed by a locally-cached **OurAirports** dataset
      (`scripts/import-ourairports.mjs` → `web/invitation/src/data/airports.json`).
      The `FlightInfo` form collects origin + 0–3 connections (removable), optional
      per-leg flight numbers, and required arrival date/time + optional final
      flight number. Persisted via the existing guest architecture
      (`flightInfo` field on the guest doc; `buildFlightInfoPayload` in
      `payload-builders.js`, `validateGuestContactPayload` in `validation.js`,
      `firestore.rules` allow it). Trilingual copy (es/fr/en) in `content.js`,
      styles in `flight-info.css` (imported in `main.jsx`). 8 new validation
      tests (43 total pass); production build passes.
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
- [x] **Programme détaillée background fixed to papel picado (selector removed)** —
      the detailed programme section now ALWAYS uses the colourful **papel
      picado** bunting background. The guest-facing background theme selector
      (papel picado vs. prehispanic parchment) was removed from `Weekend.jsx`;
      the theme is hardcoded to `"picado"` (`MEDIA.picado`). The parchment /
      prehispanic motif is no longer offered.

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
- [x] **Fix guiso_rankings write permission error (`.all()` rules bug)** — the
      `hasValidGuisoRankingFields` function used the Firestore rules list method
      `.all()` (plus `.distinct()` and `.hasAny()`), which the rules engine
      rejects with `Function not found error: Name: [all]`. This caused EVERY
      `guiso_rankings` write to fail with PERMISSION_DENIED (the "CANT SAVE"
      issue), even though the rules had been "deployed". Rewrote the function to
      validate array sizes/types only (the client-side
      `validateGuisoRankingPayload` still enforces the strict per-element rules).
      Also removed the same `.all()` calls from the flightInfo rules
      (`hasValidFlightInfo` / `hasValidDeparture`). Verified: the repro test
      (serverTimestamp write) now succeeds, and all 39 rules tests still pass.
      **Deployed to production** (`boda-500805`, ruleset
      `401332d2-1408-4376-b0df-dce304bcfd8a`, released to
      `cloud.firestore/boda-us-central1` on 2026-08-15). Guiso rankings can now
      be saved and reordered correctly.

- [x] **Desktop hamburger side drawer (multi-column)** — the desktop nav bar
      now always shows a hamburger button on its LEFT (the horizontal menu bar
      is kept as-is). Clicking it opens an elegant, transparent side drawer
      that slides in from the left with the full nav list laid out in CSS
      columns (`column-width: 12rem`): if the links exceed the viewport height
      they flow into additional columns instead of scrolling. Desktop only —
      the button lives inside `.desktop-nav-wrap`, which is hidden below the
      tablet breakpoint (mobile keeps its existing split dropdowns). Closes on
      link click, Escape, the ✕ button, or clicking the backdrop; body scroll
      is locked while open. Implemented in `Nav.jsx` (`SideDrawer` component)
      + `nav.css` (`.side-drawer__*`). Production build passes.

- [x] **Deduplicate existing `card_votes`** — a single guest's star vote on a
      card can show as 2 votes. The code + rules are correct (deterministic doc
      ID `${cardType}_${cardKey}_${guestId}` + `voteId == ...auth.uid` means one
      guest can only ever have one vote doc per card), so the duplicate is
      almost certainly stale data created before the doc-ID enforcement was
      added. Write a cleanup script to find and merge/remove duplicate
      `card_votes` docs for the same (cardType, cardKey, guestId).
  - **Done:** added `scripts/cleanup-card-votes-duplicates.mjs` (dry-run by
    default, `--execute` to apply). It groups all `card_votes` docs by
    (cardType, cardKey, guestId), reports any group with >1 doc, and in
    `--execute` mode deletes the extra docs (keeping the deterministic-ID doc,
    falling back to the most recently updated). **Verified on production: the
    live `card_votes` collection has 52 docs, all unique by
    (cardType, cardKey, guestId), and every doc ID matches the deterministic
    pattern — 0 duplicates.** The read/aggregation logic in `StarVote.jsx` and
    `Guisos.jsx` counts docs directly, so with clean data the "2 votes" display
    cannot occur. The script remains as a safety net if duplicates ever
    reappear.





      --- HUMAN WANTS MORE : About the load all is once istead of lazy loading but have. a very very very cool leading state before to show it all

      Here it goes this is our base image
      matrix_bbs1p1

      but here comes the cool part with the effects and the loading bar in real percentage and Megabytes of love to load 

Yes — absolutely. And JavaScript/Canvas is probably the right way to make it a loading state.

The trick is not to animate the generated image itself. Keep the original photo (or a green-treated version) underneath, then animate digital rain + scanlines + glitch + reveal masking on top of it.

A clean structure would be:

<div class="matrix-loader">
  <img src="/photo.jpg" class="portrait" />
  <canvas class="matrix-canvas"></canvas>


  <div class="loading-label">
    Loading...
  </div>
</div>

Then Canvas continuously draws falling characters. You can make the portrait become more or less visible depending on loading progress:

setMatrixProgress(0.15);
setMatrixProgress(0.50);
setMatrixProgress(0.85);
setMatrixProgress(1);

So visually:

0%  █░░░░  Mostly darkness + Matrix rain
25% ██░░░  Face starts appearing in code
50% ███░░  Face partially reconstructed
75% ████░  Mostly recognizable
100% █████ Normal image revealed

The coolest version is to make the characters themselves reconstruct the photograph. Canvas samples the underlying image brightness, and characters over bright facial areas become stronger/brighter while the background characters remain faint.

You can also add little random horizontal glitches:

if (Math.random() < 0.04) {
  ctx.drawImage(
    image,
    0, glitchY, width, glitchHeight,
    Math.random() * 14 - 7,
    glitchY,
    width,
    glitchHeight
  );
}

Then some CSS scanlines:

.matrix-loader::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;


  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(0, 255, 70, 0.08) 4px
  );


  animation: scan 5s linear infinite;
}

And when loading finishes, I'd make it do something satisfying:

Matrix rain
    ↓
characters accelerate
    ↓
brief glitch
    ↓
green effect collapses
    ↓
original full-color portrait

About 600–900 ms for that final reveal would look great.

And importantly: for a loader, I'd keep the canvas animation at around 30 fps, respect prefers-reduced-motion, pause it when the component isn't visible, and avoid doing expensive full-image pixel analysis on every frame. You can sample the photo once and reuse that data.

So yes: this is entirely doable client-side with no video, GIF, or backend processing. The final result can be a reusable component where you give it any portrait:

<MatrixLoader
  image="/guests/david-ayde.jpg"
  progress={loadingProgress}
/>

and it automatically “Matrix-ifies” that person while the real operation is loading.

For your particular effect, I'd tell your coding agent to build it with <canvas> + an image luminance map, rather than just CSS filters. That's what will give you the convincing person made out of streaming code effect you saw in the example.     

THAT IS HOW WE REACTIVE OUR LAZY TO LOAD ALL ARCHITECTURE 


ANOTHER SO COOL SHIT WE HAVE IS AFTER MUSIC SECTION WE HAVE MUSIC SURVEY 

# Expand the Music Genre Survey Taxonomy — Strong Mexican Regional + Serbian/Balkan Coverage

Update the existing **5-star music-style voting feature** with a much stronger curated base taxonomy.

The key principle is:

**The curated list must already be rich and useful on its own. MusicBrainz is the fallback/expansion layer, not an excuse to keep the base taxonomy shallow.**

MusicBrainz supports an `/ws/2/genre/all` resource for retrieving its full genre vocabulary, so keep that available for search/additional genres.

## Mexican music is a priority

The event has a strong Mexican context, so the **Regional Mexican / Música Mexicana** section must be substantially more exhaustive than a generic international genre survey.

Do not stop at:

```text
Mariachi
Banda
Norteño
Regional Mexican
```

That is far too broad.

Create a thoughtful hierarchy that includes major traditions, regional variants, modern derivatives, and styles guests will actually recognize.

At minimum, evaluate and include appropriate entries from the following taxonomy.

### Música Mexicana / Regional Mexicano

#### Mariachi / Ranchera

```text
Mariachi
Ranchera
Mariachi tradicional
Mariachi moderno
```

#### Norteño

```text
Norteño
Norteño tradicional
Norteño con sax
Norteño con tuba
Norteño-Banda
Norteño sinaloense
Norteño regiomontano
Norteño tumbado / urbano
```

Norteño itself has several recognized regional and instrumentation-based variants, including norteño-sax and norteño-banda.

#### Banda

Include distinctions where useful:

```text
Banda sinaloense
Banda tradicional
Banda romántica
Banda moderna
Tecnobanda
Quebradita / Technobanda
```

Technobanda is historically related to banda sinaloense and grupero and became strongly associated with quebradita.

#### Corridos

Corridos deserve their own section rather than being hidden under Norteño.

```text
Corrido tradicional
Corridos norteños
Corridos modernos
Corridos tumbados
Corridos bélicos
```

Be careful with terminology and avoid creating redundant labels when two names are effectively aliases.

#### Sierreño

```text
Sierreño
Sierreño sinaloense
Sierreño guerrerense
Sierreño con acordeón
Sierreño con tuba
Sierreño tumbado / urbano
```

#### Grupero and related styles

```text
Grupero
Romántica grupera
Duranguense
Tejano / Tex-Mex
```

#### Mexican Son traditions

Do not collapse all Mexican *son* into one checkbox.

Evaluate separate options such as:

```text
Son mexicano
Son jalisciense
Son jarocho
Son huasteco / Huapango huasteco
Son calentano
Son istmeño
Son de mariachi
```

#### Other important regional traditions

Evaluate and include recognizable styles such as:

```text
Huapango
Tamborazo zacatecano
Tierra Caliente
Chilena
Marimba chiapaneca
Tamborileros tabasqueños
Jarana yucateca
Trova yucateca
Música calentana
```

Regional Mexican music is an umbrella containing a wide range of styles; commonly recognized major branches include mariachi, banda, norteño, corridos, tejano, duranguense and sierreño.

Published regional taxonomies also include styles and variants such as son huasteco, son jarocho, tamborazo zacatecano, tamborileros tabasqueños, tecnobanda and Tierra Caliente.

### Mexican dance/popular crossover

Also consider Mexican styles that may matter enormously at a party even if musicologists classify them differently:

```text
Cumbia mexicana
Cumbia sonidera
Cumbia norteña
Cumbia rebajada
Cumbia tropical
Mambo
Danzón
Bolero mexicano
Balada romántica mexicana
Rock en español mexicano
Pop mexicano
```

The purpose of this survey is **playlist intelligence**, not academic classification purity.

If guests understand two styles as meaningfully different musical experiences, they may deserve separate ratings.

## Serbian / Balkan music

Serbian and Balkan music must also have meaningful representation in the curated base catalog.

At minimum include:

```text
Serbian Folk
Kolo
Čoček
Balkan Brass
Romani / Balkan Romani music
Ex-Yugoslav Folk
Turbo-folk
```

Treat **Kolo** and **Čoček** as separate choices.

Do not simplify them into one generic “Balkan” checkbox.

Also evaluate whether these are useful for the audience:

```text
Starogradska muzika
Sevdalinka
Serbian traditional
Balkan folk
Balkan pop
Ex-Yugoslav rock
```

Use culturally respectful names and preserve correct diacritics such as:

```text
Čoček
```

rather than silently converting everything to ASCII.

Search should nevertheless tolerate:

```text
cocek
čoček
Cöcek
```

and other reasonable user input variations.

## Taxonomy architecture

Do not treat the genre catalog as a flat array of unrelated strings.

Support hierarchy conceptually similar to:

```text
Music
│
├── Mexican / Música Mexicana
│   ├── Mariachi & Ranchera
│   │   ├── Mariachi
│   │   └── Ranchera
│   │
│   ├── Norteño
│   │   ├── Norteño tradicional
│   │   ├── Norteño con sax
│   │   └── Norteño-Banda
│   │
│   ├── Banda
│   │   ├── Banda sinaloense
│   │   └── Tecnobanda
│   │
│   ├── Corridos
│   │   ├── Corrido tradicional
│   │   └── Corridos tumbados
│   │
│   └── Son / Regional traditions
│       ├── Son jarocho
│       ├── Son huasteco
│       └── Tierra Caliente
│
└── Serbian / Balkan
    ├── Serbian Folk
    ├── Kolo
    ├── Čoček
    ├── Balkan Brass
    └── Turbo-folk
```

The UI does not necessarily need to expose the complete hierarchy visually at all times, but the data model should preserve these relationships.

## Parent genre vs subgenre voting

Think carefully about whether a user can independently rate both:

```text
Norteño       ★★★★★
Norteño sax   ★★★★☆
```

This should be allowed.

A parent rating must **not automatically overwrite** ratings of its children.

Likewise:

```text
Mexican Regional ★★★★★
Corridos         ★★☆☆☆
Mariachi         ★★★★★
```

is perfectly valid user data.

Someone can love Mexican regional music generally but dislike corridos.

That nuance is precisely what we want to capture.

## Five-star semantics

Continue using:

```text
★☆☆☆☆  Strong dislike / avoid
★★☆☆☆  Usually don't like
★★★☆☆  Neutral / okay
★★★★☆  Like
★★★★★  Love
```

And keep:

```text
UNRATED != ★★★☆☆
```

An unrated genre means **no information**.

Three stars means the guest explicitly expressed neutrality.

Never convert missing ratings into 3 stars.

## Curated catalog + MusicBrainz

The final system should conceptually work like this:

```text
                 CURATED TAXONOMY
                       │
       ┌───────────────┴────────────────┐
       │                                │
Highly useful                      Search more
party/event genres                      │
       │                                ▼
Mexican, Balkan,                 MusicBrainz genre
Latin, Rock, Pop,                     catalog
Dance, etc.                            │
       │                                │
       └───────────────┬────────────────┘
                       ▼
               Unified genre model
                       ▼
                 ★★★★★ rating
```

Do **not** make a MusicBrainz API call every time the genre survey loads.

Prefer fetching/caching the genre catalog sensibly.

MusicBrainz should mainly support:

* discovery of obscure genres
* autocomplete
* adding genres missing from our curated taxonomy
* external IDs/normalization where available

Our own curated genre identifiers must remain stable even if MusicBrainz changes its taxonomy later.

## Aliases and deduplication

Build alias-awareness.

For example, the system should understand potentially equivalent or overlapping searches such as:

```text
regional mexican
regional mexicano
música mexicana

tex mex
tex-mex
tejano

son huasteco
huapango huasteco
```

Do not blindly create a second genre because a user found an alternate spelling.

Each genre may therefore need something conceptually similar to:

```ts
{
  id: 'mx-son-huasteco',
  name: 'Son huasteco',
  aliases: [
    'Huapango huasteco'
  ],
  parentId: 'mx-son',
  region: 'Mexico',
  curated: true
}
```

Adapt this to the existing project architecture.

## Search normalization

Genre search should be accent-insensitive and case-insensitive where appropriate.

Examples:

```text
norteno -> Norteño
mexicana -> Música Mexicana
cocek -> Čoček
```

But always display the proper human-readable spelling.

## Do not overfit to MusicBrainz

MusicBrainz currently includes genres such as `ranchera`, `reggaeton`, and `regional mexicano`, but our curated taxonomy should not be limited only to what MusicBrainz happens to recognize as an official genre at this moment.

Our requirements are driven by:

1. real guest vocabulary
2. playlist usefulness
3. cultural relevance
4. musical distinction
5. aggregate preference analysis

MusicBrainz is a supporting data source.

It is **not the authority for our UX taxonomy**.

## Before implementation

Inspect the existing music-preference feature and current genre definitions.

Then improve the taxonomy rather than duplicating existing entries.

For every candidate style, classify it as one of:

```text
PRIMARY
Useful enough to appear immediately.

SECONDARY
Useful, but nested/collapsed beneath a category.

SEARCH_ONLY
Available through extended search but not shown initially.

ALIAS
Maps to another canonical genre.
```

This is important because I want an **exhaustive database without an exhausting interface**.

## Objective

The end result should give me extremely rich data across all guests.

For example, I eventually want to discover something like:

```text
Mariachi             4.82 ★
Kolo                 4.71 ★
Cumbia mexicana      4.65 ★
Banda sinaloense     4.31 ★
Čoček                 4.28 ★
Norteño              4.13 ★
Corridos tumbados    2.84 ★
Techno               2.61 ★
```

That level of granularity will later allow us to construct a playlist that genuinely represents the crowd instead of relying on generic categories like “Latin” or “World Music.”

Implement this with particular attention to **Mexico and Serbia/Balkans**, while keeping the overall international catalog extensive.


HEY THERE IS SO MUCH IS OUR MENU NOW THAT WE NEED A SIDE MENU THAT OPENS ON HAMBURGETR BUTTON FOR DESKTOP OMNLY - WE KEEP THE ACTUAL HORIZONTAL MENU BAR BUT WE ALSWAYS HAVE THE HAMBURGER BUTTON VISIBLE ON THE LEFT PART OF THE MENU BAR AND WE OPEN A SIDE DRAWER ELEGANT TRANSPARENT OVERLAY PROBABLY MULTI COLUNNS SO ENSURE THAT IF WE REACH THE END OF USER VIEW WE START MAKONG MORE COLUMNS 