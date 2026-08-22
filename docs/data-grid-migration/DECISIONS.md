# Decision Log — AG Grid Migration

> Status legend: `Proposed` · `Accepted` · `Superseded`

---

## D-001 — Use AG Grid Community (vanilla JS), not the React wrapper

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The dashboard (`web/dashboard/`) is a **vanilla JS** Vite app — it does not use
React. The invitation app (`web/invitation/`) is React, but the dashboard is not.
The migration targets the dashboard's data grids.

### Decision

Install `ag-grid-community` (the framework-agnostic vanilla JS package) and use
its vanilla JS API (`createGrid`). Do **not** install `ag-grid-react`.

### Why

- The dashboard has no React runtime; `ag-grid-react` would pull React in for no reason.
- The vanilla JS API is the correct fit for the dashboard's imperative DOM model.
- Keeps the dependency footprint minimal and Community-only.

### Alternatives considered

- `ag-grid-react` — rejected: dashboard is not React.
- `ag-grid-enterprise` — rejected: hard Community-only constraint.

### Consequences

- Grids are created imperatively via `createGrid(domElement, gridOptions)`.
- The shared layer (`AppDataGrid`) is a factory, not a React component.

---

## D-002 — AG Grid Community-only (no Enterprise, no license)

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The project must have **$0 mandatory software licensing cost**.

### Decision

Use only AG Grid Community features. Never install/import `ag-grid-enterprise`,
never enable Enterprise modules, never introduce a license key.

### Why

Hard architectural constraint from the migration brief.

### Alternatives considered

- AG Grid Enterprise — rejected (paid).

### Consequences

- Any Enterprise-only feature must be recorded here and reproduced with a simple
  free implementation (AG Grid Community + small custom code) or preserved via
  existing behavior.

---

## D-003 — Scope: only real tables migrate to AG Grid

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The dashboard has several grid-like UIs: the INVITADOS guest table, the thanks
table, the cabins assignment panel, the tables (Mesas) seating canvas, the
summary cards, and echarts charts.

### Decision

Only the **real data tables** migrate to AG Grid: the INVITADOS guest table
(G-001, pilot) and the thanks table (G-002). The cabins panel (G-003), tables
canvas (G-004), summary cards (G-005), and charts (G-006) are **card/canvas/chart
layouts, not tables** — they stay as-is.

### Why

AG Grid is for tabular data. Forcing card/canvas/chart layouts into a grid would
be a regression, not an improvement.

### Alternatives considered

- Migrating everything — rejected: would break card/canvas/chart UX.

### Consequences

- Migration scope is 2 tables.
- Card/canvas/chart code is preserved untouched.

---

## D-004 — Preserve Firestore write safety via existing services/repositories

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The dashboard writes to Firestore through repositories (`guestRepository.js`)
using `setDoc` merge. Inline edits must never replace an entire document.

### Decision

AG Grid is the UI only. Cell edits flow through the existing feature handlers →
services → repositories → Firestore. Never write Firestore from inside arbitrary
cell renderers.

### Why

Preserves document IDs, timestamps, audit fields, nested field semantics, and
security assumptions.

### Alternatives considered

- Writing Firestore directly from renderers — rejected (unsafe, violates layering).

### Consequences

- Cell edit events call existing `saveGuestInline` / `updateGuest` flows.
- Renderers only trigger feature-level handlers.

---

## D-005 — Row identity uses Firestore document ids

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

AG Grid needs stable row identity.

### Decision

Use `getRowId` returning the guest document id (`guest.id`). Never use array
indexes as persistent row identifiers.

### Why

Stable across re-renders, sorts, and filters; matches Firestore document ids.

### Consequences

- `getRowId: (params) => params.data.id`.

---

## D-006 — Preserve the existing column-group filter bar + readiness card

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The INVITADOS table has a column-group filter bar (`data-colgroup`), a readiness
card, checkbox filters, and a group select. These are dashboard-specific UX.

### Decision

Preserve these toolbar/filter controls as-is (they are not table mechanics).
AG Grid handles in-grid sorting/filtering; the toolbar remains the dashboard's
own filter UX.

### Why

Removing them would be a regression. AG Grid column filters are additive, not a
replacement for the dashboard's toolbar.

### Consequences

- Toolbar (readiness card, colgroup, checkbox filters, group select, search) stays.
- AG Grid provides in-grid sort + column filters.

---

## D-007 — AG Grid MCP configuration

- **Date:** 2026-08-22
- **Status:** Accepted

### Context

The official AG Grid MCP (`npx ag-mcp`) provides version-specific documentation.

### Decision

Merge `ag-mcp` into the Cline MCP config, preserving all existing MCP servers.
Verify it works before relying on it for AG Grid APIs.

### Why

Prefer verification over model memory for AG Grid APIs.

### Consequences

- Cline MCP config gains an `ag-mcp` server.
- Future AG Grid work should query the MCP for version-specific docs.

---

## D-008 — Legacy Quartz CSS theme (`theme: "legacy"` + `ag-theme-quartz` class)

Date: 2026-08-22
Status: Accepted

### Context

AG Grid v36 theme is `themeQuartz` by default, but the project keeps design
tokens in SCSS (`web/dashboard/src/styles/_tokens.scss`) and styles every
surface via `_*.scss` partials. Token-driven theming must not leak into JS.

