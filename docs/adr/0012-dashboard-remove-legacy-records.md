# ADR-0012: Remove legacy-records code from the dashboard

- **Status:** Accepted
- **Date:** 2026-08-18
- **Related:** ADR-0002 (Firestore repository layer), ADR-0005 (feature-local decomposition),
  AGENTS.md §6b / §7 (front-end rules + guardrails)

## Context

The dashboard previously loaded and rendered four legacy collections —
`rsvp_submissions`, `experience_suggestions`, `coast_interest`, and
`petanque_participation` — via a batch `loadDashboardData()` loader, a "Registros"
tab, per-collection record cards, CSV export buttons, and a manual "Actualizar"
refresh button.

The app no longer writes to those collections: the current RSVP / petanque / coast
mini-RSVP flows save answers directly to the `guests` doc via `saveRsvpAnswers` →
`rsvp.answers`, which the `onGuestUpdated` Cloud Function already detects. The
legacy `submit-forms.js` helpers were deleted, and the path constants were removed
from `web/shared/firestore-paths.js`. The dashboard's `COLLECTIONS` map still listed
those keys, but their path constants were `undefined`, so `loadDashboardData()` had
to filter them out to avoid `collection(db, undefined)` throwing.

This left a large block of dead code in `web/dashboard/src/dashboard.js` (the
largest dashboard file) that loaded collections nothing writes, rendered tabs/cards
nothing populates, and duplicated the attendance summary that already exists live.

## Decision

Remove the legacy-records code from the dashboard and render the attendance summary
cards live from the `guests` collection:

1. **Delete the batch loader + refresh handler** — `COLLECTIONS`, `loadDashboardData()`,
   `showLoadError()`, and `updateDashboardData()` are removed from `dashboard.js`.
2. **Delete the legacy caches + helper** — `state.rsvps` / `state.suggestions` /
   `state.coast` / `state.petanque` and `getRsvpForGuest()` are removed.
3. **Delete the "Registros" tab, record cards, CSV export, and refresh button** —
   the tab, `downloadCsvForType()`, and the "Actualizar" button are removed.
4. **Delete `recordsPanel.js`** — the module is removed.
5. **Render the summary cards live** — a new `web/dashboard/src/summary.js`
   presentation module renders the FRIDAY / SATURDAY / SUNDAY attendance cards from
   `computeDayConfirmations()` (live `rsvp.answers` scale ≥ `RSVP_CONFIRMED_MIN_LEVEL`),
   wired into the live `guests` `onSnapshot` listener so counts update in real time.
   The summary grid was reduced from 5 columns to 3 (one per attendance day).
6. **Remove orphaned records CSS** — `.dashboard-record*`, `.dashboard-export`,
   `.dashboard-records`, and `.dashboard-detail-row` were removed from `_layout.scss`,
   `_buttons.scss`, and `_responsive.scss`. `.dashboard-empty` was kept because the
   groups panel still uses it.

## Consequences

- The dashboard no longer loads collections nothing writes, eliminating the
  `[firebase:load.collection] {collection: 'rsvp_submissions'…}` noise and the
  `collection(db, undefined)` hazard.
- Attendance counts are now always live (they update as guests answer), matching the
  single-source-of-truth principle: the `guests` collection is authoritative.
- `dashboard.js` is smaller and closer to a shell that composes feature panels.
- The legacy collections remain in Firestore (historical data) but are no longer
  surfaced in the UI. If they are ever needed again, the path constants and a
  dedicated panel can be restored.
