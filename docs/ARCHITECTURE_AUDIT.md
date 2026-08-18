# Architecture Audit — David & Aydé Wedding App

**Date:** 2026-08-17
**Scope:** Full repository audit (invitation + dashboard + shared + functions).
**Status:** Audit complete. See `docs/ARCHITECTURE.md` for the target architecture and `docs/adr/` for decisions.

> This document supersedes the older `docs/architecture-audit.md` (2026-03-08), which
> described an earlier state of the codebase (static guest registries, `submit-forms.js`,
> `isCouple()`, a `web/interface` app, and a `rsvp_submissions`-based dashboard). Those
> have since been removed or reworked. This audit reflects the **current** repository.

---

## 1. Repository map

```
boda/
├── web/
│   ├── invitation/          # Guest-facing React app (Vite, JSX, plain CSS)
│   │   └── src/
│   │       ├── main.jsx / App.jsx        # entry + section composition
│   │       ├── context/                  # AppContext.jsx, RsvpContext.jsx
│   │       ├── components/               # ~40 section components (Hero, RSVP, Coast…)
│   │       ├── hooks/                    # useActivityTracker, useVersionCheck, …
│   │       ├── genres/                   # genre-taxonomy + genre-search service
│   │       ├── song-search/              # song-search service + provider
│   │       ├── styles/                   # plain CSS (one file per section)
│   │       ├── *.js                      # data modules (guest-profiles, rooms, cabins,
│   │       │                             #   card-votes, genre-ratings, guiso-rankings,
│   │       │                             #   song-requests, thanks, flight-info, …)
│   │       └── firebase.js               # initializeApp + db + auth
│   ├── dashboard/           # Admin app (Vite, VANILLA JS, SCSS)
│   │   └── src/
│   │       ├── main.js                   # entry → startDashboard()
│   │       ├── dashboard.js              # 2593-line god file (UI + Firestore + logic)
│   │       ├── guests.js                 # live guest cache + normalizeGuest
│   │       ├── rooms.js / cabins.js / tables.js
│   │       ├── invitation-profile.js
│   │       └── firebase.js               # initializeApp + db + auth
│   └── shared/             # shared between apps
│       ├── firestore-paths.js            # centralized collection names
│       ├── payload-builders.js           # explicit allowlisted payload builders
│       ├── validation.js                 # runtime validators mirroring the rules
│       └── guests.js                     # legacy static snapshot (NOT imported by apps)
├── functions/              # Cloud Functions (index.js, telegram.js)
├── firebase/               # firestore.rules + firestore.indexes.json
├── scripts/                # ~50 Admin SDK scripts (migrations, sync, inspect)
├── docs/                   # architecture, schema, processes
└── tests/                  # unit tests (validation, song-search, rules)
```

---

## 2. Current architecture (how it actually works today)

### Two independent Vite apps, one origin
- **Invitation** (`web/invitation`, port 5173) is the guest-facing React app. It renders
  ~40 sections eagerly behind a `FullLoadGate`/Matrix loader. All user-facing copy lives in
  `content.js` (trilingual `es`/`fr`/`en`), read via `t` from `AppContext`.
- **Dashboard** (`web/dashboard`, port 5174) is a **vanilla-JS** admin app. In dev the
  invitation proxies `/dashboard/*` to it; in prod both are built into
  `web/invitation/dist` and served by one Firebase Hosting site.
- Both apps call `initializeApp` in their own `firebase.js` and share `web/shared/*`.

### Data access pattern
- **Invitation:** feature modules (`guest-profiles.js`, `rooms.js`, `cabins.js`,
  `card-votes.js`, `genre-ratings.js`, `guiso-rankings.js`, `song-requests.js`,
  `thanks.js`, `flight-info.js`, …) call the Firestore SDK directly. `guest-profiles.js`
  maintains an in-memory `guestsCache` (Map) as the source of truth, populated by
  `loadAllGuests()`/`loadGuestProfiles()` (an `onSnapshot` on the `guests` collection).
  Components read the cache through `guests.js` accessors.
- **Dashboard:** `dashboard.js` is a single module that (a) renders the entire HTML shell,
  (b) holds a module-level `state` object, (c) subscribes to `guests` + `invitation_groups`
  via `onSnapshot`, (d) calls `setDoc`/`deleteDoc` directly for cabin drag-and-drop,
  guest edits, invitation-group changes, and (e) implements all business rules inline.
  `guests.js` normalizes the live records; `rooms.js`/`cabins.js`/`tables.js` load their
  collections.

