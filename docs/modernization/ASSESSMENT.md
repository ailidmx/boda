# Modernization Assessment — Repository Architecture

> Status: **ASSESSMENT PHASE (complete)**
> Date: 2026-08-22
> Author: senior frontend/architecture assessment

This document is the **current-state** assessment required by the modernization
mandate. It describes how the repository actually works today, its strengths,
weaknesses, and the highest-leverage problems. It is paired with
`TARGET_ARCHITECTURE.md` (where we want to go) and `REMEDIATION_PLAN.md` (how we
get there). Every finding references real files and line counts.

---

## A. What this repository actually is

This is **not** a single React CRUD dashboard. It is a **two-app monorepo** using
two different UI paradigms, plus Firebase backend assets:

| App | Path | UI paradigm | Framework | Language |
|-----|------|-------------|-----------|----------|
| **Invitation** (guest site) | `web/invitation/` | React 19, component model | Vite 7 | JSX/ESM |
| **Dashboard** (admin) | `web/dashboard/` | **Vanilla JS DOM manipulation** (no React) | Vite 7 | ESM |
| Shared | `web/shared/` | n/a | n/a | ESM |
| Functions | `functions/` | Node Cloud Functions | Firebase | ESM |

> **Important correction to the task premise:** the "React CRUD dashboard" is
> actually a **vanilla-JavaScript dashboard**. The React app is the guest-facing
> invitation site. The dashboard builds its UI imperatively via `document` /
> `innerHTML` / `addEventListener` and renders a large DOM tree from a mutable
> module-scope `state` object. There is no React, no JSX, no virtual DOM, and no
> router library in the dashboard. This is a **deliberate, documented decision**
> (see `docs/data-grid-migration/DECISIONS.md` D-001) and must NOT be "migrated
> to React" as part of this modernization — doing so would be a technology
> migration unrelated to the actual problems.

---

## B. Detected stack (authoritative)

```text
React:                React 19.2.8 (invitation ONLY; dashboard has NO React)
Language:             JavaScript (ESM) — no TypeScript anywhere
Bundler:              Vite 7.3.6 (both apps); sass 1.102.0 (dashboard)
Router:               NONE (dashboard uses hand-rolled tabNav + URL hash;
                      invitation is a single scroll page)
Firebase:             firebase 12.17.0 (both apps)
Firestore:            Firestore (client SDK) — backend
Firestore emulator:   @firebase/rules-unit-testing 5.0.1 (invitation test:rules)
Authentication:       Firebase Auth email/password
Callable Functions:   Firebase Functions (getAuth().generatePasswordResetLink, listAuthUsers, sendInvitation)
Data grid:            ag-grid-community 36.1.0 (Community ONLY)
Charts:               echarts 6.1.0 (dashboard)
Cloudinary:           @cloudinary/react + url-gen + cloudinary (invitation)
Styling:              Plain CSS + .scss (dashboard); CSS + tokens (invitation)
Component library:    NONE (invitation has hand-rolled ui/Button.jsx, ui/Dialog.jsx)
Data fetching:        Firestore onSnapshot + one-off getDocs (NO query lib)
State management:     React Context (invitation); mutable module `state` (dashboard)
Forms:                Hand-rolled (NO react-hook-form / formik)
Validation:           Hand-rolled web/shared/validation.js (NO zod/yup)
Tables:               AG Grid Community (2 grids); cabinsPanel card grid; tables canvas
Testing:              node --test (node:test runner), NO vitest/jest
E2E:                  NONE
Linting:              eslint 9 + eslint-plugin-react + react-hooks
Formatting:           NONE (no prettier config)
CI/CD:                GitHub Actions (ci.yml, deploy-invitation.yml, gsheet-firestore-sync.yml)
Hosting:              Firebase Hosting (single origin; dashboard at /dashboard/)
Package manager:      npm (root + web/invitation + web/dashboard + functions)
```

---

## C. Current architecture (how it really works)

### C.1 High-level data flow

