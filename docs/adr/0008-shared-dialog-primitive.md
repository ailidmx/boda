# ADR-0008: Shared `Dialog` UI primitive (invitation)

**Status:** Accepted
**Date:** 2026-08-17

## Context

The invitation had no shared modal/dialog primitive. Each modal
(`IdentityModal.jsx`, `LanguageModal.jsx`, `AboutModal.jsx`) implemented its own overlay,
card, close button, and behavior (background scroll-lock, ESC-to-close, overlay-click,
focus management) with slightly different markup and inconsistent keyboard/behavior
semantics. This duplicated the overlay/card/close structure and made the shared modal
behavior hard to evolve or test.

## Decision

Introduce a shared `Dialog` UI primitive in `web/invitation/src/components/ui/Dialog.jsx`
that is a **behavioral** wrapper: it renders the overlay + card + close-button structure
and owns the shared modal behavior (background scroll-lock, ESC-to-close,
overlay-click-to-close, focus management). Each modal keeps its own visual classes via
`overlayClassName` / `cardClassName` / `closeClassName`, so migrating preserves each
modal's exact appearance — **no CSS was changed**.

- The pure, JSX-free logic lives in `dialog-state.js`:
  - `dialogBehavior` — resolves `closeOnEscape` / `closeOnOverlayClick`, both defaulting
    to **OFF** so migration never changes existing behavior.
  - `dialogClasses` — normalizes the per-modal class names (overlay/card/close).
- Migrated the three invitation modals that share the overlay/card/close structure:
  - `IdentityModal.jsx` — keeps its existing behavior (no ESC / no overlay-click).
  - `LanguageModal.jsx` — keeps its existing behavior (no ESC / no overlay-click).
  - `AboutModal.jsx` — opts into `closeOnEscape` + `closeOnOverlayClick` (it already
    closed on ESC and overlay-click before migration).

## Consequences

- **Positive:** One place to define modal behavior; the overlay/card/close structure is no
  longer duplicated; behavior is testable via `dialog-state.js`; future modals get
  consistent focus management and scroll-lock for free.
- **Negative:** Components must import the primitive instead of writing raw overlay/card
  markup. The primitive is invitation-only for now; the dashboard still has its own
  `_modal.scss` (a separate future step).
- **Migration:** New modals should use `Dialog`. Existing raw overlay/card usages can be
  migrated incrementally as they are touched.
