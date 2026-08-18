# ADR-0006: Extract pure guest-profile domain helpers into a service

**Status:** Accepted
**Date:** 2026-08-17

## Context

`web/invitation/src/guest-profiles.js` (~753 lines) mixed two concerns: (1) pure domain
logic — normalizing guest records, resolving names/photos/phones, deciding whether a guest
travels by plane, resolving identity-check and invitation-group state, grouping members —
and (2) data access — reading the live Firestore `guests` cache, subscribing to it, and
writing guest fields. The pure helpers were hard to unit-test because they were entangled
with the module-level cache and Firestore imports.

## Decision

Split `guest-profiles.js` into a feature-local service folder:

- `web/invitation/src/guest-profiles/domain.js` — a **pure** module with NO Firestore
  access and NO module-level cache. Each helper is a pure function of its inputs. The live
  Firestore record is passed in explicitly as the `record` argument; when `record` is
  absent, the helpers fall back to the static guest fields, preserving the historical
  behavior exactly.
- `web/invitation/src/guest-profiles.js` — the data-access layer. It looks up the live
  record from the cache and passes it into the domain helpers. It keeps the cache,
  subscription, and write logic.

Extracted helpers: `normalizeGuestRecord`, `mergeGuestRecord`, `resolveGuestName`,
`guestTravelsByPlane`, `resolveGuestPhoto`, `resolveGuestPhone`, `resolveGuestEmail`,
`resolveGuestMessageAuthor`, `resolveIdentityCheckPassed`, `resolveGuestInvitationGroup`,
`getGroupMembers`, `resolveLiveGuest`.

This follows the architecture guardrail that **services own domain logic and business
rules** and do NOT touch Firestore, while **repositories/data-access layers own Firestore
access**.

## Consequences

- **Positive:** The domain helpers are now trivially unit-testable (pure functions). A new
  `web/invitation/tests/guest-profiles.test.mjs` covers normalization, name/photo/phone
  resolution, `travelsByPlane` (boolean + legacy `travelStatus`), identity check,
  invitation group, group members, and live merge. Wired into `npm test` via
  `test:guest-profiles`. No rendered markup or behavior changed.
- **Negative:** Callers of the helpers must pass the live record explicitly where they
  previously relied on the module reading the cache. The data-access layer in
  `guest-profiles.js` centralizes that lookup, so external callers are unaffected.
- **Migration:** New pure guest-domain logic should live in `guest-profiles/domain.js`;
  new cache/Firestore logic stays in `guest-profiles.js`.
