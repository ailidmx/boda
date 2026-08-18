# ADR-0021: Split trilingual `content.js` by section

**Status:** Accepted
**Date:** 2026-08-17

## Context

All user-facing copy lived in a single `web/invitation/src/content.js` (~5,260 lines)
holding a `content` object with three language blocks (`es`, `fr`, `en`), each containing
~27 top-level sections (nav, hero, food, guisos, music, rsvp, coast, petanqueTribute,
songRequest, …). This god file was fragile: an accidental uncommitted edit removed four
sections (guisos, petanqueTribute, songRequest, and the nested `music.shared`) across all
three languages, which would have rendered those features blank. A single file also makes
per-section edits and merge conflicts harder to manage.

## Decision

Split the trilingual content by **section** into a `web/invitation/src/content/` directory:

- One file per section (e.g. `content/hero.js`, `content/food.js`, `content/guisos.js`,
  `content/music.js`, `content/rsvp.js`, `content/coast.js`, `content/petanqueTribute.js`,
  `content/songRequest.js`, …), each exporting `{ es, fr, en }` for that section.
- `content/index.js` composes them into the exact same `content` object shape
  (`{ es: { locale, skip, metaDescription, nav, countdown, hero, … }, fr: {…}, en: {…} }`),
  preserving key order.
- `content.js` becomes a thin re-export of `content` (from `./content/index.js`),
  `EVENT`, and `SUPPORTED_LANGUAGES`, so **all existing imports keep working unchanged**
  (`import { content, EVENT, SUPPORTED_LANGUAGES } from "../content.js"`).

The split is purely structural: the composed `content` object is deep-equal to the
original (verified for all three languages, plus `EVENT` and `SUPPORTED_LANGUAGES`).
No component, CSS, or behavior changed.

## Consequences

- **Positive:** Each section is independently editable in a small file; the risk of a
  single accidental edit wiping multiple features is contained; merge conflicts are
  localized to the section being changed; the `content` object shape is unchanged so the
  rest of the app is untouched.
- **Negative:** More files to navigate; the `content/` directory must be kept in sync with
  the `content` object's section keys (adding a section means adding a file + wiring it in
  `content/index.js`).
- **Migration:** New copy should be added to the relevant section file. The scalar keys
  (`locale`, `skip`, `metaDescription`) remain in `content/index.js`. `EVENT` and
  `SUPPORTED_LANGUAGES` stay in `content.js`.