### Auth & authorization
- Per-guest email/password accounts; **auth UID == guest doc id**.
- The invitation gates on `authState`; the dashboard gates on `isAdmin` (read from the
  live `guests` cache, driven from inside the `onSnapshot` callback).
- Firestore rules use `isAdmin()` (reads `guests/{auth.uid}.isAdmin`) for admin writes and
  `hasValidGuestContactFields()` for guest writes. Rules are the authoritative boundary.

### Shared contract layer
- `web/shared/firestore-paths.js` centralizes collection names.
- `web/shared/payload-builders.js` builds explicit, allowlisted payloads.
- `web/shared/validation.js` mirrors the rules client-side.
- These are framework-agnostic and shared by both apps.

### Cloud Functions
- `functions/index.js` + `telegram.js` handle Telegram notifications (login, guest
  changes, guisos, song requests, genre ratings, activity), `sendInvitation` (Gmail),
  and `listAuthUsers` (admin-only).

---

## 3. Problems found

### CRITICAL

| # | Problem | Files | Detail |
|---|---------|-------|--------|
| C1 | **`dashboard.js` is a 2593-line god file** mixing UI rendering, Firestore access, business rules, routing, and module state | `web/dashboard/src/dashboard.js` | Renders HTML strings, holds `state`, calls `setDoc`/`deleteDoc`/`onSnapshot`/`collection`/`doc`/`query` directly, and implements guest-status derivation, cabin assignment, invitation-group logic, send-channel guards, CSV export, and modals — all in one module. This is the single biggest maintainability risk. |
| C2 | **Direct Firestore access inside UI/presentation code** | `dashboard.js` (setDoc/deleteDoc/onSnapshot/collection/doc/query), `AppContext.jsx` (addDoc/collection/serverTimestamp) | Violates the intended layer boundary. UI components/modules should not import Firestore SDK functions directly. |
| C3 | **`AppContext.jsx` (647 lines) is a bootstrap god-context** mixing auth, data loading, interface copy, analytics, and app state | `web/invitation/src/context/AppContext.jsx` | Holds `interfaceText` (trilingual copy), auth flows, guest bootstrap, and exposes a huge context value. Multiple responsibilities in one provider. |

### HIGH

| # | Problem | Files | Detail |
|---|---------|-------|--------|
| H1 | **Oversized section components** | `Accommodation.jsx` (1075), `Nav.jsx` (1003), `IdentityModal.jsx` (865), `Coast.jsx` (809), `Venue.jsx` (613), `RSVP.jsx` (598), `Guisos.jsx` (471) | Each mixes rendering, local state, data access, and domain calculations. Far above the 200–300 line guideline. |
| H2 | **`guest-profiles.js` (753 lines) mixes data access with business logic** | `web/invitation/src/guest-profiles.js` | Contains Firestore calls (`getDoc`/`getDocs`/`onSnapshot`/`setDoc`) AND domain resolution logic (name/phone/email precedence, `guestTravelsByPlane`, identity-check). Repository + service responsibilities conflated. |
| H3 | **Duplicated guest normalization logic** | `web/dashboard/src/guests.js` (`normalizeGuest`), `web/invitation/src/guest-profiles.js` (`normalizeGuestRecord`) | Two separate normalizers for the same `guests` doc shape, with slightly different field chains. Drift risk. |
| H4 | **Duplicated constants / magic strings** | `AUTH_EMAIL_DOMAIN` in `web/invitation/src/guests.js` and `web/dashboard/src/guests.js`; `RSVP_CONFIRMED_MIN_LEVEL`, `RSVP_ATTENDANCE_DAYS`, `DASHBOARD_QUERY_LIMIT`, `CABIN_NAME_MAP` scattered | The same domain constant is defined in two places; many thresholds/limits are inline. |
| H5 | **Dead dashboard tabs/collections still rendered** | `dashboard.js` `COLLECTIONS` map + RSVP/Suggestions/Coast/Petanque panels | `COLLECTIONS` references `collections.rsvpSubmissions` etc. which were removed from `firestore-paths.js` (now `undefined`). The tabs/panels/CSV-export still render but never load data. Dead UI + dead code. |
| H6 | **Weak error/loading handling in the dashboard** | `dashboard.js` | `loadDashboardData()` filters falsy collection names; many `.catch(showLoadError)`; `onSnapshot` errors only log. No consistent loading/error/empty states. |
| H7 | **`content.js` is a 5261-line monolith** | `web/invitation/src/content.js` | All trilingual copy in one object. Not a code smell per se, but it is the largest file and any copy change touches it. Consider splitting by section. |

