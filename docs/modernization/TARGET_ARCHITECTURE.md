# Target Architecture — Dashboard + Invitation Monorepo

> Status: **PROPOSED / TO BE VALIDATED BY PILOT**
> Date: 2026-08-22
> Pair with: `ASSESSMENT.md` (current state), `REMEDIATION_PLAN.md` (path), `DECISIONS.md` (ADRs).

This describes **where the repository should go**, in terms of ownership,
boundaries, and the file layout a fresh agent should infer. It is grounded in the
actual code, not a generic diagram. It respects two hard constraints discovered
during assessment:

1. The **dashboard is vanilla JS** (no React) — it cannot and should not be
   rewritten into a React feature-folder structure.
2. The **invitation is React 19** with a partially realized `features/` folder.

So the target has **two boundary languages** (one per paradigm) plus one shared
kernel. We unify the *principles*, not the literal folder shape.

---

## 1. The core boundary (both apps)

```
UI (React component | vanilla panel)
        ↓
feature hook / service (reusable behavior + derived state)
        ↓
repository (Firestore reads AND writes)
        ↓
Firestore SDK
```

The predicate to teach agents is:

| Question | Answer (dashboard) | Answer (invitation) |
|----------|--------------------|---------------------|
| Need Firestore op? | `src/repositories/<entity>Repository.js` | `src/features/<feature>/api/<entity>Repository.js` or `src/repositories/` |
| Need React data behavior? | (no React) `src/<entity>Service.js` | `src/features/<feature>/hooks/` or `src/hooks/` |
| Need domain derivation? | `src/<entity>Service.js` (pure, DI) | `src/features/<feature>/domain.js` (pure) |
| Need shared UI? | `src/styles/_*.scss` + DOM helpers | `src/components/ui/` |
| Need grid behavior? | `src/data-grid/` (AG Grid Community) | n/a |
| Need entity grid columns? | `src/<entity>Table.js` (or `features/…/grid/`) | n/a |
| Need global state? | `src/store.js` (single `state`) | app provider/context |

---

## 2. Dashboard target (vanilla JS)

Current god-modules get decomposed by **responsibility**, not line count:

```
web/dashboard/src/
  main.js                    # entry: import + startDashboard(app)
  firebase.js                # firebase app + db + auth (KEEP, tiny)
  bootstrap.js               # startDashboard: auth → repos → renderers ONLY  (NEW)
  store.js                   # single mutable `state` + getters  (NEW)
  repositories/
    guestRepository.js       # createGuest/updateGuest/softDeleteGuest/deleteGuest
                             # + subscribeGuests(onSnapshot)      (ADD read side)
    thanksRepository.js      # createThanks/updateThanks/deleteThanks
                             # + subscribeThanks(onSnapshot)      (ADD read side)
    tableRepository.js       # updateTableLayout/updateTableGuests
                             # + subscribeTables(onSnapshot)      (ADD read side)
    cabinRepository.js       # fetchCabins (getDocs)
    roomRepository.js        # fetchRooms
  domain/                    # pure, dependency-injected (mirrors guestService)
    guests.js                # identity/name/id helpers (from guestDomain)
    cabins.js                # cabin↔room↔guest mismatch derivations  (NEW)
  services/                  # pure derived-state (mirrors guestService)
    guestService.js          # existing pure layer (KEEP as-is)
    cabinService.js          # extracted from cabinsPanel domain bits  (NEW)
  panels/
    guestTable.js            # AG Grid columns/renderers (KEEP, split columns later)
    summary.js               # (KEEP)
    thanksPanel.js           # (KEEP)
    chartsPanel.js           # (KEEP)
    cabinsPanel.js           # thinned: render() only, derivations → services
    tables.js                # (KEEP; subscription → tableRepository)
    tabNav.js                # (KEEP)
    matrixLoader.js          # (KEEP)
  data-grid/                 # (KEEP — AG Grid Community foundation, validated)
```

**Changes that matter (behavior-preserving):**

- Add `subscribe*` functions to guest/thanks/table repositories; `bootstrap.js`
  calls them and passes normalized data to panels. This removes `onSnapshot`
  from `dashboard.js` and `tables.js` and makes the read/write boundary symmetric.
- Introduce `store.js` holding the single mutable `state` object; `dashboard.js`'s
  ~40 DI adapter functions stay as thin `state → service` binders but move to a
  `bootstrap.js` or `adapters.js` location so `dashboard.js` shrinks to a pure
  composition root.
