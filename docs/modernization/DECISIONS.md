# Architecture Decision Records — Modernization

> Pair with `ASSESSMENT.md`, `TARGET_ARCHITECTURE.md`, `REMEDIATION_PLAN.md`.

Format per record: Problem / Current / Options / Decided / Why / Tradeoffs.

---

## D-100 — Firestore rules: reconcile docs, do NOT silently restore field validation

- **Problem:** `firebase/firestore.rules` is a fully permissive
  "authenticated-can-read/write-any-field" model. `web/shared/validation.js`
  is advisory only. AGENTS.md documents a field-validating rules model
  (`hasValidGuestContactFields`, `affectedKeys`, etc.) that no longer exists in
  the rules file.
- **Current implementation:** `canWrite() == request.auth != null` for every
  collection; `canDelete() == isAdmin()`. Client validates payloads via
  `payload-builders.js` + `validation.js` before write.
- **Options considered:**
  1. Restore field-validating rules (parse `request.resource.data` with the
     `hasValidGuestContactFields`/`affectedKeys` helpers from the old model).
  2. Keep the permissive model and reconcile AGENTS.md + docs to it.
  3. Keep permissive but firm up the one field-sensitive exception
     (`song_requests` already checks `resource.data.guestId == auth.uid` for
     deletes — the only semi-secure rule).
- **Decided:** **Option 2 (reconcile docs to reality) for now; Option 1 is a
  deferred hardening item tracked in TECH_DEBT (NEXT).** Rationale: the guest
  pool is a closed, trusted wedding invitee list; any authenticated user is an
  invitee, so the couple's real boundary is "only invitees may touch data," which
  the simple model enforces. Silently restoring strict field validation now would
  be a behavior/security-model change that could break currently-working writes
  (the rules have NOT been enforcing fields, so any client could have written
  arbitrary shapes already). We must not pretend the docs are true.
- **Tradeoffs:** weakens defense-in-depth (a compromised invitee account can
  write arbitrary shapes); but avoids a risky unrequested hardening during a
  structural modernization project.
- **Migration impact:** update AGENTS.md bullets (§ "Guest data sourcing" and any
  `hasValidGuestAdminFields`/rules-test references), `docs/ARCHITECTURE.md`
  security section, and re-verify `tests/firestore.rules.test.mjs` so it tests the
  ACTUAL simple model (or is explicitly marked as testing the legacy model).

---

## D-101 — Server-state tooling: keep Firestore-realtime, no TanStack Query

- **Problem:** no server-state/query library exists; evaluate adding one.
- **Current:** Firestore `onSnapshot` (guests/thanks/tables) + one-off `getDocs`
  (cabins/rooms); loading/error handled per-listener.
- **Options:** adopt TanStack Query / React Query; keep Firestore SDK.
- **Decided:** **KEEP Firestore SDK only.** Firestore already provides client
  cache, realtime invalidation, and listener lifecycle. A query library would add
  a second cache layer and a second mutation-invalidation model on top of
  Firestore's own, for no concrete win in a bounded, realtime sync workload.
- **Tradeoffs:** less uniform loading/error abstractions; acceptable because the
  loading primitive (`MatrixLoader`) and inline error conventions are already
  consistent per ADR-0014/0016.

---

## D-102 — Do not over-abstract shared guest normalization yet

- **Problem:** dashboard `normalizeGuest` (guests.js) and invitation
  `normalizeGuestRecord` normalize guest records independently.
- **Decided:** **DEFER** a shared `normalizers/` module until a feature migration
  touches both apps simultaneously. Duplication of ~30 lines across two separate
  bundles is cheaper than a premature shared dependency with subtle per-app
  differences (`unit` vs `cabin` top-level fields).
- **Tradeoffs:** temporary 2x maintenance if the guest schema changes.

---

## D-103 — Dashboard stays vanilla JS (no React migration)

- **Problem:** task premise assumed a "React CRUD dashboard"; reality is a
  vanilla-JS Vite dashboard.
- **Decided:** **DO NOT migrate the dashboard to React.** It is a deliberate,
  documented decision (data-grid D-001) and the imperative DOM model is working
  with AG Grid. A React rewrite is a technology migration unrelated to the
  identified problems and would be high-risk.
- **Consequence:** the dashboard target uses `panels/ + services/ + repositories/`
  naming, not `features/ + hooks/ + components/`.

---

## D-104 — Form/validation/UI libraries: keep hand-rolled, standardize conventions

- **Problem:** no form lib, no component lib, no router, no zod/yup.
- **Decided:** **KEEP hand-rolled.** The existing shared conventions
  (`data-form-status` in invitation; `.dashboard-modal-field` in dashboard) and
  `web/shared/validation.js` are the single sources of truth. Adding
  react-hook-form (invitation) or a DOM form framework (vanilla dashboard) is
  churn without leverage. A component library would fight the bespoke,
  heavily-themed design.
- **Consequence:** modernization is structural (ownership/boundaries), not
  library adoption. No new dependency is introduced by this plan.

---

## D-105 — Pilot feature = dashboard `guests` + `cabins` read/write slice

- **Problem:** choose a pilot that exercises list/grid + Firestore + create/edit/
  delete + validation + permissions + filtering + row actions.
- **Decided:** the **dashboard guests + cabins vertical slice**: (1) move
  read-side (`subscribeGuests`) into `guestRepository`, (2) add `store.js` +
  `bootstrap.js`, (3) extract `cabinService.js` (pure) + reusable lightbox from
  `cabinsPanel.js`, (4) keep AG Grid touch untouched (already validated).
- **Why:** it exercises the exact read/write asymmetry and god-module problems at
  the top of the finding list, with an already-validated grid underneath.

---

## D-106 — AG Grid Community is a hard boundary (carried forward)

- **Decided (persistent):** AG Grid Community only. Never `ag-grid-enterprise`,
  `LicenseManager`, or Enterprise modules. Use the `ag-mcp` MCP for version docs.
  (See `docs/data-grid-migration/DECISIONS.md` for the original 12 records.)