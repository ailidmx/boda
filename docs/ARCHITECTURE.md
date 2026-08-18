# Architecture — David & Aydé Wedding App

**Status:** Target architecture (incremental). See `docs/ARCHITECTURE_AUDIT.md` for the
current-state audit and `docs/adr/` for the decision log.

This document describes the **intended** architecture. It is the contract every future
change should respect. When an architectural decision changes, update this document and
add an ADR.

---

## 1. Guiding principles

1. **Correctness first** — never break existing behavior during a refactor.
2. **Feature-oriented modules** — group code by domain (guests, rsvp, cabins, music,
   travel, coast), not by technical layer.
3. **Layered dependency flow** — UI → hooks/use-cases → services → repositories →
   Firebase/Firestore. **React components must not import Firestore SDK functions.**
4. **Single source of truth** — one normalizer, one set of constants, one collection-name
   map, one validation contract.
5. **Small, cohesive modules** — no god files. Split by responsibility, not by line count.
6. **Reuse before build** — search for an existing abstraction before creating a new one.
7. **No unnecessary dependencies** — prefer the standard library and existing shared code.

---

## 2. High-level layout

```
web/
├── invitation/          # Guest-facing React app (Vite, JSX)
├── dashboard/           # Admin app (Vite, vanilla JS)
└── shared/              # Framework-agnostic shared code
    ├── firestore-paths.js   # centralized collection names
    ├── payload-builders.js  # explicit allowlisted payload builders
    └── validation.js        # runtime validators mirroring the rules
functions/               # Cloud Functions (Telegram, Gmail, auth listing)
firebase/                # firestore.rules + firestore.indexes.json
scripts/                 # Admin SDK scripts (migrations, sync, inspect)
docs/                    # architecture, schema, processes
```

---

## 3. Target feature-oriented structure

Each app should progressively adopt a feature-oriented layout. Do **not** create folders
mechanically — only create a folder when it holds real, cohesive code.

```
web/invitation/src/
  app/                    # App.jsx, providers, section composition
  features/
    guests/               # guest identity, profiles, guest cloud
      components/
      hooks/
      services/           # domain logic (no Firestore)
      repositories/       # Firestore access (paths, queries, CRUD)
      schemas/            # runtime validation
      types/
      index.ts            # public API: import { useGuests } from "features/guests"
    rsvp/
    cabins/
    music/                # genre survey, song requests, card votes
    travel/               # flight info, airports
    coast/
    ...
  shared/                 # cross-feature UI + lib
  lib/                    # firebase, analytics, cloudinary
  hooks/
  config/
```

### Public module APIs

Expose each feature through its `index.ts`:

```js
// features/guests/index.ts
export { useGuests } from "./hooks/useGuests";
export { guestService } from "./services/guestService";
export { guestRepository } from "./repositories/guestRepository";
```

Prefer shallow imports:

```js
import { useGuests } from "features/guests";
```

Avoid deep cross-feature imports into internal implementation files.

---

## 4. Layer boundaries

### The dependency flow

```
UI component
  → hooks / use-cases
  → domain/service layer
  → repository/data-access layer
  → Firebase/Firestore
```

### Rules

- **React components** handle rendering, composition, interaction, and presentation
  state. They must NOT import `getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc`,
  `collection`, `doc`, `query`, `onSnapshot`, or `serverTimestamp` directly.
- **Hooks / use-cases** orchestrate: call services, hold UI state, manage subscriptions.
- **Services** implement domain logic and business rules. They do NOT touch Firestore.
- **Repositories** encapsulate all Firestore access: collection paths, queries, document
  conversion, CRUD, and Firestore-specific error handling. They do NOT contain UI behavior
  or business rules.
- **Shared contract layer** (`web/shared/*`) stays framework-agnostic and is the canonical
  source for collection names, payload shapes, and validation.

### Example

```
UserTable
  → useUsers()
  → userService
  → userRepository
  → Firestore
```

---

## 5. Firestore access

- **Centralize collection names** in `web/shared/firestore-paths.js`. Never hardcode a
  collection name in a component or service.
- **Centralize payloads** in `web/shared/payload-builders.js`. Never spread raw form state
  into Firestore.
- **Validate before write** using `web/shared/validation.js` (mirrors the rules). Route
  dashboard writes through the same validators.
- **Repositories** own the Firestore SDK calls. A repository is the only place that
  imports `firebase/firestore` (besides `lib/firebase.js`).
- **Business rules** (e.g. RSVP confirmation threshold ≥ 4, cabin name mapping, guest
  status derivation) live in services, not in repositories or components.

---

## 6. Types and validation

- The project is JavaScript. A **gradual** TypeScript migration is acceptable but not
  required. Do not rewrite the app to introduce TS.
- Define explicit domain types (JSDoc `@typedef` today, `.ts` later) for `Guest`, `Room`,
  `Cabin`, `Table`, `InvitationGroup`, `DashboardMetric`, etc.
- Where external/user-generated data enters the system, use runtime validation
  (`web/shared/validation.js`). Do not introduce a validation library without
  justification.

---

## 7. Component rules

- A component should primarily handle rendering, composition, interaction, and
  presentation state.
- A component should NOT simultaneously render a large UI, query Firestore, transform
  records, implement domain calculations, perform validation, manage notifications,
  implement CRUD, and implement routing.
- If a component exceeds ~200–300 lines, inspect whether it holds multiple
  responsibilities. Split by responsibility, not to satisfy a line count.

---

## 8. No god files

Do not create:

- `utils.js` containing everything
- `services.js` containing every service
- `firebase.js` containing all application behavior
- `api.js` containing all data logic
- `helpers.js` containing unrelated functions

Prefer cohesive modules with explicit responsibility.

---

## 9. Testing

Establish a testing pyramid appropriate to this repository:

- **Unit tests** — domain calculations, transformation functions, validation
  (`web/shared/validation.js`, services).
- **Integration tests** — repositories/services where practical; Firestore emulator rules
  tests (already present in `web/invitation/tests/`).
- **E2E** — critical CRUD workflows, authentication, dashboard navigation, create/edit/
  delete flows (when browser automation is available).

Test behavior, not implementation details.

---

## 10. Documentation

- `docs/ARCHITECTURE_AUDIT.md` — current-state audit and problem inventory.
- `docs/ARCHITECTURE.md` — this document (intended architecture).
- `docs/adr/` — Architecture Decision Records for meaningful decisions.
- `AGENTS.md` — operational rules for AI agents working on this repo.

Update architecture documentation whenever an architectural decision changes.
