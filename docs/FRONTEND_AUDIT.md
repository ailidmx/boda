# Front-End Architecture Audit

> Status: living document — updated as the front-end evolves.
> Companion docs: `docs/ARCHITECTURE.md` (intended architecture), `docs/ARCHITECTURE_AUDIT.md`
> (backend/data audit), `docs/adr/` (decision log).

This audit covers the two React applications in this monorepo:

| App | Path | Port | Purpose |
|-----|------|------|---------|
| Invitation | `web/invitation` | 5173 | Guest-facing wedding site |
| Dashboard | `web/dashboard` | 5174 | Admin/planning interface |

---

## 1. Existing UI architecture

### Framework & tooling
- **React 18 + Vite 7** for both apps. Plain JavaScript (`.jsx`/`.js`), **no TypeScript**.
- No component library (no MUI, Chakra, Radix, etc.). All UI is hand-rolled.
- No CSS framework (no Tailwind). Styling is hand-written CSS / SCSS.
- No routing library in the invitation (single-page scroll sections). The dashboard is a
  single-page admin shell with tab panels (no react-router).
- No state library (no Redux/Zustand). State is React Context + local state + Firestore
  listeners.

### Styling approach
- **Invitation**: plain CSS files co-located in `web/invitation/src/styles/`, one per
  section/component (e.g. `hero.css`, `rsvp.css`). Two token files:
  - `tokens.css` — the SINGLE source of truth for design tokens: colors, fonts,
    breakpoints, spacing scale, and fluid type ramp (CSS custom properties).
  - `base.css` — reset, global layout, the shared `.button` primitive system
    (`.button`, `.button-dark`, `.button-light`, `.button-ghost`, `.button-small`), and
    the two base-shell layout tokens (`--countdown-height`, `--header-height`).
  - `responsive.css` — cross-cutting shared layout (`.section`, `.section-heading`, grids).
  - `story-bg.css` — animated background effects used by most sections.
- **Dashboard**: SCSS in `web/dashboard/src/styles/`, compiled via `main.scss` which
  `@use`s partials (`_tokens.scss`, `_buttons.scss`, `_layout.scss`, `_modal.scss`,
  `_guests.scss`, `_tables.scss`, `_cabins.scss`, `_groups.scss`, `_tabs.scss`,
  `_thanks.scss`, `_toast.scss`, `_login.scss`, `_responsive.scss`, `_base.scss`).
  - `_tokens.scss` — SCSS variables for colors, fonts, shadows, breakpoints.
  - `_buttons.scss` — `.dashboard-button`.

### Component organization
- **Invitation**: flat `web/invitation/src/components/` (~50 files). Mostly one component
  per section (Hero, Nav, Food, Travel, RSVP, Accommodation, Photos, Music, etc.) plus a
  few shared primitives (`ui.jsx`, `CloudinaryImage.jsx`, `LazySection.jsx`,
  `SwipeCardCarousel.jsx`, `LightboxCarousel.jsx`, `FlipStepCard.jsx`, `PhoneInput.jsx`).
  A `components/ui/` primitives layer is being introduced incrementally: `Button.jsx`
  (with `button-classes.js` / `button-state.js`) and `Dialog.jsx` (with `dialog-state.js`).
  New primitives should live here and be reused rather than re-implemented per feature.
- **Dashboard**: `web/dashboard/src/` with `dashboard.js` (the shell + most UI) plus
  extracted panels/modals (`guestTable.js`, `guestEditorModal.js`, `guestModals.js`,
  `groupsPanel.js`, `summary.js`, `cabins.js`, `tables.js`) and data modules
  (`guests.js`, `rooms.js`, `guestDomain.js`, `firebase.js`, `repositories/`).

### State management
- **Invitation**: `context/AppContext.jsx` provides global app state (language, auth,
  guest profile, activity). Domain data (guests, cabins, genres, song requests, etc.)
  lives in top-level modules (`guests.js`, `guest-profiles.js`, `cabins.js`, `rooms.js`,
  `genre-ratings.js`, `song-requests.js`, `guiso-rankings.js`, `rsvp-responses.js`).
- **Dashboard**: `dashboard.js` holds most UI state; live Firestore `onSnapshot`
  listeners feed `state.liveGuests` and `state.liveGroups`.

### Forms
- Hand-rolled controlled forms. No form library (no React Hook Form / Formik).
- Validation lives in `web/shared/validation.js` (shared with the invitation) and is
  applied before Firestore writes.

### Tables
- Dashboard has several hand-rolled tables (INVITADOS guest table, cabins panel, tables
  panel). Each is bespoke; no shared `DataTable` abstraction.

### Responsive strategy
- Invitation: mobile-first, `min-width` media queries co-located per component, using the
  breakpoints in `tokens.css` (`--bp-sm/md/lg/xl/2xl`).
- Dashboard: `_responsive.scss` with `$bp-tablet: 850px`, `$bp-mobile: 560px`.

### Design system
- **No unified design system across the two apps.** The invitation uses CSS custom
  properties (semantic color names like `--ink`, `--cream`, `--terracotta`, `--marigold`);
  the dashboard uses SCSS variables with different names (`$ink`, `$bg`, `$accent`,
  `$gold`). The two palettes are related but not shared, and there is no shared token
  module.

---

## 2. Problems found

