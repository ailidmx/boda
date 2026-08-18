# ADR-0010: Route the dashboard `tables` collection writes through a repository

**Status:** Accepted
**Date:** 2026-08-18

## Context

The dashboard's tables panel (`web/dashboard/src/tables.js`) is a real-life 30 m × 6 m
seating canvas. It performs two kinds of Firestore writes directly via `setDoc`:

1. **Auto-ordenar** — persists each table's computed layout (`x`, `y`, `shape`,
   `updatedAt`) onto the `tables` collection.
2. **Drag-and-drop reassignment** — persists the new ordered `guestIds` array onto the
   source and destination tables.

These direct `setDoc(doc(db, collections.tables, …))` calls in presentation code violate
ADR-0002 (Firestore repository layer): rendering is coupled to persistence, collection
paths and payload shapes are scattered, and the write path is not unit-testable.

## Decision

Introduce `web/dashboard/src/repositories/tableRepository.js` as the ONLY module that
touches the `tables` collection for the dashboard. It exposes two merge-write functions:

- `updateTableLayout(tableId, payload)` — merge-writes layout fields (`x`, `y`, `shape`,
  `updatedAt`).
- `updateTableGuests(tableId, guestIds)` — merge-writes the `guestIds` array.

`tables.js` now imports and calls these functions instead of `setDoc`/`doc` directly. The
`onSnapshot` listener that feeds the live tables cache is a **subscription concern** and
stays in `tables.js` (mirroring how the dashboard's `guests`/`invitation_groups`
listeners are owned by the dashboard bootstrap, not the repositories).

## Consequences

- **Positive:** the `tables` write path is now behind the repository layer; `tables.js`
  no longer imports `setDoc`/`doc`; collection paths stay centralized in
  `web/shared/firestore-paths.js`; the write functions are unit-testable with a mocked
  SDK.
- **Negative:** adds a small layer of indirection for two call sites.
- **Migration:** incremental. The remaining dashboard collections (`cabins`, `rooms`,
  `guests` reads) can be routed through repositories the same way, one at a time.
