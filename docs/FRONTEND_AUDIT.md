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
  - `base.css` — `:root` color + font tokens, reset, global layout, and the shared
    `.button` primitive system (`.button`, `.button-dark`, `.button-light`,
    `.button-ghost`, `.button-small`).
  - `tokens.css` — breakpoints, spacing scale, fluid type ramp (CSS custom properties).
  - `responsive.css` — cross-cutting shared layout (`.section`, `.section-heading`, grids).
  - `story-bg.css` — animated background effects used by most sections.
- **Dashboard**: SCSS in `web/dashboard/src/styles/`, compiled via `main.scss` which
  `@use`s partials (`_tokens.scss`, `_buttons.scss`, `_layout.scss`, `_modal.scss`,
  `_guests.scss`, `_tables.scss`, `_cabins.scss`, `_groups.scss`, `_tabs.scss`,
  `_thanks.scss`, `_toast.scss`, `_login.scss`, `_responsive.scss`, `_base.scss`).
  - `_tokens.scss` — SCSS variables for colors, fonts, shadows, breakpoints.
  - `_buttons.scss` — `.dashboard-button`, `.dashboard-export`.

### Component organization
- **Invitation**: flat `web/invitation/src/components/` (~50 files). Mostly one component
  per section (Hero, Nav, Food, Travel, RSVP, Accommodation, Photos, Music, etc.) plus a
  few shared primitives (`ui.jsx`, `CloudinaryImage.jsx`, `LazySection.jsx`,
  `SwipeCardCarousel.jsx`, `LightboxCarousel.jsx`, `FlipStepCard.jsx`, `PhoneInput.jsx`).
- **Dashboard**: `web/dashboard/src/` with `dashboard.js` (the shell + most UI) plus
  extracted panels/modals (`guestTable.js`, `guestEditorModal.js`, `guestModals.js`,
  `groupsPanel.js`, `recordsPanel.js`, `cabins.js`, `tables.js`) and data modules
  (`guests.js`, `rooms.js`, `invitation-profile.js`, `firebase.js`, `repositories/`).

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
   - Files: `web/dashboard/src/dashboard.js`, `web/dashboard/src/cabins.js`,
     `web/dashboard/src/guests.js`, `web/dashboard/src/rooms.js`,
     `web/dashboard/src/tables.js`, `web/dashboard/src/invitation-profile.js`.
   - The dashboard still calls `collection()`, `doc()`, `setDoc()`, `onSnapshot()`, etc.
     directly in several places. The repositories layer (`repositories/`) exists for guest
     and group writes, but cabin/table/room data access is not fully routed through it.
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

15. **`content.js` is a 5,261-line trilingual copy file.**
    - File: `web/invitation/src/content.js`.
    - This is data (copy), not logic, so it is lower risk, but it is unwieldy. Could be
      split by domain if it grows further.

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
  `loading`, and pass-through props. No CSS was changed.
- `web/invitation/src/components/ui/button-classes.js` — pure `variant`/`size` → class
  mapping (JSX-free, unit-testable).
- `web/invitation/src/components/ui/button-state.js` — pure `as`/`disabled`/`loading` →
  element + disabled + aria decision (JSX-free, unit-testable).
- Migrated the highest-traffic usages to the primitive without changing rendered
  markup/classes: `Accommodation.jsx` (gold), `RSVP.jsx` (gold), `Petanque.jsx` (gold),
  `Coast.jsx` (ghost).
- `web/invitation/tests/button.test.mjs` — unit tests for class mapping, `as`, `disabled`,
  `loading`, and aria attributes.

Remaining F2 work: introduce the other primitives (Input, Dialog, Spinner, EmptyState,
Badge) and consolidate design tokens. Do NOT redesign visuals — preserve appearance.

### F7 progress — giant component decomposition (in progress)

The F7 phase decomposes the largest invitation components into feature-local
sub-components. Each decomposition is verified with `build:all` + lint + tests and
committed separately. No markup/classes change — appearance is preserved.

- **`Coast.jsx` (~809 → ~430 lines)** — extracted into `components/coast/`:
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

- **`Nav.jsx` (~1003 → ~252 lines)** — decomposed into `components/nav/`:
  `SideDrawer.jsx` (desktop hamburger side drawer), `MobileNav.jsx` (mobile split
  dropdowns), `UserMenu.jsx` (user menu + language switcher), and `nav-links.js`
  (the `getNavLinks`/`trackNav` helpers). `Nav.jsx` keeps the desktop nav bar, the
  golden underline, the scroll-spy, and the scroll arrows.
- **`IdentityModal.jsx` (~865 → ~277 lines)** — decomposed into `components/identity/`:
  `MemberCard.jsx` (per-member identity card: name/photo/phone/email + save),
  `MemberTabs.jsx` (the top badge strip), `Avatar.jsx` (avatar upload/preview), and
  `phone-format.js` (pure phone formatting). `IdentityModal.jsx` keeps the modal
  shell, member list, and confirm flow.

All F7 decompositions are now complete: `Nav.jsx`, `IdentityModal.jsx`, `Coast.jsx`,
`guest-profiles.js`, and `AppContext.jsx` have all been split into feature-local
sub-components / pure services. The audit's original line-count figures (~1003 / ~865 /
~809 / ~753 / ~647) reflect the pre-decomposition state and are now stale.