Severity legend: **CRITICAL** / **HIGH** / **MEDIUM** / **LOW**.

### CRITICAL

1. **Two divergent, non-shared design systems.**
   - Files: `web/invitation/src/styles/base.css`, `web/invitation/src/styles/tokens.css`,
     `web/dashboard/src/styles/_tokens.scss`.
   - The invitation and dashboard each define their own color/font/spacing tokens with
     different names and values. There is no single source of truth. Any future shared
     component cannot be styled consistently without duplicating tokens.
   - Risk: every new UI element must re-invent tokens; visual drift between apps is
     guaranteed.

2. **Giant UI files mixing presentation, data, and domain logic.**
   - Files: `web/dashboard/src/dashboard.js` (still the largest dashboard file),
     `web/invitation/src/components/Nav.jsx` (~1003 lines),
     `web/invitation/src/components/IdentityModal.jsx` (~865 lines),
     `web/invitation/src/components/Coast.jsx` (~809 lines),
     `web/invitation/src/components/Accommodation.jsx` (~900 lines after extraction).
   - These components render large UIs, hold form state, perform domain calculations, and
     (in the dashboard) touch Firestore directly. They violate the single-responsibility
     rule and are hard to test.

### HIGH

3. **Direct Firestore access in dashboard UI/data files.**
   - Files: `web/dashboard/src/dashboard.js`, `web/dashboard/src/guests.js`,
     `web/dashboard/src/invitation-profile.js`.
   - The dashboard still calls `collection()`, `doc()`, `setDoc()`, `onSnapshot()`, etc.
     directly in a few places. The repositories layer (`repositories/`) exists for guest,
     group, table, room, and cabin data access.
   - **Progress:** the `tables` collection WRITE path is fully routed through
     `repositories/tableRepository.js` (`updateTableLayout`, `updateTableGuests`); the
     `tables.js` `onSnapshot` listener (a subscription concern) stays in the module. The
     `rooms` and `cabins` READ paths are now routed through `repositories/roomRepository.js`
     (`fetchRooms`) and `repositories/cabinRepository.js` (`fetchCabins`); the pure lookup
     helpers (`getRoomsByCabin`, `getCabinPhotos`, etc.) stay in `rooms.js`/`cabins.js`.
     See ADR-0010 and ADR-0011.
   - Note: the **invitation** components are clean — zero direct Firestore SDK calls in
     `web/invitation/src/components/`. This is the model to follow.



4. **No shared UI primitives; duplicated button/input/card/modal markup.**
   - Files: `web/invitation/src/styles/base.css` (`.button`), `web/dashboard/src/styles/_buttons.scss`
     (`.dashboard-button`), plus dozens of bespoke buttons/inputs/modals across both apps.
   - There is no `components/ui/` layer. Buttons, inputs, cards, dialogs, loaders, and
     empty states are re-implemented per feature. The dashboard even has a separate
     `.dashboard-button` class instead of reusing a shared button primitive.

5. **Emoji-as-icon usage.**
   - Files: `web/invitation/src/components/Nav.jsx`, `web/dashboard/src/dashboard.js`,
     `web/dashboard/src/groupsPanel.js`, `web/dashboard/src/guestEditorModal.js`,
     `web/dashboard/src/guestModals.js`, `web/dashboard/src/guestTable.js`.
   - Text glyphs (✏ ❌ 🗑 📷 📱 ✉️ 🔑 🔒) are used as interface icons. These are
     inconsistent, render differently across platforms, and lack accessible labels.

6. **Inconsistent form architecture.**
   - Files: `web/invitation/src/components/IdentityModal.jsx`,
     `web/invitation/src/components/RSVP.jsx`, `web/dashboard/src/guestEditorModal.js`,
     `web/dashboard/src/guestModals.js`.
   - Forms are hand-rolled with no shared pattern for labels, error messages, required
     indicators, submitting states, or success feedback. Validation is applied
     inconsistently (some client-side, some only at the repository boundary).

### MEDIUM

7. **Inconsistent modal/dialog behavior.**
   - Files: `web/invitation/src/components/IdentityModal.jsx`,
     `web/invitation/src/components/LanguageModal.jsx`,
     `web/invitation/src/components/AboutModal.jsx`,
     `web/dashboard/src/styles/_modal.scss`.
   - Each modal implements its own overlay, close, ESC, and focus handling. No shared
     `Dialog` primitive. Focus trapping and keyboard behavior are inconsistent.

8. **Inline `style={{}}` usage.**
   - Files: `web/invitation/src/components/ui.jsx`, `IdentitySection.jsx`,
     `IdentityModal.jsx`, `Coast.jsx`, `Attire.jsx`, `Accommodation.jsx`,
     `WinampPlayer.jsx`, `Weekend.jsx`, `Story.jsx`, `MatrixLoader.jsx`.
   - Mostly used for CSS custom-property injection (e.g. `--identity-delay`), which is
     acceptable, but some are ad-hoc pixel values that should be tokens.

9. **No shared loading/error/empty state components.**
   - Files: `web/invitation/src/components/MatrixLoader.jsx`,
     `web/dashboard/src/styles/_toast.scss`.
   - Loading, error, and empty states are implemented ad hoc per feature. There is no
     `Spinner`, `Skeleton`, `EmptyState`, or `ErrorState` primitive.

