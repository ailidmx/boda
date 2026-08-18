# ADR-0013: Consolidate invitation design tokens into a single source of truth

- **Status:** Accepted
- **Date:** 2026-08-18
- **Branch:** `refactor/architecture`

## Context

The invitation app had two token files that both defined the same design tokens:

- `web/invitation/src/styles/tokens.css` — breakpoints, spacing scale, fluid type ramp,
  AND the color + font tokens.
- `web/invitation/src/styles/base.css` — a `:root` block that re-declared the SAME color
  and font tokens (`--ink`, `--cream`, `--terracotta`, `--marigold`, `--font-display`,
  `--font-body`, etc.) with identical values, plus two layout tokens unique to the base
  shell (`--countdown-height`, `--header-height`).

Because `tokens.css` is imported before `base.css` in `main.jsx`, the duplicated
declarations in `base.css` were redundant — they resolved to the same values and only
created a second, competing source of truth. This violates the "single source of truth"
guardrail (§7.5) and makes it easy for the two files to drift apart.

## Decision

Make `tokens.css` the **single source of truth** for the invitation's design tokens.

- Remove the duplicated color + font tokens from `base.css`'s `:root` block.
- Keep in `base.css` only the two layout tokens that are specific to the base shell
  (`--countdown-height`, `--header-height`), which are not part of the shared token
  system.
- Update the `base.css` header comment to document that design tokens live in
  `tokens.css`.

## Consequences

- **Appearance is preserved exactly.** The removed tokens had identical values to those
  in `tokens.css`, which is imported first. The built CSS output is byte-identical in
  size (292.66 kB before and after), confirming no visual change.
- **One source of truth.** Any future token change is made in `tokens.css` only; there is
  no second copy to keep in sync.
- **Clearer ownership.** `base.css` now owns reset + global layout + the shared `.button`
  primitive system + the two base-shell layout tokens; `tokens.css` owns the design token
  system.
- **No behavior change.** This is a structural refactor only — no CSS rules, selectors, or
  values were altered.

## Verification

- `npm run build:all` — passes; CSS output size unchanged.
- `npm test` — all suites pass (99 tests, 0 failures).
- `npx eslint` — no errors on changed files (CSS is outside the JS lint scope).
- Browser check — the invitation dev server serves correctly (HTTP 200) and hot-reloads
  the CSS change without errors.
