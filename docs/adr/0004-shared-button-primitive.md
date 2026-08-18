# ADR-0004: Shared `Button` UI primitive (invitation)

**Status:** Accepted
**Date:** 2026-08-17

## Context

The invitation had no `components/ui/` layer. Buttons were re-implemented per feature as
raw `<button className="button button--gold">` (and `<a>` variants) scattered across
`Accommodation.jsx`, `RSVP.jsx`, `Petanque.jsx`, `Coast.jsx`, and others. This duplicated
markup, made the semantic intent (variant/size/disabled/loading) implicit, and made the
`.button*` class system in `styles/base.css` hard to evolve or test.

## Decision

Introduce a shared `Button` UI primitive in `web/invitation/src/components/ui/Button.jsx`
that **re-exposes the existing `.button*` classes** from `styles/base.css` through a
semantic API. It does NOT change any CSS — this is a structural refactor, not a visual
redesign.

- `Button` supports `as` (`button` | `a`), `variant` (`gold` | `dark` | `light` | `ghost`),
  `size` (`small`), `disabled`, `loading`, and pass-through props.
- The pure, JSX-free logic lives in two testable helpers:
  - `button-classes.js` — `variant`/`size` → class mapping.
  - `button-state.js` — `as`/`disabled`/`loading` → element + disabled + aria decision.
- The highest-traffic usages were migrated without changing rendered markup/classes:
  `Accommodation.jsx`, `RSVP.jsx`, `Petanque.jsx`, `Coast.jsx`.

## Consequences

- **Positive:** One place to define button semantics; the `.button*` class system is now
  testable; future buttons use a consistent API; accessibility (native `disabled`,
  `aria-disabled` on anchors, `aria-busy` while loading) is centralized.
- **Negative:** Components must import the primitive instead of writing raw `<button>`.
  The primitive is invitation-only for now; the dashboard still has its own
  `.dashboard-button` (a separate future step).
- **Migration:** New buttons should use `Button`. Existing raw `.button*` usages can be
  migrated incrementally as they are touched.