10. **No shared formatting utilities.**
    - Files: `web/invitation/src/components/accommodation-price.jsx` (has `formatPrice`),
      `web/dashboard/src/guestDomain.js`.
    - Currency/date/phone formatting is implemented in a few places with ad-hoc
      `Intl.NumberFormat` / string concatenation. No single `formatCurrency` /
      `formatDate` / `formatPhoneNumber` module.

11. **Magic strings for statuses/levels.**
    - Files: `web/dashboard/src/guestTable.js`, `web/dashboard/src/guestDomain.js`,
      `web/invitation/src/rsvp-scale.js`.
    - RSVP scale levels (0–5), confirmation thresholds, and status labels are repeated as
      literals in multiple places rather than centralized constants/mappings.

12. **Accessibility gaps.**
    - Files: `web/invitation/src/components/Nav.jsx`, `web/dashboard/src/guestTable.js`,
      `web/dashboard/src/tables.js`.
    - Emoji icons lack accessible labels; some interactive elements are `div`s with
      `onClick` rather than buttons; focus management in modals is inconsistent; table
      headers/relationships are not always semantic.

### LOW

13. **Unstable list keys / recreated handlers.**
    - Files: `web/invitation/src/components/Coast.jsx`, `web/dashboard/src/guestTable.js`.
    - Some lists use index keys; inline arrow handlers are recreated each render. Not yet a
      measured perf problem, but worth auditing when optimizing.

14. **Large bundle.**
    - The invitation build emits a ~1.16 MB `index` chunk (312 KB gzip) plus a 547 KB
      firebase chunk. No route-level code splitting (single-page app). Worth revisiting
      only if it becomes a real problem.

15. **`content.js` was a 5,261-line trilingual copy file.**
    - **Resolved (ADR-0021):** split by section into `web/invitation/src/content/` (one
      file per section exporting `{ es, fr, en }`), composed in `content/index.js` into the
      exact same `content` object shape. `content.js` is now a thin re-export of `content`,
      `EVENT`, and `SUPPORTED_LANGUAGES`, so all existing imports are unchanged. The
      composed object is deep-equal to the original (verified for all three languages).


---

## 3. Proposed target front-end architecture

The application is two small-to-medium React apps. The target should be **feature-oriented
with a thin shared UI-primitive layer** — not an over-engineered monolith.

```
web/invitation/src/
  app/                    # App shell, providers, entry composition
  components/
    ui/                   # UI primitives (Button, Input, Dialog, Spinner, EmptyState…)
    shared/               # Shared app components (PageHeader, ConfirmDialog, DataTable…)
  features/
    <feature>/            # e.g. rsvp, accommodation, music, travel, coast
      components/
      hooks/
      services/
      schemas/
      types/
      utils/
      index.ts
  hooks/                  # cross-feature hooks (useActivityTracker, useSectionTime…)
  lib/                    # formatting, cloudinary, analytics helpers
  styles/                 # tokens + global styles
  config/
  types/

web/dashboard/src/
  app/                    # dashboard shell, providers
  components/
    ui/                   # dashboard UI primitives
    shared/
  features/
    guests/
    cabins/
    tables/
    groups/
    records/
  repositories/           # Firestore data access (already exists)
  services/               # domain logic (guestDomain, guestService already exist)
  hooks/
  lib/
  styles/
  config/
  types/
```

**Guiding principles:**
- UI primitives (`components/ui/`) contain little/no business logic.
- Feature components live inside their feature folder.
- Pages/routes compose features; they do not contain Firestore queries or full form
  implementations.
- Firestore stays behind repositories; UI consumes hooks/services.
- One shared design-token source per app (and ideally a shared token module for both).

---

## 4. Proposed refactoring phases

Each phase leaves the app working and is verified with `build:all` + lint + tests.

- **Phase F1 — Front-end audit & documentation** (this document + `FRONTEND_ARCHITECTURE.md`
  + AGENTS.md front-end rules). *Safe, no behavior change.*
- **Phase F2 — Design tokens & UI primitives.** Consolidate tokens; introduce a small
  `components/ui/` layer (Button, Input, Dialog, Spinner, EmptyState, Badge) and migrate
  the highest-traffic usages. Do NOT redesign visuals — preserve appearance.
- **Phase F3 — Shared states.** Standardize loading/error/empty states and dialog/notification
  behavior.
- **Phase F4 — Extract feature boundaries.** Move feature components into
  `features/<feature>/`; keep `components/ui` and `components/shared` thin.
- **Phase F5 — Normalize forms.** Shared form pattern (labels, errors, submitting state).
- **Phase F6 — Normalize CRUD tables.** Extract a reusable `DataTable` only where real
  duplication exists (dashboard INVITADOS, cabins, tables).
- **Phase F7 — Decompose giant components.** `Nav.jsx`, `IdentityModal.jsx`, `Coast.jsx`,
  `dashboard.js` (already partially decomposed).
- **Phase F8 — Accessibility & responsive improvements.** Semantic HTML, focus management,
  accessible icons, keyboard nav.
- **Phase F9 — Testing.** Component + feature tests for reusable primitives and critical
  flows.
- **Phase F10 — Dead-code & duplication cleanup.**

---

## 5. First safe refactoring phase

