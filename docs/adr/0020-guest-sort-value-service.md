# ADR-0020: Extract `guestSortValue` into the pure guest service + wire dashboard tests into `npm test`

**Status:** Accepted
**Date:** 2026-08-18

## Context

The dashboard's INVITADOS table sorts guests by column via `guestSortValue(guest, key)`,
which was defined inline in the dashboard god-file (`web/dashboard/src/dashboard.js`). It
read the mutable `state.authUsers` directly for the `hasAuth` column, making it impossible
to unit-test in isolation and keeping a pure derivation entangled with the dashboard's
module-level state. The dashboard also had no test script wired into the root `npm test`,
so its pure modules (`guestDomain.js`, `guestService.js`) were not exercised by CI.

## Decision

1. **Move `guestSortValue` into `web/dashboard/src/guestService.js`** as a pure,
   dependency-injected function: `guestSortValue(guest, key, authUsers = {})`. The Firebase
   Auth user map is passed in as the third argument instead of being read from `state`.
   `dashboard.js` keeps a thin adapter with the same short signature
   `guestSortValue(guest, key)` that binds `state.authUsers`, so `guestTable.js` (which
   receives it via `ctx`) is unchanged.

2. **Wire the dashboard test suite into the root `npm test`.** Added a `test` script to
   `web/dashboard/package.json` (`node --test tests/*.test.mjs`) and appended
   `npm --prefix web/dashboard run test` to the root `test` script. The dashboard's pure
   modules are now covered by the same `npm test` that runs the invitation tests.

This follows the architecture guardrail that **services own domain logic and business
rules** and stay decoupled from the dashboard god-file, and that **pure derivations are
dependency-injected** so they can be unit-tested.

## Consequences

- **Positive:** `guestSortValue` is now a pure, unit-testable function. Ten new tests in
  `web/dashboard/tests/guestService.test.mjs` cover every sort key (name, invitationGroup,
  idCheck, hasAuth with injected authUsers, group, lang, cabin, room, xtraCabin, xtraRoom,
  status, unknown). The dashboard test suite runs as part of `npm test`.
- **Positive:** `dashboard.js` shrinks by one inline derivation; the sort logic now lives
  next to the other guest derivations in `guestService.js`.
- **Negative:** None. The adapter preserves the exact same behavior and signature consumed
  by `guestTable.js`; no rendered markup or sort order changed.
- **Migration:** New dashboard guest derivations that need live data should live in
  `guestService.js` as dependency-injected pure functions, with `dashboard.js` providing a
  thin adapter that binds `state`. New dashboard unit tests go in
  `web/dashboard/tests/*.test.mjs` and run automatically via `npm test`.
