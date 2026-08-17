# ADR-0002: Firestore repository layer

**Status:** Accepted
**Date:** 2026-08-17

## Context

Firestore SDK functions (`getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc`,
`collection`, `doc`, `query`, `onSnapshot`, `serverTimestamp`) are called directly from
UI/presentation code — most notably `web/dashboard/src/dashboard.js`, which both renders
HTML and performs Firestore writes. This couples rendering to persistence, makes the data
layer impossible to swap or unit-test, and scatters collection paths and payload shapes
across the codebase.

## Decision

Introduce a **repository layer** that encapsulates all Firestore access. The dependency
flow is:

```
UI component → hooks/use-cases → services → repositories → Firebase/Firestore
```

- **Repositories** own collection paths, queries, document conversion, CRUD, and
  Firestore-specific error handling. They are the only place that imports
  `firebase/firestore` (besides `lib/firebase.js`).
- **Services** implement domain logic and business rules; they do NOT touch Firestore.
- **React components** must NOT import Firestore SDK functions directly.
- Collection names stay centralized in `web/shared/firestore-paths.js`; payloads in
  `web/shared/payload-builders.js`; validation in `web/shared/validation.js`.

## Consequences

- **Positive:** UI is decoupled from persistence; repositories are unit-testable with a
  mocked SDK or the emulator; collection paths and payloads are centralized; the
  dashboard's direct `setDoc`/`deleteDoc` calls can be moved behind repositories.
- **Negative:** Adds a layer of indirection; requires moving existing Firestore calls.
- **Migration:** Incremental. Extract one repository at a time (e.g. `guestRepository`,
  `cabinRepository`, `roomRepository`, `tableRepository`, `groupRepository`,
  `voteRepository`), then route callers through it. Behavior is preserved at each step.
