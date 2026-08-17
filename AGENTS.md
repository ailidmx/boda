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
- **The deploy workflow (`deploy-invitation.yml`) MUST use `npm run build:all`**,
  NOT `npm run build` in `web/invitation` alone. Building only the invitation
  means the dashboard is never built into `web/invitation/dist/dashboard`, so
  `/dashboard/` 404s on prod. The workflow also installs dashboard deps
  (`npm ci` in `web/dashboard`) and includes `web/dashboard/**` + `web/shared/**`
  in its push/pull_request path filters so dashboard changes trigger a deploy.
  When adding a new app to the monorepo, wire it into `build:all` AND the deploy
  workflow's build + path filters.

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
  reflects live Firestore data. (The separate admin dashboard is also
  LIVE-ONLY — see the dashboard bullets below; it does not read the static
  `web/shared/guests.js` snapshot either.)

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
- **Dashboard summary cards read the live `guests` collection** — the
  dashboard's top summary cards for FRIDAY / SATURDAY / SUNDAY attendance come
  from a live `onSnapshot` listener on the `guests` collection
  (`state.liveGuests` in `web/dashboard/src/dashboard.js`), NOT from the legacy
  `rsvp_submissions` collection. Each guest's `rsvp.answers` map holds a scale
  level (int 0–5) per attendance day (`friday`/`saturday`/`sunday`); a guest
  counts as "confirmed" when the level is ≥ 4 (`RSVP_CONFIRMED_MIN_LEVEL`).
  The helper `computeDayConfirmations()` aggregates these. When adding a new
  attendance day or changing the confirmation threshold, update
  `RSVP_ATTENDANCE_DAYS` / `RSVP_CONFIRMED_MIN_LEVEL` and the summary cards.
- **Dashboard is LIVE-ONLY — there is NO static guest registry** — the
  dashboard (`web/dashboard/src/guests.js` + `dashboard.js`) reads ONLY the
  live Firestore `guests` collection. `web/shared/guests.js` is NOT imported
  anywhere in the dashboard and there is NO fallback to it. `setLiveGuests()`
  (fed by the `onSnapshot` listener in `startDashboard`) normalizes the raw
  Firestore records into the dashboard's guest shape; `getActiveGuests()`,
  `getGuest(id)`, `getGuestByUsername()`, `getGuestByEmail()` all read that
  live cache. Do NOT reintroduce a static registry — the live collection is the
  single source of truth for everything (identity names/photo, `hosting`
  cabin/room incl. `xtraCabin`/`xtraRoom`, `tagGroup`, `rsvp.answers`).
- **Dashboard access check: auth uid IS the guest doc id, and access = `isAdmin`** —
  the dashboard's access gate (`startDashboard` in `dashboard.js`) grants access
  ONLY to guests whose Firestore `guests` doc has `isAdmin: true` (David and
  Aydé). The auth user's `uid` IS the document id in the `guests` collection, so
  the gate looks the guest up by uid via `getGuest(currentUser.uid)` and checks
  `isAdminGuest(guest)` (`guest.isAdmin === true`). It does NOT look up by email
  and there is NO `isNovio`/`Novios`-group logic anymore — that was removed as
  stale/confusing. The lookup reads the LIVE guest cache, which is ONLY populated
  by the `onSnapshot` listener on the `guests` collection (via `setLiveGuests`).
  If that listener is missing or the access decision runs before it fires,
  `getGuest(uid)` returns `undefined` and EVERYONE is denied access
  (blank/access-denied screen). The access decision is therefore driven from
  INSIDE the `onSnapshot` callback (which fires immediately with the current
  data), not from `onAuthStateChanged` alone. When refactoring `startDashboard`,
  keep the `onSnapshot(collection(db, collections.guests), …)` listener that
  calls `setLiveGuests()` and calls `decideAccess()` after populating the cache.

