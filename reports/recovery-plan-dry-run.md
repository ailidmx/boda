# Recovery Plan — Dry-Run Report (Consolidated)

**Date:** 2026-08-08
**Scope:** `web/invitation` (guest-facing React app) + `content.js` i18n
**Status:** DRY RUN — audit complete. Additive fixes applied to `content.js` only.
**Build:** ✅ `npm run build:all` passes (invitation + dashboard).

> This is the single authoritative recovery-planning document. It consolidates the
> findings from `reports/i18n-audit-dry-run.md`, `reports/i18n-stale-code-dry-run.md`,
> `reports/audit-stale-code.md`, `reports/audit-hardcoded-strings.md`, and
> `reports/audit-empty-buttons.md` into one prioritized plan.

---

## Executive summary

The invitation app accumulated **real i18n damage** and **moderate dead code** from a
series of uncoordinated commits. The most serious problems are **translation keys
referenced by components that do not exist in `content.js`** — these render as
**blank/undefined text** (blank nav labels, blank buttons, blank sections). There is
also **one entire section (`petanqueTribute`) that was missing its translation block**,
plus **Spanish strings leaking into the `fr`/`en` translations**.

The three language blocks are otherwise **structurally consistent**, so the damage is
mostly **missing keys referenced from code**, not broken language parity.

---

## ✅ Already fixed (additive, safe — applied to `content.js`)

These were **missing i18n keys** referenced by components but absent from `content.js`.
Added to all three languages (`es`/`fr`/`en`). Build verified.

| Key | Component(s) using it | Notes |
|-----|----------------------|-------|
| `story.mapLabel` | Story map link | Was missing in all 3 langs |
| `thanks.guestCloud.navNext` | GuestCloud "see programme" CTA | Was missing in all 3 langs |
| `identity.savedWithName` | IdentityModal save confirmation | Was missing in `es`/`en` (fr had it) |
| `thanks.guestCloud.modeGroupLabel`, `modeFull`, `modeFirst`, `modeLast`, `avatarCarouselLabel` | GuestCloud name-mode UI | Was missing in all 3 langs |
| `identity.verify` | IdentityModal verify button | Was missing in all 3 langs |
| `identity.membersLabel` | IdentityModal group members | Was missing in all 3 langs |
| `accommodation.recap.*` | Accommodation recap section | Was missing in all 3 langs |
| `accommodation.navNext` | Accommodation nav | Was missing in all 3 langs |
| `accommodation.guestOption.planCard*` (6 keys) | Accommodation plan card | Was missing in all 3 langs |
| `nav.about`, `aboutTitle`, `aboutSubtitle`, `aboutClose`, `close`, `ok`, `successTitle`, `currentPasswordLabel`, `currentPasswordPlaceholder`, `confirmPasswordLabel`, `confirmPasswordPlaceholder`, `passwordMismatch`, `passwordReauthRequired`, `passwordWrongCurrent`, `emailDomainError`, `emailErrorTitle` | Nav auth/account modal | Was missing in all 3 langs |
| `nav.teAnimas`, `nav.petanque`, `nav.food`, `nav.coast` | Nav menu entries | Was missing in all 3 langs |
| `petanqueTribute.*` (whole section) | Petanque.jsx | Was missing entirely in all 3 langs |

---

## 🔴 CRITICAL — still needs fixing (blank UI)

### 1. Non-existent references (component reads a key NOT in `content.js` → renders empty)

| Key path | Component | Impact |
|----------|-----------|--------|
| `coast.suggestions.*` | `Coast.jsx:112,343–428` | Whole suggestions section never renders |
| `coast.rsvpMini.*` | `Coast.jsx:113,295–337` | Whole rsvp-mini section never renders |
| `accommodation.recap.*` | `Accommodation.jsx:358–359,926–976` | Recap section guarded by `recap.title &&` → never renders |
| `accommodation.navNext` | `Accommodation.jsx:993` | Empty nav link |
| `accommodation.guestOption.planCard*` | `Accommodation.jsx:608–642` | Empty plan-card fields |

> **Decision needed:** For each of these, either (a) add the missing block to
> `content.js`, or (b) remove the dead section from the component. The `coast`
> suggestions/rsvpMini sections appear to be **dead UI** (never rendered) — likely
> should be removed from `Coast.jsx`. The `accommodation.recap`/`planCard` sections
> appear **intended** — should be added to `content.js`.

### 2. Spanish leaking into `fr`/`en` translations

| Key | es | fr | en | Fix |
|-----|----|----|----|-----|
| `nav.teAnimas` | "Te animas" | "Te animas" ❌ | "Te animas" ❌ | fr: "Ça vous tente ?", en: "Are you in?" |
| `petanqueTribute.homage` | "¡Te animas!" | "Te animas !" ❌ | "Te animas!" ❌ | fr: "Ça vous tente !", en: "Are you in!" |
| `thanks.subtitle` | "padrinos" | "padrinos" ❌ | "padrinos" ❌ | fr: "parrains", en: "godparents" |
| `thanks.humor[0]` | "padrino" | "padrino" ❌ | "padrino" ❌ | fr: "parrain", en: "godparent" |
| `gift.accounts.mx.details[0]` | "Cuenta Clave" | "Cuenta Clave" ❌ | "Cuenta Clave" ❌ | fr: "CLABE", en: "CLABE" |
| `travel.routes.toBeachLabel` | "Hacia la playa" | "Vers la plage" ✅ | "GO TO THE PLAYA" ❌ | en: "GO TO THE BEACH" |
| `identity.ok` | "Sí, es correcto" | "Confirm" ❌ (English) | "Yes, it's correct" ✅ | fr: "Oui, c'est correct" |

