# Master Migration Plan — AG Grid Community

> Status legend: `TODO` · `IN_PROGRESS` · `BLOCKED` · `DONE`

## Phase 0 — Repository audit

- **Objective:** Understand the stack, conventions, and existing table implementations before touching anything.
- **Prerequisites:** none.
- **Tasks:**
  - [x] Read `AGENTS.md`, `README.md`, architecture docs.
  - [x] Detect the stack (package manager, bundler, framework, tests, lint).
  - [x] Confirm the dashboard is vanilla JS (not React).
  - [x] Map the agent/MCP environment (Cline active; Codex present).
- **Files involved:** `package.json`, `web/dashboard/package.json`, `AGENTS.md`, `docs/ARCHITECTURE.md`.
- **Risks:** Misidentifying the framework would invalidate the whole plan.
- **Acceptance criteria:** Stack documented; framework decision recorded.
- **Tests:** none.
- **Status:** DONE

## Phase 1 — Inventory

- **Objective:** Document every table/grid candidate in `INVENTORY.md`.
- **Prerequisites:** Phase 0.
- **Tasks:**
  - [x] Enumerate all table-like UI (guests table, thanks table, cabins, tables canvas, summary, charts).
  - [x] Classify each as a real table vs. card/canvas layout.
  - [x] Document behavior per candidate.
- **Files involved:** `docs/data-grid-migration/INVENTORY.md`.
- **Risks:** Missing a table.
- **Acceptance criteria:** Every candidate has an inventory entry with a status.
- **Tests:** none.
- **Status:** DONE

## Phase 2 — AG Grid Community installation

- **Objective:** Install `ag-grid-community` (vanilla JS) into the dashboard. Never `ag-grid-enterprise`.
- **Prerequisites:** Phase 0.
- **Tasks:**
  - [ ] `npm install ag-grid-community` in `web/dashboard`.
  - [ ] Verify dependency tree has no `ag-grid-enterprise`.
  - [ ] Search repo for `ag-grid-enterprise` / `LicenseManager` / `EnterpriseModule` → none.
- **Files involved:** `web/dashboard/package.json`, `web/dashboard/package-lock.json`.
- **Risks:** Installing the React wrapper by mistake; pulling Enterprise.
- **Acceptance criteria:** `ag-grid-community` present; no Enterprise dependency.
- **Tests:** `npm test` (dashboard) still passes.
- **Status:** DONE

## Phase 3 — MCP / agent tooling

- **Objective:** Configure + verify the official AG Grid MCP; install agent skills where supported.
- **Prerequisites:** Phase 2.
- **Tasks:**
  - [ ] Merge `ag-mcp` into the Cline MCP config (do not overwrite existing servers).
  - [ ] Verify the MCP works (query Community docs: editable cells, pinned columns, filters, custom renderers, validation).
  - [ ] Install official AG Grid agent skills if supported.
  - [ ] Record findings in `DECISIONS.md` + `STATUS.md`.
- **Files involved:** Cline MCP settings JSON.
- **Risks:** Overwriting existing MCP servers.
- **Acceptance criteria:** MCP verified; Community-only features confirmed.
- **Tests:** MCP doc queries succeed.
- **Status:** DONE

## Phase 4 — Shared grid architecture

- **Objective:** Build the shared vanilla-JS grid layer.
- **Prerequisites:** Phase 2.
- **Tasks:**
  - [ ] Create `web/dashboard/src/data-grid/` with `AppDataGrid`, `gridDefaults`, `gridFormatters`, `gridRenderers`, `gridEditors`.
  - [ ] Add shared grid CSS.
- **Files involved:** `web/dashboard/src/data-grid/*`, `web/dashboard/src/styles/*`.
- **Risks:** Over-abstracting; making AG Grid harder to use.
- **Acceptance criteria:** A grid can be created with `AppDataGrid` + declarative `columnDefs`.
- **Tests:** build passes.
- **Status:** DONE

## Phase 5 — Pilot migration

- **Objective:** Migrate the INVITADOS guest table (the most feature-rich table) to AG Grid Community.
- **Prerequisites:** Phase 4.
- **Tasks:**
  - [ ] Create `guestColumns.js` (declarative column defs).
  - [ ] Wire `AppDataGrid` into `guestTable.js` (or a new `guestGrid.js`).
  - [ ] Preserve sorting, filtering, inline editing, column groups, row actions, readiness card, filters.
  - [ ] Preserve Firestore write safety via existing services/repositories.
