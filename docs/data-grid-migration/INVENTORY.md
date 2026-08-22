# Table Inventory — AG Grid Migration

> Status legend: `NOT_STARTED` · `ANALYZED` · `IN_PROGRESS` · `MIGRATED` · `VALIDATED` · `BLOCKED`

This inventory covers every table/grid-like UI in the dashboard. The dashboard is
**vanilla JS** (no React). The primary data grid is the INVITADOS guest table.

---

## G-001 — INVITADOS guest table (PILOT)

- **ID:** G-001
- **Component:** `renderGuestManager` → guest table (currently `guestTable.js`)
- **Route:** Dashboard → INVITADOS tab
- **Purpose:** Admin CRUD/management of all wedding guests.
- **Source file:** `web/dashboard/src/guestTable.js`, `web/dashboard/src/dashboard.js`
- **Data source:** Live Firestore `guests` collection (`state.liveGuests` via `onSnapshot`).
- **Firestore collection/query:** `guests` (live listener).
- **Row identifier:** guest document id (`guest.id`).
- **Columns:** Enviar, Enviada, Invitación, GRUPO, IDIOMA, GÉNERO, EDAD, MENSAJE, AVION, estado, VIERNES, SÁBADO, DOMINGO, ALOJAMIENTO, CABAÑA, CUARTO, CABAÑA EXTRA, CUARTO EXTRA, ROCA AZUL, PETANQUE, BOULES, PLAYA.
- **Editable columns:** name (inline), email (inline), invitationGroup (inline), gender (select), age (select), plus per-day RSVP chips and boolean chips.
- **Computed columns:** status badge (from `rsvp.answers`), readiness, avatar badges.
- **Sorting:** Manual via `sortTh` (sortable headers). Keys in `GUEST_SORT_COLUMNS`.
- **Filtering:** Manual — column-group filter bar (`data-colgroup`), checkbox filters, group select.
- **Global search:** Manual search input.
- **Pagination:** None (virtualized by AG Grid after migration).
- **Selection:** None (row-level).
- **Row actions:** Send (WhatsApp/email), edit modal, delete, avatar upload.
- **Bulk actions:** None.
- **Validation:** Client-side via `validateGuestContactPayload` / `GUEST_WRITABLE_FIELDS`.
- **Permissions:** Admin-only (dashboard access gate).
- **Loading behavior:** Live listener; loading state.
- **Empty behavior:** Empty state.
- **Error behavior:** Error state.
- **Responsive behavior:** Wide table; horizontal scroll.
- **Persistence behavior:** Inline edits → `saveGuestInline` → `guestRepository.updateGuest` (setDoc merge).
- **Dependencies:** `guestService.js`, `guestDomain.js`, `guestRepository.js`, `guestModals.js`.
- **Known bugs:** None blocking.
- **Migration complexity:** HIGH (most feature-rich table).
- **Migration priority:** 1 (pilot).
- **Migration status:** VALIDATED — migrated to AG Grid Community via `createAppDataGrid` + declarative column defs in `web/dashboard/src/guestTable.js`. AG Grid now owns pinning/sort/filter/virtualization; the toolbar (column groups, readiness card, search + attribute filters, RSVP legend, "+ Agregar") is preserved above the grid. Inline edits flow through the existing `saveGuestInline`/`saveGuestRsvpAnswer`/`saveGuestHosting`/`saveGuestEmail` → `guestRepository.updateGuest` (setDoc merge). (See decisions D-006, D-010, D-011, D-012.)

---

## G-002 — Thanks table

- **ID:** G-002
- **Component:** `renderThanksManager` (thanks panel)
- **Route:** Dashboard → Gracias tab
- **Purpose:** View guest thank-you messages.
- **Source file:** `web/dashboard/src/thanksPanel.js` (or inline in `dashboard.js`)
- **Data source:** Live Firestore `thanks` collection.
- **Firestore collection/query:** `thanks`.
- **Row identifier:** thanks document id.
- **Columns:** guest, message, date.
- **Editable columns:** none (read-only).
- **Computed columns:** none.
- **Sorting:** Manual.
- **Filtering:** Manual.
- **Global search:** Manual.
- **Pagination:** None.
- **Selection:** None.
- **Row actions:** None (or delete).
- **Bulk actions:** None.
- **Validation:** n/a.
- **Permissions:** Admin-only.
- **Loading/Empty/Error:** Present.
- **Responsive behavior:** Wide table.
- **Persistence behavior:** Read-only.
- **Dependencies:** `thanks` collection.
- **Known bugs:** None.
- **Migration complexity:** LOW.
- **Migration priority:** 2.
- **Migration status:** VALIDATED — migrated to AG Grid Community in `web/dashboard/src/thanksPanel.js` (pinned Destinatario + Acciones, native filters/sort, empty-state overlay). Create/edit modal and delete-confirm preserved; writes via `createThanks`/`updateThanks`/`deleteThanks` repositories.

---

## G-003 — Cabins assignment panel