### MEDIUM

| # | Problem | Files | Detail |
|---|---------|-------|--------|
| M1 | **Inconsistent async patterns** | invitation modules, dashboard | Mix of `getDocs`/`getDoc`/`onSnapshot`/`setDoc` with ad-hoc caching flags (`cabinsLoaded`, `roomsLoaded`). No unified repository API. |
| M2 | **Magic collection names in some modules** | `web/invitation/src/*.js` (some still hardcode `"guests"`, `"rooms"`, etc. instead of `collections.*`) | `firestore-paths.js` exists but is not used everywhere. |
| M3 | **No runtime validation on dashboard writes** | `dashboard.js` | Dashboard writes `hosting`, `invitationGroup`, guest fields directly via `setDoc` without going through `validation.js`. |
| M4 | **`web/shared/guests.js` is a stale static snapshot** | `web/shared/guests.js` (324 lines) | Not imported by either app (both are live-only), but still present and could be mistaken for a source of truth. |
| M5 | **Duplicated `getGuestsByUnit` / guest accessors** | `web/invitation/src/guests.js`, `web/dashboard/src/guests.js` | Same accessor names with different implementations. |
| M6 | **`functions/index.js` is large and mixes concerns** | `functions/index.js` | Telegram notifications, Gmail send, auth listing, activity events — many triggers in one file. |
| M7 | **No TypeScript** | both apps | JavaScript throughout. A gradual migration is possible but not required. |

### LOW

| # | Problem | Files | Detail |
|---|---------|-------|--------|
| L1 | **Unused imports** | `dashboard.js` imports `serverTimestamp` (never used) | Minor lint noise. |
| L2 | **`web/shared/guests.js` dead snapshot** | `web/shared/guests.js` | Could be removed or clearly marked. |
| L3 | **Inconsistent naming** | `unit` vs `cabin`, `group` vs `tagGroup` vs `invitationGroup`, `isNovio` vs `isAdmin` | Historical aliases remain in the dashboard normalizer. |

---

## 4. Five biggest architectural risks

1. **`dashboard.js` god file (C1)** — 2593 lines of UI + Firestore + business logic. Any
   change to the dashboard risks regressions; it is effectively unmaintainable as-is.
2. **Direct Firestore in presentation code (C2)** — UI modules import the Firestore SDK,
   making the data layer impossible to swap/test and coupling rendering to persistence.
3. **Duplicated domain logic (H3/H4)** — two guest normalizers and duplicated constants
   mean the invitation and dashboard can disagree on the same data.
4. **Dead dashboard panels (H5)** — legacy tabs render but never load; confusing and
   misleading for the couple, and a trap for future work.
5. **Oversized components (H1)** — 1000+ line components mix rendering, state, and data,
   making them hard to test and reason about.

---

## 5. Five largest / most problematic files

| File | Lines | Why it's a problem |
|------|-------|--------------------|
| `web/invitation/src/content.js` | 5261 | Trilingual copy monolith (largest file). |
| `web/dashboard/src/dashboard.js` | 2593 | God file: UI + Firestore + business logic + routing + state. |
| `web/invitation/src/components/Accommodation.jsx` | 1075 | Oversized section component. |
| `web/invitation/src/components/Nav.jsx` | 1003 | Oversized nav component. |
| `web/invitation/src/components/IdentityModal.jsx` | 865 | Oversized modal component. |

---

## 6. Locations where UI directly accesses Firestore

| File | Firestore SDK usage |
|------|---------------------|
| `web/dashboard/src/dashboard.js` | `collection`, `doc`, `getDocs`, `setDoc`, `deleteDoc`, `onSnapshot`, `query`, `limit` (directly in a file that also renders HTML) |
| `web/invitation/src/context/AppContext.jsx` | `addDoc`, `collection`, `serverTimestamp` (bootstrap context) |
| `web/invitation/src/guest-profiles.js` | `getDoc`, `getDocs`, `onSnapshot`, `query`, `where`, `setDoc`, `doc`, `collection`, `serverTimestamp` (data module — acceptable, but mixes business logic) |
| `web/invitation/src/rooms.js`, `cabins.js`, `card-votes.js`, `genre-ratings.js`, `guiso-rankings.js`, `song-requests.js`, `thanks.js`, `flight-info.js`, `guest-attendance.js`, `invitation-profile.js` | `getDocs`/`getDoc`/`setDoc`/`addDoc`/`onSnapshot` (data modules — acceptable location, but inconsistent patterns) |
| `web/dashboard/src/rooms.js`, `cabins.js`, `tables.js` | `getDocs`/`setDoc` (data modules) |