**Phase F1 (documentation)** is the immediate deliverable and is already in progress:
- `docs/FRONTEND_AUDIT.md` (this file).
- `docs/FRONTEND_ARCHITECTURE.md` (intended front-end architecture).
- AGENTS.md front-end engineering rules.

These are pure documentation and carry zero behavior risk. After they are committed, the
next safe code phase is **F2 (design tokens & UI primitives)**, starting with the smallest,
highest-leverage primitive (a shared `Button`) and migrating the most duplicated usages
without changing appearance.

### F2 progress — shared `Button` primitive (in progress)

The first F2 step is landed: a shared `Button` UI primitive for the invitation.

- `web/invitation/src/components/ui/Button.jsx` — renders the EXISTING `.button` /
  `.button--gold` / `.button-dark` / `.button-light` / `.button-ghost` / `.button-small`
  classes from `styles/base.css`. Supports `as` (button/a), `variant`, `size`, `disabled`,
  `loading`, and pass-through props. No base CSS was changed.
- `web/invitation/src/components/ui/Button.css` — co-located variant styling for the
  primitive. The `.button--gold` metallic gradient + `@keyframes identity-shine` were
  moved here from `styles/base.css` so the primitive owns its variant appearance and the
  golden RSVP CTAs keep their exact look. The base `.button` layout stays in base.css.
- `web/invitation/src/components/ui/button-classes.js` — pure `variant`/`size` → class
  mapping (JSX-free, unit-testable).
- `web/invitation/src/components/ui/button-state.js` — pure `as`/`disabled`/`loading` →
  element + disabled + aria decision (JSX-free, unit-testable).

- Migrated the highest-traffic usages to the primitive without changing rendered
  markup/classes: `Accommodation.jsx` (gold), `RSVP.jsx` (gold), `Petanque.jsx` (gold),
  `Coast.jsx` (ghost).
- `web/invitation/tests/button.test.mjs` — unit tests for class mapping, `as`, `disabled`,
  `loading`, and aria attributes.

The second F2 step is landed: a shared `Dialog` UI primitive for the invitation.

- `web/invitation/src/components/ui/Dialog.jsx` — a BEHAVIORAL modal wrapper that renders
  the overlay + card + close-button structure and owns the shared modal behavior
  (background scroll-lock, ESC-to-close, overlay-click-to-close, focus management). Each
  modal keeps its own visual classes via `overlayClassName` / `cardClassName` /
  `closeClassName`, so migrating preserves each modal's exact appearance — no CSS changed.
- `web/invitation/src/components/ui/dialog-state.js` — pure, JSX-free helpers:
  `dialogBehavior` (resolves `closeOnEscape` / `closeOnOverlayClick`, both defaulting to
  OFF so migration never changes existing behavior) and `dialogClasses` (normalizes the
  per-modal class names).
- Migrated the three invitation modals that share the overlay/card/close structure to the
  primitive without changing rendered markup/classes:
  - `IdentityModal.jsx` — keeps its existing behavior (no ESC / no overlay-click).
  - `LanguageModal.jsx` — keeps its existing behavior (no ESC / no overlay-click).
  - `AboutModal.jsx` — opts into `closeOnEscape` + `closeOnOverlayClick` (it already
    closed on ESC and overlay-click before migration).
- `web/invitation/tests/dialog.test.mjs` — unit tests for the behavior defaults and class
  composition. Wired into `npm test` via `test:dialog`.

The final F2 step is landed: **design tokens consolidated into a single source of truth.**

- `web/invitation/src/styles/tokens.css` is now the ONLY home for the invitation's design
  tokens (colors, fonts, breakpoints, spacing, fluid type). The duplicated color/font
  tokens that previously lived in `styles/base.css`'s `:root` block were removed; `base.css`
  now defines only the two layout tokens specific to the base shell (`--countdown-height`,
  `--header-height`). Since `tokens.css` is imported before `base.css` and the values were
  identical, appearance is preserved exactly (the built CSS output is byte-identical in
  size). See ADR-0013.

**F2 primitive evaluation (deferred — no genuine reuse):** The remaining primitives
listed in the original audit (Input, Spinner, EmptyState, Badge) were evaluated against
the "do not over-abstract / reuse only when real reuse exists" rule and **intentionally
deferred**. Research found each is bespoke with its own class and markup, so a shared
primitive would either change appearance or be a thin pass-through wrapper:
- **Input** — no shared input class. Each feature styles its own: `.song-request-field__input`
  (SongRequest), `.phone-input__number` (PhoneInput), bare inputs in AuthGate. No 2+ call
  sites share a class.
- **Spinner** — only ONE loader exists (`MatrixLoader.jsx`), a bespoke cinematic full-screen
  component with its own `matrix-loader.css`. No generic spinner to unify.
- **EmptyState** — each empty message is bespoke: `.song-request-results__status`,
  `.airport-autocomplete__status`, `.genre-vote__empty`, `.star-vote__empty`,
  `.accommodation-room-empty`, `.rsvp-recap-answer--empty`, `.phone-input__empty`. No shared
  class.
- **Badge** — bespoke per context: `identity-group-badge`, `identity-member-tag` (invitation),
  `badgeHtml`/`badgeStyle` chips (dashboard). No shared class across call sites.

These should be introduced only when a second genuine call site appears (e.g. a new search
feature that needs an empty state, or a second loader). See ADR-0009.

### F3 progress — shared states (evaluated, deferred)

