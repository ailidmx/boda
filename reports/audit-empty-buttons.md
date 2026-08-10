# Audit: Empty menu entries & buttons without labels

Audit date: 2025-08-08
Scope: `/Users/aydejuarez/boda/web/invitation/src/components/` (all .jsx) + `content.js` translation keys.

---

## Empty menu entries

### Nav.jsx — menu entries and their rendered labels

The nav menu is built from `nav.menu` (an array of `{ key, label }` objects) and rendered in `Nav.jsx`. Each entry renders `item.label` directly (a translated string from `content.js`). No entry renders an empty `t.` key — all labels are populated strings. However, several entries are **hardcoded / not translated** (see below).

Menu entries rendered by `Nav.jsx`:

| # | key | label (es) | label (fr) | label (en) | Notes |
|---|-----|-----------|-----------|-----------|-------|
| 1 | `home` | "Inicio" | "Accueil" | "Home" | translated |
| 2 | `story` | "Nuestra historia" | "Notre histoire" | "Our story" | translated |
| 3 | `schedule` | "Programa" | "Programme" | "Schedule" | translated |
| 4 | `accommodation` | "Alojamiento" | "Hébergement" | "Accommodation" | translated |
| 5 | `food` | "Comida" | "Repas" | "Food" | translated |
| 6 | `music` | "Música" | "Musique" | "Music" | translated |
| 7 | `petanque` | "Petanca" | "Pétanque" | "Pétanque" | translated |
| 8 | `photos` | "Fotos" | "Photos" | "Photos" | translated |
| 9 | `rsvp` | "Confirmar asistencia" | "Confirmer" | "RSVP" | translated |
| 10 | `dashboard` | "admin" | "admin" | "admin" | **HARDCODED** — see Known Issue #1 |

**No menu entry renders an empty `t.` key.** All `nav.menu` labels resolve to non-empty translated strings.

### Footer.jsx — menu entries and their rendered labels

Footer renders a set of links. All labels are translated strings from `content.js` (via `t.footer.*` and `t.nav.*`). No empty `t.` key found. The footer includes:

- `footer.eyebrow` / `footer.title` / `footer.body` — translated.
- `footer.contactLabel` — translated.
- `footer.credits` — translated.
- `footer.legal` — translated.
- `footer.thanks` — translated.
- `footer.backToTop` — translated.
- `footer.instagram` / `footer.whatsapp` / `footer.email` — translated.
- `footer.venue` — translated.
- `footer.weather` — translated.
- `footer.weatherSlides` — translated.
- `footer.weatherSlidesLabel` — translated.
- `footer.weatherSlidesHint` — translated.
- `footer.weatherSlidesNext` / `footer.weatherSlidesPrev` — translated.
- `footer.weatherSlidesClose` — translated.
- `footer.weatherSlidesImage` — translated.
- `footer.weatherSlidesCountry` — translated.
- `footer.weatherSlidesSearch` — translated.
- `footer.weatherSlidesNoResults` — translated.
- `footer.weatherSlidesContinue` — translated.
- `footer.weatherSlidesLanguage` — translated.

**No empty menu entry found in Footer.jsx.**

---

## Buttons/links without labels

### Buttons/links with NO visible text AND NO aria-label (accessibility issue)

**None found.** Every `<button>` and `<a>` in the components directory either has visible child text or an `aria-label`. The following are the closest cases, all of which DO have an accessible name via `aria-label` or image `alt`:

- `Accommodation.jsx:511-519` — `<button className="accommodation-note-close">` renders only `×` but has `aria-label="Close"` (hardcoded English — see below). Has accessible name.
- `Accommodation.jsx:527-536` — `<button className="accommodation-note-fab">` renders only `<span aria-hidden="true">i</span>` but has `aria-label={accommodation.noteTitle}` (translated). Has accessible name.
- `Accommodation.jsx:779-787` — `<button className="accommodation-occupancy-close">` renders only `×` but has `aria-label="Close"` (hardcoded English — see below). Has accessible name.
- `Gallery.jsx:20-34` — `<a className="gallery-item">` contains only an `<img>` (no visible text, no `aria-label`). Its accessible name comes from the `<img alt={gallery.alts[...]}>` (translated). Not strictly empty, but the link itself has no explicit `aria-label` — relies on image alt.

