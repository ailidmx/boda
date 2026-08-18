# ADR-0019: Defer component-test harness (F9)

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

Phase F9 ("Testing") of the front-end refactor proposes "component + feature tests for
reusable primitives and critical flows." The current test setup uses Node's built-in
`node --test` runner with pure `.mjs` unit tests — there is NO jsdom and NO React Testing
Library configured.

The existing suite already covers the pure logic extracted during this refactor:

- `tests/button.test.mjs` — the shared `Button` primitive (class mapping, `as`, `disabled`,
  `loading`, aria).
- `tests/dialog.test.mjs` — the shared `Dialog` primitive (behavior defaults, class
  composition).
- `tests/guest-profiles.test.mjs` — the extracted guest-profiles domain service.
- `tests/auth-logic.test.mjs` — the extracted auth/login logic service.
- `tests/validation.test.mjs` — shared validation.
- `tests/song-search.test.mjs` — the song-search service.
- `tests/firestore.rules.test.mjs` — Firestore rules (emulator).

All JSX-free, Firebase-free logic is already unit-tested. What F9 would add is
component-level rendering tests (mount a React component, assert on the DOM), which
requires a new test harness.

## Decision

**Defer** the component-test harness. There is no genuine gap in the current pure-logic
coverage, and adding a component harness would introduce new infrastructure and
dependencies (jsdom + React Testing Library) that the AGENTS.md §7.8 rule ("do not
introduce dependencies unnecessarily") and the "smallest coherent system" principle
discourage for a structural refactor.

## Consequences

- **No new test dependencies or harness** are introduced.
- **Existing pure-logic coverage is preserved** — the primitives and services extracted
  during F2/F7 remain unit-tested.
- **Future trigger:** introduce a component-test harness (jsdom + React Testing Library)
  only when a critical user flow needs regression protection that pure-logic tests cannot
  provide (e.g. a complex multi-step form or a high-risk interaction), and do it as its own
  scoped infrastructure change — not mixed into a structural refactor.
- **Documented** in `docs/FRONTEND_AUDIT.md` (F9 phase).

## Verification

- No code changed — this is a decision + documentation ADR.
- `npm run build:all`, `npm test`, and `npx eslint` remain green (unchanged code).
