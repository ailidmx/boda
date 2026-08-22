# Data Grid Architecture — AG Grid Community

This document is the authoritative "how-to" for the dashboard's data grids after
the AG Grid Community migration. It reflects the ACTUAL implementation, not an
aspirational design.

> **Community-only.** Only `ag-grid-community` is used. No `ag-grid-enterprise`,
> no `LicenseManager`, no license key, no watermark.

---

## Reality: the dashboard is vanilla JS (not React)

`web/dashboard/` is a Vite 7 + ESM app with no React runtime. It renders
everything via imperative DOM (template strings + delegated events). The
invitation app (`web/invitation/`) is React, but the **dashboard is not**.

Therefore the shared grid layer is a **factory**, not a React component, and we
use the vanilla AG Grid API (`createGrid`, `ModuleRegistry`, `GridApi`), **not**
`ag-grid-react`.

Installed package: `ag-grid-community@^36.1.0`.

---

## File layout

```
web/dashboard/src/
  data-grid/
    AppDataGrid.js      # createAppDataGrid() factory (the one grid entry point)
    gridDefaults.js     # module registration + base options + theme class
    gridRenderers.js    # dataHtmlRenderer() / htmlCellRenderer() helpers
  styles/
    _grid.scss          # AG Grid theme variables (uses _tokens.scss)
  guestTable.js         # G-001 INVITADOS grid (pilot)
  guestService.js       # pure domain derivations (sort/filter/status)
  guestDomain.js        # identity/cabin/guest helpers
  thanksPanel.js        # G-002 Gracias grid
```

---

## How to create a new grid

Use `createAppDataGrid`. You describe **data + columns + business behavior**; the
factory handles Community module registration, the Quartz theme, a sensible
height, and shared defaults.

```js
import { createAppDataGrid } from "./data-grid/AppDataGrid.js";
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

export function renderMyPanel(ctx) {
  const { container, items } = ctx;

  // Keep a stable mount target so the grid is created once and updated later.
  if (!container.dataset.gridReady) {
    container.innerHTML = `
      <div data-my-toolbar></div>
      <div data-my-grid></div>`;
    container.dataset.gridReady = "1";
  }
  const gridEl = container.querySelector("[data-my-grid]");

  // Business functions produce declarative column defs + row data.
  const columnDefs = [
    { headerName: "Nombre", colId: "name", field: "name", pinned: "left", lockPinned: true, width: 220 },
    { headerName: "Nota", colId: "note", field: "note", flex: 1, minWidth: 160 },
    {
      headerName: "Acciones", colId: "actions", pinned: "right", width: 120,
      cellRenderer: dataHtmlRenderer((row) => `<button data-act="${row.id}">…</button>`),
      filter: false, sortable: false,
    },
  ];

  let grid = container._myGrid;
  if (!grid) {
    grid = createAppDataGrid({ container: gridEl, columnDefs, rowData: items, getRowId: (p) => p.data.id });
    container._myGrid = grid;
  } else {
    grid.setColumnDefs(columnDefs);
    grid.setRowData(items);
  }

  // Wire row actions once via delegation on the stable grid element.
  if (!container.dataset.gridWired) {
    container.dataset.gridWired = "1";
    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (btn) doSomething(btn.dataset.act);
    });
  }
}
```

`createAppDataGrid` returns `{ api, setRowData, setColumnDefs, setLoading, destroy }`.
Keep `api` only for advanced needs.

---

## How to define columns

Column defs are plain AG Grid `ColDef` objects, grouped close to the feature
(`guestTable.js`, `thanksPanel.js`), NOT in a generic "all columns" module. Each
expresses: `headerName`, `colId`, `field`/`valueGetter`, `width`/`flex`/`minWidth`,
`cellRenderer` (custom HTML), `filter`, `sortable`, `comparator` (business sort),
`pinned`/`lockPinned`. Business-specific renderers/editors stay close to their
feature.

---

## How to make a field editable

Edits are **business behavior**, so they keep the existing toggle-mode inline
editors (click a display button → `<select>`/`<input>` with ✓/✕) rendered inside a
custom `cellRenderer`. AG Grid owns the grid shell (sort/filter/pin/resize/virtual
scroll), not the edit UI, because each edit needs its own Firestore payload path.

Do **not** use AG Grid's single-value string editor for fields whose persistence
is multi-part (name = 4 fields, hosting = cabin+room, auth email = Auth + Firestore).

---

## How to persist edits

