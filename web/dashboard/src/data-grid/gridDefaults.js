// ── Shared AG Grid defaults ─────────────────────────────────────────────
//
// Single home for the AG Grid Community module registration and the sane
// default grid options every dashboard grid inherits. Keeps grid mechanics
// (theme, sizing, sort/filter/edit defaults, row identity, overlays) in ONE
// place so a new grid only has to describe data + columns + business behavior.
//
// Community-only: we register `AllCommunityModule` (never any `ag-grid-enterprise`
// module). Theming uses the LEGACY precompiled Quartz CSS theme (`theme: "legacy"`
// + the `ag-theme-quartz` class) so theme customisation stays in the SCSS
// tokens partial (`styles/_grid.scss`), matching the dashboard convention of
// keeping design tokens out of JS. No license, no Enterprise watermark.

import {
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register all Community modules exactly once. This is idempotent; calling it
// on every grid creation is safe and keeps callers from needing to know the
// module list.
let registered = false;
export function ensureGridModulesRegistered() {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}

// The theme class(es) applied to every grid's container element. `ag-theme-quartz`
// is required by the legacy CSS theme; `dashboard-data-grid` is our shared
// styling hook (see styles/_grid.scss).
export const GRID_THEME_CLASS = "ag-theme-quartz dashboard-data-grid";

// Default grid options shared by every dashboard grid. Callers spread their own
// options over these. `defaultColDef` is intentionally minimal so feature column
// defs still control filter/editor per column.
export function baseGridOptions() {
  return {
    // Use the legacy CSS theme (see GRID_THEME_CLASS).
    theme: "legacy",
    domLayout: "normal",
    suppressContextMenu: true,
    animateRows: false,
    // Header buttons / menus are Community-only by default; we keep the native
    // filtering + sorting affordances (no Enterprise columns menu needed).
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      width: 140,
      minWidth: 80,
      suppressHeaderMenuButton: false,
    },
    // Stable row identity from Firestore document ids (D-005). Callers supply
    // their own `getRowId` if the data shape differs.
    getRowId: (params) => params.data?.id ?? params.data?.guestId ?? String(params.data),
    overlayNoRowsTemplate:
      '<span class="dashboard-grid-empty">Sin resultados.</span>',
  };
}