- **Dashboard INVITADOS table renders LIVE guest data** — the guest table in
  `renderGuestManager()` renders each row from `getMergedGuest(guest)`, which
  merges the normalized live guest with its raw Firestore record from
  `state.liveGuests` (real `identity` names/photo, `hosting` incl.
  `xtraCabin`/`xtraRoom`, and `rsvp.answers`). Live wins where both exist.
  Columns: avatar (from `identity.cloudinaryId` via `guestAvatarUrl`, built as
  `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/<id>`),
  name with the guest ID shown underneath (hover shows the ID in the title),
  colored badges for grupo/cabaña/cuarto/cabaña-extra/cuarto-extra
  (`badgeHtml` → deterministic pastel `badgeStyle`), per-day RSVP chips
  (`rsvpLevelChip`: gray "—" = no answer, amber = level 1–3, green = level 4–5),
  and the status badge. The status badge (`guestStatusBadge`) is derived from
  the LIVE `rsvp.answers` (confirmed = any day ≥ 4, partial = answered but not
  confirmed, pending = no answers), NOT the legacy `rsvp_submissions`. When
  adding a column, update the `<thead>`, the row template, and the group-header
  `colspan` (currently 12).
  The avatar is wrapped in `.dashboard-avatar-wrap` with three corner badges:
  top-left = ID check (`idCheckUser`): a 🔒 LOCK on a green chip when verified,
  or an EMPTY hollow chip (no lock icon) when not; top-right = a 📷 button
  (`data-edit-photo`) that opens the guest editor modal (photo upload section);
  bottom-right = auth (`state.authUsers[guest.id]`): 🔑 on green when the guest
  has a Firebase Auth account, ❌ on red when they don't. The ID check and auth
  are NOT standalone columns — they live as badges on the avatar.

- **Dashboard edit modal can upload a guest avatar to Cloudinary** — the
  "✏️ Editar" modal (`openGuestEditor` in `dashboard.js`) has a photo section
  with a preview thumbnail, a "📷 Subir foto" file input, and a text input for
  pasting a Cloudinary ID manually. Picking a file calls
  `uploadAvatarToCloudinary(file)` (an inline helper in `dashboard.js` that
  mirrors the invitation's `uploadAvatar`): it POSTs to
  `https://api.cloudinary.com/v1_1/k2ajcgxv/image/upload` with the unsigned
  preset `boda_avatars_unsigned` (overridable via
  `VITE_CLOUDINARY_UPLOAD_PRESET`) and folder `boda/avatars`, then fills the
  `identityCloudinaryId` input and refreshes the preview. On save, the public
  id is written to BOTH `identity.cloudinaryId` and top-level `cloudinaryId`
  via `buildDashboardGuestEditPayload` — the same field the invitation reads.
  The upload runs client-side (no Cloud Function), so it requires the unsigned
  preset to be enabled in the Cloudinary dashboard. Styles live in
  `_guests.scss` (`.dashboard-avatar-upload*`).
- **Dashboard cabin matching reads `cabin`/`xtraCabin` (mirrors the front-end)** —

  the "Asignación de cabañas" panel (`renderCabinAssignments` in
  `web/dashboard/src/dashboard.js`) groups guests by the active period's cabin
  field, reading ONLY the LIVE `hosting` map. For the primary period
  (Viernes → Domingo) it reads `hosting.cabin`; for the extra period
  (Domingo → Martes, coast) it reads `hosting.xtraCabin`. Guests with no live
  assignment in the active period are excluded entirely — a guest with no
  `hosting` never shows up in a cabin card. The dashboard's OWN normalizer
  (`normalizeGuest` in `web/dashboard/src/guests.js`) exposes the primary-period
  cabin as BOTH `unit` (the historical field used by the INVITADOS table via
  `getMergedGuest`) and `cabin` (the field the invitation front-end reads, used
  by the cabins panel). Both resolve the same chain: `hosting.cabin` first, then
  the live record's own top-level `cabin`/`unit`. This mirrors the invitation's
  `normalizeGuestRecord` (`cabin: hosting.cabin ?? data.cabin`) so the dashboard
  and the invitation agree on assignments. Rooms are matched to cabins via
  `getCabinDisplayName(cabin)` → `getRoomsByCabin(displayName)`, and guests to
  rooms by filtering the cabin's guests on the LIVE `hosting.room` /
  `hosting.xtraRoom` field (NOT `getRoomOccupancy`, which reads the normalized
  `room` field). When adding a new cabin field, update `cabinField`/`roomField`
  in `renderCabinAssignments` and the `CABIN_NAME_MAP` in `rooms.js`.


- **`CABIN_NAME_MAP` maps the "Cabaña de madera" units to `CABAÑA 1–4`** — the
  `madera_31/32/33/34` unit codes are the SAME physical cabins as `CABAÑA 1/2/3/4`
  in the room inventory (their rooms are stored under `CABAÑA 1-1`, `CABAÑA 2-1`,
  `CABAÑA 3-1`, `CABAÑA 4-1`, etc.). `getCabinDisplayName` therefore maps
  `madera_31 → "CABAÑA 1"`, `madera_32 → "CABAÑA 2"`, `madera_33 → "CABAÑA 3"`,
  `madera_34 → "CABAÑA 4"`. Do NOT map them to `CABAÑA 31–34` — no rooms exist
  under those names, so the cabin card would show 0 capacity/0 guests.
- **Dead notification collections have no app writes** — `rsvp_submissions`,
  `petanque_participation`, `coast_interest`, and `experience_suggestions` are
  NOT written by the app anymore (the current RSVP/petanque/coast mini-RSVP flows
  save answers directly to the `guests` collection via `saveRsvpAnswers` →
  `rsvp.answers`). The dashboard does NOT load them, the path constants were
  removed from `web/shared/firestore-paths.js`, and the legacy
  `web/invitation/src/submit-forms.js` (with `submitRsvp`/`submitPetanque`/
  `submitCoast`) was deleted. If you still see
  `[firebase:load.collection] {collection: 'rsvp_submissions'…}` logs in the
  dashboard console, it's a stale cached build — hard-refresh / redeploy.

- **Dashboard guest list + cabins panel are LIVE-ONLY** — both
  `getFilteredGuests()` (INVITADOS table) and `renderCabinAssignments()`
  (Cabañas panel) build their guest list from the LIVE Firestore `guests`
  collection (`state.liveGuests`) as the ONLY source, mirroring the
  invitation front-end. There is NO static fallback (`web/shared/guests.js` is
  not imported anywhere in the dashboard). This means names and cabin
  assignments always reflect what's actually in Firestore (the true source of
  truth that guests update themselves), never a stale sheet snapshot. Treat
  live Firestore as authoritative.

