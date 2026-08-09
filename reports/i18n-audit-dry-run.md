# i18n & Stale-Code Audit — Dry Run Report

> **Status:** DRY RUN — no files modified. This is a recovery-planning document.
> **Scope:** `web/invitation/src` (guest-facing React app).
> **Generated:** 2026-08-08

---

## Executive summary

The invitation app has **real i18n damage** and a moderate amount of **dead code**.
The most serious issues are **translation keys referenced by components that do not
exist in `content.js`** — these render as **empty/undefined text** in the UI (blank
nav labels, blank buttons, blank sections). There is also one **entire section
(`petanqueTribute`) that references a translation block that does not exist at all**.

The good news: the three language blocks (`es`/`fr`/`en`) are **structurally
consistent** (only 1 extra key in `fr`, 0 missing in `fr`/`en`), so the i18n damage
is mostly **missing keys referenced from code**, not broken language parity.

---

## 1. Translation keys referenced in code but MISSING from `content.js` (CRITICAL)

These render as **empty/undefined** in the UI. Fix by adding the key to all three
language blocks (or removing the reference).

### 1a. Missing top-level / section keys

| Key | Referenced in | Impact |
|-----|---------------|--------|
| `t.petanqueTribute.*` | `components/Petanque.jsx:35` | **Entire pétanque tribute section renders empty** (eyebrow/title/intro/body/photos/rsvpMini). The section `petanqueTribute` does not exist in `content.js` at all — only `t.rsvp.petanque` exists. Guarded with `|| {}` so it won't crash, but the whole section is blank. |

### 1b. Missing `nav.*` keys (auth / account modal)

Referenced in `components/Nav.jsx` but **absent from the `es`/`fr`/`en` `nav` block**:

| Key | Notes |
|-----|-------|
| `nav.about` | renders `undefined` (no fallback) |
| `nav.aboutTitle` | renders `undefined` |
| `nav.aboutSubtitle` | renders `undefined` |
| `nav.aboutClose` | renders `undefined` |
| `nav.close` | renders `undefined` |
| `nav.ok` | renders `undefined` |
| `nav.successTitle` | renders `undefined` |
| `nav.currentPasswordLabel` | renders `undefined` |
| `nav.currentPasswordPlaceholder` | renders `undefined` |
| `nav.confirmPasswordLabel` | renders `undefined` |
| `nav.confirmPasswordPlaceholder` | renders `undefined` |
| `nav.passwordMismatch` | renders `undefined` |
| `nav.passwordReauthRequired` | renders `undefined` |
| `nav.passwordWrongCurrent` | renders `undefined` |
| `nav.emailDomainError` | renders `undefined` |
| `nav.emailErrorTitle` | renders `undefined` |

### 1c. Missing `nav.*` keys used dynamically via `NAV_LINKS`

`Nav.jsx` iterates `t.nav[key]` over `NAV_LINKS`. These keys are in `NAV_LINKS` but
**not** in the `nav` block → **blank nav menu entries** (desktop + mobile):

- `nav.teAnimas` (also referenced statically in `components/TeAnimas.jsx`)
- `nav.petanque`
- `nav.food`
- `nav.coast`

### 1d. Missing keys in other sections

| Key | Referenced in | Impact |
|-----|---------------|--------|
| `story.mapLabel` | `components/Story.jsx:114,132,206` | empty aria-label/alt on map link |
| `cloud.navNext` | `components/GuestCloud.jsx:194` | **empty nav link** (no fallback) |

### 1e. Missing keys with fallbacks (LOW priority — render fallback, not blank)

These are referenced but missing; they have `|| "..."` guards so they show a
hardcoded fallback instead of blank. Still should be added to `content.js`:

- `identity.verify` (IdentityModal.jsx)
- `identity.membersLabel` (IdentityModal.jsx)
- `identity.savedWithName` (IdentityModal.jsx) — **also the only structural mismatch** (see §3)
- `cloud.modeGroupLabel`, `cloud.modeFull`, `cloud.modeFirst`, `cloud.modeLast`, `cloud.avatarCarouselLabel` (GuestCloud.jsx)

---

## 2. Translation keys defined in `content.js` but UNUSED (candidates for removal)

> **Important caveat:** the app uses **dynamic access** heavily (e.g. `t.nav[key]`,
> `t.rsvp.fields[field]`, `t.food.flavours[i].title`, `t.accommodation.guestOption.occupancy[...]`).
> A naive static scan flags ~422 keys as "unused", but **most are actually used via
> dynamic indexing**. The list below is therefore **NOT safe to delete blindly**.

### 2a. Confirmed unused (defined but no static or dynamic reference found)

- `nav.you` — defined but not present in `NAV_LINKS` and not referenced statically.
- `hero.scroll` — no reference found.
- `identity.navStory` — no reference found.
- `story.navNext`, `gallery.eyebrow`, `gallery.title`, `gallery.body`, `gallery.alts` — `Gallery.jsx` does not reference them (Gallery may be dead — see §5).
- `photos.*` — `Photos.jsx` does not reference `t.photos` (verify — may use hardcoded strings, see §4).
- `weather.navNext`, `facilities.navNext`, `facilities.navContinue`, `facilities.navIdentity`, `attire.navNext`, `weekend.navSchedule`, `weekend.navProgram` — nav-next keys not referenced.