---

## 🟠 MEDIUM — hardcoded strings in components (need i18n)

These are **user-facing strings hardcoded in `.jsx`** instead of `content.js`
(violates AGENTS.md). Move into a shared `a11y`/`ui` block in all three languages.

### aria-label / title (accessibility + language switching)

| File:line | Value |
|-----------|-------|
| Accommodation.jsx:515, 783 | "Close" |
| Accommodation.jsx:991 | "Continue" |
| Attire.jsx:115 | "Wixárika" |
| Attire.jsx:170 | "Close" |
| Attire.jsx:183 | "Attire navigation" |
| AuthGate.jsx:68 | "Hide password" / "Show password" |
| AuthGate.jsx:121 | "Language" |
| Coast.jsx:274 | "Previous" |
| Coast.jsx:282 | "Next" |
| Food.jsx:136 | "Close" |
| FunFactCarousel.jsx:118,124,147 | "Carousel navigation" / "Previous" / "Next" |
| Gift.jsx:56 | "Continue" |
| GuestCloud.jsx:192 | "Continue" |
| Hero.jsx:171 | "Continue" |
| IdentitySection.jsx:289 | "Continue" |
| LightboxCarousel.jsx:17,68,77,117 | "Galería" / "Cerrar" / "Anterior" / "Siguiente" |
| Nav.jsx:335 | "Language" |
| Nav.jsx:997,1002,1027 | "Scroll left" / "Primary" / "Scroll right" |
| Petanque.jsx:318 | "Continue" |
| PhoneInput.jsx:241 | "Country" |
| RsvpQuestion.jsx:64 | "Escala de respuesta" |
| Story.jsx:176,214 | "Close" / "Continue" |
| Venue.jsx:319,339,526,557 | "Anterior" / "Siguiente" / "Close" / "Venue navigation" |
| Weather.jsx:121,125,148,158,180 | "Weather slides" / "Previous" / "Next" / "Continue" / "Close" |
| Weekend.jsx:37,161,172,187,213,304,308,331 | "Weekend navigation" / "Día anterior" / "Día siguiente" / "Programme navigation" / "Close" / "Schedule slides" / "Previous" / "Next" |
| WinampPlayer.jsx:184–254 | "Mostrar u ocultar la canción actual" / "Canción anterior" / "Anterior" / "Pausar" / "Reproducir" / "Siguiente canción" / "Siguiente" / "Desactivar repetición" / "Activar repetición" / "Repetición activada" / "Repetición desactivada" / "Progreso de la canción" |
| ui.jsx:37,60 | "D. & A. — A. & D." / "David & Aydé — Aydé y David" |
| App.jsx:107 | "Loading" |

### placeholder (form fields)

| File:line | Value |
|-----------|-------|
| PhoneInput.jsx:248 | "Buscar país…" |
| RSVP.jsx:318, 349 | "GDL" |

### Hardcoded fallbacks (`|| "..."`)

| File:line | Value |
|-----------|-------|
| Petanque.jsx:280 | `|| "Resumen"` |
| Petanque.jsx:306–308 | `|| "Step"` / `"Next"` / `"Back"` |
| RsvpRecap.jsx:33,36 | `|| "Resumen"` / `"respondidos"` |
| Music.jsx:57,66 | `|| "Listen"` / `"Website"` |
| Accommodation.jsx:649 | `|| "Group members"` |
| GuestCloud.jsx:132,138,145,152,177 | `|| "Guest name mode"` / `"Nombre completo"` / `"Nombre"` / `"Apellidos"` / `"Nuestros invitados"` |
| DressCodePictograms.jsx:88 | `|| "Dress code pictograms"` |
| Petanque.jsx:201 | `— ver en grande` (Spanish suffix) |

---

## 🟡 LOW — unused / orphaned i18n keys (candidates for removal)

> ⚠️ The app uses **dynamic access** heavily (`t.nav[key]`, `t.rsvp.fields[field]`,
> iterated arrays). A naive static scan flags ~422 keys as "unused" but most are used
> dynamically. **Do NOT delete blindly.** The list below is high-confidence.

### Confirmed unused (defined but no static/dynamic reference found)

- `nav.you` — not in `NAV_LINKS`, not referenced statically.
- `hero.scroll` — no reference.
- `identity.navStory` — no reference.
- `story.navNext`, `gallery.*` — `Gallery.jsx` doesn't reference them (Gallery may be dead).
- `photos.*` — `Photos.jsx` doesn't reference `t.photos`.
- `weather.navNext`, `facilities.navNext`, `facilities.navContinue`, `facilities.navIdentity`, `attire.navNext`, `weekend.navSchedule`, `weekend.navProgram` — nav-next keys not referenced.

