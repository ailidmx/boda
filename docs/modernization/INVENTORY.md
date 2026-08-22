# Modernization Inventory

> Migration status legend: `KEEP` (no change) · `REFACTOR` (restructure) ·
> `REPLACE` · `REMOVE` · `STANDARDIZE` · `ADD`.

Line counts are from 2026-08-22 `wc -l`.

## 1. Dashboard source (`web/dashboard/src/`)

| File | Lines | Responsibility | Direct Firestore | Migration status |
|------|------:|----------------|:----------------:|------------------|
| `dashboard.js` | 1661 | bootstrap god-module: auth + access gate + live `onSnapshot`(guests/thanks) + `state` + ~40 DI adapters + UI builders + mutation orchestrators | ✅ reads + auth-list | **REFACTOR** → `bootstrap.js` + `store.js` + read repos |
| `guestService.js` | 652 | pure derived-state (merged guest, RSVP answers/chips, readiness, filters, sort) | — | KEEP (the model) |
| `guestTable.js` | 1098 | AG Grid columns/renderers/events for INVITADOS | — | KEEP (split columns later) |
| `cabinsPanel.js` | 1181 | cabin card grid god-module: mismatch, presence scale, lightbox, drag-drop | reads cache via `getActiveGuests()` | **REFACTOR** → `cabinService` pure + thinner render + reusable lightbox |
| `tables.js` | 351 | seating canvas (30m×6m), seat positions, drag-drop, auto-layout | ✅ `onSnapshot`(tables) | REFACTOR → subscription into `tableRepository` |
| `summary.js` | 479 | top summary cards + confirmed-guest modals | — | KEEP |
| `thanksPanel.js` | 412 | AG Grid thanks table + modal | — | KEEP |
| `guestModals.js` | 212 | delete-confirm + send-invite modals | — | KEEP |
| `guestEditorModal.js` | 277 | guest edit modal + avatar upload | — | KEEP |
| `guestCreateModal.js` | 207 | create-guest modal + auth provisioning call | — | KEEP |
| `guests.js` | 135 | live cache store (`setLiveGuests`, `getGuest`, `getActiveGuests`) | — | KEEP (fold into `store.js`?) |
| `guestDomain.js` | ~180 | identity/name/id helpers, badge style, invite URL | — | KEEP (→ `domain/guests.js`) |
| `chartsPanel.js` | 258 | echarts charts | — | KEEP |
| `rooms.js` | 250 | room inventory load + `CABIN_NAME_MAP` + `getCabinUnitCode` | ✅ `getDocs` | KEEP |
| `cabins.js` | 138 | cabin photos load | ✅ `getDocs` | KEEP |
| `tabNav.js` | 175 | hash routing + tab nav | — | KEEP |
| `matrixLoader.js` | 283 | loading HUD | — | KEEP |
| `main.js` | 11 | entry | — | KEEP |
| `firebase.js` | 18 | firebase app/db/auth init | — | KEEP |
| `data-grid/AppDataGrid.js` | 93 | `createAppDataGrid` factory | — | KEEP (validated) |
| `data-grid/gridRenderers.js` | 36 | cell renderers | — | KEEP |
| `data-grid/gridDefaults.js` | 62 | default grid options | — | KEEP |
| `repositories/guestRepository.js` | 72 | guest writes | ✅ write | **REFACTOR**: add `subscribeGuests` |
| `repositories/thanksRepository.js` | 68 | thanks writes | ✅ write | **REFACTOR**: add `subscribeThanks` |
| `repositories/tableRepository.js` | 39 | table writes | ✅ write | **REFACTOR**: add `subscribeTables` |
| `repositories/cabinRepository.js` | 55 | cabin one-off read | ✅ read | KEEP |
| `repositories/roomRepository.js` | 50 | room one-off read | ✅ read | KEEP |

## 2. Shareable domain / services (dashboard)

| Item | Location | Status |
|------|----------|--------|
| `guestService` pure functions (40 tested) | `guestService.js` | KEEP |
| `cabinService` (mismatch/presence derivations) | extract from `cabinsPanel.js` | **ADD** (pilot) |

## 3. Invitation source (`web/invitation/src/`)

