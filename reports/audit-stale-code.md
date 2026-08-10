# Stale / Dead Code Audit — React Wedding Invitation App

**Scope:** `/Users/aydejuarez/boda/web/invitation/src`
**Audited file:** `content.js` (the `content` object with `es`/`fr`/`en` locales) and the components that consume it.
**Method:** Cross-referenced every `t.<block>.<key>` reference in the components against the keys actually defined in `content.js` (all three locales). Findings below cite file + line.

---

## 1. Structure of `content` and `EVENT`

- `content.js` exports a `content` object keyed by locale: `es`, `fr`, `en`. Each locale contains top-level blocks: `nav`, `hero`, `story`, `weekend`, `programme`, `venue`, `facilities`, `attire`, `weather`, `gift`, `photos`, `thanks`, `guests`, `rsvp`, `petanqueTribute`, `footer`, `suggestions`, `coast`, `accommodation`, `travel`, `food`, `music`, `identity`, etc.
- `EVENT` is a separate export (static event metadata, not localized). **No component imports `EVENT.playlists.general/karaoke/shared`** — those keys do not exist on `EVENT` and are never referenced anywhere in the source. (No import of `EVENT` sub-keys was found in any component.)

---

## 2. Specific suspected issues

### 2a. TWO petanque forms: `rsvp.petanque.*` (full) vs `petanqueTribute.rsvpMini.*` (mini)

**Both are LIVE — neither is dead, but they are two distinct forms.**

- **`rsvp.petanque.*` (full form)** — defined in `content.js` (es: lines 1049–1072). Rendered by **`RSVP.jsx`** (uses `rsvp.petanque.eyebrow`, `.intro`, `.organizerWhatsapp`, `.organizerLabel`, `.fields.*`, `.options.*`). This is the full RSVP petanque section.
- **`petanqueTribute.rsvpMini.*` (mini form)** — defined in `content.js` (es: lines 1194–1211). Rendered by **`Petanque.jsx`** (uses `petanque.rsvpMini.eyebrow`, `.title`, `.intro`, `.organizerLabel`, `.organizerWhatsapp`, `.fields.*`, `.yesLabel`, `.noLabel`, `.success`, `.error`, `.button`, `.recapTitle`). This is the mini "¿Se apuntan?" form inside the Petanque tribute section.

**Conclusion:** Both forms are actively rendered by different components. Neither is dead. They are intentionally separate (full RSVP form vs. a lightweight tribute-section form). No dead code here.

### 2b. `nav` block account/email/password keys — used vs orphaned

**Used by `Nav.jsx` (all confirmed):**
`nav.dashboard` (332), `nav.changeEmail` (392, 467), `nav.changePassword` (402, 467), `nav.music` (413), `nav.logout` (425), `nav.about` (437, 694), `nav.emailWarningTitle` (473), `nav.emailWarningBody` (474), `nav.currentEmailLabel` (478), `nav.newEmailLabel` (482), `nav.newEmailPlaceholder` (487), `nav.emailReauthLabel` (493), `nav.emailReauthPlaceholder` (498), `nav.cancel` (460, 516, 572, 603, 645, 687), `nav.working` (523, 579), `nav.save` (523, 579), `nav.currentPasswordLabel` (529), `nav.currentPasswordPlaceholder` (534), `nav.newPasswordLabel` (540), `nav.newPasswordPlaceholder` (545), `nav.confirmPasswordLabel` (550), `nav.confirmPasswordPlaceholder` (555), `nav.passwordReauthRequired` (198), `nav.passwordError` (202, 223, 255, 289), `nav.passwordMismatch` (206), `nav.passwordSuccess` (213), `nav.passwordWrongCurrent` (221, 268), `nav.emailVerificationSent` (233), `nav.emailUnchanged` (235), `nav.emailSuccess` (235, 237), `nav.emailInvalid` (247), `nav.emailReauthPasswordRequired` (255), `nav.emailReauthRequired` (273), `nav.emailDomainError` (284), `nav.emailError` (284, 289), `nav.successTitle` (610), `nav.ok` (623, 665, 718), `nav.close` (623, 665), `nav.emailErrorTitle` (652), `nav.aboutClose` (687, 718), `nav.aboutTitle` (694), `nav.aboutSubtitle` (696), `nav.home` (750, 777), plus section keys via `NAV_LINKS`/`t.nav[key]` (`story`, `weekend`, `programme`, `venue`, `accommodation`, `travel`, `attire`, `weather`, `gift`, `photos`, `thanks`, `guests`, `rsvp`, `teAnimas`, `petanque`, `food`, `coast`).

**ORPHANED (defined in `content.js` but never referenced by any component):**
- **`nav.you`** (es:43, fr:1228, en:...) — **orphaned.** No component reads `nav.you`. (Note: `you` also exists inside `accommodation.guestOption` at es:155, which IS used.)

All other `nav.*` keys listed in the task are used. Only `nav.you` is orphaned.

### 2c. Imports from `content.js` referencing non-existent exports/keys

