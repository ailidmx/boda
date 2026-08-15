# AGENTS.md — Instructions for any AI working on this repo

> **This is a living document.** Every time you (the AI) learn something important
> about this project — an architectural rule, a gotcha, a workflow, a naming
> convention — add it here so the next AI (and the human) benefits. Keep it
> concise and factual. When in doubt, prefer documenting over guessing.

---

## 1. Local development workflow (ALWAYS follow this)

When working locally, **always run BOTH apps** — the invitation (web) and the
dashboard — and use the **network** variant so the human can test on other
devices from their LAN (phone, tablet, another computer).

### The two apps

| App        | Path             | Dev port | Base path  | Purpose                          |
|------------|------------------|----------|------------|----------------------------------|
| Invitation | `web/invitation` | **5173** | `/`        | The guest-facing wedding site    |
| Dashboard  | `web/dashboard`  | **5174** | `/dashboard/` | Admin/planning interface       |

### How they connect in dev

- The invitation dev server (5173) **proxies** `/dashboard/*` to the dashboard
  dev server (5174). So both apps are served from a **single origin**:
  `http://localhost:5173` (invitation) and `http://localhost:5173/dashboard/`
  (dashboard).
- The proxy runs **server-side**, so LAN devices only need to reach the
  invitation server (5173); they never need direct access to 5174.
- Both ports use `strictPort: true` — if a port is taken, the server fails
  instead of silently moving.

### Commands

Run both apps for local development:

```bash
npm run dev
```

Run both apps **exposed on the LAN** (so the human can test on other devices):

```bash
npm run dev:network
```

Individual apps (if you only need one):

```bash
npm run dev:invitation          # invitation only, localhost
npm run dev:dashboard           # dashboard only, localhost
npm run dev:invitation:network  # invitation only, LAN
npm run dev:dashboard:network   # dashboard only, LAN
```

### LAN testing (network mode)

- `dev:network` starts both Vite servers with `--host`, binding them to the
  machine's LAN IP.
- The invitation prints its LAN URL (e.g. `http://192.168.1.23:5173`). The
  human opens that URL on their phone/tablet.
- The dashboard is reachable at `http://<LAN-IP>:5173/dashboard/` (through the
  invitation proxy). The dashboard's own port 5174 is also exposed directly if
  needed.
- **Firewall note:** if LAN devices can't connect, the macOS firewall may be
  blocking Vite. Allow the node process or the ports (5173/5174) in
  System Settings → Network → Firewall.

### After changing code

- Vite hot-reloads automatically; no manual restart needed for JS/CSS changes.
- If you change `vite.config.js`, `package.json`, or add/remove dependencies,
  restart the dev servers.
- Before finishing a task, run a production build to confirm it compiles:
  `npm run build:all` (builds invitation + dashboard into `web/invitation/dist`).

---

## 2. Project layout (high level)

- `web/invitation/` — guest-facing React app (Vite). All guest content lives
  here.
- `web/dashboard/` — admin React app (Vite). Built into
  `web/invitation/dist/dashboard` so one Firebase Hosting site serves both.
- `web/shared/` — code shared between apps (validation, payload builders).
- `web/content/` — content assets.
- `scripts/` — Node scripts (builds, data sync, migrations, verification).
- `docs/` — project documentation (schema, invitations, processes).
- `firebase/` — Firestore rules and indexes.
- `reports/` — generated reports (e.g. Google Sheets ↔ Firestore sync).

---

## 3. Key architectural principles

### Content is trilingual and lives in `content.js`
- All user-facing copy lives in `web/invitation/src/content.js` under a single
  `content` object with three languages: `es`, `fr`, `en`.
- Components read copy via `t` (the active translation) from `useApp()`.
- **Never hardcode user-facing strings in components** — add them to all three
  language blocks in `content.js`.
- When a component references a translation key that doesn't exist, the UI
  renders empty. Always verify the key exists in all three languages.

### Reuse existing shared components
- The app already has reusable components (e.g. `SwipeCardCarousel` for
  swipeable card carousels, `LightboxCarousel`, `CoupleNames`, `HeroDate`).
- Before building a new carousel/modal/component, check if one already exists
  and reuse it for visual and behavioral consistency.

### Keep DOM nesting shallow
- Avoid deeply nested container divs. Prefer a single container level per
  section. Deep nesting breaks layout on mobile and makes styling fragile.