### Decision

Use the legacy precompiled CSS theme: import `ag-grid-community/styles/ag-grid.css`
and `ag-theme-quartz.css` from `gridDefaults.js`, set `theme: "legacy"`, and apply
the `ag-theme-quartz dashboard-data-grid` classes to the grid element. Customize
the palette via CSS variables in `styles/_grid.scss` referencing the SCSS tokens.

### Why

Keeps theming in the SCSS token system (the project convention), avoids a JS theme
object, and is Community-only.

### Alternatives considered

- `themeQuartz.withParams(...)` in JS — rejected: pulls tokens into JS.
- `createTheme({...})` — rejected: same reason.

### Consequences

- `gridDefaults.js` imports the two CSS files once.
- `_grid.scss` owns all AG Grid CSS-variable customizations.

---

## D-009 — Do NOT install the `ag-grid/skills` agent skills (repo has no agent dir)

Date: 2026-08-22
Status: Accepted

### Context

Official AG Grid skills install via `npx skills add ag-grid/skills`, but the CLI
requires a config directory for the target agent (`.claude/`, `.codex/`, …) in the
repo root. This repo tracks no such directory — it uses a single root `AGENTS.md`,
which explicitly says not to create duplicate/competing instruction systems.

### Decision

Do not install the skills. The AG Grid MCP (D-007) is the verification path, and
`docs/data-grid-migration/ARCHITECTURE.md` is the authoritative how-to substitute.

### Why

Installing would create a competing instruction directory that contradicts the
repo's "no duplicate rule systems" convention.

### Alternatives considered

- Installing to `~/.claude` globally — rejected: not this repo's convention and
  not versioned with the migration docs.

### Consequences

- No `skills` dependency or new agent directory.
- Future agents use the MCP + `ARCHITECTURE.md`.

---

## D-010 — Keep toggle-mode inline editors as custom cell renderers (not native editors)

Date: 2026-08-22
Status: Accepted

### Context

The INVITADOS table has rich inline editors whose persistence is multi-part:
name = 4 identity fields, cabin/room = `hosting` (cabin+room, period-aware),
auth email = Auth + `firebaseEmail` via a Cloud Function, group = badge + select +
create-new flow with a bulk "apply to all" confirm.

### Decision

AG Grid owns the grid shell (sort/filter/pin/resize/virtual scroll/row identity).
Editing stays as the existing toggle-mode custom cell renderers wired via a single
delegated listener on the stable grid container. Native AG Grid single-value
editors are NOT used for multi-part persistence.

### Why

Each edit maps to a distinct payload path (`saveGuestInline` / `saveGuestRsvpAnswer`
/ `saveGuestHosting` / `saveGuestEmail`), so a generic native editor would either
duplicate that logic or risk unsafe Firestore writes.

### Alternatives considered

- Native `agSelectCellEditor` + `valueParser` for all fields — rejected: cannot
  express multi-field/period/Cloud-Function persistence faithfully.

### Consequences

- Column defs use `cellRenderer: dataHtmlRenderer(...)`; edit state is DOM-toggle
  shown/hidden within the cell.
- Delegated events survive AG Grid row virtualization.

---

## D-011 — Fixed latent bugs in the old `guestTable.js` while migrating

Date: 2026-08-22
Status: Accepted

### Context

Auditing the pre-migration table surfaced bugs that would `ReferenceError` at
runtime: the cabin-confirm handler referenced an unimported/uninjected
`CABIN_NAME_MAP`; the RSVP cells referenced `rsvpScaleValue`/`rsvpBooleanValue`
which were not in scope; and the group select confirm read the wrong
`data-*` attribute (`select.dataset[selectAttr]` instead of the camelCase key).

### Decision

Fix them as part of the migration: add `getCabinUnitCode()` to `rooms.js` (the
proper inverse of `getCabinDisplayName`) and inject it; read the RSVP values from
the injected `rsvpScaleValue`/`rsvpBooleanValue`; read the group select's guest id
via `getAttribute`.

### Why

These are correctness fixes, not behavior changes — the intended behavior is
obvious, and shipping a guaranteed-throwing handler would be a regression.
Preserves, not removes, functionality.

### Consequences

- `rooms.js` gains `getCabinUnitCode`.
- The pilot grid is exercised rather than carrying forward dead code.

---

## D-012 — Column-group nav drives grid `columnDefs` (not hidden `<td>`s)

Date: 2026-08-22
Status: Accepted

### Context

The INVITADOS table groups columns by use case (Identidad / Presencia /
Pétanque / Playa) via a toolbar nav. The old table conditionally rendered `<th>`
and `<td>` in the template.

### Decision

The column-group nav now rebuilds the AG Grid `columnDefs` (only the active
group's columns are present) on `renderGuestManager`. The pinned Identidad and
Acciones columns are always present.

### Why

AG Grid renders purely from `columnDefs`; conditional DOM injection inside the
grid is not the model. Rebuilding `columnDefs` is the clean mapping.

### Consequences

- `guestTable.js` derives `columnDefs` from `state.columnGroup`.
- Switching groups calls `grid.setColumnDefs(...)`.