### Buttons/links with visible text (OK, listed for completeness)

All other buttons/links render translated visible text and are fine. No empty buttons found.

---

## Hardcoded aria-labels / placeholders / text

### Known issues (requested)

#### 1. `nav.dashboard = "admin"` — hardcoded, not translated
- **File:** `web/invitation/src/content.js`
- **Lines:** 61 (es), 1246 (fr), 2429 (en)
- **Value:** `dashboard: "admin"` in ALL THREE languages.
- **Issue:** The word "admin" is hardcoded English and identical in es/fr/en. It is a developer-facing label, not a user-facing translation. It is only rendered in `Nav.jsx` when `isAdmin` is true (admin-only menu entry), so it is **intended to be admin-only**, but the label itself is not localized. If admins are expected to see a localized label, this should be translated (e.g. "Administración" / "Administration" / "Admin").

#### 2. `nav.teAnimas = "Te animas"` — Spanish leaking into fr/en
- **File:** `web/invitation/src/content.js`
- **Lines:** 93 (es), 1278 (fr), 2461 (en)
- **Value:** `teAnimas: "Te animas"` in ALL THREE languages.
- **Issue:** The Spanish phrase "Te animas" (roughly "Are you in?") is used verbatim in the French and English translations. This is Spanish leaking into fr/en. Should be localized (e.g. fr: "Ça vous tente ?", en: "Are you in?").

#### 3. `petanqueTribute.homage = "Te animas!"` — Spanish leaking into fr/en
- **File:** `web/invitation/src/content.js`
- **Lines:** 2368 (fr), 3549 (en); the es value is `homage: "¡Te animas!"` (line ~1185).
- **Values:**
  - es: `"¡Te animas!"`
  - fr: `"Te animas !"` (line 2368)
  - en: `"Te animas!"` (line 3549)
- **Issue:** The Spanish phrase "Te animas!" is used verbatim in the French and English translations. Spanish leaking into fr/en. Should be localized.
- **Rendered at:** `Petanque.jsx:192` — `<p className="petanque-homage handwritten">{petanque.homage}</p>`.

### Hardcoded aria-labels (English/Spanish, not translated)

| File | Line | Element | Hardcoded value | Issue |
|------|------|---------|-----------------|-------|
| `Accommodation.jsx` | 515 | `<button className="accommodation-note-close">` | `aria-label="Close"` | Hardcoded English, not translated. Should use a translated key. |
| `Accommodation.jsx` | 783 | `<button className="accommodation-occupancy-close">` | `aria-label="Close"` | Hardcoded English, not translated. |
| `Accommodation.jsx` | 991 | `<nav className="section-nav accommodation-section-nav">` | `aria-label="Continue"` | Hardcoded English, not translated. |
| `Petanque.jsx` | 318 | `<nav className="petanque-nav">` | `aria-label="Continue"` | Hardcoded English, not translated. |
| `Petanque.jsx` | 201 | `<button className="petanque-photo">` | `aria-label={\`${petanque.photoAlts?.[index] || ""} — ver en grande\`}` | Hardcoded Spanish suffix "ver en grande" appended to the (translated) photo alt. Spanish leaks into fr/en. |
| `DressCodePictograms.jsx` | 88 | `<div className="dp-gallery">` | `aria-label={labels?.ariaLabel \|\| "Dress code pictograms"}` | Hardcoded English fallback "Dress code pictograms" if `labels.ariaLabel` is missing. |

### Hardcoded English/Spanish fallback text (placeholders)

