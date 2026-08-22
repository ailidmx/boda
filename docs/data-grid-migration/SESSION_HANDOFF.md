# Migration Session Handoff

Updated: 2026-08-22
Branch: master
Last known commit: 2bc049d fix(dashboard): restore INVITACION/GRUPO inline editing + refine group/tab select styling

## Current objective

Completed the AG Grid Community migration for BOTH in-scope dashboard tables
(G-001 INVITADOS + G-002 thanks). Finishing final documentation + Enterprise
audit + AGENTS.md rules.

## Completed this session

- Verified `ag-grid-community@36.1.0` installed; audit = zero Enterprise refs.
- Configured + verified the `ag-mcp` MCP (npx ag-mcp; tools: search_docs,
  detect_version, list_versions, set_versions; framework detected = vanilla,
  version 36.1.0, Enterprise: No).
- Decided NOT to install `ag-grid/skills` (repo has no agent dir) — D-009.
- Built the shared grid layer:
  - `web/dashboard/src/data-grid/AppDataGrid.js` (`createAppDataGrid` factory)
  - `web/dashboard/src/data-grid/gridDefaults.js` (AllCommunityModule + legacy Quartz CSS theme + base options)
  - `web/dashboard/src/data-grid/gridRenderers.js` (`dataHtmlRenderer`/`htmlCellRenderer`)
  - `web/dashboard/src/styles/_grid.scss` (token-driven AG Grid CSS variables), wired into `main.scss`.
- Migrated G-001 (INVITADOS): rewrote `web/dashboard/src/guestTable.js` to AG Grid
  (pinned Identidad + Acciones, native sort/filter via valueGetters + business
  comparators, column-group nav rebuilds `columnDefs`, toolbar + readiness card +
  filters preserved, delegated events survive virtualization, edits route through
  existing save handlers).
- Migrated G-002 (thanks): rewrote `web/dashboard/src/thanksPanel.js` (pinned
  Destinatario + Acciones, native filters/sort, empty overlay; create/edit modal
  + delete confirm preserved).
- Added `getCabinUnitCode()` to `web/dashboard/src/rooms.js` (fixes a latent
  `CABIN_NAME_MAP` ReferenceError in the old cabin-edit flow) and injected it.
- Wrote `docs/data-grid-migration/ARCHITECTURE.md` (how-to guide).
- Updated `STATUS.md`, `DECISIONS.md` (D-008…D-012), `TEST_MATRIX.md`,
  `INVENTORY.md`, `MASTER_PLAN.md`.

## Files changed

- `web/dashboard/package.json` / `package-lock.json` (ag-grid-community, pre-existing)
- `web/dashboard/src/data-grid/AppDataGrid.js` (new)
- `web/dashboard/src/data-grid/gridDefaults.js` (new)
- `web/dashboard/src/data-grid/gridRenderers.js` (new)
- `web/dashboard/src/styles/_grid.scss` (new)
- `web/dashboard/src/styles/main.scss` (register `grid`)
- `web/dashboard/src/guestTable.js` (rewritten to AG Grid)
- `web/dashboard/src/thanksPanel.js` (rewritten to AG Grid)
- `web/dashboard/src/rooms.js` (added `getCabinUnitCode`)
- `web/dashboard/src/dashboard.js` (import + inject `getCabinUnitCode`)
- `docs/data-grid-migration/ARCHITECTURE.md` (new), `STATUS.md`, `DECISIONS.md`,
  `TEST_MATRIX.md`, `INVENTORY.md`, `MASTER_PLAN.md`, `SESSION_HANDOFF.md`
- `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` (added `ag-mcp`)

## Important discoveries

- The dashboard is **vanilla JS** (Vite 7 + ESM, no React). Use the vanilla
  `ag-grid-community` API (`createGrid`), NOT `ag-grid-react`.
- AG Grid v36 removed the old theme classes from the default; the legacy CSS
  theme path is `theme: "legacy"` + import `ag-grid-community/styles/ag-grid.css`
  + `ag-theme-quartz.css` + apply `ag-theme-quartz` class.
- The old `guestTable.js` had latent runtime bugs (uninjected `CABIN_NAME_MAP`,
  out-of-scope `rsvpScaleValue`/`rsvpBooleanValue`, wrong `dataset[selectAttr]`
  group lookup) — fixed during migration (D-011).

## AG Grid MCP findings

- `ag-mcp` exposes `search_docs`, `detect_version`, `list_versions`, `set_versions`.
- `detect_version` on this project → vanilla, 36.1.0, Enterprise: No.
- DOCS cover up to 36.0.0; the 36.0 docs are authoritative for the APIs used
  (pinned columns are Community; `createGrid(eGridDiv, gridOptions)`; select
  editor is `agSelectCellEditor`, Community `SelectEditorModule`).

## Architecture decisions

- See `DECISIONS.md`: D-001…D-012 (vanilla JS, Community-only, 2-table scope,
  Firestore safety, row id = doc id, toolbar preserved, MCP, legacy CSS theme,
  no skills, toggle editors as renderers, latent-bug fixes, columnDefs-driven
  group nav).

## Current problems

- None blocking. Only remaining item is the AGENTS.md section (in progress) and
  a manual browser pass by the couple.

## Tests run

- `web/dashboard && npm test` → 40/40 PASS
- `web/dashboard && npm run build` → PASS
- root `npm test` → PASS
- root `npm run build:all` → PASS (invitation + dashboard)
- `npx eslint` on changed dashboard JS → clean
- Enterprise grep (`ag-grid-enterprise|LicenseManager|EnterpriseModule|licenseKey`)
  across the repo (excl. node_modules) → clean

## Test results

- All green. No Enterprise console warning/watermark expected (Community-only).

## Git status summary

- Working tree: `web/dashboard/package.json` + `package-lock.json` (M,
  pre-existing install), plus untracked `docs/data-grid-migration/` and the new
  `web/dashboard/src/data-grid/` + modified dashboard sources.

## Exact next action

Add the "## AG Grid Development Rules" section and the new-agent bootstrap rule
to the root `AGENTS.md`, then commit everything to `master` with a
`feat(dashboard): migrate data grids to AG Grid Community` message and push.

## Suggested next commands

```bash
cd /Users/aydejuarez/boda
git status --short
# After committing: git push origin master
```
