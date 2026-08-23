// ── DataPanel — generic inline-editable AG Grid record table ────────────
//
// Renders a flat Firestore collection as an AG Grid Community table where every
// non-id document field is editable inline by default (text / number / boolean
// / array cells). Persistence flows through the injected `updateField` function
// (the repository's `updateRecordField`), never Firestore inside a renderer.
//
// A caller describes its panel with:
//   { container, collection, records, columns, updateField, emptyText,
//     onAfterEdit }
//
//   columns   — ordered list of `{ field, label, type? }`. `type` is one of
//               "text" | "number" | "boolean" | "array" (default "text").
//   records   — array of { id, ...docData }.
//
// Array cells render as a comma-separated, wrapped list and are edited as
// comma-separated free text (split on commas → trimmed non-empty strings).
// Boolean cells render as a Sí/No chip and toggle on click. Number cells use a
// numeric prompt. Text cells use a plain text prompt. The doc `id` is a
// read-only monospace column.

import { createAppDataGrid } from "./data-grid/AppDataGrid.js";
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

function esc(v) {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  const apos = "&#" + "39;";
  return String(v ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

function displayValue(value, type) {
  if (value === undefined || value === null || value === "") return { text: "—", empty: true };
  if (type === "boolean") return { text: value ? "Sí" : "No", value: Boolean(value) };
  if (type === "array") {
    const arr = Array.isArray(value) ? value : [value];
    return { text: arr.join(", "), value: arr };
  }
  if (type === "number") {
    const n = Number(value);
    return { text: Number.isFinite(n) ? String(n) : String(value ?? ""), value: n };
  }
  return { text: String(value), value: String(value) };
}

/**
 * Render a generic inline-editable record table into `container`.
 */
export function renderDataPanel(ctx) {
  const { container, collection, records, columns, updateField, emptyText, onAfterEdit } = ctx;
  if (!container) return;

  const typeOf = (field) => (columns.find((c) => c.field === field)?.type) || "text";

  const valueCell = (field) => (record) => {
    const type = typeOf(field);
    const d = displayValue(record[field], type);
    if (type === "boolean") {
      return `
        <button type="button" class="dashboard-badge ${record[field] ? "dashboard-badge-yes" : "dashboard-badge-no"}"
          data-rec-id="${esc(record.id)}" data-recfeld="${field}" title="Clic para alternar">${d.text}</button>`;
    }
    if (type === "array") {
      return `
        <button type="button" class="dashboard-datapanel-array" data-rec-id="${esc(record.id)}" data-recfeld="${field}" title="Clic para editar">${esc(d.text)}</button>`;
    }
    return `
      <button type="button" class="dashboard-datapanel-text ${d.empty ? "is-empty" : ""}" data-rec-id="${esc(record.id)}" data-recfeld="${field}" title="Clic para editar">${esc(d.text)}</button>`;
  };

  const idCell = (record) => `<code class="dashboard-datapanel-id" title="${esc(record.id)}">${esc(record.id)}</code>`;

  const columnDefs = [
    {
      headerName: "ID",
      colId: "__id",
      pinned: "left",
      lockPinned: true,
      width: 180,
      minWidth: 120,
      cellRenderer: dataHtmlRenderer(idCell),
      valueGetter: (p) => p.data.id,
      filter: false,
      sortable: false,
      cellClass: "dashboard-grid-cell",
    },
    ...columns.map((col) => {
      const type = col.type || "text";
      return {
        headerName: col.label,
        colId: col.field,
        field: col.field,
        width: type === "boolean" ? 110 : type === "array" ? 360 : 180,
        minWidth: 90,
        cellRenderer: dataHtmlRenderer(valueCell(col.field)),
        valueGetter: (p) => {
          const v = p.data?.[col.field];
          if (type === "boolean") return v ? 1 : 0;
          if (type === "array") return (Array.isArray(v) ? v : []).join(", ");
          return v ?? "";
        },
        comparator: type === "number"
          ? (a, b) => (Number(a) || 0) - (Number(b) || 0)
          : (a, b) => (a < b ? -1 : a > b ? 1 : 0),
        cellClass: "dashboard-grid-cell",
      };
    }),
  ];

  if (!container.dataset.gridReady) {
    container.innerHTML = `<div data-datapanel-grid></div>`;
    container.dataset.gridReady = "1";
  }
  const gridEl = container.querySelector("[data-datapanel-grid]");

  let grid = container._grid;
  if (!grid) {
    grid = createAppDataGrid({
      container: gridEl,
      columnDefs,
      rowData: records,
      getRowId: (p) => p.data.id,
      overrides: {
        rowHeight: 54,
        overlayNoRowsTemplate: `<span class="dashboard-grid-empty">${esc(emptyText || "Sin registros.")}</span>`,
      },
    });
    container._grid = grid;
  } else {
    grid.setColumnDefs(columnDefs);
    grid.setRowData(records);
  }

  // ── Editing (delegated, wired once) ──
  if (container.dataset.gridWired) return;
  container.dataset.gridWired = "1";

  const commit = async (docId, field, type, current) => {
    if (type === "boolean") {
      return updateField(collection, docId, field, !current);
    }
    if (type === "array") {
      const raw = window.prompt("Valores separados por comas:", (Array.isArray(current) ? current : []).join(", "));
      if (raw === null) return false;
      const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return updateField(collection, docId, field, arr);
    }
    const raw = window.prompt("Nuevo valor:", current == null ? "" : String(current));
    if (raw === null) return false;
    if (type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) return false;
      return updateField(collection, docId, field, n);
    }
    return updateField(collection, docId, field, raw);
  };

  gridEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-recfeld]");
    if (!btn) return;
    const docId = btn.dataset.recId;
    const field = btn.dataset.recfeld;
    const record = records.find((r) => r.id === docId);
    if (!record) return;
    const ok = await commit(docId, field, typeOf(field), record[field]);
    if (ok === false) return;
    onAfterEdit?.();
  });
}

export default { renderDataPanel };