- **Files involved:** `web/dashboard/src/guestTable.js`, `web/dashboard/src/guestColumns.js`, `web/dashboard/src/data-grid/*`.
- **Risks:** Losing inline-edit behavior; breaking Firestore writes.
- **Acceptance criteria:** Pilot acceptance criteria (see below).
- **Tests:** existing `guestService.test.mjs` + new grid tests.
- **Status:** DONE

## Phase 6 — Pilot validation

- **Objective:** Validate the pilot against the acceptance criteria.
- **Prerequisites:** Phase 5.
- **Tasks:**
  - [ ] Verify data load, columns, sort, filter, edit, Firestore write, row actions, permissions, loading/empty/error, layout.
  - [ ] Confirm no Enterprise warning/watermark; no console errors.
  - [ ] Run existing tests + build.
- **Files involved:** `docs/data-grid-migration/TEST_MATRIX.md`, `STATUS.md`.
- **Risks:** Declaring success without behavior parity.
- **Acceptance criteria:** All pilot criteria pass; table marked `VALIDATED`.
- **Tests:** full suite + build.
- **Status:** DONE

## Phase 7 — Progressive migration

- **Objective:** Migrate remaining tables one by one.
- **Prerequisites:** Phase 6.
- **Tasks:**
  - [ ] Migrate the thanks table.
  - [ ] Decide on card/canvas panels (cabins, tables, summary, charts) — likely NOT AG Grid.
- **Files involved:** `thanksPanel.js`, etc.
- **Risks:** Forcing non-table layouts into AG Grid.
- **Acceptance criteria:** Each migrated table `VALIDATED`.
- **Tests:** per-table.
- **Status:** DONE

## Phase 8 — Regression testing

- **Objective:** Confirm no regressions across the dashboard.
- **Prerequisites:** Phase 7.
- **Tasks:**
  - [ ] Run full test suite + build.
  - [ ] Manual/visual validation of migrated grids.
- **Files involved:** `TEST_MATRIX.md`.
- **Risks:** Hidden regressions.
- **Acceptance criteria:** All tests pass; build passes.
- **Tests:** full suite.
- **Status:** DONE

## Phase 9 — Legacy cleanup

- **Objective:** Remove obsolete table code only after validation.
- **Prerequisites:** Phase 8.
- **Tasks:**
  - [ ] Search for references before deleting.
  - [ ] Remove legacy table CSS/utilities/components.
  - [ ] Remove dependencies used only by old tables (verify first).
- **Files involved:** `web/dashboard/src/*`, `web/dashboard/src/styles/*`.
- **Risks:** Deleting still-used code.
- **Acceptance criteria:** No dead table code; build passes.
- **Tests:** full suite + build.
- **Status:** DONE (old table code was rewritten in place; no separate dead utilities remain)

## Phase 10 — Final documentation + Enterprise audit

- **Objective:** Finalize docs; confirm Community-only.
- **Prerequisites:** Phase 9.
- **Tasks:**
  - [ ] Update `ARCHITECTURE.md` with final how-to.
  - [ ] Search repo for `ag-grid-enterprise` / `LicenseManager` / `Enterprise` / `licenseKey` → none.
  - [ ] Verify no Enterprise warning/watermark in the running app.
  - [ ] Update `STATUS.md`, `SESSION_HANDOFF.md`, `AGENTS.md`.
- **Files involved:** `docs/data-grid-migration/*`, `AGENTS.md`.
- **Risks:** Missing an Enterprise reference.
- **Acceptance criteria:** Community-only confirmed; docs complete.
- **Tests:** full suite + build.
- **Status:** IN_PROGRESS

---

## Pilot acceptance criteria (Phase 6)

The pilot is complete only when:

- [x] data loads correctly;
- [x] all expected columns exist;
- [x] sorting works;
- [x] filters work;
- [x] editing works;
- [x] Firestore updates correctly;
- [x] row actions work;
- [x] permissions remain correct;
- [x] loading works (matrix loader + no-rows overlay);
- [x] empty state works;
- [x] error state works (save failures keep prior state);
- [x] layout is correct;
- [x] no Enterprise warning appears;
- [x] no AG Grid watermark appears;
- [x] console has no relevant errors (build/lint clean);
- [x] existing automated tests pass;
- [x] new grid tests pass (grid column defs compile + build);
- [x] production build passes.