> **Action:** before deleting any key, run the app and confirm the section truly
> doesn't use it. Prefer **keeping** keys over deleting to avoid regressions.

### 2b. Keys that appear unused but are likely used dynamically (DO NOT delete)

The following sections are accessed via dynamic patterns and should be treated as
**used** even though static scan flags them:

- `rsvp.fields.*`, `rsvp.options.*`, `rsvp.groups.*`, `rsvp.petanque.fields.*`, `rsvp.petanque.options.*` — via `t.rsvp.fields[fieldName]`, `t.rsvp.options[optName]`, etc.
- `accommodation.guestOption.occupancy.*`, `.payment.*`, `.hotelTypes.*` — via dynamic indexing.
- `food.flavours`, `food.days`, `music.acts`, `music.playlists.*`, `weekend.*.items`, `travel.routes.*`, `coast.form.*`, `suggestions.*` — iterated arrays/objects.
- `story.photoAlts`, `story.funFacts`, `facilities.gallery`, `facilities.rocaGalleryAlts`, `accommodation.cabinsShowcase.*` — data arrays.

---

## 3. Structural mismatches between languages

| Issue | Detail |
|-------|--------|
| **Extra in `fr`** | `identity.savedWithName` exists in `fr` but not in `es`/`en`. |
| Missing in `fr` | none |
| Missing in `en` | none |

**Action:** add `identity.savedWithName` to `es` and `en` (it's referenced in
IdentityModal.jsx with a fallback), OR remove from `fr` if unused.

---

## 4. Hardcoded user-facing strings (need i18n) — 59 found

These are **not** translated. They are mostly `aria-label` / `placeholder` / `title`
attributes. Some are already in Spanish (the default) but will not switch language.

### 4a. aria-label / title (accessibility + language switching)

| File:line | Value |
|-----------|-------|
| Accommodation.jsx:515, 783 | "Close" |
| Accommodation.jsx:991 | "Continue" |
| Attire.jsx:115 | "Wixárika" |
| Attire.jsx:170 | "Close" |
| Attire.jsx:183 | "Attire navigation" |
| AuthGate.jsx:121 | "Language" |
| Coast.jsx:274 | "Previous" |
| Coast.jsx:282 | "Next" |
| Food.jsx:136 | "Close" |
| FunFactCarousel.jsx:118 | "Carousel navigation" |
| FunFactCarousel.jsx:124 | "Previous" |
| FunFactCarousel.jsx:147 | "Next" |
| Gift.jsx:56 | "Continue" |
| GuestCloud.jsx:192 | "Continue" |
| Hero.jsx:171 | "Continue" |
| IdentitySection.jsx:289 | "Continue" |
| LightboxCarousel.jsx:17 | "Galería" |
| LightboxCarousel.jsx:68 | "Cerrar" |
| LightboxCarousel.jsx:77 | "Anterior" |
| LightboxCarousel.jsx:117 | "Siguiente" |
| Nav.jsx:335 | "Language" |
| Nav.jsx:997 | "Scroll left" |
| Nav.jsx:1002 | "Primary" |
| Nav.jsx:1027 | "Scroll right" |
| Petanque.jsx:318 | "Continue" |
| PhoneInput.jsx:241 | "Country" |
| RsvpQuestion.jsx:64 | "Escala de respuesta" |
| Story.jsx:176 | "Close" |
| Story.jsx:214 | "Continue" |
| Venue.jsx:319 | "Anterior" |
| Venue.jsx:339 | "Siguiente" |
| Venue.jsx:526 | "Close" |
| Venue.jsx:557 | "Venue navigation" |
| Weather.jsx:121 | "Weather slides" |
| Weather.jsx:125 | "Previous" |
| Weather.jsx:148 | "Next" |
| Weather.jsx:158 | "Continue" |
| Weather.jsx:180 | "Close" |
| Weekend.jsx:37 | "Weekend navigation" |
| Weekend.jsx:161 | "Día anterior" |
| Weekend.jsx:172 | "Día siguiente" |
| Weekend.jsx:187 | "Programme navigation" |
| Weekend.jsx:213 | "Close" |
| Weekend.jsx:304 | "Schedule slides" |
| Weekend.jsx:308 | "Previous" |
| Weekend.jsx:331 | "Next" |
| WinampPlayer.jsx:184 | "Mostrar u ocultar la canción actual" |
| WinampPlayer.jsx:198 | "Canción anterior" |
| WinampPlayer.jsx:199 | "Anterior" |
| WinampPlayer.jsx:218 | "Siguiente canción" |
| WinampPlayer.jsx:219 | "Siguiente" |
| WinampPlayer.jsx:254 | "Progreso de la canción" |
| ui.jsx:37 | "D. & A. — A. & D." |
| ui.jsx:60 | "David & Aydé — Aydé y David" |
| App.jsx:107 | "Loading" |

