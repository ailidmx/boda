# ADR-0015: Feature-boundary extraction into `features/` (F4)

**Status:** Accepted
**Date:** 2026-08-18

## Context

The F7 decomposition (ADR-0005) placed feature-local sub-components in
`components/<feature>/` folders (e.g. `components/coast/`, `components/nav/`,
`components/identity/`). The target architecture in `docs/FRONTEND_AUDIT.md` §3 and the
AGENTS.md §7.3 rule ("expose each feature through a public `index.ts` and prefer shallow
imports") call for feature components to live under `features/<feature>/` and be consumed
through a public barrel, not deep internal paths.

The invitation currently has three feature folders that were created under
`components/` during F7: `nav`, `identity`, and `coast`. These are genuine features (not
UI primitives), so they belong under `features/`, not `components/`.

## Decision

Move the three feature folders from `components/<feature>/` to `features/<feature>/` and
give each a public `index.js` barrel so consumers import shallowly:

- `features/nav/` — `SideDrawer.jsx`, `MobileNav.jsx`, `UserMenu.jsx`, `nav-links.js`,
  plus `index.js` exporting `getNavLinks`, `trackNav`, `SideDrawer`, `MobileNav`,
  `UserMenu`.
- `features/identity/` — `MemberCard.jsx`, `MemberTabs.jsx`, `Avatar.jsx`,
  `phone-format.js`, plus `index.js` exporting `MemberCard`, `MemberTabs`.
- `features/coast/` — `ExtraStayCard.jsx`, `CoastSuggestions.jsx`, `CoastBudget.jsx`,
  `data.js`, plus `index.js` exporting `ExtraStayCard`, `CoastSuggestions`, `CoastBudget`.

The parent section components (`Nav.jsx`, `IdentityModal.jsx`, `Coast.jsx`) now import
from `../features/<feature>/index.js` instead of deep internal paths. The old
`components/nav/`, `components/identity/`, and `components/coast/` folders were removed.

- **No markup/classes change** — this is a structural refactor, not a visual redesign.
  Rendered DOM and CSS classes are preserved exactly.
- `components/ui/` (Button, Dialog) and `components/shared/` remain the home for UI
  primitives and shared app components; only feature components move to `features/`.

## Consequences

- **Positive:** Aligns the invitation with the target feature-oriented architecture and
  the §7.3 shallow-import rule; feature internals are encapsulated behind a public barrel;
  future features follow the same `features/<feature>/index.js` convention; the
  `components/` folder now holds only primitives and shared components.
- **Negative:** Adds a folder level and a barrel file per feature; consumers must import
  through the barrel rather than deep paths (a deliberate trade-off for encapsulation).
- **Migration:** New features should be created under `features/<feature>/` with a public
  `index.js` from the start. Existing feature folders under `components/` are moved
  incrementally, one feature at a time.