- If a section has a "frame" look, apply the frame styles to the section
  itself rather than wrapping content in an extra `<div>`.

### Styling
- Styles are plain CSS files (some `.scss`) co-located in
  `web/invitation/src/styles/` (e.g. `hero.css`, `rsvp.css`).
- Class names are descriptive and prefixed by section (e.g. `hero-eyebrow`,
  `rsvp-section`).

### Build / deploy
- `npm run build:all` builds both apps. The invitation build must NOT empty the
  whole `dist/` (it would wipe the dashboard build); `build:all` handles
  cleaning first.
- The invitation injects a build number (`version.json` + service worker cache
  version) so stale cached versions are detectable.

---

## 4. Data & backend

- Firestore is the backend. Rules live in `firebase/firestore.rules`, indexes
  in `firebase/firestore.indexes.json`.
- Google Sheets ↔ Firestore sync is handled by `scripts/gsheet-firestore-sync.mjs`
  (see `reports/gsheet-firestore-sync-report.md` for the latest run).
- Guest identity/profile logic lives in `web/invitation/src/guest-profiles.js`
  and `web/invitation/src/invitation-profile.js`.

---

## 5. Testing

```bash
npm test          # profile + validation unit tests
npm run test:rules  # Firestore rules tests (uses emulators)
```

---

## 6. Conventions & gotchas (add as you learn)

- **Always run both apps + network mode** when developing locally (see §1).
- **Verify translation keys exist** in all three languages before relying on
  them (empty keys render blank).