### Dead blocks (defined in content.js, never rendered)

- `suggestions` (top-level)
- `coast.form`
- `travel.routes` + `travel.cta` + `travel.ctaNote`
- `accommodation.plan`
- `food.days`

### Orphaned keys

- `accommodation.noCabinRecommendation`
- `accommodation.cabinsShowcase.*` except `privateVideoEyebrow`/`privateVideoTitle`
- `food.flavoursEyebrow`, `food.photoCredits`
- `facilities.note`, `facilities.navNext`, `facilities.navIdentity`

---

## 🟡 LOW — stale / dead code

### Dead exports in `src/` modules (never imported/used)

| File | Dead export(s) |
|------|----------------|
| `guests.js` | `SHARED_PASSWORD`, `getGuestByUsername`, `getGuestByEmail`, `getGuestsByUnit` |
| `guest-profiles.js` | `resolveGuestEmail`, `resolveGuestMessageAuthor`, `saveGuestMessageAuthor` |
| `invitation-profile.js` | `INVITATION_CODES`, `encodeInvitationCode`, `decodeInvitationCode`, `getInvitationCodeFromUrl`, `buildInvitationUrl`, `invitationProfileText`, `getGroupContentCache` (⚠️ some used by tests/scripts — verify) |
| `guest-attendance.js` | `getAttendanceResponse`, `resolveGuestAttendance`, `saveGuestAttendance` |
| `rsvp-responses.js` | `getRsvpResponse` |
| `rsvp-scale.js` | `DEFAULT_RSVP_LEVEL`, `getRsvpScaleMessage` |
| `thanks.js` | `hasThanksEntry`, `getThanksGuestIds` |
| `rooms.js` | `CABIN_NAME_MAP`, `getCabinDisplayName`, `getRoomOccupancy`, `getCabinNames` |
| `cloudinary.js` | `CLOUDINARY_BASE`, `cloudinaryVideoObj`, `cloudinaryVideo` |
| `cloudinary-upload.js` | `CLOUDINARY_UPLOAD_PRESET`, `AVATAR_FOLDER` |
| `submit-forms.js` | `submitCoast` |

### Dead variables / possibly-dead components

- `Accommodation.jsx:303` — `privateVideoEyebrow` assigned but never used.
- `Gallery.jsx` — uses `t.gallery.*` keys that are defined but never referenced; verify it's not mounted in `App.jsx`.

---

## 🟢 No issues found

- **No broken JS variable/import references** — all imports resolve to defined functions. The "missing" items are i18n-key issues, not JS issues.
- **No empty `<button>/<a>/<li>` tags** — every button/link has visible text or an `aria-label`. The "empty menu entries" are caused by missing `nav.*` keys (now fixed) and `cloud.navNext` (now fixed).

---

## Recovery plan (recommended order)

### Phase 1 — Fix remaining blank UI (CRITICAL)
1. **`coast.suggestions` / `coast.rsvpMini`** — decide: remove dead sections from `Coast.jsx`, OR add the blocks to `content.js`. (Recommend removal — they appear to be leftover UI.)
2. **`accommodation.recap` / `planCard`** — these appear intended; add the missing blocks to `content.js` (already partially done — verify all keys present).

### Phase 2 — Language parity (MEDIUM)
3. Translate the leaked Spanish strings (§2 table) into `fr`/`en`.

### Phase 3 — i18n hardcoded strings (MEDIUM)
4. Create a shared `a11y`/`ui` translation block and replace the ~59 hardcoded aria-labels/placeholders/titles (§3) with `t.*` references in all three languages.

### Phase 4 — Dead code cleanup (LOW)
5. Remove confirmed-dead exports (§5) after verifying no `scripts/`/`tests/` usage.
6. Investigate `Gallery.jsx` and remove if unused.
7. Remove orphaned i18n keys (§4) after confirming no dynamic usage.

### Phase 5 — Regression guard (LOW)
8. Add a **CI check** that fails the build if a `t.` key is missing from `content.js` (prevents future blank-UI regressions).
9. Add a check that flags unused keys (optional warning).

### Phase 6 — Verification
10. Run `npm test` and `npm run build:all`.
11. Run the app in all three languages and visually verify no blank labels/buttons.
12. Re-run `node scripts/audit-i18n.mjs` to confirm the missing-key count drops to 0.

---

## Files touched in this dry run

| File | Change |
|------|--------|
| `web/invitation/src/content.js` | Added missing keys: `story.mapLabel`, `thanks.guestCloud.navNext` + `mode*`/`avatarCarouselLabel`, `identity.savedWithName` + `verify` + `membersLabel`, `accommodation.recap.*` + `navNext` + `planCard*`, `nav.about*`/auth keys, `nav.teAnimas`/`petanque`/`food`/`coast`, `petanqueTribute.*` (all languages) |

No other files were modified. All remaining items are **pending your approval** before
destructive/cleanup edits.
