# ADR-0016: Defer shared form primitives (F5)

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

Phase F5 of the front-end refactor ("Normalize forms") proposes a shared form pattern
(labels, errors, submitting state) — e.g. a `FormField` / `FormStatus` primitive — to
replace the hand-rolled forms in `IdentityModal.jsx`, `RSVP.jsx`, `AuthGate.jsx`
(invitation) and `guestEditorModal.js`, `guestModals.js` (dashboard). Before introducing
any primitive, the "do not over-abstract / reuse only when real reuse exists" guardrail
(§6b, §7.6) requires confirming there are at least two genuine call sites that share a
markup/class pattern.

A full inventory of both apps was performed.

## Findings

### Invitation (React forms)
- **`AuthGate.jsx`** — a single-column login form: `<label htmlFor>` + `<input>`, a
  `.password-field` wrapper with a password-toggle button, a `.gate-disclosure` checkbox,
  a `.button.button-dark` submit with `disabled={submitting || !disclosure}`, and an error
  via `<small data-access-status data-state="error">`. Uses a local `submitting` state.
- **`IdentityModal.jsx` / `features/identity/MemberCard.jsx`** — a 5-step flip wizard
  (`identity-edit-form`, `.form-field` wrappers with `<label htmlFor>` + `<input>`), one
  field per step, `noValidate`, no per-field errors (validation in `saveAll` reports via
  `onStatusChange`).
- **`RSVP.jsx` / `TeAnimas.jsx` / `Accommodation.jsx`** — mini-RSVP flows that already
  share the `data-form-status` CSS convention in `base.css` (`<small data-form-status>`
  driven by a `saveStatus` state: working/saved/error).
- **`Coast.jsx`** — a mini-RSVP flow (same `data-form-status` family).

These forms are structurally very different (login form, 5-step wizard, question-card
flows). The only shared convention is `data-form-status`, which is already a shared CSS
convention in `base.css`.

### Dashboard (DOM-built modals, not React)
- **`guestEditorModal.js`** — a DOM-built modal with `.dashboard-modal-field` wrappers
  (`<label for>` + `<input>`), a `<small data-guest-editor-status>` status element with
  `data-state` working/success/error, and `.dashboard-button` submit. Uses inline `style`
  for status colors.
- **`guestModals.js`** — delete-confirm and send-invite modals using the same
  `.dashboard-modal-field` + `<small data-*-status>` pattern.

The dashboard's `.dashboard-modal-field` + status-`<small>` pattern IS shared across its
modals, but the dashboard is a separate app (per ADR-0014) and builds its modals via DOM
(`document.createElement` + `innerHTML`), not React — so a React `FormField`/`FormStatus`
primitive would not apply cleanly.

## Decision

**Defer** a shared form primitive (labels/errors/submitting state) in both apps. There is
no genuine cross-form reuse that justifies a primitive without either changing appearance
or creating a thin pass-through wrapper:

- **Invitation:** the `data-form-status` CSS convention (base.css, used by
  RSVP/TeAnimas/Accommodation) is already the shared form-status convention and needs no
  new primitive. The other forms (AuthGate, IdentityModal) are structurally unique (login
  form, 5-step wizard) with no shared field markup.
- **Dashboard:** the `.dashboard-modal-field` + `data-state` status convention is already
  consistent across its DOM-built modals; a React primitive would not apply to DOM-built
  modals, and the dashboard is intentionally a separate system.

## Consequences

- **No new primitives are introduced** for form fields/status, avoiding thin pass-through
  wrappers that would either change appearance or add no value.
- **Appearance and behavior are preserved** — no markup/classes change.
- **Future trigger:** introduce a `FormField`/`FormStatus` primitive only when a second
  genuine React call site shares a field/status markup pattern (e.g. a new React form that
  duplicates the `data-form-status` markup). This mirrors the F2/F3 primitive deferrals in
  ADR-0009 and ADR-0014.
- **Documented** in `docs/FRONTEND_AUDIT.md` (F5 phase).

## Verification

- No code changed — this is a decision + documentation ADR.
- `npm run build:all`, `npm test`, and `npx eslint` remain green (unchanged code).