```
Firestore (guests, thanks, cabins, rooms, tables, song_requests, …)
        ▲  onSnapshot / getDocs / setDoc (MERGE)
        │
        ├── INVITATION (React)
        │     App.jsx → useApp()/AppContext (auth + content + guests cache)
        │     guest-profiles.js (loadGuestProfiles onSnapshot + subscribeGuestsCache)
        │     └─ ~9 modules call Firestore directly (rsvp-responses, cabins,
        │        rooms, thanks, flight-info, guest-attendance, invitation-profile,
        │        rsvp-scale, hooks/usePageViewTracking, hooks/useActivityTracker)
        │
        └── DASHBOARD (vanilla JS)
              dashboard.js (bootstrap: onSnapshot guests/thanks + auth + access gate + state)
              guests.js (setLiveGuests + cache + getGuest/getActiveGuests)
              guestService.js (pure, DI-derived domain/derived-state functions)
              guestDomain.js (pure identity/name/id helpers)
              guestTable.js (AG Grid render — read-only vs Firestore)
              cabinsPanel.js / tables.js / summary.js / thanksPanel.js / chartsPanel.js
              repositories/ (WRITE path: guest/cabin/room/table/thanks)
              shared/payload-builders.js + validation.js (write payloads)
```

### C.2 Dashboard responsibilities (precise)

- **`web/dashboard/src/dashboard.js` — 1661 lines (god bootstrap).** Single
  exported `startDashboard(app)`. Responsibilities it currently holds:
  1. Firebase Auth `onAuthStateChanged` + access gate (`decideAccess` → admin `isAdminGuest`).
  2. `onSnapshot` on `guests` (the live source of truth) → `setLiveGuests` + `state.liveGuests`.
  3. `onSnapshot` on `thanks` (bounded by `DASHBOARD_QUERY_LIMIT`).
  4. `loadTables()` (which itself opens its own `onSnapshot` in `tables.js`).
  5. `listAuthUsers` callable load → `state.authUsers`.
  6. `createMatrixLoader()` plumbing + `reportSource`.
  7. The module-scope mutable `state` object (lines 128–144).
  8. ~40 **thin adapter functions** that bind `state.authUsers`/`state.liveGuests` into the pure `guestService.js` functions (e.g. `getMergedGuest(guest)` → `serviceGetMergedGuest(guest, state.liveGuests)`). These are NOT duplications — they are a sound dependency-injection adapter layer.
  9. Several **real UI builders** still living here: `renderDashboard`, `renderGuestManager` (delegates), `renderCabinAssignments` (delegates), `renderTableAssignments` (delegates), `renderGroupFilter`, `renderThanksPanel`, `renderChartsPanel`, `renderAccessDenied`, plus `openConfirmModal`, `openGuestEditor`/`openCreateGuestModal`/`openSendInviteModal`/`openDeleteConfirm` adapters.
  10. Mutation orchestrators: `saveGuestRsvpAnswer`, `saveGuestHosting`, `saveGuestInline`, `saveGuestEmail`, `applyInvitationGroupChange`, `applyGroupChange` (all route writes through `repositories/guestRepository.js` + `shared/payload-builders.js`).

- **`web/dashboard/src/cabinsPanel.js` — 1181 lines (the other god module).**
  Single `renderCabinAssignments({…})` that mixes: guest→cabin/room mismatch
  resolution, presence-scale HTML generation, special-cards, MXN formatting, a
  full lightbox (`openCabinLightbox`), a giant internal `render()` with `goTo`/
  `close`/`onKey`, per-period card building, drag-drop target wiring, and the
  add/remove-guest UI. It reads the live cache via `getActiveGuests()` but
  mutates in-memory `guest.hosting` optimistically.

- **`web/dashboard/src/guestService.js` — 652 lines (pure service, GOOD).**
  Holds the derived-state and domain functions as pure, dependency-injected
  helpers (each takes `activeGuests`, `liveGuests`, and/or `authUsers` as args).
  This is the single source of truth for: merged guest, RSVP level/boolean/scale
  answers, payment-confirmed, day confirmations/distributions, readiness,
  filtered guests, sort values, status badge. Covered by `tests/guestService.test.mjs`
  (40 tests). **This is the strongest part of the dashboard and should be the
  model for the rest.**

- **`web/dashboard/src/guestDomain.js` — pure identity/id helpers (GOOD).**

