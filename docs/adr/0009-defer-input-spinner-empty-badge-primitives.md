# ADR-0009: Defer `Input` / `Spinner` / `EmptyState` / `Badge` primitives (no genuine reuse)

**Status:** Accepted
**Date:** 2026-08-17

## Context

The F2 phase introduced shared `Button` (ADR-0004) and `Dialog` (ADR-0008) primitives
because they had genuine, repeated call sites. The original audit also listed `Input`,
`Spinner`, `EmptyState`, and `Badge` as candidate primitives. Before building them, we
audited every call site in the invitation (and the dashboard for badges) to confirm real
reuse exists.

## Findings

Each candidate primitive turned out to be **bespoke per feature**, with its own class and
markup and no shared class across call sites:

- **Input** — no shared input class. Each feature styles its own:
  `.song-request-field__input` (SongRequest), `.phone-input__number` (PhoneInput), bare
  inputs in AuthGate. No two call sites share a class.
- **Spinner** — only ONE loader exists (`MatrixLoader.jsx`), a bespoke cinematic
  full-screen component with its own `matrix-loader.css`. There is no generic spinner to
  unify.
- **EmptyState** — each empty message is bespoke: `.song-request-results__status`,
  `.airport-autocomplete__status`, `.genre-vote__empty`, `.star-vote__empty`,
  `.accommodation-room-empty`, `.rsvp-recap-answer--empty`, `.phone-input__empty`. No
  shared class.
- **Badge** — bespoke per context: `identity-group-badge`, `identity-member-tag`
  (invitation), `badgeHtml`/`badgeStyle` chips (dashboard). No shared class across call
  sites.

## Decision

**Defer** introducing `Input`, `Spinner`, `EmptyState`, and `Badge` primitives for now.
Forcing them would either change appearance (violating the "preserve appearance exactly"
rule) or produce thin pass-through wrappers with a `className` prop — which is
over-abstraction with no real reuse. This follows the audit's own rule: *"Do NOT
over-abstract. Prefer three clear components over one configurable component with 37
props. Reusability is valuable only when real reuse exists."*

## Consequences

- **Positive:** No speculative abstraction; no risk of visual drift; the `components/ui/`
  layer stays small and honest (Button + Dialog, both with genuine reuse).
- **Negative:** The next feature that needs an input/empty-state/loader/badge must still
  write bespoke markup until a second genuine call site appears.
- **Trigger to revisit:** Introduce each primitive only when a second genuine call site
  appears — e.g. a new search feature that needs an empty state, a second loader, or a
  second shared input class. When that happens, extract the primitive from the two real
  call sites (not from a speculative API).
