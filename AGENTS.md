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
- *(Add new lessons here as you discover them.)*

