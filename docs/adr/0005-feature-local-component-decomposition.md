# ADR-0005: Feature-local component decomposition (F7)

**Status:** Accepted
**Date:** 2026-08-17

## Context

The invitation's largest section components (`Nav.jsx` ~1003, `IdentityModal.jsx` ~865,
`Coast.jsx` ~809, `Accommodation.jsx` ~900) mix presentation, form state, domain
calculations, and (in some cases) data access. They violate the single-responsibility
rule and are hard to test. The audit (docs/FRONTEND_AUDIT.md, problem #2) calls for
decomposing them.

## Decision

Decompose giant section components into **feature-local sub-components** placed in a
`components/<feature>/` folder (e.g. `components/coast/`), rather than a global
`components/` folder. This follows the §6b/§7.3 rule that feature components stay inside
their feature.

- Each sub-component owns one coherent slice of the section (e.g. the extra-stay card,
  the accommodation suggestions, the budget estimate).
- The parent section component keeps the section scaffolding and composes the
  sub-components, passing data down via props.
- Shared, feature-specific helpers (e.g. `formatPrice`, `MXN_PER_EUR`) live in a
  `data.js` (or `utils.js`) inside the feature folder.
- **No markup/classes change** — this is a structural refactor, not a visual redesign.
  Rendered DOM and CSS classes are preserved exactly.
- Each decomposition is verified with `build:all` + lint + tests and committed separately.

## Consequences

- **Positive:** Each sub-component is small, single-purpose, and independently readable;
  the parent becomes a composition point; feature helpers are co-located and reusable
  within the feature; future extraction into `features/<feature>/` (F4) is trivial.
- **Negative:** Adds a folder level; sub-components must receive data via props rather
  than reading context directly (a deliberate trade-off for testability and clarity).
- **Migration:** New large sections should be built as feature-local sub-components from
  the start. Existing giant components are decomposed incrementally, one slice at a time.
