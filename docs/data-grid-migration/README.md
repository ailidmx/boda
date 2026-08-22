# Data Grid Migration — AG Grid Community

This directory is the **authoritative, persistent memory** for the migration of the
dashboard's data grids to **AG Grid Community**.

> **Repository state is authoritative. Conversation memory is not.**
> If you are resuming this work after context loss, follow the
> [Resume Migration](#resume-migration) protocol below.

---

## Why this migration exists

The dashboard (`web/dashboard/`) hand-builds every data-grid mechanic:

- custom `<table>` markup via `innerHTML` string templates;
- manual sortable headers;
- manual column-group show/hide;
- manual inline editors (toggle-mode display ↔ editor);
- manual filters (search input + checkbox dropdown);
- manual row-action buttons;
- manual loading/empty/error handling.

Every new table means rebuilding all of that from scratch. The goal is to stop
rebuilding data-grid infrastructure forever: **describe the data + the columns +
the business behavior**, and let AG Grid Community handle the grid mechanics.

## Target architecture

- **AG Grid Community** (vanilla JS API — the dashboard is **not** React).
- A shared grid layer under `web/dashboard/src/data-grid/`:
  - `AppDataGrid` — a factory that creates a configured AG Grid instance.
  - `gridDefaults` — sensible default grid options.
  - `gridFormatters` — shared value formatters.
  - `gridRenderers` — shared cell renderers (badges, chips, actions).
  - `gridEditors` — shared cell editors (select, boolean, scale).
- Column definitions are **declarative** and live close to their feature
  (e.g. `guestColumns.js`).
- Firestore stays the data layer. AG Grid is the UI only. Writes flow through
  the existing service/repository layer, never from inside arbitrary renderers.

## AG Grid Community-only constraint

**This project must use AG Grid Community. It must NOT depend on AG Grid Enterprise.**

- Never install `ag-grid-enterprise`.
- Never import from `ag-grid-enterprise`.
- Never enable Enterprise modules.
- Never introduce a license key.
- Never rely on Enterprise functionality.

If a requested behavior is Enterprise-only, record it in `DECISIONS.md` and
prefer a simple free implementation (AG Grid Community + a small custom React/JS
implementation) that preserves existing behavior.

## Where migration status is stored

| File | Purpose |
|------|---------|
| `MASTER_PLAN.md` | Phased plan with objectives, tasks, risks, acceptance criteria, status. |
| `INVENTORY.md` | Every table/grid candidate with full behavior documentation + status. |
| `ARCHITECTURE.md` | Final shared grid architecture + how-to guide. |
| `DECISIONS.md` | Decision log (D-001, D-002, …). |
| `STATUS.md` | Concise machine/human-readable progress + health. |
| `TEST_MATRIX.md` | Per-table behavior parity matrix. |
| `SESSION_HANDOFF.md` | Mandatory handoff for the next agent/session. |

## How a new developer/agent resumes the work

1. Read `STATUS.md`.
2. Read `SESSION_HANDOFF.md`.
3. Read the relevant entries in `INVENTORY.md`.
4. Read the relevant decisions in `DECISIONS.md`.
5. Check `git status` / `git diff`.
6. Run validation/tests.
7. Continue the exact next task listed in `SESSION_HANDOFF.md`.

## Where AG Grid conventions are documented

- `ARCHITECTURE.md` — how to create a grid, define columns, edit, persist,
  render, filter, pin, handle loading/errors, test, and use the AG Grid MCP.
- `AGENTS.md` (repo root) — the "AG Grid Development Rules" section.

## Resume Migration

The instructions are essentially:

1. Read `STATUS.md`.
2. Read `SESSION_HANDOFF.md`.
3. Read relevant entries in `INVENTORY.md`.
4. Read `DECISIONS.md`.
5. Check git status.
6. Run validation/tests.
7. Continue the exact next task.