- **Dashboard only loads the `thanks` collection** — the dashboard's
  `COLLECTIONS` map only loads `thanks` (plus the live `guests` listener and
  the `rooms` inventory). The legacy `rsvp_submissions`, `experience_suggestions`,
  `coast_interest`, and `petanque_participation` collections are NOT loaded and
  their tabs/panels/CSV-export/record-card code was removed from
  `web/dashboard/src/dashboard.js`. The path constants may still exist in
  `web/shared/firestore-paths.js` but nothing reads them from the dashboard.
  If you still see `[firebase:load.collection] {collection: 'rsvp_submissions'…}`
  logs in the console, it's a stale cached build — hard-refresh.
- **`loadDashboardData` skips undefined legacy collection names** — the
  dashboard's `COLLECTIONS` map still lists `rsvps`/`suggestions`/`coast`/
  `petanque` keys, but their path constants (`collections.rsvpSubmissions` etc.)
  were removed from `web/shared/firestore-paths.js`, so those values are
  `undefined`. `loadDashboardData()` therefore filters out entries whose
  collection name is falsy before calling `collection(db, name)` — otherwise
  `collection(db, undefined)` throws and the whole dashboard fails to load
  (summary cards, RSVP/suggestions/coast/petanque tabs all stay empty). The
  summary cards for FRIDAY / SATURDAY / SUNDAY now come from
  `computeDayConfirmations()` (live `rsvp.answers` scale ≥ 4), not the legacy
  `rsvps` collection. When re-adding a legacy collection, restore its path
  constant AND remove the falsy filter.
- **Dashboard cabin drag-and-drop reassignment writes `hosting`** — the

  "Asignación de cabañas" panel supports drag-and-drop: each guest row is
  `draggable` (`data-guest-id`) and each room block is a drop target
  (`data-room-id` + `data-cabin-unit`). Dropping a guest persists the new
  assignment to the guest's `hosting` map in Firestore via
  `setDoc(doc(db, collections.guests, guestId), { guestId, hosting, updatedBy, updatedAt }, { merge: true })`.
  For the primary period it writes `hosting.cabin`/`hosting.room`; for the
  extra (coast) period it writes `hosting.xtraCabin`/`hosting.xtraRoom`,
  preserving the other period's fields and the payment flags. **Admins have
  FULL write access to any guest doc** — the `guests` write rule is
  `(isAdmin() ? true : hasValidGuestContactFields()) && (isAdmin() || …)`, so
  an admin can write `hosting` (and any other field) with no schema/affectedKeys
  gymnastics. There is NO `hasValidAdminGuestFields()` / admin `affectedKeys()`
  list anymore — that was removed to stop the permission errors. Regular guests
  are still restricted to `hasValidGuestContactFields()` (which validates
  `hosting` via `hasValidGuestHostingFields()` and allows `null` for
  `cabin`/`room`/`xtraCabin`/`xtraRoom` via `isNullableShortText`). If the
  dashboard's cabin remove / drag-and-drop / add-guest ever fails with a
  permission error, the cause is almost always that the rules are NOT deployed
  (the local file is fine but live Firestore is stale) — redeploy with
  `firebase deploy --only firestore:rules`. `isAdmin()` requires the admin's
  OWN guest doc (`guests/{auth.uid}`) to have `isAdmin == true`; the couple's
  docs (`aydé_juárez_guadalupe`, `david_aïli`) have it set.