- **`EVENT.playlists.general/karaoke/shared`** — **do not exist.** No component imports or references `EVENT.playlists.*`. No dead import found; the reference simply does not exist anywhere.
- No component imports a named export from `content.js` that does not exist. The only named import found is `SUPPORTED_LANGUAGES` (used in `Nav.jsx:6,338`), which is a real export.

### 2d. Components importing something but never using it

- **`Accommodation.jsx:303`** — `const privateVideoEyebrow = cabinsShowcase.privateVideoEyebrow;` is **assigned but never used** in any JSX. (Only `privateVideoTitle` at line 304 is used.) Dead variable.
- **`Coast.jsx:112`** — `const suggestions = coast.suggestions || {};` — `coast.suggestions` does not exist (see 3 below); the whole suggestions block (lines 343–428) is dead because `suggestions.title` is always undefined.
- **`Coast.jsx:113`** — `const rsvpMini = coast.rsvpMini || {};` — `coast.rsvpMini` does not exist (see 3 below); the whole rsvp-mini block (lines 295–337) is dead because `rsvpMini.title` is always undefined.

### 2e. References to variables that appear undefined (destructured props not passed / `t.xxx` not in content)

These are **references to keys that do NOT exist in `content.js`** (they silently render empty/undefined):

1. **`accommodation.recap.*`** — `Accommodation.jsx:358` `const recap = accommodation.recap || {};` then `recap.title` (359, 926, 930), `recap.eyebrow` (929), `recap.intro` (931), `recap.hasCabinQuestion` (937), `recap.noCabinQuestion` (937), `recap.yesLabel` (952), `recap.noLabel` (960), `recap.button` (974), and `recap.success`/`recap.error` (in `recapStatusText`). **The `accommodation` block (es:634–848) has NO `recap` sub-object in any locale.** The whole recap section is guarded by `recap.title &&` (926) so it never renders — dead/non-existent reference.
2. **`accommodation.navNext`** — `Accommodation.jsx:993`. **Not defined** in the `accommodation` block (es:634–848) in any locale. Renders empty. Non-existent reference.
3. **`accommodation.guestOption.planCard*`** — `Accommodation.jsx:608` `option.planCardTitle`, `:613` `option.planCardPerPerson`, `:621`/`:637` `option.planCardSaleLabel`, `:629` `option.planCardGroupTotal`, `:642` `option.planCardEurDisclaimer`, `:642` `option.planCardEstimate`. **None of these keys exist** in `accommodation.guestOption` (es:656–713). Non-existent references (render empty).
4. **`coast.suggestions.*`** — `Coast.jsx:112` + lines 343–428 (`suggestions.title`, `.eyebrow`, `.body`, `.airbnbTitle`, `.airbnbBody`, `.airbnbAreaPrice`, `.perNight`, `.beforeTaxes`, `.airbnbGuests`, `.airbnbBedrooms`, `.airbnbBeds`, `.airbnbRating`, `.airbnbView`, `.airbnbSearchAll`, `.fromPrice`, `.hotelTitle`, `.hotelBody`, `.hotelLocation`, `.hotelView`, `.hotelTypes`). **The `coast` block (es:977–1037) has NO `suggestions` key in any locale.** Non-existent reference; the whole suggestions section never renders.
5. **`coast.rsvpMini.*`** — `Coast.jsx:113` + lines 295–337 (`rsvpMini.eyebrow`, `.title`, `.intro`, `.questions`, `.recapTitle`, `.recapProgress`, `.button`, `.success`, `.error`). **The `coast` block has NO `rsvpMini` key in any locale** (the only `rsvpMini` in content.js lives under `petanqueTribute`). Non-existent reference; the whole rsvp-mini section never renders.

---

## 3. Per-block usage of the requested keys

