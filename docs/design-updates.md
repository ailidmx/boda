# Design Updates Log

> Living log of design/UI changes requested and implemented. Each entry records
> the request, the files touched, and the status. Keep it concise and factual.

---

## 2026-08-08 — Mobile nav restructure + carousel nav restyle

### 1. `schedule-carousel__nav` — ultra-thin carousel navigation
- **Request:** Use an ultra-thin design with low top/bottom margin. Arrow buttons
  must have **no round border** around them.
- **Files:** `web/invitation/src/styles/*.css` (carousel nav styles)
- **Status:** In progress

### 2. Mobile top nav bar — split into two dropdown menus
- **Request:** The mobile menu has too many entries. Split into two separate
  dropdown menus:
  - **Part I:** from `INICIO` to `TE ANIMAS` (inclusive).
  - **Part II:** from `VENGO DE LEJOS` (or the next visible item if `VENGO DE
    LEJOS` is hidden) to the last item.
  - Add a **REPONDRE CTA** as the 3rd menu item on the left part.
  - Keep the **user dropdown** on the right part.
- **Files:** `web/invitation/src/components/Nav.jsx`, `web/invitation/src/styles/nav.css`
- **Status:** In progress

---

## 2026-08-08 — i18n / content recovery (completed)
- Added missing `coast.rsvpMini` and `coast.suggestions` blocks (es/fr/en).
- Verified `accommodation.recap`, `accommodation.navNext`, `guestOption.planCard*`
  present in all languages.
- Fixed leaked strings: `travel.routes.toBeachLabel` (en) and `identity.ok` (fr).
- **Status:** Done — build passes.