Never write Firestore from a renderer. The flow is always:

```
grid delegated event  →  feature handler  →  repository  →  Firestore (merge)
```

The INVITADOS grid calls the injected `saveGuestInline` / `saveGuestRsvpAnswer` /
`saveGuestHosting` / `saveGuestEmail`, which delegate to `guestRepository`,
`updateGuest()` (`setDoc` merge) and the `updateGuestEmail` Cloud Function. The
thanks grid calls `createThanks`/`updateThanks`/`deleteThanks` repositories.

Single-cell writes merge only the intended field (or a deliberate null to clear),
preserving doc id, timestamps, and audit fields. See `shared/payload-builders.js`.

---

## How to create a custom renderer

Use `dataHtmlRenderer(fn)` (or `htmlCellRenderer` for raw params):

```js
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

const badgeCell = dataHtmlRenderer((row) =>
  `<span class="dashboard-badge">${escapeHtml(row.label)}</span>`);
```

The renderer returns an element whose `innerHTML` is set to your string.
**Event handlers are NOT attached inside renderers** — use a single delegated
listener on the grid container keyed by `data-*` attributes, so wiring survives
AG Grid's row virtualization (cells are created/destroyed on scroll).

---

## How to add row actions

Put the buttons in a `cellRenderer` with `data-*` attributes, then delegate:

```js
gridEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-edit]");
  if (!btn) return;
  const row = items.find((r) => r.id === btn.dataset.edit);
  // … call the feature handler (modal / service), never Firestore here
});
```

Destructive actions must keep their existing confirmation modals
(`openDeleteConfirm`, `openConfirmModal`) — never reduce the confirmation UX.

---

## How to add filters

AG Grid Community column filters work out of the box when a column is `filter`
enabled with a `field`/`valueGetter` returning a primitive. For computed business
values (e.g. RSVP scale, group, status), set a `valueGetter` that returns the
comparison value — filtering then matches the same value the admin sees.

The INVITADOS table keeps its own toolbar filters (search + checkbox attributes +
column groups + readiness card) as the dashboard's primary filter UX; AG Grid
column filters are additive. The global toolbar search stays as-is.

---

## How to pin columns

Set `pinned: "left" | "right"` and, for fixed position, `lockPinned: true`. Pin
identity/primary-key/actions columns only. AG Grid Community supports pinning;
the pinned section auto-shrinks if it would crowd the center viewport.

---

## How to handle loading/errors

AG Grid renders row data synchronously once set. Loading/error overlays are
available via `api.showLoadingOverlay()` / `grid.setLoading(true)` and an error
state should set `rowData` empty plus a visible message. The dashboard keeps its
global matrix loader for boot.

---

## How to test grids

- Unit tests cover the pure service/domain functions (`guestService.js`,
  `guestDomain.js`) via `node --test web/dashboard/tests/*.test.mjs`.
- `npm test` runs invitation + dashboard suites.
- `npm run build:all` builds both apps (dashboard into
  `web/invitation/dist/dashboard`).
- Manual browser check: run `npm run dev:dashboard:network` and open the
  INVITADOS + Gracias tabs; verify sort/filter/edit/save/delete/pin/scroll.

---

## How to use the AG Grid MCP

The `ag-mcp` MCP is configured in the Cline settings
(`cline_mcp_settings.json`) as `npx -y ag-mcp`. It exposes `search_docs`,
`detect_version`, `list_versions`, `set_versions`. Ask it for version-specific
docs before relying on memory. The MCP docs cover up to 36.0.0; this project
installs 36.1.0 — the 36.0 docs are accurate for the APIs used here (pin,
createGrid, ModuleRegistry, legacy CSS themes, select editor).

## How to use AG Grid agent skills

Official skills exist in the `ag-grid/skills` GitHub repo, installed via
`npx skills add ag-grid/skills`, but they require an agent config directory
(`.claude/`/`.codex/`) in the repo. This repo uses a single root `AGENTS.md`
(no `.claude`/`.codex`/`.cline`), and AGENTS.md says "do not create unnecessary
duplicate rule systems". Decision: **not installed** (D-009). The MCP is the
supported verification path; the how-to above is the skills substitute.

---

## Community-only rule

Never install/import `ag-grid-enterprise`. Verify feature availability via
Community (`AllCommunityModule`). The final audit in `STATUS.md` confirms zero
Enterprise references. If a feature is Enterprise-only, record it in
`DECISIONS.md` and reproduce it with a small free implementation.