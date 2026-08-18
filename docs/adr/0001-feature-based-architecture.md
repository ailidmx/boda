# ADR-0001: Feature-based architecture

**Status:** Accepted
**Date:** 2026-08-17

## Context

The repository has grown organically. The dashboard is a single 2593-line god file
(`web/dashboard/src/dashboard.js`) mixing UI rendering, Firestore access, business rules,
routing, and module state. The invitation app has oversized section components
(`Accommodation.jsx` 1075 lines, `Nav.jsx` 1003 lines) and a bootstrap god-context
(`AppContext.jsx` 647 lines). Code is grouped by technical layer (components/, hooks/,
*.js data modules) rather than by domain, which makes it hard to reason about a feature
end-to-end and encourages duplication.

## Decision

Organize code by **feature/domain** rather than by technical layer. Each feature
(`guests`, `rsvp`, `cabins`, `music`, `travel`, `coast`, …) owns its components, hooks,
services, repositories, schemas, and types, and exposes a public API through an
`index.ts`.

Do **not** create folders mechanically — only create a folder when it holds real,
cohesive code. The structure must reflect the actual size of the application.

## Consequences

- **Positive:** A feature is discoverable in one place; cross-feature imports are
  explicit; duplication is easier to spot; the dashboard can be decomposed feature by
  feature.
- **Negative:** Requires moving existing files; some shared code still lives in
  `web/shared/` and `components/` until migrated.
- **Migration:** Incremental. Each phase moves one domain into a `features/<feature>/`
  folder and updates imports. Behavior is preserved at each step.
