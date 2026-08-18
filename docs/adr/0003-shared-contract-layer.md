# ADR-0003: Shared contract layer (paths, payloads, validation)

**Status:** Accepted
**Date:** 2026-08-17

## Context

Both the invitation and the dashboard read and write the same Firestore collections
(`guests`, `rooms`, `cabins`, `tables`, `invitation_groups`, `card_votes`,
`genre_ratings`, `guiso_rankings`, `song_requests`, `thanks`, …). Collection names,
payload shapes, and validation rules were historically duplicated or scattered, causing
drift between the two apps and between the client and the Firestore Security Rules.

## Decision

Maintain a **framework-agnostic shared contract layer** in `web/shared/`:

- `firestore-paths.js` — the single source of truth for collection names.
- `payload-builders.js` — explicit, allowlisted payload builders (never spread raw form
  state into Firestore).
- `validation.js` — runtime validators that mirror the Firestore Security Rules, so
  invalid payloads are caught client-side before a round-trip.

Both apps import from `web/shared/*`. The Firestore Security Rules remain the
authoritative security boundary; the client validators are for early feedback and
testability, not security.

## Consequences

- **Positive:** One source of truth for collection names, payload shapes, and validation;
  the invitation and dashboard agree on the data contract; rules and client stay in sync.
- **Negative:** Changes to the shared layer affect both apps and must be tested together.
- **Migration:** Already largely in place. Remaining work: route the dashboard's direct
  writes through `validation.js` and `payload-builders.js`, and replace any remaining
  hardcoded collection names with `collections.*`.
