# Audit: Hardcoded user-facing strings & Spanish leaking into fr/en

Audited: `web/invitation/src/components/*.jsx` and `web/invitation/src/content.js`
Date: audit run against current working tree.

---

## Hardcoded strings in components

Strings that are literal text (not `{t.xxx}` / `{variable}`) in JSX text content,
`aria-label`, `placeholder`, `title`, `alt`, or fallback (`|| "..."`) values.
`className`, `style`, `data-*`, `id`, `src`, `href`, and pure numbers/symbols are ignored.

### Accommodation.jsx
- Line 515 — `aria-label="Close"` — aria-label
- Line 649 — `aria-label={option.membersLabel || "Group members"}` — fallback "Group members"
- Line 783 — `aria-label="Close"` — aria-label
- Line 991 — `aria-label="Continue"` — aria-label
- (Data, not flagged as i18n) `AIRBNB_SUGGESTIONS` / `HOTEL_SUGGESTIONS` contain hardcoded Spanish listing names, e.g. "Casa Roca Azul en Jocotepec, Lago Chapala", "Casa Vista Roca Azul Jocotepec", "Roca Azul, vecindario agradable cerca de Ajijic", "El Chante Spa Hotel", "Cosalá Grand Boutique Resort & Spa", "Hotel Balneario San Juan Cosalá". These are proper listing names but are not translated.

### Attire.jsx
- Line 115 — `aria-label="Wixárika"` — aria-label (proper noun, hardcoded)
- Line 170 — `aria-label="Close"` — aria-label
- Line 183 — `aria-label="Attire navigation"` — aria-label

### AuthGate.jsx
- Line 68 — `aria-label={showPassword ? "Hide password" : "Show password"}` — aria-label (English hardcoded, not translated)
- Line 121 — `aria-label="Language"` — aria-label

### Coast.jsx
- Line 270 — `aria-label={`${coast.barraPhotosLabel} navigation`}` — aria-label (literal "navigation" appended)
- Line 274 — `aria-label="Previous"` — aria-label
- Line 282 — `aria-label="Next"` — aria-label
- (Data, not flagged as i18n) `COAST_AIRBNB_SUGGESTIONS` / `COAST_HOTEL_SUGGESTIONS` contain hardcoded Spanish listing names, e.g. "Casa del Sol · Barra de Navidad", "Departamento Vista al Mar", "Casa Palapa frente a la playa", "Villa Marea Alta", "Casa Grande Barra de Navidad", "Hotel Barra de Navidad", "Hotel Delfín", "Grand Bay Hotel". These are proper listing names but are not translated.

### DressCodePictograms.jsx
- Line 88 — `aria-label={labels?.ariaLabel || "Dress code pictograms"}` — fallback "Dress code pictograms"

### Petanque.jsx
- Line 201 — `aria-label={`${petanque.photoAlts?.[index] || ""} — ver en grande`}` — aria-label (Spanish "ver en grande" hardcoded)
- Line 280 — `label: rsvpMini.recapTitle || "Resumen"` — fallback "Resumen" (Spanish)
- Lines 306–308 — `copy={{ step: interfaceText.stepLabel || "Step", next: interfaceText.next || "Next", back: interfaceText.back || "Back" }}` — fallbacks "Step" / "Next" / "Back"
- Line 318 — `aria-label="Continue"` — aria-label

### TeAnimas.jsx
- Line 102 — `label: rsvp.recap?.title || "Resumen"` — fallback "Resumen" (Spanish)
- Lines 133–135 — `copy={{ step: interfaceText.stepLabel || "Step", next: interfaceText.next || "Next", back: interfaceText.back || "Back" }}` — fallbacks "Step" / "Next" / "Back"

### WinampPlayer.jsx
- Line 184 — `aria-label="Mostrar u ocultar la canción actual"` — aria-label (Spanish)
- Line 198 — `aria-label="Canción anterior"` — aria-label (Spanish)
- Line 199 — `title="Anterior"` — title (Spanish)
- Line 208 — `aria-label={playing ? "Pausar" : "Reproducir"}` — aria-label (Spanish)
- Line 209 — `title={playing ? "Pausar" : "Reproducir"}` — title (Spanish)
- Line 218 — `aria-label="Siguiente canción"` — aria-label (Spanish)
- Line 219 — `title="Siguiente"` — title (Spanish)
- Line 228 — `aria-label={loop ? "Desactivar repetición" : "Activar repetición"}` — aria-label (Spanish)
- Line 230 — `title={loop ? "Repetición activada" : "Repetición desactivada"}` — title (Spanish)
- Line 254 — `aria-label="Progreso de la canción"` — aria-label (Spanish)

### Components with NO hardcoded user-facing strings
- CloudinaryImage.jsx
- Countdown.jsx
- FlipStepCard.jsx
- LanguageModal.jsx
- Photos.jsx

---

## Spanish leaking into fr/en in content.js

Keys where the `fr` and/or `en` value is identical to (or contains) the Spanish
string instead of a proper translation.

### nav.teAnimas
- es: `"Te animas"` (line 93)
- fr: `"Te animas"` (line 1278) — Spanish, not translated
- en: `"Te animas"` (line 2461) — Spanish, not translated

### petanqueTribute.homage
- es: `"¡Te animas!"` (line 1185)
- fr: `"Te animas !"` (line 2368) — Spanish, not translated
- en: `"Te animas!"` (line 3549) — Spanish, not translated

### thanks.subtitle (contains Spanish word "padrinos")
- es: `"Sin nuestros padrinos y ayudantes nada de esto sería posible. ..."` (line 952)
- fr: `"Sans nos padrinos et nos aides, rien de tout cela ne serait possible. ..."` (line 2136) — "padrinos" left in Spanish
- en: `"Without our padrinos and helpers, none of this would be possible. ..."` (line 3317) — "padrinos" left in Spanish

### thanks.humor[0] (contains Spanish word "padrino")
- es: `"Si quieres aparecer aquí, contacta nuestro servicio de programa de afiliación a programa de padrino."` (line 962)
- fr: `"Si vous voulez apparaître ici, contactez notre programme d’affiliation au programme de padrino."` (line 2145) — "padrino" left in Spanish
- en: `"If you would like to appear here, contact our padrino affiliate programme service."` (line 3326) — "padrino" left in Spanish

### gift.accounts.mx.details[0] (contains Spanish "Cuenta Clave")
- es: `"Cuenta Clave: 012 320 01559313382 0"` (line 940)
- fr: `"Cuenta Clave : 012 320 01559313382 0"` (line 2124) — "Cuenta Clave" left in Spanish
- en: `"Cuenta Clave: 012 320 01559313382 0"` (line 3305) — "Cuenta Clave" left in Spanish

### travel.routes.toBeachLabel (Spanish word "PLAYA" in English)
- es: `"Hacia la playa"` (line 866)
- fr: `"Vers la plage"` (line 2049) — correct French
- en: `"GO TO THE PLAYA"` (line 3231) — "PLAYA" left in Spanish (also note `toVenueLabel` en is `"GO TO ROCA AZUL"` line 3230, all-caps styling)

### Additional language leak (English into fr, not Spanish — noted for completeness)
- identity.ok — es: `"Sí, es correcto"` (line 213); fr: `"Confirm"` (line 1397) — English word left in French; en: `"Yes, it's correct"` (line 2581)