Phase F3 ("Shared states") proposed standardizing loading/error/empty states and
dialog/notification behavior into shared primitives (`Spinner`, `Skeleton`, `EmptyState`,
`ErrorState`, a toast system). A full inventory of both apps was performed and the phase
was **intentionally deferred** — there is no genuine reuse today, so a shared primitive
would either change appearance or be a thin pass-through wrapper:

- **Loading** — the invitation has exactly ONE loader (`MatrixLoader.jsx`, a bespoke
  cinematic full-screen component with its own `matrix-loader.css`) plus a bare unstyled
  `<div className="app-loading">` in `App.jsx`. The dashboard has NO spinner/loader/skeleton
  markup at all (only inline `<small>` status text inside modals). No 2+ call sites share a
  pattern.
- **EmptyState** — every empty message is bespoke with its own class:
  `.song-request-results__status`, `.airport-autocomplete__status`, `.genre-vote__empty`,
  `.star-vote__empty`, `.accommodation-room-empty`, `.rsvp-recap-answer--empty`,
  `.phone-input__empty` (invitation) and `.dashboard-empty` (dashboard). No shared class.
- **ErrorState** — errors are shown via divergent inline status text: the `data-form-status`
  CSS convention (base.css, used by TeAnimas/Accommodation/RSVP), `rsvp-confirmation--error`,
  `song-request-feedback is-error`, `genre-vote__error` (invitation), plus the dashboard's
  toast system and per-modal `<small>` status text.
- **Notification/toast** — the two apps are intentionally separate systems. The invitation
  has NO toast component and uses ZERO `window.alert`/`confirm`/`prompt`; all feedback is
  inline status text. The dashboard HAS a toast system (`_toast.scss`, used by `dashboard.js`
  and `cabinsPanel.js`). There is no cross-app duplication to unify.

The one genuinely shared convention — the `data-form-status` CSS attribute in `base.css`
(used by TeAnimas, Accommodation, RSVP) — is already a shared CSS convention and needs no
new primitive. These primitives should be introduced only when a second genuine call site
appears (e.g. a new search feature needing an empty state, or a second loader). See
ADR-0014.


### F7 progress — giant component decomposition (in progress)

The F7 phase decomposes the largest invitation components into feature-local
sub-components. Each decomposition is verified with `build:all` + lint + tests and
committed separately. No markup/classes change — appearance is preserved.

- **`Coast.jsx` (~809 → ~430 lines)** — extracted into `features/coast/`:
  - `ExtraStayCard.jsx` — the extra-cabin (Plan 1 · stay at Roca Azul) card: member
    tabs, cabin badge, photo carousel, `CabinOccupancy`, and the shared `StayPlanCard`.
  - `CoastSuggestions.jsx` — the Airbnb + hotel accommodation suggestions (mirrors the
    Accommodation "no cabin" pattern).
  - `CoastBudget.jsx` — the Barra de Navidad budget estimate (per-night rate → group
    total for the 4 beach nights).
  - `data.js` — shared `formatPrice` + `MXN_PER_EUR` for the coast feature.
  - `Coast.jsx` now composes these sub-components and keeps only the section
    scaffolding, beach scene, Barra carousel, and the mini-RSVP flow.

- **`guest-profiles.js` — pure domain helpers extracted into a service** — the
  JSX-free, cache-free domain logic moved to `web/invitation/src/guest-profiles/domain.js`
  (a pure module with NO Firestore access and NO module-level cache). The data-access
  layer in `guest-profiles.js` now looks up the live record from the cache and passes it
  in as the `record` argument; the helpers fall back to the static guest fields when
  `record` is absent, preserving behavior exactly. Extracted helpers:
  `normalizeGuestRecord`, `mergeGuestRecord`, `resolveGuestName`, `guestTravelsByPlane`,
  `resolveGuestPhoto`, `resolveGuestPhone`, `resolveGuestEmail`, `resolveGuestMessageAuthor`,
  `resolveIdentityCheckPassed`, `resolveGuestInvitationGroup`, `getGroupMembers`,
  `resolveLiveGuest`.
- `web/invitation/tests/guest-profiles.test.mjs` — unit tests for the domain helpers
  (normalization, name/photo/phone resolution, `travelsByPlane` boolean + legacy
  `travelStatus`, identity check, invitation group, group members, live merge). Wired into
  `npm test` via `test:guest-profiles`.

- **`AppContext.jsx` — auth/login logic extracted into a pure service** — the JSX-free,
  Firebase-free auth helpers moved to `web/invitation/src/auth/auth-logic.js` (a pure
  module with NO Firestore/Firebase access and NO DOM dependency). `AppContext.jsx` now
  imports and calls these helpers instead of inlining the logic. Extracted helpers:
  `getInitialLanguage`, `normalizeIdentifier`, `normalizeLanguage`, `validateCredentials`.
  This also removed a stale `getGuestByUsername` reference (the function no longer exists
  in `guests.js`); per the documented login flow, a bare username is now always resolved
  to `username@AUTH_EMAIL_DOMAIN` with no username lookup.
- `web/invitation/tests/auth-logic.test.mjs` — unit tests for the auth helpers (language
  normalization/initialization, identifier normalization, credential validation). Wired
  into `npm test` via `test:auth-logic`.

