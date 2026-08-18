# ADR-0014: Defer shared loading/error/empty-state primitives (F3)

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

Phase F3 of the front-end refactor ("Shared states") proposes standardizing
loading/error/empty states and dialog/notification behavior into shared UI primitives
(`Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, a toast system). Before introducing
any primitive, the "do not over-abstract / reuse only when real reuse exists" guardrail
(§6b, §7.6) requires confirming there are at least two genuine call sites that share a
markup/class pattern.

A full inventory of both apps was performed.

## Findings

### Loading states
- **Invitation:** `MatrixLoader.jsx` is a bespoke cinematic full-screen loader with its
  own `matrix-loader.css` (portrait, canvas, scanlines, HUD, progress bar). `App.jsx`
  renders a bare `<div className="app-loading" aria-label="Loading" />` with no CSS rule.
  These are two unrelated, single-use patterns.
- **Dashboard:** there is NO spinner/loader/skeleton markup anywhere. The only "loading"
  feedback is inline `<small>` status text ("Actualizando…", "Guardando…") inside modals.

### Empty states
- Every empty message is bespoke with its own class and markup:
  `.song-request-results__status`, `.airport-autocomplete__status`, `.genre-vote__empty`,
  `.star-vote__empty`, `.accommodation-room-empty`, `.rsvp-recap-answer--empty`,
  `.phone-input__empty` (invitation) and `.dashboard-empty` (dashboard). No two call
  sites share a class.

### Error states
- Errors are shown via divergent inline status text: the `data-form-status` CSS
  convention (base.css, used by TeAnimas/Accommodation/RSVP), `rsvp-confirmation--error`,
  `song-request-feedback is-error`, `genre-vote__error` (invitation), plus the dashboard's
  toast system and per-modal `<small>` status text.

### Notification / toast
- The two apps are intentionally separate systems. The invitation has NO toast component
  and uses ZERO `window.alert`/`confirm`/`prompt`; all feedback is inline status text. The
  dashboard HAS a toast system (`_toast.scss`, used by `dashboard.js` and `cabinsPanel.js`).
  There is no cross-app duplication to unify.

## Decision

**Defer** the shared loading/error/empty-state primitives and any cross-app toast
unification. There is no genuine reuse today:

- Only ONE loader exists (MatrixLoader) — bespoke.
- Empty states are all bespoke with distinct classes.
- Error feedback is intentionally inline and divergent per feature.
- The invitation and dashboard use different notification strategies by design.

The one genuinely shared convention — the `data-form-status` CSS attribute in `base.css`
(used by TeAnimas, Accommodation, RSVP) — is already a shared CSS convention and needs no
new primitive.

## Consequences

- **No new primitives are introduced** for loading/error/empty states, avoiding thin
  pass-through wrappers that would either change appearance or add no value.
- **Appearance and behavior are preserved** — no markup/classes change.
- **Future trigger:** introduce a `Spinner`/`EmptyState`/`ErrorState` primitive only when a
  second genuine call site appears (e.g. a new search feature needing an empty state, or a
  second loader). This mirrors the F2 primitive deferral in ADR-0009.
- **Documented** in `docs/FRONTEND_AUDIT.md` (F3 phase).

## Verification

- No code changed — this is a decision + documentation ADR.
- `npm run build:all`, `npm test`, and `npx eslint` remain green (unchanged code).
