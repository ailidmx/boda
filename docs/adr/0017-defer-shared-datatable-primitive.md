# ADR-0017: Defer shared DataTable primitive (F6)

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

Phase F6 of the front-end refactor ("Normalize CRUD tables") proposes extracting a
reusable `DataTable` abstraction where real duplication exists across the dashboard's
three "tables": the INVITADOS guest table, the cabins panel, and the tables panel. Before
introducing any primitive, the "do not over-abstract / reuse only when real reuse exists"
guardrail (§6b, §7.6) requires confirming there are at least two genuine call sites that
share a markup/class pattern.

A full inventory of the three dashboard "tables" was performed.

## Findings

The three "tables" are structurally completely different:

- **`guestTable.js` (INVITADOS)** — the ONLY real semantic `<table>`: a
  `.dashboard-guest-table` with `<thead>`/`<tbody>`, sortable `<th>`s rendered via a
  `sortTh(key, label)` helper (`data-sort-key`, `▲`/`▼`), and template-literal row
  rendering (`container.innerHTML = ...`). Client-side sorting via `guestSortValue`.
- **`cabinsPanel.js` (Asignación de cabañas)** — a CARD grid, not a table: `.dashboard-cabin-card`
  + `.dashboard-cabin-room` + `.dashboard-cabin-guests` (`<ul>`/`<li>`). No `<table>` /
  `<thead>` / `<tbody>` semantics. Includes period tabs, nav badges, a summary card, a
  photo carousel, and drag-and-drop / remove / add-guest interactions.
- **`tables.js` (Mesas)** — an absolutely-positioned CANVAS floor plan
  (`.dashboard-tables-canvas`, real-life 30 m × 6 m dimensions, `pxPerMeter` scaling,
  `tableSeatPos` seat computation). No table semantics at all.

There is no shared table markup, class, or helper across the three. Only ONE is a real
`<table>`; the other two are a card grid and a canvas floor plan.

## Decision

**Defer** a shared `DataTable` abstraction. There is no genuine reuse today:

- Only ONE call site is a real `<table>` (`guestTable.js`). A `DataTable` primitive would
  have exactly one consumer and would be a thin pass-through wrapper.
- The cabins panel and tables panel are not tables — they are a card grid and a canvas
  floor plan respectively, with no shared markup/class pattern to unify.

## Consequences

- **No new primitive is introduced**, avoiding a thin pass-through wrapper that would
  either change appearance or add no value.
- **Appearance and behavior are preserved** — no markup/classes change.
- **Future trigger:** introduce a `DataTable` primitive only when a second genuine
  `<table>` call site appears (e.g. a new dashboard table that duplicates the
  `.dashboard-guest-table` + `sortTh` pattern). This mirrors the F2/F3/F5 primitive
  deferrals in ADR-0009, ADR-0014, and ADR-0016.
- **Documented** in `docs/FRONTEND_AUDIT.md` (F6 phase).

## Verification

- No code changed — this is a decision + documentation ADR.
- `npm run build:all`, `npm test`, and `npx eslint` remain green (unchanged code).