- **Dashboard cabin edits read `hosting` from the LIVE record** — the remove
  ("✕"), drag-and-drop, and "+ Agregar" handlers in `renderCabinAssignments()`
  all build the new `hosting` map from `getLiveHosting(guestId)` (a helper that
  reads `state.liveGuests`), NOT from `guestHosting(getGuest(guestId))`. This
  preserves the other period's fields and the payment flags via `merge: true`.
  Guests added via "+ Agregar" only exist in Firestore, so `getGuest()` returns
  `undefined` for them — the handlers must NOT bail out on that. Each handler
  logs `traceFirebase("cabin.<op>.start")` with the current and next hosting so
  permission errors are easy to spot in the console.

- **Dashboard cabin panel: remove + add-guest buttons** — besides drag-and-drop,
  the "Asignación de cabañas" panel has two more ways to edit assignments:
  (1) each guest row has a "✕" remove button (`data-remove-guest`) that clears
  the ACTIVE period's `cabin`+`room` (primary) or `xtraCabin`+`xtraRoom` (extra)
  from the guest's `hosting` map by setting those keys to `null` (NOT deleting
  them — the keys stay present so the field exists; the Firestore rules accept
  `null` via `isNullableShortText`), preserving the other period's fields and
  payment flags; (2) each cabin card heading has a
  "+ Agregar" button (`data-add-guest`) that opens a modal listing every guest
  WITHOUT a cabin in the active period (unassigned), sorted A→Z by name with
  their avatar (`guestAvatarUrl`), and assigns the picked guest to the cabin's
  FIRST room (`getRoomsByCabin(displayName)[0]`). Both write the same `hosting`
  payload shape as drag-and-drop and re-render on success. The unassigned
  filter reads the merged guest's `unit` (primary) or `xtraCabin` (extra).
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
- **Dashboard design language is "sharp & airy"** — the dashboard SCSS
  (`web/dashboard/src/styles/*.scss`) uses small border radii (cards/sections
  `0.5rem`, inputs/buttons `0.35rem`, tabs `0.4rem`) and generous padding
  (cards `1.15rem`, table cells `0.7rem 0.9rem`, modal body `1.75rem`). This
  replaces the old pill/rounded look (999px chips, 50% RSVP dots, 1.25rem+
  radii). When adding new dashboard UI, keep radii small and padding generous
  to match. Chips/badges use `0.35rem` radius, not `999px`.
- **Dashboard INVITADOS table has a dedicated "Enviar" column with per-channel send guards** —
  the guest table's "Enviar" column (`sendCell` in `dashboard.js`) sits right after
  "Identidad" and renders two send buttons: WhatsApp (📱) and Email (✉️). Each is
  disabled when that channel is not available for the guest, enforced by three
  helpers: `guestHasAuth(guest)` (has a Firebase Auth account — either in the live
  `state.authUsers` list or via an explicit `firebaseEmail` on the raw record),
  `guestCanWhatsapp(guest)` (auth AND has a phone), and `guestCanEmail(guest)`
  (auth AND has a real email that is NOT on the default auth domain
  `@boda-david-y-ayde.web.app` — that domain is auto-appended to bare usernames and
  is not a real inbox). The send modal (`openSendInviteModal(guest, channel)`)
  disables the same channels with explanatory tooltips and auto-triggers the
  pre-selected channel from the column button. The old 📨 button was removed from
  the "Acciones" column. When adding a new send channel, update `sendCell`, the
  modal, and the `guestCan*` helpers together.
- **Dashboard INVITADOS table has an "Invitación" column (rename + pick another group)** —
  the guest table's "Invitación" column (`invitationGroupCell` in `dashboard.js`)
  shows the guest's `invitationGroup` as a clickable display that reveals an
  inline editor with a free-text rename input and a dropdown to pick another
  existing group. The dropdown options come from `getInvitationGroupOptions()`
  (the `invitation_groups` collection ids plus every distinct `invitationGroup`
  value currently used by guests). Renaming or picking a group calls
  `applyInvitationGroupChange`, which saves the new value to that guest via
  `saveGuestInline` (the `invitationGroup` field is in `GUEST_WRITABLE_FIELDS`)
  and, if the old group was shared by other guests, opens a confirm modal
  (`openConfirmModal`) asking whether to apply the same change to all of them.
  The column is sortable (`sortTh("invitationGroup", "Invitación")`). Styles
  live in `_guests.scss` (`.dashboard-invgroup-*`). When adding a new column,
  update `GUEST_SORT_COLUMNS`, `guestSortValue`, the `<thead>`, and the row
  template.