| Area | Key files | Direct Firestore | Status |
|------|-----------|:----------------:|--------|
| App root | `App.jsx` (220), `main.jsx` (89) | — | KEEP |
| Context | `context/AppContext.jsx` (623) | via `guest-profiles` | **REFACTOR** — split auth/content/guests |
| Guest identity | `guest-profiles.js` (598), `guests.js` (108) | ✅ read+write | KEEP (read-side service) |
| Analytics | `analytics.js` (196) + 4 hooks | ✅ `addDoc` (page_views, activity_events) | KEEP |
| Features (flat) | `Accommodation.jsx`, `RSVP.jsx`, `Petanque.jsx`, `Food.jsx`, `Travel.jsx`, `Music.jsx`, `Guisos.jsx`, `SongRequest.jsx`, `GenreSurvey.jsx`, `GenreVote.jsx`, `Attire.jsx`, `Story.jsx`, `Venue.jsx`, `Weekend.jsx`, `Weather.jsx`, `Gift.jsx`, `Coast.jsx` | various | KEEP (gradual → `features/`) |
| Features (folder) | `features/coast/`, `features/identity/`, `features/nav/` | — | KEEP + extend |
| UI primitives | `components/ui/Button.jsx`, `Dialog.jsx` + `ui.jsx` | — | KEEP |
| Shared components | `LightboxCarousel`, `SwipeCardCarousel`, `FlipStepCard`, `CoupleNames`, `HeroDate`, `StayPlanCard`, `PaymentSummary`, `LazySection`, `FullLoadGate` | — | KEEP (reuse before create) |
| Data modules | `rsvp-responses.js`, `rsvp-scale.js`, `cabins.js`, `rooms.js`, `thanks.js`, `flight-info.js`, `guest-attendance.js`, `invitation-profile.js` | ✅ direct | **STANDARDIZE** per-feature repos (gradual) |
| Search services | `song-search/`, `genre-search/`, `genres/` | — | KEEP |

## 4. Shared kernel (`web/shared/`)

| File | Lines | Status |
|------|------:|--------|
| `firestore-paths.js` | 101 | KEEP (single source of truth) |
| `payload-builders.js` | 872 | KEEP |
| `validation.js` | 656 | KEEP (client-side authority) |
| `guests.js` | (stale?) | **REVIEW** — AGENTS.md says dashboard/invitation no longer import it; confirm dead |
| `validation.test.mjs` | — | KEEP |

## 5. Backend

| File | Lines | Status |
|------|------:|--------|
| `firebase/firestore.rules` | 184 | **RECONCILE** (D-100) permissive model |
| `functions/index.js` | 1391 | KEEP (large but cohesive trigger set) |
| `functions/telegram.js` | 131 | KEEP |

## 6. Duplicated / repeated implementations (targets for deletion)

| Duplication | Locations | Verdict |
|-------------|-----------|---------|
| Lightbox | `cabinsPanel.js#openCabinLightbox` vs invitation `LightboxCarousel.jsx` | consolidate (separate bundles → LOW debt) |
| Guest normalization | dashboard `guests.js#normalizeGuest` vs invitation `guest-profiles.js` | DEFER (D-102) |
| `invitation_groups` / `attendance_responses` / `rsvp_submissions` refs | AGENTS.md bullets + `firestore.rules` legacy matches | REMOVE from docs/rules (dead collections) |

## 7. Dependencies (classification)

| Package | App | Verdict |
|---------|-----|---------|
| `firebase` 12.17 | both | KEEP |
| `ag-grid-community` 36.1 | dashboard | KEEP (Community only) |
| `echarts` 6.1 | dashboard | KEEP |
| `sass` 1.102 | dashboard | KEEP |
| `vite` 7.3 | both | KEEP |
| `react`/`react-dom` 19.2 | invitation | KEEP |
| `@cloudinary/*` + `cloudinary` | invitation | KEEP |
| `dotenv` | invitation | KEEP |
| `@firebase/rules-unit-testing` | invitation dev | KEEP |
| `eslint` 9 + plugins | root | KEEP |

No REMOVE/REPLACE/UPDATE dependencies identified that are in-scope for modernization.