**The main violation of the layer boundary is `dashboard.js`** — it is presentation code
that also performs Firestore writes and reads.

---

## 7. Duplicated logic found

- **Guest normalization:** `normalizeGuest` (dashboard) vs `normalizeGuestRecord`
  (invitation) — two implementations of the same `guests` doc → guest shape.
- **`AUTH_EMAIL_DOMAIN`:** defined in `web/invitation/src/guests.js` and
  `web/dashboard/src/guests.js`.
- **Guest accessors:** `getActiveGuests`/`getGuest`/`getGuestsByUnit` exist in both
  `web/invitation/src/guests.js` and `web/dashboard/src/guests.js`.
- **Avatar URL building:** `guestAvatarUrl`/`resolveGuestPhotoUrl` logic appears in
  multiple places (dashboard.js, guest-profiles.js, functions).
- **RSVP confirmation threshold:** `RSVP_CONFIRMED_MIN_LEVEL` (≥4) is a domain rule that
  should live in one place.
- **Cabin name mapping:** `CABIN_NAME_MAP` / `getCabinDisplayName` logic is spread across
  dashboard `rooms.js` and invitation `rooms.js`.

---

## 8. Recommended target architecture

Feature-oriented, layered, incremental. See `docs/ARCHITECTURE.md` for the full picture.

```
web/invitation/src/
  app/            # App.jsx, providers, routing
  features/
    <feature>/    # e.g. guests, rsvp, cabins, music, travel, coast
      components/
      hooks/
      services/   # domain logic (no Firestore)
      repositories/  # Firestore access (collection paths, queries, CRUD)
      schemas/    # runtime validation
      types/
      index.ts
  shared/         # cross-feature UI + lib
  lib/            # firebase, analytics, cloudinary
  hooks/
  config/
```

**Dependency flow (enforced):**

```
UI component
  → hooks / use-cases
  → domain/service layer
  → repository/data-access layer
  → Firebase/Firestore
```

React components should NOT import Firestore SDK functions directly. Firestore
implementation details are encapsulated in repositories.

---

## 9. Proposed migration phases

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0** | Documentation + guardrails (this audit, `ARCHITECTURE.md`, ADRs, AGENTS.md rules) | Docs committed; AGENTS.md updated. |
| **1** | Firebase infrastructure normalization | Single shared `firebase.js`/config; `collections.*` used everywhere; remove dead dashboard tabs/collections. |
| **2** | Extract Firestore repositories | `repositories/guestRepository.js`, `cabinRepository.js`, `roomRepository.js`, `tableRepository.js`, `groupRepository.js`, `voteRepository.js`, … encapsulating all Firestore calls. |
| **3** | Extract domain services/hooks | Move business rules out of components/`dashboard.js` into `services/`; add `useGuests()`, `useCabins()`, etc. |
| **4** | Break down `dashboard.js` | Split into `render/`, `state/`, `handlers/`, `services/` modules; remove dead panels. |
| **5** | Break down oversized components | Split `Accommodation`, `Nav`, `IdentityModal`, `Coast`, `Venue`, `RSVP` by responsibility. |
| **6** | Introduce validation/types | Route dashboard writes through `validation.js`; add JSDoc types; optional gradual TS. |
| **7** | Tests | Unit tests for services/repositories; extend rules tests; smoke the affected UI. |
| **8** | Cleanup / dead-code removal | Remove `web/shared/guests.js`, unused imports, legacy aliases. |

Each phase ends with: lint → test → build → verify behavior.

---

## 10. Tools / MCP capabilities available

- **GitHub MCP** — repository inspection, PRs, issues, code search, commits.
- **Local CLI** — `git`, `npm`, `node`, `firebase` (emulator/rules tests), `grep`/`sed`.
- **File tools** — read/write/replace/search across the workspace.
- **Subagents** — parallel exploration of large files.

## 11. Tools I wish I had

- **Firebase MCP** (Firestore structure, rules, auth inspection) — not currently connected.
- **Browser automation** (Playwright/Puppeteer) to exercise the UI after refactors.
- **A TypeScript-aware language server** for the dashboard (vanilla JS) to catch type drift.

---

## 12. Priority order

correctness → maintainability → explicit architecture → testability → developer
experience → speed of adding features.