- **Dashboard INVITADOS table shows phone + auth email inside the identity cell** —

  the guest table's "Identidad" cell (`identityCell` in `dashboard.js`) renders
  the avatar, the name (inline editor), and a mini meta row with the guest ID
  and the phone (live `identity.phone` wins, then the live record's own `phone`;
  see `getMergedGuest` and `normalizeGuest` in `guests.js`). The phone renders
  as a `tel:` link (`.dashboard-phone`) or a muted "—" when empty. When the
  guest has a Firebase Auth account, a second mini meta row shows the auth email
  (`.dashboard-auth-email`), and the avatar gets a small green "✓" badge
  (`.dashboard-auth-badge`). There is NO dedicated "Auth" column — the auth
  email lives inside the identity cell. The auth set is derived from the LIVE
  Firebase Auth user list, fetched on demand via the `listAuthUsers` Cloud
  Function (a callable in `functions/index.js` that uses the Admin SDK
  `auth.listUsers()` and is admin-only). The dashboard calls it in
  `startDashboard` and stores the result in `state.authUsers` (a map of
  `uid → { email }`). There is NO `auth_users` mirror collection and NO
  `login_events`-based auth set anymore — the callable is the authoritative,
  always-current source. When adding a new column, update `GUEST_COLUMNS`,
  `guestSortValue`, the `<thead>`, and the row template.

- **Dashboard tables panel is a real-life 30m × 6m seating canvas** — the
  "Mesas" panel lives in `web/dashboard/src/tables.js` (imported by
  `dashboard.js` as `loadTables` + `renderTablesManager`; styles in
  `_tables.scss`). The main canvas represents the actual banquet hall floor at
  real-life dimensions: `CANVAS_W = 30` m wide × `CANVAS_H = 6` m tall. Tables
  are absolutely positioned at their real-life meter coordinates scaled to px
  (`pxPerMeter = 20` for the main canvas, `12` for the secondary). The NOVIOS
  banquet table (22 guests, `NOVIOS_CAPACITY`) sits centered horizontally with
  11 seats north + 11 south; the remaining round tables of 10 (`ROUND_DIAM =
  1.8` m) are distributed evenly — 6 on the left, 6 on the right
  (`ROUNDS_PER_SIDE = 6`), in a 2-column × 3-row grid per side. The main canvas
  therefore holds 13 tables (NOVIOS + 12 rounds). Any round table beyond the
  12 main rounds (the 14th) is treated as the secondary table
  (`isSecondaryTable`) and rendered centered on its own secondary canvas
  ("Salón secundario"). Seat positions are computed in JS (`tableSeatPos`):
  round = on the circumference, rectangle = two rows (north/south) spread from
  the center outward. When adding a new table shape, update `tableSeatPos`,
  `renderTableCard`, and the `.is-<shape>` CSS.
- **Numbered "Mesa N" tables are ALWAYS square** — `tableShape()` in
  `web/dashboard/src/tables.js` forces any table whose name matches
  `/^Mesa\s+\d+$/i` to the `"square"` shape, regardless of the stored `shape`
  field. Square tables render as a moderate square card with seats around the
  4 edges (top/right/bottom/left), each side getting roughly a quarter of the
  seats (`tableSeatPos` square branch). When adding a new shape, update
  `tableShape`, `tableSeatPos`, `renderTableCard`, and the `.is-<shape>` CSS.
- **Tables panel has an "Auto-ordenar" button** — the "Mesas" toolbar has an
  "Auto-ordenar" button (`data-auto-layout`) that calls `computeLayout()` for
  every table and persists each table's new `x`/`y`/`shape` via `setDoc`
  (merge) on the `tables` collection, then re-renders. `computeLayout()` places
  the NOVIOS table at the canvas CENTER and the round tables in the fixed
  6-left / 6-right grid described above. When adding a new layout algorithm,
  keep the NOVIOS-at-center + 6-per-side convention so the couple's mental
  model stays consistent.
- *(Add new lessons here as you discover them.)*










