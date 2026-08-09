# Dry-Run Report: i18n Keys, Stale Code & Regressions

**Date:** 2026-08-08
**Scope:** `web/invitation` (guest-facing React app)
**Status:** DRY RUN — no destructive changes applied. Only additive fixes to `content.js` were made to restore missing keys.

---

## 1. Summary

The invitation app had accumulated **stale state, missing i18n keys, and regressions** from a series of uncoordinated commits. This report documents every issue found, what was already fixed (additive only), and what still needs attention before we consider the app "clean".

### What was already fixed (additive, safe)
These were **missing i18n keys** referenced by components but absent from `content.js`. They were added to all three languages (`es`, `fr`, `en`):

| Key | Component(s) using it | Notes |
|-----|----------------------|-------|
| `story.mapLabel` | Story section map | Was missing in all 3 langs |
| `thanks.guestCloud.navNext` | GuestCloud "see programme" CTA | Was missing in all 3 langs |
| `identity.savedWithName` | IdentityModal save confirmation | Was missing in `es` and `en` (fr had it) |

---

## 2. Missing i18n keys (FIXED — additive)

These keys were referenced in components via `t.xxx` but did not exist in `content.js`, causing **blank UI** (per AGENTS.md: "When a component references a translation key that doesn't exist, the UI renders empty").

| Key | Language(s) missing | Status |
|-----|--------------------|--------|
| `story.mapLabel` | es, fr, en | ✅ Added |
| `thanks.guestCloud.navNext` | es, fr, en | ✅ Added |
| `identity.savedWithName` | es, en | ✅ Added (fr already present) |

---

## 3. Unused / orphaned i18n keys (STILL PRESENT — needs review)

These keys exist in `content.js` but **no component references them**. They are candidates for removal (or they indicate a component was deleted but its copy was left behind). **Not removed yet** — pending your confirmation.

### `nav` block (account/email/password management)
These look like leftovers from an account-management feature that may have been removed or moved to the dashboard:
- `nav.dashboard`
- `nav.changeEmail`, `nav.changePassword`, `nav.logout`
- `nav.emailWarningTitle`, `nav.emailWarningBody`
- `nav.currentEmailLabel`, `nav.newEmailLabel`, `nav.newEmailPlaceholder`
- `nav.emailInvalid`, `nav.emailSuccess`, `nav.emailUnchanged`, `nav.emailError`
- `nav.emailVerificationSent`, `nav.emailReauthRequired`
- `nav.emailReauthLabel`, `nav.emailReauthPlaceholder`, `nav.emailReauthPasswordRequired`
- `nav.newPasswordLabel`, `nav.newPasswordPlaceholder`
- `nav.passwordError`, `nav.passwordSuccess`
- `nav.currentPasswordLabel`, `nav.currentPasswordPlaceholder`
- `nav.confirmPasswordLabel`, `nav.confirmPasswordPlaceholder`
- `nav.passwordMismatch`, `nav.passwordReauthRequired`, `nav.passwordWrongCurrent`
- `nav.emailDomainError`, `nav.emailErrorTitle`
- `nav.about`, `nav.aboutTitle`, `nav.aboutSubtitle`, `nav.aboutClose`
- `nav.successTitle`, `nav.ok`, `nav.close`, `nav.cancel`, `nav.save`, `nav.working`

### `nav` menu entries (section navigation)
- `nav.teAnimas`, `nav.petanque`, `nav.food`, `nav.coast` — these look like **menu section names** that may be unused if the nav was reorganized.

### `hero` block
- `hero.imageNote`, `hero.selectImage`, `hero.pause`, `hero.play` — photo carousel controls; verify the hero carousel still uses them.

### `identity` block
- `identity.firstName`, `identity.lastName` (duplicates of `firstNameLabel`/`lastNameLabel`)
- `identity.nombreLabel`, `identity.nombre2Label`, `identity.apellidoLabel`, `identity.apellido2Label` (Spanish field names — likely legacy)
- `identity.correctNumber`, `identity.edit`
- `identity.phoneMissing`

### `story` block
- `story.anecdotesLabel` ("El lago de Chapala en 12 anécdotas") — verify the anecdotes feature still exists.

### `weekend` block
- `weekend.navSchedule`, `weekend.navProgram` — verify these nav CTAs are still rendered.

### `facilities` block
- `facilities.navNext`, `facilities.navContinue`, `facilities.navIdentity` — verify these nav CTAs are still rendered.

### `accommodation` block
- `accommodation.contactPrompt` ("Más info") — verify the contact prompt is still used.
- `accommodation.guestOption.*` — verify the guest-option panel is still rendered.

### `travel` block
- `travel.cta`, `travel.ctaNote` — verify the travel form CTA is still used.

### `attire` block
- `attire.navNext` — verify.

### `thanks` block
- `thanks.cta`, `thanks.ctaPlanner` — verify.