- **`web/dashboard/src/repositories/` — WRITE path only (GOOD but asymmetric).**
  `guestRepository` (`createGuest`, `updateGuest`, `softDeleteGuest`, `deleteGuest`),
  `thanksRepository` (`createThanks`, `updateThanks`, `deleteThanks`),
  `cabinRepository` (`fetchCabins`), `roomRepository` (`fetchRooms`),
  `tableRepository` (`updateTableLayout`, `updateTableGuests`). Writes are
  properly isolated from presentation. **BUT reads/subscriptions are NOT in
  repositories** — `onSnapshot(guests)` lives in `dashboard.js`, `onSnapshot(tables)`
  lives in `tables.js`, `onSnapshot(thanks)` lives in `dashboard.js`. Cabin/room
  are `getDocs` one-off reads in their repos. This read/write ownership split is
  inconsistent.

### C.3 Invitation responsibilities (precise)

- **`web/invitation/src/context/AppContext.jsx` — 623 lines (large context).**
  Provides auth state, the trilingual `content`/`t`, the live guests cache
  (via `loadGuestProfiles`), activity/`isActive`, and section-tracking helpers.
  This is a legitimate cross-cutting context, but it is large and mixes auth +
  content + guests cache + analytics-derived state.

- **`web/invitation/src/guest-profiles.js` — 598 lines** — the guest identity
  layer: `loadGuestProfiles` (group-scoped `onSnapshot`), `subscribeGuestsCache`,
  profile resolution (`resolveGuestName`, `resolveGuestPhoto`, etc.). Direct
  Firestore SDK usage here is expected (it IS the read layer), but it is a
  service-ish file with no `repository` name and no shared boundary with the
  dashboard's `guests.js`.