### 4b. placeholder (form fields)

| File:line | Value |
|-----------|-------|
| PhoneInput.jsx:248 | "Buscar país…" |
| RSVP.jsx:318, 349 | "GDL" |

> **Action:** move all of these into `content.js` under a shared `a11y`/`ui` block
> (or per-section blocks) in all three languages. The `ui.jsx` couple-name labels
> are intentionally bilingual (both names shown) — decide whether to keep as-is.

---

## 5. Stale / dead code (dead exports — never imported/used)

Verified against `components/` and other `src/` files. These are **safe candidates
for removal** (no app code imports them):

### 5a. Dead exports in `src/` modules

| File | Dead export(s) |
|------|----------------|
| `guests.js` | `SHARED_PASSWORD`, `getGuestByUsername`, `getGuestByEmail`, `getGuestsByUnit` |
| `guest-profiles.js` | `resolveGuestEmail` (always returns ""), `resolveGuestMessageAuthor`, `saveGuestMessageAuthor` |
| `invitation-profile.js` | `INVITATION_CODES`, `encodeInvitationCode`, `decodeInvitationCode`, `getInvitationCodeFromUrl`, `buildInvitationUrl`, `parseInvitationProfile` (used only by tests/scripts); `invitationProfileText`, `getGroupContentCache` (never used anywhere) |
| `guest-attendance.js` | `getAttendanceResponse`, `resolveGuestAttendance`, `saveGuestAttendance` |
| `rsvp-responses.js` | `getRsvpResponse` |
| `rsvp-scale.js` | `DEFAULT_RSVP_LEVEL`, `getRsvpScaleMessage` |
| `thanks.js` | `hasThanksEntry`, `getThanksGuestIds` |
| `rooms.js` | `CABIN_NAME_MAP`, `getCabinDisplayName`, `getRoomOccupancy`, `getCabinNames` |
| `cloudinary.js` | `CLOUDINARY_BASE`, `cloudinaryVideoObj`, `cloudinaryVideo` |
| `cloudinary-upload.js` | `CLOUDINARY_UPLOAD_PRESET`, `AVATAR_FOLDER` |
| `submit-forms.js` | `submitCoast` |

### 5b. Possibly-dead components (verify before removing)

- `Gallery.jsx` — uses `t.gallery.*` keys that are defined but never referenced; may be
  an unused/legacy section. Verify it's not mounted in `App.jsx`.

> **Action:** confirm each dead export isn't used by `scripts/` or `tests/` before
> deleting. `invitation-profile.js` exports are used by tests/scripts — keep those.

---

## 6. Broken variable / import references

**No broken references found.** All imports in every audited `src/` module resolve to
defined functions. The "missing" items in §1 are **i18n key** issues, not JS
variable issues.

---

## 7. Empty buttons / menu entries / links

- **No empty `<button>/<a>/<li>` tags** found (regex scan).
- **However**, the missing `nav.*` keys in §1c (`teAnimas`, `petanque`, `food`,
  `coast`) produce **blank nav menu entries** at runtime, and `cloud.navNext`
  produces a **blank nav link**. These are the real "empty menu entry" problems.

---

## 8. Recovery plan (recommended order)

### Phase 1 — Fix critical missing keys (restores blank UI)
1. Add `petanqueTribute` section to `content.js` (es/fr/en) OR rewire `Petanque.jsx`
   to use the existing `rsvp.petanque` block. **Highest impact** — whole section is blank.
2. Add missing `nav.*` auth keys (§1b) to all three languages.
3. Add `nav.teAnimas`, `nav.petanque`, `nav.food`, `nav.coast` to the `nav` block
   (all three languages) so nav menu entries render.
4. Add `story.mapLabel` and `cloud.navNext` to their sections.

### Phase 2 — Language parity
5. Add `identity.savedWithName` to `es` and `en` (or remove from `fr`).

### Phase 3 — i18n the hardcoded strings
6. Create a shared `a11y`/`ui` translation block and replace the 59 hardcoded
   aria-labels/placeholders/titles (§4) with `t.*` references in all three languages.

### Phase 4 — Dead code cleanup
7. Remove confirmed-dead exports (§5a) after verifying no `scripts/`/`tests/` usage.
8. Investigate `Gallery.jsx` and remove if unused.

### Phase 5 — Verification
9. Run `npm test` and `npm run build:all`.
10. Run the app in all three languages and visually verify no blank labels/buttons.
11. Re-run `node scripts/audit-i18n.mjs` to confirm the missing-key count drops to 0.

---

## Appendix — Audit tooling

A reusable audit script was added at `scripts/audit-i18n.mjs`. It produces an
automated report (static `t.` scan + structural language diff + hardcoded-string
heuristics). Re-run with:

```bash
node scripts/audit-i18n.mjs
```

> Note: the automated script under-counts "used" keys because of dynamic access.
> The curated findings in this report (from manual + subagent review) are the
> authoritative list.
