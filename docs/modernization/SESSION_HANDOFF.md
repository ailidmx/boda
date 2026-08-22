# Modernization Session Handoff

> Read this before continuing the modernization. Future agents MUST read this
> + `MIGRATION_STATUS.md` first.

## Current phase

**Phase 0 — Documentation reconciliation** (the assessment + plan are complete;
no code has been migrated yet).

## What was produced this session

The full assessment deliverable set under `docs/modernization/`:

- `ASSESSMENT.md` — current-state architecture, strengths, weaknesses, critical
  problems, scorecard, top 10 problems, recommended tools.
- `TARGET_ARCHITECTURE.md` — proposed boundary + per-app file layout.
- `INVENTORY.md` — file/feature/dependency inventory with migration status.
- `TECH_DEBT.md` — debt register with NOW/NEXT/LATER buckets.
- `DECISIONS.md` — ADRs D-100 … D-106.
- `REMEDIATION_PLAN.md` — ordered phases 0–5.
- `MIGRATION_STATUS.md` — live status.
- `SESSION_HANDOFF.md` — this file.

## Key architectural discoveries (factual)

1. **The dashboard is vanilla JS (Vite + ESM), NOT React.** The React app is the
   guest-facing invitation. Migration must NOT convert the dashboard to React
   (D-103).
2. **`firebase/firestore.rules` is a fully permissive "simple model"**
   (`canWrite() == auth != null` for every collection; `canDelete() == isAdmin()`).
   `web/shared/validation.js` is advisory only. **AGENTS.md documents a field-
   validating model that no longer exists** in the rules file. This is the #1
   finding (D.1 / T-001 / D-100).
3. **`dashboard.js` (1661 lines) is a bootstrap god-module** — auth + access gate
   + `onSnapshot`(guests/thanks) + `state` + ~40 sound DI adapters + UI builders
   + mutation orchestrators.
4. **`cabinsPanel.js` (1181 lines) is a panel god-module** — domain derivations +
   presence scale + lightbox + drag-drop all mixed.
5. **`guestService.js` is the good model**: pure, dependency-injected derived
   state, 40 tests. `guestDomain.js` likewise. Writes are already cleanly in
   `repositories/`; reads/subscriptions are NOT (asymmetric).
6. **No duplicated `guestService` logic exists in `dashboard.js`** — those are
   thin DI adapters binding `state` to the pure service. Do not "deduplicate"
   them away; they are correct.
7. **AG Grid Community migration is already complete and validated** (2 grids,
   40/40 tests, build green, zero Enterprise). Do not redo.
8. The invitation has ~9 direct-Firestore modules + 2 hooks with NO repository
   boundary, and `features/` is only ~15% realized (coast/identity/nav).

## Decisions made

D-100 through D-106. Most important: **reconcile rules docs, do NOT silently
restore field validation now** (D-100); **keep Firestore realtime, no TanStack
Query** (D-101); **dashboard stays vanilla JS** (D-103); **keep hand-rolled
forms/validation, no new deps** (D-104); **pilot = dashboard guests+cabins
read/write slice** (D-105).

## Tests / build (baseline)

- Baseline is green per the completed data-grid migration handoff
  (`docs/data-grid-migration/SESSION_HANDOFF.md`): `npm test` (40/40 dashboard +
  invitation), `npm run build:all`, lint clean.
- This session made only documentation changes — no code, so no test run was
  needed.

## Exact next action

**Phase 0, step 1:** open `AGENTS.md` and reconcile the guest-write/rules bullets
to the actual permissive `firebase/firestore.rules`:
- Replace/remove `hasValidGuestContactFields()`, `affectedKeys()`,
  `hasValidAdminGuestFields()`, `isNullableShortText()` references.
- State plainly: "Firestore rules are a simple authenticated-only model
  (`canWrite() == auth != null`, `canDelete() == isAdmin()`); client-side
  `validation.js` is advisory, not enforced by rules."
- Remove dead collection refs (`invitation_groups`, `attendance_responses`,
  `rsvp_submissions`, `experience_suggestions`, `coast_interest`,
  `petanque_participation`) referenced in AGENTS.md as "currently written".

Then Phase 0 step 2: re-point `web/invitation/tests/firestore.rules.test.mjs`
to the actual simple model.

## Suggested commands when code work begins

```bash
cd /Users/aydejuarez/boda
npm test
npm run build:all
npm run test:rules
npx eslint .