# ADR — Spatial wedding layout & seating editor

- **Status:** Accepted
- **Date:** 2026-08-22
- **Scope:** Dashboard "Mesas" panel (seating/layout planning)

## Context

The dashboard's previous seating view was a hand-rolled DOM canvas
(`web/dashboard/src/tables.js`) that persisted pixel-adjacent grid coordinates
(`x`/`y` in "meters-as-integers", shape, capacity, `slots`, `guestIds`) into
the `tables` collection, with seat positions computed ad hoc in the renderer.

The product needed to evolve into a real 2D spatial event-planning editor:
real-world meter geometry, zones, reusable object catalog, derived seats,
magnetic connections, hard collision, grouping, undo/redo, and guest-seat
assignment.

## Decision

Introduced a pure, side-effect-free **spatial domain/geometry layer** under
`web/dashboard/src/spatial/`, a thin **repository** for Firestore, and a
**vanilla SVG editor** (`web/dashboard/src/spatialEditor.js`).

### Canonical unit

All geometry is in **meters** (rotation in degrees). Pixel positions are never
persisted as geometry. Rendering maps world → screen through a camera
(`viewport.js`); zoom/pan only modify the camera, not the plan.

### Domain model

- `Plan` — top-level document: `venue`, `zones[]`, `definitions[]`,
  `instances[]`, `groups[]`, `connections[]`, `guestAssignments{}`.
- `ObjectDefinition` — WHAT an object is (system vs custom, shape, dimensions,
  seating config, connection ports). System definitions are immutable.
- `ObjectInstance` — WHERE a copy is placed: `{ id, definitionId, zoneId,
  transform:{x,y,rotation}, groupId }`. Never redefines dimensions.
- `Connection` — explicit `{ objectAId, portA, objectBId, portB }`.
- `Group` — `{ id, zoneId, name, objectIds[] }` **with child transforms only**
  (no group-local coordinate system). Group move/rotate mutate child transforms
  around the group pivot.
- `GuestAssignment` — `{ [instanceId]: { [seatId]: guestId } }`.

### Modules

| Module | Responsibility |
|--------|----------------|
| `geometry.js` | snaps, rotation, footprint (SAT/circle), collision, zone containment, group bounds, ports |
| `seating.js` | derived seat anchors (round / rect-edge / square), AUTO capacity |
| `catalog.js` | system definitions, usage counts, structural-change + delete guards |
| `connections.js` | magnetic connection detection, derived seat blocking |
| `groups.js` | group pivot / translate / rotate |
| `editor-state.js` | pure plan reducer (semantic actions) + placement validation + drag candidate |
| `history.js` | local in-session undo/redo (semantic action granularity) |
| `viewport.js` | world↔screen transform, zoom/pan, adaptive grid steps |

### State & history

The plan is the only persistent state. Editing is a **semantic command reducer**
(`reducePlan`). A drag A→B is ONE `MOVE_INSTANCES` action → ONE undo entry.
Undo/redo stays local to the editor session and is never persisted.

### Rendering

**SVG** (DOM) is retained — not Konva/Fabric/Pixi. Rationale: low object count
(tens–hundreds), native DOM hit-testing for seats/objects, zero new dependency,
simplest React/vanilla integration, and touch support via Pointer Events +
`touch-action: none`. The old `tables.js` DOM canvas is superseded
(the panel now renders `spatialEditor.js`); `tables.js` is left intact for the
legacy data but no longer registered as the panel.

### Persistence

New `plans` collection (rules + `collections.plans`). One plan = one document:
`plans/{planId}/plans/{docId}` (default `main`/`default`). `planRepository.js`
owns all reads/writes. **Autosave is debounced and fires only on semantic
commits** (valid drop, rotate, group, connect, guest assign) — never on pointer
movement. UI exposes a `Saving… / Guardado / Error` status.

## Migration

`scripts/migrate-tables-to-plan.mjs` materializes the existing `tables`
collection into a plan: 1 rectangle + N round instances, preserving guest
assignments via slots/guestIds. Dry-run by default; `--execute` writes
`plans/main/plans/default`. The legacy `tables` collection is untouched.

## Consequences

- Geometry is testable (77 tests pass: `web/dashboard/tests/spatial.test.mjs`).
- Zones, catalog (system + custom), rotation, connections, grouping, and guest
  assignment are driven by one canonical domain model.
- The legacy `tables` collection becomes read-only legacy; the new `plans`
  document is authoritative for the editor.