### `coast` block
- `coast.form.*` — the coast survey form; verify it's still active (previewNote says "will open with the private RSVP").

### `rsvp` block
- `rsvp.petanque.*` (full petanque form) — there is ALSO a `petanqueTribute.rsvpMini.*`. Verify which one is actually rendered; one may be dead.
- `rsvp.recap.*` — verify the recap is still shown.

### `petanqueTribute` block
- `petanqueTribute.rsvpMini.*` — verify vs `rsvp.petanque.*` (possible duplicate/dead).

### `footer` block
- `footer.privacy` — verify.

---

## 4. Hardcoded strings (no i18n) — STILL PRESENT

These are user-facing strings **hardcoded in components** instead of in `content.js`. Per AGENTS.md this is a violation. **Not fixed yet** — needs component edits.

> ⚠️ Full list requires per-component inspection. The following were identified as high-confidence candidates during the audit:

- **`EVENT` object** in `content.js` contains hardcoded names/URLs (couple names, phone numbers, WhatsApp links, Spotify playlists, map URL). These are **data**, not copy — acceptable, but confirm they're not meant to be translatable.
- **`thanks.credits`** — names/roles are hardcoded in content (data, acceptable).
- **`thanks.humor`** — hardcoded jokes (copy, in content — OK).
- Any literal strings inside `.jsx` components (e.g. button labels, aria-labels, placeholders) that are not wrapped in `t(...)`. **Needs a component-by-component grep.**

---

## 5. Empty menu entries / buttons without labels — STILL PRESENT

- **`nav.teAnimas`** = `"Te animas"` (Spanish) is used verbatim in **fr** and **en** too — this is a **hardcoded Spanish string leaking into other languages**. It should be translated per language.
- **`petanqueTribute.homage`** = `"Te animas!"` — same issue, Spanish leaking into fr/en.
- **`nav.dashboard`** = `"admin"` — a menu entry labeled "admin" in all languages; verify this is intended (it may be a hidden admin link).
- Any `<button>` or `<a>` in components with an empty `children` or missing `aria-label` — **needs component inspection**.

---

## 6. References to non-existent variables — STILL PRESENT (needs verification)

> ⚠️ This requires running the build/linter to confirm. The following are **suspected** based on the audit:

- **`identity.savedWithName`** — was referenced with a `{name}` interpolation; now added. Verify the component passes `name`.
- **`story.mapLabel`** — now added; verify the Story component renders a map with this label.
- **`thanks.guestCloud.navNext`** — now added; verify GuestCloud renders this CTA.
- Any component importing a named export from `content.js` that doesn't exist (e.g. `EVENT.playlists.shared` vs `general`/`karaoke` — verify all three playlist keys are used).

---

## 7. Stale / dead code — STILL PRESENT (needs review)

- **Duplicate petanque forms**: `rsvp.petanque` (full form) vs `petanqueTribute.rsvpMini` (mini form). Likely one is dead.
- **Account/email/password nav keys** (see §3) suggest a removed account-management feature left orphaned copy.
- **`identity` legacy field labels** (`nombreLabel`, `apellidoLabel`, etc.) suggest an old schema naming that was replaced.
- **`story.anecdotesLabel`** references "12 anécdotas" — verify the anecdotes feature exists.
- **`coast.form`** — the survey may be gated behind the private RSVP; if the RSVP is not yet live, this is dead-but-intended.

---

## 8. Recommended recovery plan (next steps)

### Phase 1 — Verify (no changes)
1. Run `npm run build:all` to confirm the app compiles after the additive key fixes.
2. Run `npm test` and `npm run test:rules`.
3. Grep components for `t.` usages and cross-check against `content.js` to produce a **complete** missing/unused key list (the audit above is high-confidence but not exhaustive).

### Phase 2 — Clean up i18n (with your approval)
4. Remove confirmed **unused keys** (orphaned account/email/password nav block, legacy identity labels, dead petanque form).
5. Translate the leaked Spanish strings (`nav.teAnimas`, `petanqueTribute.homage`) into fr/en.
6. Move any remaining **hardcoded component strings** into `content.js`.

### Phase 3 — Remove stale code
7. Delete the dead petanque form (keep whichever is rendered).
8. Remove orphaned account-management copy if the feature is truly gone.

### Phase 4 — Regression guard
9. Add a **CI check** that fails the build if a `t.` key is missing from `content.js` (prevents future blank-UI regressions).
10. Add a check that flags **unused keys** (optional, can be a warning).

---

## 9. Files touched in this dry run

| File | Change |
|------|--------|
| `web/invitation/src/content.js` | Added `story.mapLabel`, `thanks.guestCloud.navNext`, `identity.savedWithName` (all languages) |

No other files were modified. All remaining items are **pending your approval** before destructive/cleanup edits.