- **French uses TU (tutoiement)** — the invitation addresses each guest
  personally and warmly, so French copy must use the informal singular
  "tu / ton / ta / tes" (e.g. "Saisis ton mot de passe", "Participes-tu au
  tournoi ?"), never "vous / votre / vos". This applies to `content.js` and to
  the `interfaceText` in `AppContext.jsx`. Spanish likewise uses the informal
  "tú / tu / tus".
- **Don't hardcode copy** — use `content.js`.
- **Reuse existing components** (carousels, modals) instead of reinventing.
- **Keep container nesting shallow** — one container level per section.
- **Extra cabin display mirrors the primary cabin** — the "Et après ?" (Coast)
  section renders the extra cabin (`xtraCabin`/`xtraRoom`) with the same
  treatment as the primary cabin in Hébergement: covered note
  (`accommodation-covered-note`), cabin badge (`accommodation-cabin-badge`),
  photo carousel (`accommodation-photo-carousel`), and the `CabinOccupancy`
  modal. Reuse these existing classes/components rather than building a new
  layout. The extra cabin's photos come from the same `cloudinaryIds` field.
- **Cabin photo storage convention** — a cabin's `cloudinaryIds` are stored
  **relative to the `boda/` prefix**; the app renders them as
  `cloudinaryImage(\`boda/${id}\`)`. So a photo at `boda/cabin/casona/foo` is
  stored as `cabin/casona/foo`. When wiring up new cabin photos, move the
  Cloudinary assets into `boda/cabin/<slug>/` (via `uploader.rename`) and store
  the relative IDs. See `scripts/update-casona-lavanda-photos.mjs` for a
  working example (it also shows how to split a batch of uploads by timestamp).
- **Mini-RSVP recap step** — In the stepped mini-RSVP cards (Coast, Pétanque,
  "¡Te animas!"), the recap step is the LAST step and holds BOTH the "Modify my
  answers" button (jumps back to step 1 via `goToStart`) and the save button.
  The save button must live on the recap step, never on an intermediate
  question step. The recap step's `render` receives `{ goToStart }` from
  `FlipStepCard`.
- **Per-group price row is hidden for single-guest groups** — In the RSVP
  "À payer" summary (`PaymentSummary.jsx`) and the Total block (`RSVP.jsx`),
  the "par le groupe" (per group) row is only rendered when the group has more
  than one member (`groupMembers.length > 1` / `guests.length > 1`). With a
  single guest it would just duplicate the per-person amount, so it is hidden.
  When adding new price rows, keep this rule in mind.

- **`.fieldset-note` is a plain paragraph** — The RSVP section styles generic
  `p` tags as elegant citations (left border, italic, quote mark). Any note
  that must NOT look like a citation (e.g. `.fieldset-note`) needs an explicit
  override resetting `padding-left`, `border-left`, `font-style`, and
  `::before`/`::after` `content: none`.
- **RSVP progress "done" state** — The final RSVP progress checklist derives
  "done" from the actual answers via `computeInitialStepIndex` (a flow is done
  when its current step reaches the recap), NOT from a separate saved flag.
  This keeps "En attente" clearing as soon as answers are saved/reach recap.
- **Guest data sourcing (Firestore-only)** — `web/invitation/src/guests.js` is
  the guest registry and sources ALL data from the LIVE Firestore `guests`
  cache (populated by `loadAllGuests()`/`loadGuestProfiles()` in
  `guest-profiles.js`). There is NO static guest registry in the invitation
  app anymore. `getActiveGuests()` returns the cache, `getGuest(id)` reads the
  cache by id, and `getGuestsByUnit(unit)` filters by `hosting.cabin`. Login is
  a normal Firebase Auth email/password login: if a guest types a bare username
  (no "@"), the app silently appends `@${AUTH_EMAIL_DOMAIN}` to build a valid
  email — no username lookup. Per-guest invitation-link resolution was removed;
  only profile codes are accepted. When adding a new guest-facing list, read
  through `getActiveGuests()` + `resolveGuestName`/`resolveGuestPhoto` so it
  reflects live Firestore data. (The separate admin dashboard still reads the
  static `web/shared/guests.js` snapshot; it is not part of the invitation app.)
- **Telegram bot must be a member of the target chat** — The notification
  Cloud Functions (`functions/index.js` + `telegram.js`) post to a Telegram
  group via the `@boda_dya_bot` bot. If the bot is NOT a member of the group,
  `sendMessage` returns `Bad Request: chat not found` and the notification is
  silently dropped (the guest's Firestore write still succeeds). To fix, add
  the bot as a member of the group in Telegram. The bot can post to a group it
  belongs to without being an admin (channels require admin). The secrets
  (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`) are wired via Secret Manager and must
  be listed in each function's `secrets: [...]` dependency array — otherwise
  the function logs `No value found for secret parameter ...` and skips the
  notification. Verify with `firebase functions:list` (secrets shown) and
  `gcloud logging read 'resource.labels.service_name="onlogin"'`.
- **Travel-by-plane flag is `travelsByPlane` (boolean), NOT `travelStatus`** —
  The FLIGHTS ("Je viens de loin") section visibility, the nav link, and the
  "next section" bottom links all depend on whether the guest flies in. The
  source of truth on the guest's Firestore record is the boolean
  `travelsByPlane` (true = flies in). There is NO `travelStatus` field in the
  data (0 of 262 guests have it). Always read it via the
  `guestTravelsByPlane(profile?.guest)` helper in `guest-profiles.js` (which
  also accepts the legacy `travelStatus` string for backward compatibility) —
  never read `profile?.guest?.travelStatus` directly, or the section will be
  hidden for everyone.
- **`story-bg.css` MUST be imported in `main.jsx`** — The `.story-bg` class
  (used on most sections: Food, Travel, RSVP, Accommodation, Photos, Story,
  Attire, Venue, Petanque, Music, Guisos, Weather, Gift, Weekend) renders the
  animated orbs/sparkles/bloom/vignette via `::before`/`::after`. If
  `web/invitation/src/styles/story-bg.css` is not imported in `main.jsx`, the
  class has NO styles and every section silently loses its background effects.
  It must be imported BEFORE `travel.css` so the Travel mood overrides
  (`.travel-bg--<id>`) come after the base `.travel-section` palette in the
  cascade and win. If you add a new section that uses `story-bg`, verify the
  import is present and ordered correctly.
- **Song-request search is isolated behind a service + provider** — the
  "Pide tu canción" section (`SongRequest.jsx`) never talks to MusicBrainz
  directly. It uses `createSongSearchService()` from
  `web/invitation/src/song-search/song-search-service.js`, which enforces a
  minimum query length (`MIN_QUERY_LENGTH = 2`), caches results per query, and
  delegates to an injectable provider (`musicbrainz-provider.js`). The provider
  normalizes raw recordings into the internal `SongSearchResult` shape
  (`title`, `artist`, `year`, `externalId`, `source`, `isrc`) and dedupes by
  (title+artist) preferring ISRC then earliest year. The UI owns debouncing
  (~600ms) and aborting stale requests via `AbortController`. When adding a new
  search source, add a provider and inject it — don't touch the UI or the
  persistence layer. Unit tests live in `tests/song-search.test.mjs`.
 - **Song-request persistence uses a `songMeta` field** — the guest's chosen
   song identity (title, artist, year, MusicBrainz id, isrc) is stored in the
   `songMeta` field of the `song_requests` doc, separate from the free-text
   `song` and the `intent`. `buildSongRequestPayload` (payload-builders) and
   `validateSongRequestPayload` (validation) both accept `songMeta`; the
   Firestore rules allow it. If the search finds nothing, the guest can still
   type a free-text title (no `songMeta`).
 - **Song-request band-type selector shows for BOTH `band` and `sing` intents** —
   In `SongRequest.jsx`, the "which musicians" selector (`bandType`) is rendered
   when `intent === "band" || intent === "sing"`, because "sing on stage with the
   musicians" also needs to know which band accompanies the guest. The `bandType`
   is saved via `saveSongRequest` for both intents. When adding a new intent that
   needs a band choice, include it in that condition.
 - **Guest-change Telegram notifications are context-aware + include the avatar** —
   `onGuestUpdated` in `functions/index.js` watches the `guests` collection and
   notifies on ANY meaningful change, formatted by what changed: identity check,
   name correction, phone, photo, RSVP answers, flight details (`flightInfo`),
   travel mode (`travelsByPlane`), a written message (`messageAuthor`), and cabin
   assignment (`hosting`). Metadata-only touches (`updatedBy`/`updatedAt`) are
   skipped. When the guest has an avatar, the notification is sent via
   `sendTelegramPhoto` (in `functions/telegram.js`) with the avatar as the photo
   and the message as its caption; otherwise it falls back to `sendTelegramMessage`.
   The avatar URL is built from `identity.cloudinaryId` (stored relative to the
   `boda/` prefix) as
   `https://res.cloudinary.com/k2ajcgxv/image/upload/w_256,h_256,c_fill,g_auto/boda/<id>`
   (see `resolveGuestPhotoUrl`). When adding a new guest field that should notify,
   add a change-detection block in `onGuestUpdated` and a human-readable line.
 - **Guisos-order Telegram notification** — `onGuisoRanking` in
   `functions/index.js` watches the `guiso_rankings/{guestId}` collection (one doc
   per guest, written via `saveGuisoRanking` with `setDoc` + `merge: true`) and
   notifies the couple whenever a guest saves or updates their guisos order. It
   uses `onDocumentWritten` (fires on both create and update) and reads the
   `after` snapshot. The message lists the guest, the dishes marked "in the menu"
   (`selected`), and the full ranked order (`ranking`). When adding a new
   guest-facing collection that should notify, add an `onDocumentWritten` trigger
   here with the `secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID]` dependency array.
 - **Song-request + genre-rating Telegram notifications** — `onSongRequest` and
   `onGenreRating` in `functions/index.js` notify the couple when a guest submits
   a song request (`song_requests/{requestId}`, written via `addDoc` in
   `song-requests.js`) or rates a music genre (`genre_ratings/{genreId}_{guestId}`,
   written via `setDoc` + `merge: true` in `genre-ratings.js`). `onSongRequest`
   uses `onDocumentCreated` (each request is a new doc); `onGenreRating` uses
   `onDocumentWritten` (a rating can be created or updated). Both read the guest
   name via `resolveGuestName` and include the `secrets: [TELEGRAM_TOKEN,
   TELEGRAM_CHAT_ID]` dependency array. When adding a new guest-facing collection
   that should notify, add a trigger here.
 - **Dead notification collections (no app writes)** — `rsvp_submissions`,
   `petanque_participation`, and `coast_interest` still have deployed triggers
   (`onRsvpSubmission`, `onPetanqueSubmission`, `onCoastSubmission`) but the app
   NO LONGER writes to them: the current RSVP/petanque/coast mini-RSVP flows save
   answers directly to the `guests` collection via `saveRsvpAnswers` →
   `rsvp.answers`, which `onGuestUpdated` already detects. The old
   `submit-forms.js` helpers (`submitRsvp`, `submitPetanque`, `submitCoast`) have
   no callers. These triggers are harmless but dead; they can be removed if the
   couple wants to reduce deployed functions.
- **Genre survey is a curated catalog + isolated search service** — the "Califica
  la música" survey (`GenreSurvey.jsx` + `GenreVote.jsx`) rates music genres with
  1–5 stars. The source of truth is the app's OWN curated catalog
  (`web/invitation/src/genres/genre-taxonomy.js`), deliberately rich in Mexican
  Regional and Serbian/Balkan music (the two cultural pillars). Genres are
  hierarchical (parent category → subgenres), tiered (PRIMARY shown / SECONDARY
  collapsed / SEARCH_ONLY), alias-aware, and use stable ids independent of
  MusicBrainz. Ratings persist to `genre_ratings/{genreId}_{guestId}` (one doc
  per genre+guest; the rules enforce the doc id). Search is isolated behind
  `createGenreSearchService()` (`genre-search/genre-search-service.js`), which
  searches the curated catalog first and only falls back to the injectable
  MusicBrainz provider (`musicbrainz-genre-provider.js`) for obscure genres —
  never touch the UI or persistence layer to add a search source. When adding a
  genre, add it to `genre-taxonomy.js` (with aliases + tier); the UI, rules, and
  persistence need no changes. There is also a dedicated **French/Francophone
  category** (`id: "french"`, "Francesa / Francófona") with 12 subgenres
  (Chanson française, Variété française, Yé-yé, French pop, French rap,
  French electro, French house, French rock, French folk, French jazz, Musette,
  Afro-francophone). Note that "Chanson française" and "French pop" also exist
  under the Jazz/Blues/World category (`jw-chanson`, `jw-french-pop`) — search
  returns both, which is intentional.
- **Song-request intro is a citation** — the "Pide tu canción" intro body
  (`songRequest.body` in `content.js`) renders with the shared `.experience-note`
  citation style (italic, muted, right-aligned). Do NOT add a `.song-request-section
  .experience-note` override to strip it (that was removed); the section relies on
  the generic `.experience-note` styling from `food.css`.

- **Desktop hamburger side drawer is desktop-only** — the desktop nav bar
  always shows a hamburger button on its LEFT (`.side-drawer__toggle` inside
  `.desktop-nav-wrap`). It opens a transparent side drawer
  (`SideDrawer` in `Nav.jsx`, `.side-drawer__*` in `nav.css`) listing the full
  nav in CSS columns (`column-width: 12rem`), so links flow into more columns
  when they exceed the viewport height. Because the button lives inside
  `.desktop-nav-wrap` (hidden below 900px), it never appears on mobile — mobile
  keeps its existing split dropdowns. When adding a new nav link, it appears in
  the drawer automatically (it renders the same `links` array as the desktop
  nav). Reuse `.side-drawer__*` classes rather than building a new drawer.
- **Login event is written ONLY in `signIn()`, never in `onAuthStateChanged`** —
  The `login_events` write (which triggers the "NUEVO INICIO DE SESIÓN"
  Telegram notification) lives in the `signIn()` function in `AppContext.jsx`,
  which runs only when the guest truly types their credentials. It must NOT be
  added to the `onAuthStateChanged` handler: that handler fires on EVERY page
  load/refresh (the session is restored from `browserLocalPersistence`), so
  writing there would spam the couple with a login notification on every
  refresh even though the guest did not actually log in.
- **Inactivity tracking is isolated in `useActivityTracker`** — the
  `web/invitation/src/hooks/useActivityTracker.js` hook listens to user-activity
  events (mouse, keyboard, scroll, touch, pointer) and, after the idle threshold
  (default 5 min), logs a Firebase Analytics `user_inactive` event and writes a
  doc to the `activity_events` collection (schema enforced in `firestore.rules`;
  a Cloud Function `onActivityEvent` notifies the couple). It exposes `isActive`
  (false once idle) which `AppContext` puts on the context value. `useSectionTime`
  (via `LazySection`) reads `isActive` and pauses section-time accumulation while
  the guest is idle or the tab is hidden — idle/hidden time is NOT counted as
  "time spent" on a section. When adding a new activity signal, extend the
  `ACTIVITY_EVENTS` list and the `type` enum in the rules.
- *(Add new lessons here as you discover them.)*