| File | Line | Element | Hardcoded value | Issue |
|------|------|---------|-----------------|-------|
| `Petanque.jsx` | 280 | step label | `rsvpMini.recapTitle \|\| "Resumen"` | Hardcoded Spanish fallback "Resumen". |
| `Petanque.jsx` | 306 | `copy.step` | `interfaceText.stepLabel \|\| "Step"` | Hardcoded English fallback "Step". |
| `Petanque.jsx` | 307 | `copy.next` | `interfaceText.next \|\| "Next"` | Hardcoded English fallback "Next". |
| `Petanque.jsx` | 308 | `copy.back` | `interfaceText.back \|\| "Back"` | Hardcoded English fallback "Back". |
| `RsvpRecap.jsx` | 33 | `<h3 className="rsvp-recap-title">` | `recap.title \|\| "Resumen"` | Hardcoded Spanish fallback "Resumen". |
| `RsvpRecap.jsx` | 36 | progress text | `recap.answered \|\| "respondidos"` | Hardcoded Spanish fallback "respondidos". |
| `Music.jsx` | 57 | `<a className="text-link">` | `music.listenLabel \|\| "Listen"` | Hardcoded English fallback "Listen". |
| `Music.jsx` | 66 | `<a className="text-link">` | `music.websiteLabel \|\| "Website"` | Hardcoded English fallback "Website". |
| `Accommodation.jsx` | 649 | `<div role="tablist">` | `aria-label={option.membersLabel \|\| "Group members"}` | Hardcoded English fallback "Group members". |
| `GuestCloud.jsx` | 132 | guest name mode | `guestNameModeLabel \|\| "Guest name mode"` | Hardcoded English fallback "Guest name mode". |
| `GuestCloud.jsx` | 138 | first name placeholder | `\|\| "Nombre completo"` | Hardcoded Spanish fallback "Nombre completo". |
| `GuestCloud.jsx` | 145 | first name placeholder | `\|\| "Nombre"` | Hardcoded Spanish fallback "Nombre". |
| `GuestCloud.jsx` | 152 | last name placeholder | `\|\| "Apellidos"` | Hardcoded Spanish fallback "Apellidos". |
| `GuestCloud.jsx` | 177 | section title | `\|\| "Nuestros invitados"` | Hardcoded Spanish fallback "Nuestros invitados". |
| `GuestCloud.jsx` | 192 | `<button>` | `aria-label="Continue"` | Hardcoded English aria-label "Continue". |

### Translated aria-labels (OK — verified, not hardcoded)

The following aria-labels use translated keys and are fine:
- `Travel.jsx` — carousel aria-labels use translated `t.travel.*` keys.
- `Accommodation.jsx:552` — `<nav aria-label={option.linkLabel}>` (translated).
- `Accommodation.jsx:981` — `<nav aria-label={option.backLabel}>` (translated).
- `Accommodation.jsx:531` — `<button aria-label={accommodation.noteTitle}>` (translated).
- `Accommodation.jsx:855` — `<span aria-label={\`${option.airbnbRating} ${listing.rating}\`}>` (translated prefix).
- `Thanks.jsx:150` — `<div role="group" aria-label={thanks.avatarToggleLabel \|\| thanks.title}>` (translated).
- `Petanque.jsx:194` — `<div aria-label={petanque.photosLabel}>` (translated).
- `Music.jsx:26,83` — `<SwipeCardCarousel label={music.title}>` (translated).
- `DressCodePictograms.jsx:88` — `labels?.ariaLabel` (translated when provided).

---

## Summary of actionable findings

1. **Hardcoded English aria-labels (should be translated):** `Accommodation.jsx:515` ("Close"), `Accommodation.jsx:783` ("Close"), `Accommodation.jsx:991` ("Continue"), `Petanque.jsx:318` ("Continue"), `GuestCloud.jsx:192` ("Continue").
2. **Hardcoded Spanish aria-label suffix:** `Petanque.jsx:201` ("ver en grande").
3. **Spanish leaking into fr/en translations:** `content.js` `nav.teAnimas` (lines 93/1278/2461) and `petanqueTribute.homage` (lines 2368/3549).
4. **Hardcoded non-localized label:** `content.js` `nav.dashboard` = "admin" (lines 61/1246/2429) — admin-only, but not localized.
5. **Hardcoded English/Spanish fallbacks:** `Petanque.jsx` (280, 306-308), `RsvpRecap.jsx` (33, 36), `Music.jsx` (57, 66), `Accommodation.jsx` (649), `GuestCloud.jsx` (132, 138, 145, 152, 177), `DressCodePictograms.jsx` (88).
6. **No empty buttons/links** (no button/link with neither visible text nor aria-label) were found.
