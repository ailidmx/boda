# ADR-0018: Accessibility — mark decorative emoji icons aria-hidden (F8)

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

Phase F8 ("Accessibility & responsive improvements") of the front-end refactor improves
semantic HTML, focus management, and accessible icon labels WITHOUT changing appearance or
behavior. The audit (docs/FRONTEND_AUDIT.md, problem #12) flagged emoji-as-icon usage
lacking accessible labels.

A concrete inventory of the invitation's signed-in account menu
(`web/invitation/src/features/nav/UserMenu.jsx`) found that each menu action is a real
`<button>` with a visible text label (e.g. `{identity.eyebrow}`, `{nav.changeEmail}`,
`{nav.logout}`) plus a decorative emoji icon in a `.user-menu__item-icon` span
(🪪 📷 ✉ 🔑 🎵 ℹ️ 📊 ↪). The accessible name already comes from the visible text, so the
emoji glyphs are redundant for screen readers — but they were NOT `aria-hidden`, so
assistive tech would announce the emoji in addition to the label.

## Decision

Mark all 8 decorative `.user-menu__item-icon` emoji spans in `UserMenu.jsx` with
`aria-hidden="true"`. This is a purely additive attribute change:

- No markup structure, class, or behavior changes.
- No CSS changes — appearance is preserved exactly.
- Screen readers now announce only the visible text label for each menu action, not the
  redundant emoji glyph.

## Evaluation of the remaining F8 gaps (deferred)

The other F8 gaps were evaluated and intentionally deferred because a safe scoped fix
would require a visual or behavioral trade-off, or belongs to a separate app pass:

- **Dashboard emoji icons** (`guestTable.js`: 🔒 📷 🔑 ❌ 📱 ✉️ ✏️ 🔗 👁️ 🗑️) already carry
  `title` attributes (e.g. `title="Editar foto de perfil"`). The dashboard is a separate
  app (per ADR-0014) that builds its table via DOM template literals, not React; upgrading
  `title` → `aria-label` there is a dashboard-scoped change better handled in a dedicated
  dashboard pass.
- **Clickable `<div>`/`<span>` → `<button>`** — the audit's flagged interactive elements
  are already real `<button>`s in the invitation (user menu, nav scroll buttons, modal
  close buttons). No safe conversion was found where the CSS already styles a non-button
  element as a button.
- **Dialog focus management** — the shared `Dialog` primitive (F2) already owns ESC /
  overlay-click / scroll-lock behavior; the migrated modals preserve their existing focus
  behavior. Full focus-trap + focus-restore is a behavioral enhancement that would change
  modal behavior, so it is deferred rather than mixed into this structural pass.
- **Table header semantics** — the dashboard's only real `<table>` (`guestTable.js`) uses
  semantic `<th>` headers (via `sortTh`) and `<thead>`/`<tbody>`. No missing-header gap
  was found.

## Consequences

- **Improved accessibility** for the invitation's user menu with zero visual/behavioral
  change.
- **No new primitive or abstraction** — this is a targeted attribute fix, not a component.
- **Future trigger:** a dedicated dashboard accessibility pass can upgrade the dashboard's
  `title`-only emoji buttons to `aria-label`; a behavioral focus-trap enhancement to the
  `Dialog` primitive can be done as its own scoped change when desired.

## Verification

- `npm run build:all` — green.
- `npx eslint web/invitation/src/features/nav/UserMenu.jsx` — clean.
- `npm test` — 14 pass.
- Documented in `docs/FRONTEND_AUDIT.md` (F8 phase).
