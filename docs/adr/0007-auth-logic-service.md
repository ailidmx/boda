# ADR-0007: Extract pure auth/login helpers into a service

**Status:** Accepted
**Date:** 2026-08-17

## Context

`web/invitation/src/context/AppContext.jsx` (~647 lines) mixed several concerns: React
context state management (language, auth state, guest profile, identity prompt, music
toggle), the Firebase Auth subscription, and inline pure helpers for language
normalization, identifier normalization, and credential validation. The pure helpers were
hard to unit-test because they were entangled with the React component and the Firebase
imports. The file also carried a stale `getGuestByUsername` reference to a function that no
longer exists in `guests.js`, which broke the production build.

## Decision

Extract the JSX-free, Firebase-free auth helpers into a pure service module:

- `web/invitation/src/auth/auth-logic.js` — a **pure** module with NO Firestore/Firebase
  access and NO DOM dependency. Each helper is a pure function of its inputs.
- `web/invitation/src/context/AppContext.jsx` — imports and calls these helpers instead of
  inlining the logic. It keeps the React state, the Firebase Auth subscription, and the
  sign-in/sign-out/change-email/change-password orchestration.

Extracted helpers: `getInitialLanguage`, `normalizeIdentifier`, `normalizeLanguage`,
`validateCredentials`.

This also removed the stale `getGuestByUsername` lookup. Per the documented login flow
(AGENTS.md), a bare username is always resolved to `username@AUTH_EMAIL_DOMAIN` with no
username lookup — the auth email is the username plus the default domain. This matches the
current `guests.js` API (which exports `getActiveGuests`, `getGuest`, `getGuestsByUnit`,
`AUTH_EMAIL_DOMAIN` — but not `getGuestByUsername`).

This follows the architecture guardrail that **services own domain logic and business
rules** and do NOT touch Firestore/Firebase, while **hooks/use-cases orchestrate** and hold
UI state.

## Consequences

- **Positive:** The auth helpers are now trivially unit-testable (pure functions). A new
  `web/invitation/tests/auth-logic.test.mjs` covers language normalization/initialization,
  identifier normalization, and credential validation. Wired into `npm test` via
  `test:auth-logic`. The production build now passes (the stale `getGuestByUsername`
  reference was removed).
- **Negative:** None for behavior — the extracted helpers preserve the exact same logic.
  The only behavioral change is the removal of the broken `getGuestByUsername` lookup,
  which could never have run (the function did not exist), so it is a no-op fix that
  aligns with the documented login flow.
- **Migration:** New pure auth/login logic should live in `auth/auth-logic.js`; new
  Firebase Auth orchestration stays in `AppContext.jsx`.
