# ADR-0011: Route the dashboard `rooms` and `cabins` reads through repositories

**Status:** Accepted
**Date:** 2026-08-18

## Context

The dashboard's room and cabin inventory modules (`web/dashboard/src/rooms.js` and
`web/dashboard/src/cabins.js`) each performed a direct Firestore read via
`getDocs(collection(db, collections.rooms|cabins))` inside their `loadRooms()` /
`loadCabins()` functions. This coupled the data-loading path to the Firestore SDK in
presentation/data modules, scattering collection paths and doc→entity conversion outside
the repository layer (violating ADR-0002).

## Decision

Introduce two read-only repositories, mirroring the `tableRepository` pattern from
ADR-0010:

- `web/dashboard/src/repositories/roomRepository.js` — exposes `fetchRooms()`, which owns
  the `rooms` query (`limit(500)`) and the doc→Room conversion.
- `web/dashboard/src/repositories/cabinRepository.js` — exposes `fetchCabins()`, which owns
  the `cabins` query and the doc→Cabin conversion.

`rooms.js` and `cabins.js` now import and call these functions instead of `getDocs`/
`collection`/`db` directly. The pure lookup helpers (`getRoomsByCabin`, `getRoom`,
`getRoomDescription`, `getRoomOccupancy`, `getCabinNames`, `normalizeCloudinaryIds`,
`getCabinPhotos`) and the static fallback inventory stay in the domain modules, consuming
the loaded list.

## Consequences

- **Positive:** the `rooms` and `cabins` read paths are now behind the repository layer;
  `rooms.js`/`cabins.js` no longer import Firestore SDK functions; collection paths stay
  centralized in `web/shared/firestore-paths.js`; the fetch functions are unit-testable
  with a mocked SDK.
- **Negative:** adds a small layer of indirection for two read call sites.
- **Migration:** incremental. The remaining dashboard Firestore access is the `guests`/
  `invitation_groups` `onSnapshot` listeners (subscription concerns owned by the dashboard
  bootstrap) and the `loadDashboardData` `getDocs` reads, which can be routed through
  repositories the same way if desired.