- **`Nav.jsx` (~1003 → ~252 lines)** — decomposed into `features/nav/`:
  `SideDrawer.jsx` (desktop hamburger side drawer), `MobileNav.jsx` (mobile split
  dropdowns), `UserMenu.jsx` (user menu + language switcher), and `nav-links.js`
  (the `getNavLinks`/`trackNav` helpers). `Nav.jsx` keeps the desktop nav bar, the
  golden underline, the scroll-spy, and the scroll arrows.
- **`IdentityModal.jsx` (~865 → ~277 lines)** — decomposed into `features/identity/`:
  `MemberCard.jsx` (per-member identity card: name/photo/phone/email + save),
  `MemberTabs.jsx` (the top badge strip), `Avatar.jsx` (avatar upload/preview), and
  `phone-format.js` (pure phone formatting). `IdentityModal.jsx` keeps the modal
  shell, member list, and confirm flow.

All F7 decompositions are now complete: `Nav.jsx`, `IdentityModal.jsx`, `Coast.jsx`,
`guest-profiles.js`, and `AppContext.jsx` have all been split into feature-local
sub-components / pure services. The audit's original line-count figures (~1003 / ~865 /
~809 / ~753 / ~647) reflect the pre-decomposition state and are now stale.

### F4 progress — extract feature boundaries (in progress)