| Key path | Component that uses it | Status |
|---|---|---|
| `suggestions.*` (top-level, es:510–560) | **none** | **DEAD** (whole block unused; `coast.suggestions` is a different, non-existent key) |
| `coast.form.*` (es:998–1036) | **none** | **DEAD** (whole block unused) |
| `coast.suggestions.*` | `Coast.jsx:112,343–428` | **NON-EXISTENT** (key not in content.js) |
| `coast.rsvpMini.*` | `Coast.jsx:113,295–337` | **NON-EXISTENT** (key not in content.js) |
| `travel.routes.*` (es:859–898) | **none** | **DEAD** (whole `routes` sub-block unused) |
| `travel.cta` (es:899) | **none** | **DEAD** |
| `travel.ctaNote` (es:901) | **none** | **DEAD** |
| `accommodation.plan.*` (es:836–847) | **none** | **DEAD** (whole `plan` sub-block unused) |
| `accommodation.cabinsShowcase.*` (es:718–835) | `Accommodation.jsx:303–304` | **PARTIALLY USED** — only `privateVideoEyebrow` (303, unused var) and `privateVideoTitle` (304) are read. **ORPHANED:** `eyebrow`, `key`, `title`, `intro`, `capacity`, `roomsLabel`, `bedsLabel`, `rooms`, `amenities`, `galleryLabel`, `photoAlts`, `note`, `additionalUnits` |
| `accommodation.guestOption.*` (es:656–713) | `Accommodation.jsx` | **USED** (all defined keys used) — but see 2e#3 for 6 non-existent `planCard*` keys referenced |
| `accommodation.recap.*` | `Accommodation.jsx:358–359,926–976` | **NON-EXISTENT** (no `recap` in accommodation block) |
| `accommodation.navNext` | `Accommodation.jsx:993` | **NON-EXISTENT** |
| `accommodation.noCabinRecommendation` (es:654–655) | **none** | **ORPHANED** |
| `food.days.*` (es:415–443) | **none** | **DEAD** (whole `days` sub-block unused) |
| `food.flavoursEyebrow` (es:381) | **none** | **ORPHANED** (note: `food.flavoursTitle` es:382 IS used by Food.jsx) |
| `food.photoCredits` (es:446) | **none** | **ORPHANED** |
| `food.drinks.*` (es:447–454) | `Food.jsx` | **USED** (`eyebrow`, `title`, `body`, `note`) |
| `facilities.note` (es:628) | **none** | **ORPHANED** |
| `facilities.navNext` (es:630) | **none** | **ORPHANED** |
| `facilities.navIdentity` (es:632) | **none** | **ORPHANED** |
| `facilities.*` (used keys) | `Venue.jsx` | **USED** (`eyebrow`, `title`, `body`, `videoTitle`, `privacyTitle`, `privacyBody`, `gallery`, `gallerySource`, `rocaGalleryLabel`, `rocaGalleryAlts`, `groups`, `navContinue`) |
| `rsvp.scale.*` (es:1147–1177) | `RSVP.jsx` | **USED** |
| `rsvp.recap.*` (es:1147) | `RsvpRecap.jsx` | **USED** (`title` 33, `answered` 36, `yes` 54, `no` 56) |
| `rsvp.petanque.*` (es:1049–1072) | `RSVP.jsx` | **USED** |
| `petanqueTribute.*` (es:1178–1212) | `Petanque.jsx` | **USED** (all keys incl. `rsvpMini`) |
| `story.anecdotesLabel` | `Story.jsx` | **USED** |
| `hero.imageNote` | `Hero.jsx` | **USED** |
| `hero.selectImage` | `Hero.jsx` | **USED** |
| `hero.pause` | `Hero.jsx` | **USED** |
| `hero.play` | `Hero.jsx` | **USED** |

---

## 4. Summary of actionable findings

**DEAD blocks (defined in content.js, never rendered):**
- `suggestions` (top-level, es:510–560)
- `coast.form` (es:998–1036)
- `travel.routes` (es:859–898) + `travel.cta` (899) + `travel.ctaNote` (901)
- `accommodation.plan` (es:836–847)
- `food.days` (es:415–443)

**ORPHANED keys (defined but never used):**
- `nav.you` (es:43)
- `accommodation.noCabinRecommendation` (es:654–655)
- `accommodation.cabinsShowcase.*` except `privateVideoEyebrow`/`privateVideoTitle` (es:718–835)
- `food.flavoursEyebrow` (es:381)
- `food.photoCredits` (es:446)
- `facilities.note` (es:628), `facilities.navNext` (es:630), `facilities.navIdentity` (es:632)

**NON-EXISTENT references (component reads a key that is NOT in content.js → renders empty/undefined):**
- `accommodation.recap.*` (Accommodation.jsx:358–359, 926–976)
- `accommodation.navNext` (Accommodation.jsx:993)
- `accommodation.guestOption.planCardTitle/planCardPerPerson/planCardSaleLabel/planCardGroupTotal/planCardEurDisclaimer/planCardEstimate` (Accommodation.jsx:608, 613, 621, 629, 637, 642)
- `coast.suggestions.*` (Coast.jsx:112, 343–428)
- `coast.rsvpMini.*` (Coast.jsx:113, 295–337)

**DEAD VARIABLE:**
- `privateVideoEyebrow` (Accommodation.jsx:303) — assigned, never used.

**NOT dead (confirmed live):**
- `rsvp.petanque.*` (full form, RSVP.jsx) and `petanqueTribute.rsvpMini.*` (mini form, Petanque.jsx) — both rendered.
- All `nav.*` account/email/password keys except `nav.you`.
- `rsvp.scale.*`, `rsvp.recap.*`, `story.anecdotesLabel`, `hero.imageNote/selectImage/pause/play`, `food.drinks.*`, `facilities.*` (used keys incl. `navContinue`), `accommodation.guestOption.*` (defined keys), `petanqueTribute.*`.

---

## Relevant file paths
web/invitation/src/content.js
web/invitation/src/components/Nav.jsx
web/invitation/src/components/Accommodation.jsx
web/invitation/src/components/Coast.jsx
web/invitation/src/components/Petanque.jsx
web/invitation/src/components/RSVP.jsx
web/invitation/src/components/RsvpRecap.jsx
web/invitation/src/components/Travel.jsx
web/invitation/src/components/Facilities.jsx
web/invitation/src/components/Food.jsx
web/invitation/src/components/Venue.jsx
web/invitation/src/components/Story.jsx
web/invitation/src/components/Hero.jsx