- **Firestore access is spread across ~9 invitation modules with no repository
  boundary** (unlike the dashboard's `repositories/`): `rsvp-responses.js`,
  `rsvp-scale.js`, `cabins.js`, `rooms.js`, `thanks.js`, `flight-info.js`,
  `guest-attendance.js`, `invitation-profile.js`, plus `hooks/usePageViewTracking.js`
  and `hooks/useActivityTracker.js` (both do `addDoc`). This is `README`-level
  acceptable for a guest site but breaks the `UI → repository → Firestore`
  boundary promised in `docs/ARCHITECTURE.md`.

- **`features/` migration is incomplete.** Only `coast/`, `identity/`, `nav/`
  exist as feature folders. Most guest-facing section components still live
  flat in `components/` (Accommodation.jsx, RSVP.jsx, Petanque.jsx, Food.jsx,
  Travel.jsx, Guisos.jsx, GenreSurvey.jsx, SongRequest.jsx, …). This is an
  intentional gradual migration, not a defect, but it means the feature-first
  target is only ~15% realized on the invitation side.

---

## D. Critical problems (ordered by impact)

### D.1 CRITICAL — Firestore rules are fully permissive and contradict the docs

`firebase/firestore.rules` (184 lines) implements a **"SIMPLE RULES MODEL"**:

```js
function isAdmin() { return request.auth != null
  && get(.../guests/$(request.auth.uid)).data.isAdmin == true; }
function canRead()  { return request.auth != null; }
function canWrite() { return request.auth != null; }   // ← ANY auth user, ANY field
function canDelete(){ return isAdmin(); }
```

Every collection (guests, thanks, cabins, rooms, tables, song_requests,
genre_ratings, guiso_rankings, card_votes, login_events, page_views,
activity_events, attendance_responses, plus 4 legacy `*_submissions`) uses these
same three helpers. Consequences:

1. **Any authenticated guest can write ANY field on ANY guest's document**
   (or any other collection), because `canWrite()` ignores `request.resource`
   entirely. The rich client-side validation in `web/shared/validation.js`
   (`validateGuestContactPayload`, `hasValidGuestContactFields`,
   `hasValidGuestHostingFields`, etc.) is **advisory only** — the rules do not
   enforce it. A malicious or buggy client can write arbitrary shapes.

2. **`AGENTS.md` describes guardrails that no longer exist.** The AGENTS.md
   bullets still reference `hasValidGuestContactFields()`,
   `isNullableShortText()`, `affectedKeys()`, `hasValidAdminGuestFields()`, and a
   guest-write rule of the form
   `(isAdmin() ? true : hasValidGuestContactFields()) && (isAdmin() || …)`.
   **None of these functions appear in the current `firestore.rules`.** The rules
   were simplified to the permissive model, but AGENTS.md (and possibly the auth
   bullets in `docs/`) were not correspondingly updated. This is documentation
   drift with security implications: a future agent reading AGENTS.md will
   believe the DB enforces field validation when it does not.

3. The test `web/invitation/tests/firestore.rules.test.mjs` was written against
   the older field-validating model (it references `paymentConfirmed`,
   `rsvp.answers`, group-member writes). It must be re-verified against the
   current permissive rules — if it still passes it is testing the OLD model or
   is now vacuously green.

**Remediation decision:** see `DECISIONS.md` D-100. Short answer: for a
closed-pool wedding site the permissive model is a *product-acceptable* tradeoff
(any invitee is effectively trusted by the couple), but we MUST (a) reconcile
AGENTS.md + docs to the actual rules, and (b) re-point the rules tests to the
current model, OR (c) restore field-validation. This is the single highest-risk
item because it is a correctness-of-documentation + security-assumption mismatch.

### D.2 HIGH — `dashboard.js` is a 1661-line bootstrap god-module

It is the dashboard's composition root, but it also owns: the `state` object,
the live `onSnapshot` subscriptions, the access gate, the auth-user list fetch,
the matrix-loader plumbing, ~40 adapter functions (sound), and ~15 UI-builder /
modal / mutation-inline functions that conceptually belong elsewhere. The
adapter-pattern itself is good; the problem is that Firestore **reads** and
bootstrap live in the same file as a large amount of DOM-orchestration.

**Target:** split `dashboard.js` into (1) a lean bootstrap (`startDashboard`)
that only wires auth → repositories → renderers, (2) repository read functions
(`subscribeGuests`, `subscribeThanks`, `subscribeTables`, `fetchAuthUsers`) so
the subscription/read side mirrors the existing write repositories.

### D.3 HIGH — `cabinsPanel.js` is a 1181-line card-grid god-module

It mixes domain resolution (guest↔cabin/room mismatch, presence scale), MXN
formatting, a lightbox, render/onKey/goTo/close, special cards, and drag-drop
target wiring. It should be decomposed: a pure module for cabin-mismatch/domain
derivations (mirroring `guestService.js`), a reusable lightbox (it already
duplicates the one-off lightbox pattern used elsewhere), and a thinner
`render()` that only builds DOM from injected derived data.

### D.4 MEDIUM — Invitation Firestore access has no repository boundary

Unlike the dashboard, the invitation React app has no `repositories/`. Firestore
writes/reads are inlined in ~9 feature modules + 2 hooks. For a guest-facing
site this is tolerable, but it contradicts the documented
`UI → hook → repository → Firestore` target and makes the two apps inconsistent.
**Do not** force a full repository rewrite of the invitation now (low leverage,
high churn); instead, standardize the *new* feature pattern and migrate
incrementally as features are touched (see `TECH_DEBT.md`).

### D.5 MEDIUM — `AppContext.jsx` (623 lines) is a large, mixed context

It bundles auth + trilingual content + live guests cache + activity state. It is
genuinely cross-cutting, but should be assessed for a split:
auth/session vs content/`t` vs guests-cache/`subscribeGuestsCache`. Not urgent —
see `TECH_DEBT.md`.

### D.6 MEDIUM — Read/subscribe ownership asymmetry in the dashboard

Writes go through `repositories/`; reads/subscriptions live in `dashboard.js`
and `tables.js`. A future agent cannot answer "where do I put a Firestore
subscription?" unambiguously. Consolidate reads into repositories for symmetry
(see `TARGET_ARCHITECTURE.md`).

### D.7 LOW — Two-app paradigm mismatch (vanilla JS dashboard vs React invitation)

This is a deliberate, documented choice. It is NOT a problem to fix now; it is a
cost to acknowledge. Do NOT migrate the dashboard to React.

---

## E. What is already good (do NOT rewrite)

1. **`guestService.js`** — a pure, dependency-injected derived-state layer with
   40 passing tests. This is the model for every other domain.
2. **`guestDomain.js`** — pure identity/id helpers.
3. **`repositories/` (write path)** — clean `setDoc`/`deleteDoc` isolation with
   correct `merge: true` semantics and `setDoc`-no-merge for create.
4. **`web/shared/firestore-paths.js`** — single source of truth for collection
   names (`collections.*`), used by both apps and functions.
5. **`web/shared/payload-builders.js` + `validation.js`** — single source of
   truth for write payload construction + client validation (advisory given
   D.1, but still the right single place).
6. **AG Grid Community migration** — already complete and validated
   (`docs/data-grid-migration/STATUS.md`: 2 grids migrated, 40/40 tests,
   build:all green, zero Enterprise refs). The `data-grid/` factory
   (`createAppDataGrid`) is a suitably thin abstraction. Do NOT redo this.
7. **Access gate** (`isAdminGuest`, uid==doc-id, decision driven inside the
   `onSnapshot` callback) — correct and already documented.
8. **`subscribeGuestsCache`** pattern for render-time group-member consumers —
   a real, documented gotcha solved correctly.
9. **Existing documentation** (`docs/ARCHITECTURE.md`, `ARCHITECTURE_AUDIT.md`,
   `FRONTEND_ARCHITECTURE.md`, `FRONTEND_AUDIT.md`, `docs/adr/`, and the
   data-grid-migration set) — unusually thorough. The modernization docs live
   alongside them and must not contradict them.
10. **Cabin name map / `getCabinUnitCode`** — single mapping source.

---

## F. State-management assessment (category map)

| State source | Class | Where it lives | Verdict |
|--------------|-------|----------------|---------|
| Auth user (invitation) | app-global | `AppContext` | KEEP (cross-cutting) |
| Trilingual `content`/`t` | app-global config | `AppContext` | KEEP, consider separate provider |
| Live guests cache (invitation) | server state | `AppContext` + `guest-profiles` + `subscribeGuestsCache` | KEEP (Firestore realtime) |
| Live guests cache (dashboard) | server state | module `state.liveGuests` + `setLiveGuests` | KEEP (realtime); consider a store module |
| `state` object (dashboard) | server + local UI | `dashboard.js` module scope | REFACTOR — split server vs UI state |
| Auth users map (dashboard) | server state | `state.authUsers` (from callable) | KEEP |
| Filter/sort/colGroup (dashboard) | local UI | `state` | KEEP |
| Section time / activity / page views | derived + analytics | hooks | KEEP |
| RSVP answers (per guest) | server state | inside `guests` docs (`rsvp.answers`) | KEEP (single source of truth, no mirror) |

**No duplicated state found at the source level** — the earlier worry that
`dashboard.js` duplicated `guestService.js` was **false**: the `dashboard.js`
functions are thin DI adapters binding `state` to the pure service functions.
Good. The real state smell is that the dashboard has **no explicit store
module** — `state` is a raw mutable object scattered across a 1661-line file.

**Server-state tooling decision:** no TanStack Query / React Query. Firestore
`onSnapshot` already provides realtime sync + client cache; a query library
would add a second cache layer on top of Firestore's own for no concrete value
here. **KEEP no-query-lib** (see `DECISIONS.md` D-101).

---

## G. Firestore assessment (dedicated)

- **Direct SDK usage (dashboard):** reads/subscriptions in `dashboard.js`
  (`onSnapshot` guests + thanks), `tables.js` (`onSnapshot` tables),
  `cabins.js`/`rooms.js` (`getDocs`), guarded writes in `repositories/`.
- **Direct SDK usage (invitation):** `guest-profiles.js` (onSnapshot + setDoc),
  `rsvp-responses.js` (setDoc), `rsvp-scale.js`, `cabins.js`, `rooms.js`,
  `thanks.js` (getDocs), `flight-info.js`, `guest-attendance.js`,
  `invitation-profile.js` (getDoc), `hooks/usePageViewTracking.js`,
  `hooks/useActivityTracker.js` (addDoc).
- **Unsafe full-document writes?** No `setDoc` without merge in the app write
  paths except intentional create (`createGuest` uses `setDoc` no-merge to fail
  loudly on duplicate id). All guest edits use `merge: true`.
  **Nested-map replace bug risk:** documented in AGENTS.md (the `identity`
  wipe incident) — all scripts now use dot-notation. Verify no lingering
  `update({ map: {...} })` in the app (none found in repos; they all merge).
- **Realtime subscriptions:** genuinely appropriate for `guests` (the couple
  edits assignments live and guests self-update) and `thanks` (guest thank-you
  messages). `tables` is read-heavy but low-frequency; `onSnapshot` is fine.
  `cabins`/`rooms` are on-demand `getDocs` (correct — they are static inventory).
- **Subscription cleanup:** `tables.js` tracks `unsub` and cleans up; the
  dashboard's guests/thanks `onSnapshot` unsubs are returned but should be
  verified they are invoked when `signOut`/access-denied. **Flag for review.**
- **Collections loaded in multiple places:** `guests` is loaded once (dashboard
  bootstrap) and cached in `guests.js`; the invitation loads it once via
  `guest-profiles`. No double-loading of the same client-side listener found.
- **Pagination:** none (wedding guest list is bounded; `DASHBOARD_QUERY_LIMIT`
  is the safety cap). Acceptable.

**Target pattern** (already partially realized):
`UI → feature hook/panel → repository(read+write) → Firestore`. The gap is that
reads are not yet in repositories.

---

## H. Component architecture assessment (dashboard = modules, invitation = components)

**Dashboard "components" (imperative modules):**
- `dashboard.js` (1661) — too many responsibilities (D.2).
- `cabinsPanel.js` (1181) — too many responsibilities (D.3).
- `guestTable.js` (1098) — AG Grid column/renderer definitions; large but
  conceptually cohesive (column defs + renderers + event wiring). **KEEP**, but
  column defs could split into `features/guests/grid/columns.js` later.
- `tables.js` (351), `summary.js` (479), `thanksPanel.js` (412),
  `chartsPanel.js` (258) — cohesive single-purpose modules. **KEEP**.

**Invitation components:**
- `guestTable` equivalent: the dashboard is the only grid consumer; the
  invitation has no tables.
- Section components (Food, Travel, RSVP, Accommodation, Petanque, Music,
  Guisos, SongRequest, GenreSurvey, Attire, Story, Venue, Weekend, Weather,
  Gift, Coast) are feature components living flat in `components/`. The
  `features/` folder has only coast/identity/nav.
- Reusable primitives exist and should be reused: `LightboxCarousel`,
  `SwipeCardCarousel`, `FlipStepCard`, `CoupleNames`, `HeroDate`,
  `ui/Button.jsx`, `ui/Dialog.jsx`, `StayPlanCard`, `PaymentSummary`.

**Duplicated modal/form patterns:** lightbox is re-implemented in `cabinsPanel.js`
(`openCabinLightbox`) instead of reusing the invitation `LightboxCarousel`
(violates "reuse before create", but the two apps are separate bundles — note
this as a LOW debt, not a blocker).

---

## I. CRUD pattern assessment (dashboard entities)

| Entity | LIST | CREATE | EDIT | DELETE | VALIDATION | PERMISSIONS | Grid |
|--------|------|--------|------|--------|------------|-------------|------|
| guests | AG Grid | modal (`guestCreateModal`) | inline + modal (`guestEditorModal`) | soft-delete confirm | `payload-builders`/`validation` (advisory) | `isAdmin` gate only | ✅ migrated |
| thanks | AG Grid | modal (`thanksPanel` opens) | modal | confirm | shared | `isAdmin` gate | ✅ migrated |
| cabins | card grid | — | drag-drop + add/remove | ✕ (sets null) | shared | `isAdmin` | n/a (cards) |
| tables | canvas | — | drag-drop + auto-layout | — | shared | `isAdmin` | n/a (canvas) |

CRUD is **not yet boring**: guests and thanks use AG Grid + repos; cabins and
tables use bespoke imperative panels with mutations orchestrated by `dashboard.js`.
The write side is standardized (repositories + payload builders); the read side
and the panel orchestration are not.

---

## J. Form & validation assessment

- **Forms:** hand-rolled. Invitation has AuthGate (login), IdentityModal
  (5-step wizard), RSVP (multi-step mini-RSVP cards), RsvpQuestion/RsvpRecap,
  PhoneInput. Dashboard has DOM-built modals using `.dashboard-modal-field` +
  `data-state`.
- **No form library is needed.** The forms are bespoke and the shared conventions
  (`data-form-status` in invitation, `.dashboard-modal-field` in dashboard) are
  already consistent enough per ADR-0014/0016. Introducing react-hook-form into
  the invitation OR a form framework into a vanilla-JS dashboard would be
  churn without leverage. **KEEP hand-rolled, standardize conventions.**
- **Validation:** `web/shared/validation.js` is the single validation source.
  It is NOT enforced by rules (D.1). **KEEP as the client-side authority; either
  restore rule enforcement or document the permissive model.**

---

## K. Routing & authorization assessment

- **Routing:** no router. Dashboard uses `tabNav.js` (URL hash) + switchTab/
  navigateToTab. Invitation is a single scroll page with section nav. **KEEP**
  (a router would be overkill for both).
- **Authorization:** dashboard gate = `isAdminGuest(guest)` where auth uid ==
  guest doc id. Clean and already documented. No duplicated permission checks
  found (single `isAdminGuest` + single `decideAccess`). The frontend permission
  is advisory; Firestore rules are the actual boundary (currently permissive —
  see D.1). **Expose a `usePermissions()`/`isAdminGuest` equivalent is not
  needed** — there are only 2 admins and one gate.

---

## L. Error & loading & notification assessment

- **Errors:** mutations wrap saves in try/catch and surface a toast/inline.
  Consistent-ish, but errors are `alert()`/`showToast` inline per panel — no
  single error policy. See `TECH_DEBT.md` (LATER).
- **Loading:** `MatrixLoader` is the single dashboard loader (bespoke but
  consistent). Invitation uses `FullLoadGate` + section-level states. **KEEP**
  (ADR-0014 already deferred unifying them).
- **Notifications:** dashboard `showToast` (custom, `_toast.scss`). Invitation
  uses inline status + `data-form-status`. Telegram notifications are
  server-side (functions). **KEEP** the divergence — it is deliberate.

---

## M. Performance assessment (actual risks only)

1. **`guestTable.js` (AG Grid)** — correctly virtualized; no unvirtualized
   large list. ✅
2. **`cabinsPanel.js`** rebuilds the entire panels DOM on each re-render; with
   ~263 guests this is fine but it is the only O(n) DOM-churn candidate. Flag
   LOW, do not prematurely optimize.
3. **Duplicate normalization:** `normalizeGuest` (dashboard `guests.js`) and
   `normalizeGuestRecord` (invitation) normalize independently. Acceptable
   (separate bundles) but noted as a shared-helper opportunity.
4. **No `useMemo`/`useCallback` cargo-culting** detected in invitation — good.
5. **Unstable Context value:** `AppContext` value identity on every render —
   verify if it re-renders all children on each guests-cache tick. Flag LOW.
   Do NOT blanket-memoize; profile first.

---

## N. AI-agent maintainability assessment

**What is already agent-friendly:**
- `AGENTS.md` is extremely detailed and operational.
- Collection names centralized in `firestore-paths.js`.
- Payloads + validation centralized in `payload-builders.js`/`validation.js`.
- AG Grid has a documented architecture (`docs/data-grid-migration/ARCHITECTURE.md`).
- Repositories for writes, service layer for derived state.

**What is ambiguous for a fresh agent:**
1. "Where do I put a Firestore **subscription**?" — reads live in `dashboard.js`/
   `tables.js`, writes in `repositories/`. Ambiguous (D.6).
2. "Is the dashboard React?" — a fresh agent reading the task premise may assume
   React; it is vanilla JS. Must be stated up front in AGENTS.md (§stack).
3. "Do the Firestore rules enforce validation?" — AGENTS.md implies yes, the
   rules say no (D.1). Misleading.
4. "Where does a new invitation feature's Firestore code go?" — no repository
   boundary on the invitation side; agents will inline it (as happened).
5. Feature-first target is described but only ~15% realized — an agent cannot
   tell whether to put a new section in `components/` or `features/`.

These five ambiguities are the primary agent-facing targets of the remediation.

---

## O. Scorecard (current → target)

Scale 1 (weak) … 5 (strong).

| Dimension | Current | Target | Notes |
|-----------|:-------:|:------:|-------|
| Component architecture | 2 | 4 | dashboard god-modules; split + DI adapters are sound |
| Feature isolation | 2 | 4 | invitation features/ incomplete; dashboard panels flat |
| Code reuse | 3 | 4 | carousels/modal reuse good; lightbox dup in cabinsPanel |
| Data access | 3 | 4 | writes in repos; reads/subscriptions not yet |
| State management | 3 | 4 | reactive Context + live cache OK; dashboard `state` scattered |
| Firestore usage | 3 | 4 | merge-safe writes good; permissive rules (D.1) |
| Forms | 3 | 3 | hand-rolled but consistent (keep) |
| Validation | 3 | 4 | single source but advisory (rules don't enforce) |
| Tables | 5 | 5 | AG Grid Community done, validated |
| Error handling | 2 | 3 | inconsistent per panel |
| Loading handling | 3 | 3 | MatrixLoader consistent |
| Testing | 4 | 4 | strong pure-logic; no E2E/component harness (deferred) |
| Performance | 4 | 4 | no red flags; cabinsPanel DOM churn low-risk |
| Accessibility | 2 | 3 | hand-rolled modals/lightbox; no focus-trap (invitation has Dialog) |
| AI-agent maintainability | 2 | 4 | docs good but 5 ambiguities (N) |
| Developer experience | 3 | 4 | two paradigms; clear scripts; build:all |

---

## P. Highest-leverage problems (the 5–10 that drive the plan)

1. **CRITICAL — Firestore rules vs docs/AGENTS.md mismatch (D.1).** Security +
   trust of the agent instructions.
2. **HIGH — `dashboard.js` god-bootstrap (D.2).** Composition root + state +
   subscriptions + UI builders.
3. **HIGH — `cabinsPanel.js` god-panel (D.3).** Mixed domain + DOM + lightbox.
4. **MEDIUM — No repository boundary on the invitation Firestore access (D.4).**
5. **MEDIUM — Read/subscribe ownership asymmetry (D.6).**
6. **MEDIUM — `AppContext` large mixed context (D.5).**
7. **MEDIUM — Agent-facing ambiguity (N).** Fix by reconciling rules/docs and
   stating the stack/pipeline unambiguously.
8. **LOW — Incomplete invitation `features/` migration (D.7/C.3).**
9. **LOW — `cabinsPanel` lightbox duplication vs `LightboxCarousel` (H).**
10. **LOW — No formatting tool (prettier) and no E2E (both deferred).**

---

## Q. Recommended standard tools (with cost/license)

| Problem | Existing | Recommended | Why | License | Complexity |
|---------|----------|-------------|-----|---------|-----------|
| Data grid | hand-rolled HTML table (before) | **AG Grid Community** | already adopted + validated | MIT (Community) | DONE |
| Grid docs at build time | model memory | **ag-mcp** MCP | version-specific docs | free | DONE |
| Server state | Firestore onSnapshot | **KEEP no query lib** | Firestore already syncs | n/a | none |
| Forms | hand-rolled | **KEEP** | bespoke + conventions consistent | n/a | none |
| Validation | shared/validation.js | **KEEP** (single source) | already centralized | n/a | none |
| Rules | permissive simple model | **reconcile + decide** | correctness/security | free | LOW |
| Component lib | hand-rolled ui/ | **KEEP** (no new dep) | low count, bespoke style | n/a | none |

> **No new paid or free dependency is proposed** by this assessment. The stack is
> already appropriately minimal. The modernization is **structural consolidation
> and correctness-of-documentation**, not library adoption.

---

## R. What this assessment does NOT recommend (scope control)

- ❌ Migrating the vanilla-JS dashboard to React.
- ❌ Adding TypeScript.
- ❌ Adding a router, react-hook-form/zod, TanStack Query, or a component library.
- ❌ Re-doing the already-complete AG Grid migration.
- ❌ A big-bang folder reorganization (see REPLACE vs MOVE philosophy).

---

*Next: `TARGET_ARCHITECTURE.md` → where the boundaries should be; then
`REMEDIATION_PLAN.md` → ordered steps; `DECISIONS.md` → ADRs; `INVENTORY.md`,
`TECH_DEBT.md`, `MIGRATION_STATUS.md`, `SESSION_HANDOFF.md`.*