Phase F4 ("Extract feature boundaries") moves feature components out of the flat
`components/` folder into `features/<feature>/` folders, each exposing a public `index.js`
so consumers import shallowly (`import { SideDrawer } from "../features/nav"`) instead of
deep internal paths. This aligns the invitation with the target architecture in §3 and the
AGENTS.md §7.3 rule ("expose each feature through a public `index.ts` and prefer shallow
imports"). No markup/classes change — appearance is preserved.

- **`features/nav/`** — the nav feature (moved from `components/nav/`): `SideDrawer.jsx`,
  `MobileNav.jsx`, `UserMenu.jsx`, `nav-links.js`, and a public `index.js` exporting
  `getNavLinks`, `trackNav`, `SideDrawer`, `MobileNav`, `UserMenu`. `Nav.jsx` imports from
  `../features/nav/index.js`.
- **`features/identity/`** — the identity feature (moved from `components/identity/`):
  `MemberCard.jsx`, `MemberTabs.jsx`, `Avatar.jsx`, `phone-format.js`, and a public
  `index.js` exporting `MemberCard`, `MemberTabs`. `IdentityModal.jsx` imports from
  `../features/identity/index.js`.
- **`features/coast/`** — the coast feature (moved from `components/coast/`):
  `ExtraStayCard.jsx`, `CoastSuggestions.jsx`, `CoastBudget.jsx`, `data.js`, and a public
  `index.js` exporting `ExtraStayCard`, `CoastSuggestions`, `CoastBudget`. `Coast.jsx`
  imports from `../features/coast/index.js`.

The three feature folders now live under `web/invitation/src/features/` and are consumed
via their public `index.js` barrel. The old `components/nav/`, `components/identity/`, and
`components/coast/` folders were removed. See ADR-0015.

### F5 progress — normalize forms (evaluated, deferred)

Phase F5 ("Normalize forms") proposed a shared form pattern (labels, errors, submitting
state) — e.g. a `FormField` / `FormStatus` primitive — to replace the hand-rolled forms in
`IdentityModal.jsx`, `RSVP.jsx`, `AuthGate.jsx` (invitation) and `guestEditorModal.js`,
`guestModals.js` (dashboard). A full inventory of both apps was performed and the phase
was **intentionally deferred** — there is no genuine cross-form reuse that justifies a
primitive without either changing appearance or being a thin pass-through wrapper:

- **Invitation** — the forms are structurally very different: `AuthGate.jsx` is a
  single-column login form (`.password-field`, `.gate-disclosure`, `data-access-status`),
  `IdentityModal.jsx`/`MemberCard.jsx` is a 5-step flip wizard (`.form-field`, one field
  per step, `noValidate`, no per-field errors), and `RSVP.jsx`/`TeAnimas.jsx`/
  `Accommodation.jsx`/`Coast.jsx` are mini-RSVP flows that ALREADY share the
  `data-form-status` CSS convention in `base.css` (driven by a `saveStatus` state:
  working/saved/error). The only shared convention is `data-form-status`, which is already
  a shared CSS convention and needs no new primitive.
- **Dashboard** — the `.dashboard-modal-field` + status-`<small>` (`data-state`
  working/success/error) pattern IS shared across `guestEditorModal.js` and
  `guestModals.js`, but the dashboard is a separate app (per ADR-0014) and builds its
  modals via DOM (`document.createElement` + `innerHTML`), not React — so a React
  `FormField`/`FormStatus` primitive would not apply cleanly.

These primitives should be introduced only when a second genuine React call site shares a
field/status markup pattern (e.g. a new React form that duplicates the `data-form-status`
markup). See ADR-0016.

### F6 progress — normalize CRUD tables (evaluated, deferred)

Phase F6 ("Normalize CRUD tables") proposed extracting a reusable `DataTable` abstraction
where real duplication exists across the dashboard's three "tables": the INVITADOS guest
table, the cabins panel, and the tables panel. A full inventory was performed and the
phase was **intentionally deferred** — the three "tables" are structurally completely
different, so a shared `DataTable` would have exactly one genuine call site and be a thin
pass-through wrapper:

- **`guestTable.js` (INVITADOS)** — the ONLY real semantic `<table>`: a
  `.dashboard-guest-table` with `<thead>`/`<tbody>`, sortable `<th>`s via a `sortTh`
  helper (`data-sort-key`, `▲`/`▼`), and template-literal row rendering. Client-side
  sorting via `guestSortValue`.
- **`cabinsPanel.js` (Asignación de cabañas)** — a CARD grid, not a table:
  `.dashboard-cabin-card` + `.dashboard-cabin-room` + `.dashboard-cabin-guests`
  (`<ul>`/`<li>`), with period tabs, nav badges, a summary card, a photo carousel, and
  drag-and-drop / remove / add-guest interactions. No `<table>` semantics.
- **`tables.js` (Mesas)** — an absolutely-positioned CANVAS floor plan
  (`.dashboard-tables-canvas`, real-life 30 m × 6 m dimensions, `pxPerMeter` scaling,
  `tableSeatPos` seat computation). No table semantics at all.

A `DataTable` primitive should be introduced only when a second genuine `<table>` call
site appears (e.g. a new dashboard table that duplicates the `.dashboard-guest-table` +
`sortTh` pattern). See ADR-0017.

### F8 progress — accessibility & responsive improvements (in progress)

Phase F8 ("Accessibility & responsive improvements") improves semantic HTML, focus
management, and accessible icon labels WITHOUT changing appearance or behavior. Each fix
is purely additive (attributes/roles) or a semantics-preserving swap, verified with
`build:all` + lint + tests and committed separately.

- **Decorative emoji icons marked `aria-hidden` in the user menu** — the signed-in
  account menu (`web/invitation/src/features/nav/UserMenu.jsx`) renders each action as a
  `<button>` with a visible text label plus a decorative emoji icon
  (`.user-menu__item-icon`: 🪪 📷 ✉ 🔑 🎵 ℹ️ 📊 ↪). The accessible name already comes from
  the visible text, so the emoji is redundant for screen readers. All 8 icon spans now
  carry `aria-hidden="true"`, so assistive tech no longer announces the emoji glyphs.
  Purely additive — no markup/class/behavior change, appearance preserved.

**Evaluation of the remaining F8 gaps (deferred — no safe scoped change without a visual
or behavioral trade-off):**
- **Dashboard emoji icons** (`guestTable.js`: 🔒 📷 🔑 ❌ 📱 ✉️ ✏️ 🔗 👁️ 🗑️) already carry
  `title` attributes (e.g. `title="Editar foto de perfil"`). The dashboard is a separate
  app (per ADR-0014) that builds its table via DOM template literals, not React; upgrading
  `title` → `aria-label` there is a dashboard-scoped change better handled in a dedicated
  dashboard pass.
- **Clickable `<div>`/`<span>` → `<button>`** — the audit's flagged interactive elements
  are already real `<button>`s in the invitation (the user menu, nav scroll buttons, and
  modal close buttons are all `<button>`). No safe conversion was found where the CSS
  already styles a non-button element as a button.
- **Dialog focus management** — the shared `Dialog` primitive (F2) already owns ESC /
  overlay-click / scroll-lock behavior; the migrated modals preserve their existing focus
  behavior. Full focus-trap + focus-restore is a behavioral enhancement that would change
  modal behavior, so it is deferred rather than mixed into this structural pass.
- **Table header semantics** — the dashboard's only real `<table>` (`guestTable.js`) uses
  semantic `<th>` headers (via `sortTh`) and `<thead>`/`<tbody>`. No missing-header gap
  was found.

See ADR-0018.

### F9 progress — testing (evaluated, deferred)

Phase F9 ("Testing") proposed "component + feature tests for reusable primitives and
critical flows." The current test setup uses Node's built-in `node --test` runner with
pure `.mjs` unit tests — there is NO jsdom and NO React Testing Library configured. The
existing suite already covers the pure logic extracted during this refactor:

- `tests/button.test.mjs` — the shared `Button` primitive (class mapping, `as`, `disabled`,
  `loading`, aria).
- `tests/dialog.test.mjs` — the shared `Dialog` primitive (behavior defaults, class
  composition).
- `tests/guest-profiles.test.mjs` — the extracted guest-profiles domain service.
- `tests/auth-logic.test.mjs` — the extracted auth/login logic service.
- `tests/validation.test.mjs` — shared validation.
- `tests/song-search.test.mjs` — the song-search service.
- `tests/firestore.rules.test.mjs` — Firestore rules (emulator).

All JSX-free, Firebase-free logic is already unit-tested. Component-level rendering tests
(mount a React component, assert on the DOM) would require a new test harness (jsdom +
React Testing Library), which introduces new infrastructure and dependencies that the
AGENTS.md §7.8 rule ("do not introduce dependencies unnecessarily") and the "smallest
coherent system" principle discourage for a structural refactor. The phase was therefore
**intentionally deferred** — a component-test harness should be introduced only when a
critical user flow needs regression protection that pure-logic tests cannot provide, as
its own scoped infrastructure change. See ADR-0019.

### F10 progress — dead-code & duplication cleanup (in progress)

- **Dashboard legacy-records code removed** — the dashboard no longer loads or renders
  the legacy `rsvp_submissions` / `experience_suggestions` / `coast_interest` /
  `petanque_participation` collections (the app writes answers directly to the `guests`
  doc via `rsvp.answers`). Removed from `web/dashboard/src/dashboard.js`:
  - The `COLLECTIONS` map, `loadDashboardData()`, `showLoadError()`, and
    `updateDashboardData()` (the batch loader + refresh handler).
  - The `getRsvpForGuest()` helper and the `state.rsvps` / `state.suggestions` /
    `state.coast` / `state.petanque` caches.
  - The "Registros" tab, the per-collection record cards, the CSV export buttons
    (`downloadCsvForType`), and the "Actualizar" refresh button.
  - The `recordsPanel.js` module was deleted.
  - The attendance summary cards are now rendered live from `computeDayConfirmations()`
    via a new `web/dashboard/src/summary.js` presentation module, wired into the live
    `guests` `onSnapshot` listener (so FRIDAY / SATURDAY / SUNDAY counts update in
    real time as guests answer). The summary grid was reduced from 5 columns to 3.
  - Orphaned records CSS was removed from `_layout.scss`, `_buttons.scss`, and
    `_responsive.scss` (`.dashboard-record*`, `.dashboard-export`, `.dashboard-records`,
    `.dashboard-detail-row`). `.dashboard-empty` was kept (still used by the groups
    panel).
  - See ADR-0012.

- **`invitation-profile.js` removed (dead code)** — the dashboard's
  `web/dashboard/src/invitation-profile.js` module was deleted. It was never imported
  anywhere in the dashboard (its exports `loadGroupCustomContent`, `getCustomContent`,
  `getGroupContentCache`, `getGroupTag`, `buildInvitationUrl` had zero callers; the
  dashboard reads groups via the live `onSnapshot` listener in `dashboard.js` and
  `groupsPanel.js`, and `buildInvitationUrl` was already inlined into the pure
  `guestDomain.js`). Removing it also eliminated the last direct-Firestore READ
  (`getDocs` on `invitation_groups`) from a non-repository dashboard data module.
  Stale comments in `guestDomain.js` referencing the deleted module were updated.

- **Cabin-assignments panel extracted into `cabinsPanel.js`** — the inline
  `renderCabinAssignments()` in `web/dashboard/src/dashboard.js` was moved to a new
  presentation module `web/dashboard/src/cabinsPanel.js`. The module renders the
  cabin-assignment cards into `[data-cabin-assignments]` and wires the copy-link
  buttons; it contains no Firestore access and no business rules (data is injected as
  dependencies, the same pattern as `guestTable.js` / `groupsPanel.js` / `summary.js`).
  `dashboard.js` keeps a thin adapter that binds the live guest cache
  (`getUniqueCabins` + `getGuestsByUnit`) and `getInviteUrl`. Markup/classes are
  unchanged — appearance is preserved. NOTE: this is the LEGACY simplified cabin view
  (groups by the normalized `unit` field); the richer `hosting`-based drag-and-drop /
  remove / add-guest panel described in AGENTS.md is not present in the current
  codebase and was NOT added (structural refactor only).

- **Tab navigation extracted into `tabNav.js`** — the inline sub-page routing
  (`PATH_TO_TAB` / `TAB_TO_PATH` / `getTabFromPath` / `navigateToTab`) and the tab bar
  (`switchTab` / `renderTabNavigation`) in `web/dashboard/src/dashboard.js` were moved
  to a new presentation module `web/dashboard/src/tabNav.js`. The module owns the
  URL-path ↔ tab-id mapping, the active-tab state (exposed via `getActiveTab`), the tab
  bar rendering, and the DOM class toggling that shows/hides panels. It contains no
  Firestore access and no business rules. `dashboard.js` imports `getTabFromPath`,
  `navigateToTab`, `switchTab`, and `renderTabNavigation` and dropped its own
  `state.activeTab` (the module now owns that state). Markup/classes are unchanged —
  appearance is preserved.

- **`guestSortValue` extracted into the pure `guestService.js`** — the INVITADOS table's
  column sort derivation `guestSortValue(guest, key)` was moved out of
  `web/dashboard/src/dashboard.js` into `web/dashboard/src/guestService.js` as a pure,
  dependency-injected function `guestSortValue(guest, key, authUsers = {})`. The Firebase
  Auth user map is now passed in as the third argument instead of being read from the
  mutable `state.authUsers`, making the function unit-testable in isolation.
  `dashboard.js` keeps a thin adapter with the same short signature
  `guestSortValue(guest, key)` that binds `state.authUsers`, so `guestTable.js` (which
  receives it via `ctx`) is unchanged. No rendered markup or sort order changed.

- **Dashboard test suite wired into `npm test`** — added a `test` script to
  `web/dashboard/package.json` (`node --test tests/*.test.mjs`) and appended
  `npm --prefix web/dashboard run test` to the root `test` script. The dashboard's pure
  modules (`guestDomain.js`, `guestService.js`) are now exercised by the same `npm test`
  that runs the invitation tests. Ten new tests in
  `web/dashboard/tests/guestService.test.mjs` cover every `guestSortValue` sort key
  (name, invitationGroup, idCheck, hasAuth with injected authUsers, group, lang, cabin,
  room, xtraCabin, xtraRoom, status, unknown). See ADR-0020.