- **ID:** G-003
- **Component:** `renderCabinAssignments` (`cabinsPanel.js`)
- **Route:** Dashboard → Cabañas tab
- **Purpose:** Drag-and-drop cabin/room assignment.
- **Source file:** `web/dashboard/src/cabinsPanel.js`
- **Data source:** Live Firestore `guests` + `rooms` inventory.
- **Firestore collection/query:** `guests`, `rooms`.
- **Row identifier:** guest id.
- **Columns:** n/a (card-based layout, not a table).
- **Editable columns:** cabin/room via drag-and-drop + remove + add-guest.
- **Computed columns:** n/a.
- **Sorting:** n/a.
- **Filtering:** n/a.
- **Global search:** n/a.
- **Pagination:** n/a.
- **Selection:** n/a.
- **Row actions:** drag-and-drop, remove, add-guest.
- **Bulk actions:** none.
- **Validation:** via `hasValidGuestHostingFields`.
- **Permissions:** Admin-only.
- **Loading/Empty/Error:** Present.
- **Responsive behavior:** Card grid.
- **Persistence behavior:** `setDoc` merge on `hosting`.
- **Dependencies:** `rooms.js`, `guestRepository.js`.
- **Known bugs:** None.
- **Migration complexity:** n/a — **NOT a table** (card/canvas layout). Keep as-is.
- **Migration priority:** n/a.
- **Migration status:** NOT_STARTED (out of scope — card layout)

---

## G-004 — Tables (Mesas) seating canvas

- **ID:** G-004
- **Component:** `renderTablesManager` (`tables.js`)
- **Route:** Dashboard → Mesas tab
- **Purpose:** Real-life 30m × 6m seating canvas.
- **Source file:** `web/dashboard/src/tables.js`
- **Data source:** Live Firestore `tables` collection.
- **Firestore collection/query:** `tables`.
- **Row identifier:** table id.
- **Columns:** n/a (canvas layout, not a table).
- **Editable columns:** n/a.
- **Computed columns:** n/a.
- **Sorting:** n/a.
- **Filtering:** n/a.
- **Global search:** n/a.
- **Pagination:** n/a.
- **Selection:** n/a.
- **Row actions:** auto-layout, seat assignment.
- **Bulk actions:** auto-ordenar.
- **Validation:** n/a.
- **Permissions:** Admin-only.
- **Loading/Empty/Error:** Present.
- **Responsive behavior:** Canvas.
- **Persistence behavior:** `setDoc` merge on `tables`.
- **Dependencies:** `tables.js`.
- **Known bugs:** None.
- **Migration complexity:** n/a — **NOT a table** (canvas layout). Keep as-is.
- **Migration priority:** n/a.
- **Migration status:** NOT_STARTED (out of scope — canvas layout)

---

## G-005 — Summary cards (Viernes/Sábado/Domingo)

- **ID:** G-005
- **Component:** `renderSummary` (`summary.js`)
- **Route:** Dashboard → top summary
- **Purpose:** Attendance summary cards + confirmed-guests modal.
- **Source file:** `web/dashboard/src/summary.js`
- **Data source:** Live Firestore `guests` collection.
- **Firestore collection/query:** `guests`.
- **Row identifier:** guest id.
- **Columns:** n/a (card layout).
- **Editable columns:** n/a.
- **Computed columns:** n/a.
- **Sorting:** n/a.
- **Filtering:** n/a.
- **Global search:** n/a.
- **Pagination:** n/a.
- **Selection:** n/a.
- **Row actions:** open confirmed-guests modal.
- **Bulk actions:** none.
- **Validation:** n/a.
- **Permissions:** Admin-only.
- **Loading/Empty/Error:** Present.
- **Responsive behavior:** Card grid.
- **Persistence behavior:** Read-only.
- **Dependencies:** `guestService.js`.
- **Known bugs:** None.
- **Migration complexity:** n/a — **NOT a table** (card layout). Keep as-is.
- **Migration priority:** n/a.
- **Migration status:** NOT_STARTED (out of scope — card layout)

---

## G-006 — Charts (echarts)

- **ID:** G-006
- **Component:** echarts instances
- **Route:** Dashboard
- **Purpose:** Data visualization.
- **Source file:** `web/dashboard/src/*`
- **Data source:** Live Firestore.
- **Firestore collection/query:** various.
- **Row identifier:** n/a.
- **Columns:** n/a.
- **Editable columns:** n/a.
- **Computed columns:** n/a.
- **Sorting:** n/a.
- **Filtering:** n/a.
- **Global search:** n/a.
- **Pagination:** n/a.
- **Selection:** n/a.
- **Row actions:** n/a.
- **Bulk actions:** n/a.
- **Validation:** n/a.
- **Permissions:** Admin-only.
- **Loading/Empty/Error:** Present.
- **Responsive behavior:** Responsive charts.
- **Persistence behavior:** Read-only.
- **Dependencies:** `echarts`.
- **Known bugs:** None.
- **Migration complexity:** n/a — **NOT a table** (charts). Keep as-is.
- **Migration priority:** n/a.
- **Migration status:** NOT_STARTED (out of scope — charts)

---

## Summary

| ID | Component | Type | Priority | Status |
|----|-----------|------|----------|--------|
| G-001 | INVITADOS guest table | Table | 1 (pilot) | VALIDATED |
| G-002 | Thanks table | Table | 2 | VALIDATED |
| G-003 | Cabins panel | Card/canvas | n/a | out of scope |
| G-004 | Tables canvas | Canvas | n/a | out of scope |
| G-005 | Summary cards | Card | n/a | out of scope |
| G-006 | Charts | Chart | n/a | out of scope |

**Real tables to migrate:** G-001 (pilot), G-002.
**Card/canvas/chart layouts (NOT AG Grid):** G-003, G-004, G-005, G-006.
