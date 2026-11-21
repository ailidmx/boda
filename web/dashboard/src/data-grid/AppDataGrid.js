// ── AppDataGrid — shared AG Grid Community factory (vanilla JS) ─────────
//
// The dashboard is vanilla JS (Vite + ESM, no React), so the shared grid layer
// is a FACTORY, not a React component. It owns the grid bootstrap mechanics —
// Community module registration, the legacy Quartz theme class, an explicit
// container height, and the shared base options — and returns a tiny API so
// pages never call `createGrid`/`ModuleRegistry` directly.
//
// Usage:
//   const grid = createAppDataGrid({
//     container,          // HTMLElement (required)
//     columnDefs,         // AG Grid column defs (required)
//     rowData,            // initial rows (optional)
//     getRowId,           // stable identity (optional; defaults to data.id)
//     onCellValueChanged, // persistence handler (optional)
//     ...rest,            // any other AG Grid grid options
//   });
//   grid.setRowData(next);
//   grid.setColumnDefs(next);
//   grid.api // raw AG Grid GridApi when you need the full API
//   grid.destroy();
//
// Business logic + Firestore never live here — callers pass declarative
// column defs and event handlers, and persist through their own services.

import { createGrid } from "ag-grid-community";
import {
  ensureGridModulesRegistered,
  GRID_THEME_CLASS,
  baseGridOptions,
} from "./gridDefaults.js";

/**
 * Create a configured AG Grid Community instance.
 *
 * @param {object} params
 * @param {HTMLElement} params.container — mount target (gets the theme class).
 * @param {Array<object>} params.columnDefs — AG Grid column definitions.
 * @param {Array<object>} [params.rowData] — initial rows.
 * @param {Function} [params.getRowId] — stable row identity (default: data.id).
 * @param {Function} [params.onCellValueChanged] — confirmed-edit handler.
 * @param {object} [params.overrides] — extra AG Grid options merged last.
 * @returns {{ api: object, setRowData: Function, setColumnDefs: Function, destroy: Function }}
 */
export function createAppDataGrid({
  container,
  columnDefs,
  rowData = [],
  getRowId,
  onCellValueChanged,
  overrides = {},
}) {
  if (!container) throw new Error("AppDataGrid: container is required");

  ensureGridModulesRegistered();

  // The legacy Quartz CSS theme needs the `ag-theme-quartz` class on the grid
  // element, plus our own sizing hook. Apply it once (idempotent).
  GRID_THEME_CLASS.split(/\s+/).forEach((cls) => container.classList.add(cls));

  // AG Grid requires a non-zero container, but with the shared `autoHeight`
  // layout it sizes itself to the rows. Only a caller that explicitly asks for
  // a fixed viewport (`overrides.domLayout = "normal"`) gets the default height.
  const domLayout = overrides.domLayout ?? "autoHeight";
  if (domLayout === "autoHeight") {
    container.style.height = "";
    container.style.maxHeight = "none";
    container.style.overflow = "visible";
  } else if (!container.style.height) {
    container.style.height = getDefaultHeight();
  }

  const base = baseGridOptions();
  const api = createGrid(container, {
    ...base,
    columnDefs,
    rowData,
    domLayout,
    ...(getRowId ? { getRowId } : {}),
    ...(onCellValueChanged ? { onCellValueChanged } : {}),
    ...overrides,
  });

  return {
    api,
    setRowData: (next) => api.setGridOption("rowData", next),
    setColumnDefs: (next) => api.setGridOption("columnDefs", next),
    setLoading: (loading) => {
      if (loading) api.showLoadingOverlay();
      else api.hideOverlay();
    },
    destroy: () => api.destroy(),
  };
}

// A sensible default height for the grid viewport. Callers may override by
// setting `container.style.height` before creating the grid.
function getDefaultHeight() {
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return `${Math.max(360, Math.round(vh * 0.62))}px`;
}