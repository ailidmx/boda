# Remediation Plan (ordered)

> Ordered by risk > architectural leverage > duplication reduction > DX, per the
> mandate. No cosmetic-first steps. Each phase ends in `build:all` + `npm test`.

---

## Phase 0 — Documentation reconciliation (no code behavior change)

**Goal:** make the agent instructions and security docs truthful.

1. Reconcile `AGENTS.md` guest-write / rules bullets to the ACTUAL
   `firebase/firestore.rules` simple model (`canWrite() == auth != null`,
   `canDelete() == isAdmin()`, client validation advisory). Remove stale
   `hasValidGuestContactFields` / `affectedKeys` / `hasValidAdminGuestFields`
   references.
2. Re-point `web/invitation/tests/firestore.rules.test.mjs` to the actual simple
   model (or mark it "legacy model" if it currently passes against permissive).
3. Update `docs/ARCHITECTURE.md` security section.
4. Remove dead collection refs (`invitation_groups`, `attendance_responses`,
   `rsvp_submissions`, `experience_suggestions`, `coast_interest`,
   `petanque_participation`) from AGENTS.md and optionally collapse the legacy
   `match` blocks in `firestore.rules`.

**Exit:** docs match rules; rules test is meaningful. **No Firestore data touched.**

---

## Phase 1 — Pilot vertical slice: dashboard guests + cabins read/write boundary

**Goal:** validate the target boundary through one complete slice.

Steps (behavior-preserving, each with `build:all` + `npm test`):

1. **`guestRepository.subscribeGuests(onSnapshot)`** — move the guests listener
   out of `dashboard.js`; expose an unsubscribe-returning function.
2. **`store.js`** — introduce the single mutable `state` + getters; move the
   `state` object out of `dashboard.js`. Keep the ~40 DI adapters as thin
   `state → service` binders (relocated, not deleted).
3. **`bootstrap.js`** — `startDashboard` becomes: auth → repositories →
   renderers. `dashboard.js` shrinks to re-export/alias for compatibility during
   transition, then is removed.
4. **`tableRepository.subscribeTables` + `thanksRepository.subscribeThanks`** —
   mirror step 1 for the other two live collections.
5. **Extract `cabinService.js`** (pure) — pull the mismatch/presence/format
   derivations out of `cabinsPanel.js`; leave `renderCabinAssignments` thinner.
6. **Extract a reusable lightbox** for the dashboard (reuse the DOM lightbox
   pattern; do NOT import the React `LightboxCarousel`).
7. **Add `tests/cabinService.test.mjs`** mirroring the `guestService` test style
   (characterization tests for extracted derivations).

**Exit:** `dashboard.js` is a pure composition root (or deleted); reads and
writes both sit in repositories; `cabinsPanel.js` is meaningfully thinner; all
tests + build green; manual browser pass by the couple.

**Review gate:** confirm the `subscribe*`-in-repository split did NOT add
unnecessary indirection for zero reuse. Adjust `TARGET_ARCHITECTURE.md` if so.

---

## Phase 2 — Kill remaining god-module debt in the dashboard

- Finish `dashboard.js` decomposition (remove transitional re-exports).
- Audit `onSnapshot` cleanup on sign-out/access-denied (T-014).
- Verify no leftover direct `setDoc`/`deleteDoc` outside repositories
  (grep gate).

**Exit:** `grep -R "setDoc\|deleteDoc\|onSnapshot" web/dashboard/src` shows
those calls ONLY inside `repositories/` + `bootstrap.js`. Build + tests green.

---

## Phase 3 — Invitation context split (AppContext)

- Split `AppContext.jsx` into `AppProvider` (auth + activity) and
  `ContentProvider` (trilingual `content`/`t`), preserving the `useApp()`
  consumer surface where possible (a thin combined hook for compatibility).
- Verify each consumer re-renders correctly (no empty translation keys).

**Exit:** `AppContext` no longer mixes content with session; invitation build
green.

---

## Phase 4 — Feature-by-feature (invitation) — only as touched

For each invitation feature that carries Firestore (rsvp → songs → genres →
identity → …), when it is next modified, apply the vertical slice:

```
feature/api/<entity>Repository.js   (extract Firestore calls)
feature/hooks/useX.js               (extract reusable React behavior)
feature/domain.js                   (pure derivations, if any)
feature/components/                 (section JSX)
```

Do NOT do a big-bang `features/` move. Track per-feature status in
`MIGRATION_STATUS.md`.

---

## Phase 5 — Remove obsolete code + final sweep

- Remove `web/shared/guests.js` if confirmed dead (T-016).
- Remove transitional re-exports left from Phase 1 if any.
- Record lines-removed / duplications-eliminated.

**Exit:** `npm run build:all` + `npm test` + `npm run test:rules` green; no dead
imports.

---

## Dependencies & risks (see ASSESSMENT §P, §R)

- The plan introduces **no new dependencies**.
- Highest regression risk: Phase 1 (Firestore listener relocation + `store.js`).
  Mitigate with behavior-preserving moves, per-step build/test, and a manual
  browser pass before each phase's exit.
- Risk of scope creep: invitation `features/` migration. Mitigate with the
  "only as touched" rule in Phase 4.