// ── Shared AG Grid cell-renderer helpers (vanilla JS) ───────────────────
//
// A tiny class-based cell renderer that sets a cell to the HTML returned by a
// generator function. Used for the dashboard's complex cells (identity, actions,
// chips, inline editors). Event handling is NOT wired here — the dashboard uses
// a single DELEGATED listener on the grid container keyed by `data-*`
// attributes, so renderers stay stateless and all persistence flows through the
// feature's own save handlers (never Firestore inside a renderer).

/**
 * Create an ICellRendererComp class whose `getGui()` returns an element with
 * the HTML from `html(params)`.
 *
 * @param {(params: object) => string} html — receives the AG Grid cell params.
 */
export function htmlCellRenderer(html) {
  return class HtmlCellRenderer {
    init(params) {
      this.eGui = document.createElement("div");
      this.eGui.className = "dashboard-cell-render";
      this.eGui.innerHTML = html(params);
    }
    getGui() {
      return this.eGui;
    }
    refresh() {
      return false;
    }
  };
}

/**
 * Wrap a plain function `(data) => html` into an htmlCellRenderer class.
 * Convenience for data-only HTML generators.
 */
export function dataHtmlRenderer(render) {
  return htmlCellRenderer((params) => render(params.data));
}