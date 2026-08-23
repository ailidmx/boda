// ─────────────────────────────────────────────────────────────────────────
// spatial/ — the wedding spatial layout & seating domain + geometry engine.
//
// Public shallow-import barrel. All modules are side-effect free (no
// React/Firestore/DOM), so they are fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────

export * from "./geometry.js";
export * from "./seating.js";
export * from "./catalog.js";
export * from "./connections.js";
export * from "./groups.js";
export * from "./editor-state.js";
export * from "./history.js";
export * from "./viewport.js";