- Extract `cabinService.js` (pure) + a reusable lightbox from `cabinsPanel.js`,
  leaving a thinner `render()`.

**What we do NOT do:** convert the dashboard to React, add AG Grid Enterprise,
add a router, or re-home every function into a `features/` folder (vanilla JS
does not benefit from React's co-location-by-route convention).

---

## 3. Invitation target (React)

Feature-first, but **migrate only as features are touched** (vertical slices):

```
web/invitation/src/
  app/                       # providers + router + config
    providers/
      AppProvider.jsx        # auth session + activity
      ContentProvider.jsx    # trilingual content/t  (SPLIT from AppContext)
    App.jsx                  # composition
  components/
    ui/                      # Button, Dialog (KEEP + extend)
    layout/                  # Nav, Footer, LazySection, FullLoadGate
    shared/                  # LightboxCarousel, SwipeCardCarousel, FlipStepCard,
                             # CoupleNames, HeroDate, StayPlanCard, PaymentSummary
  features/
    coast/                   # (existing) + api/ hooks/ grid n/a
    identity/                # (existing)
    nav/                     # (existing)
    rsvp/                    # (gradual) RSVP, RsvpQuestion, RsvpRecap
    accommodation/           # (gradual) Accommodation, CabinOccupancy
    travel/                  # (gradual) Travel, FlightInfo, AirportAutocomplete
    food/ music/ guisos/ songs/ genres/ attire/ venue/ weekend/ …
      api/     guestRepository.js (per feature where it has Firestore)
      hooks/   useGuests, useSongRequest, …
      components/ (section JSX)
  hooks/                     # cross-cutting: useActivityTracker, useClickTracking,
                             # usePageViewTracking, useSectionTime, useVersionCheck
  services/                  # analytics.js, guest-profiles.js, song-search/, genres/
  lib/                       # cloudinary.js, invitation-link.js, media.js, content/
```

**Changes that matter (behavior-preserving):**

- **Split `AppContext.jsx`** into `AppProvider` (auth + activity) and
  `ContentProvider` (trilingual `content`/`t`). This is the only *urgent* context
  change; it is low-risk and high-clarity.
- **Add per-feature repositories only where Firestore writes exist** — start with
  the features carrying the most write surface (rsvp, songs, genres, identity).
  Do NOT migrate every one of the ~9 direct-Firestore modules at once.
- **Keep `guest-profiles.js`** as the invitation's read-side service (it already
  does `onSnapshot` + subscription correctly); do not force it into a repository
  folder unless a feature migration reaches it.

---

## 4. Shared kernel (both apps)

```
web/shared/
  firestore-paths.js    # collections.*  (KEEP — single source of truth)
  payload-builders.js   # build*Payload   (KEEP — single write-payload source)
  validation.js         # validate* + hasValid*  (KEEP — client-side authority)
```

Potential small addition (only if real reuse appears): a shared `normalizers/`
for guest normalization (dashboard `normalizeGuest` ≈ invitation
`normalizeGuestRecord`). **Defer** until a feature migration touches both
(POLICY: don't over-abstract — see D-102).

---

## 5. Principle → location quick-reference (the "success test" for agents)

After this target is realized, a fresh agent should answer unambiguously:

- **Where do I put Firestore code?** → a `repositories/` module (dashboard) or
  `features/<feature>/api/` (invitation). Never inline in a component/panel.
- **Where do I put a subscription?** → a `subscribeX()` in the matching
  repository; bootstrap wires it. Never in a render function.
- **Where do I put React data behavior?** → `features/<feature>/hooks/`.
- **Where do I put shared UI?** → dashboard `styles/_*.scss` + DOM helpers;
  invitation `components/ui/` + `components/shared/`.
- **Where do I put a pure domain derivation?** → dashboard `services/` (DI);
  invitation `features/<feature>/domain.js`.
- **Do the Firestore rules enforce field validation?** → **NO** (reconciled in
  `ASSESSMENT.md` D.1 + `DECISIONS.md` D-100). Client validation is advisory;
  the rules are a permissive authenticated-only model.
- **Is the dashboard React?** → **NO**, vanilla JS.

---

## 6. What changes if the pilot disproves parts of this

The pilot (see `REMEDIATION_PLAN.md`) is the first vertical slice through
`guestRepository` read-side + `bootstrap.js` + `store.js` + `cabinService.js`
extraction. If the pilot shows the `subscribe*`-in-repository split adds
unnecessary indirection (no real reuse), we collapse it back to the current
`dashboard.js` listener location and adjust this document. Architecture is
validated by implementation, not by diagram.