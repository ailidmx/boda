// ─────────────────────────────────────────────────────────────────────────
// catalog.js — object DEFINITIONS (what an object IS) vs INSTANCES (where a
// copy is placed). This module is PURE: it takes collections of definitions
// and instances as arguments and never touches Firestore.
//
// System definitions are immutable and cannot be structurally edited/deleted.
// Custom definitions can be edited, but geometry-affecting edits to a USED
// definition must be treated as a destructive migration (the UI warns first).
// Custom definitions cannot be deleted while any placed instance references
// them.
// ─────────────────────────────────────────────────────────────────────────

import { estimateCapacity, resolveSeatCount, RECT_EDGES } from "./seating.js";

/**
 * Extra built-in "provider/stage" objects — useful for the venue layout. These
 * have no guest seats and (where overhead) no physical collision.
 */
export const PROVIDER_DEFINITIONS = [
  { id: "sys-pista-baile", origin: "system", name: "Pista de baile", category: "floor", shape: "square", width: 6, height: 6, rotationMode: "orthogonal", canRotate: true, collidable: false, seating: { enabled: false }, connection: { enabled: false, ports: [] }, metadata: { description: "Pista de baile." } },
  { id: "sys-barra-comida", origin: "system", name: "Barra de comida", category: "provider", shape: "rectangle", width: 4, height: 1.2, rotationMode: "orthogonal", canRotate: true, collidable: true, seating: { enabled: false }, connection: { enabled: false, ports: [] }, metadata: { description: "Barra de comida (proveedor)." } },
  { id: "sys-mariachis", origin: "system", name: "Mariachis", category: "provider", shape: "circle", diameter: 1.2, rotationMode: "none", canRotate: false, collidable: false, seating: { enabled: false }, connection: { enabled: false, ports: [] }, metadata: { description: "Escenario / área de mariachis." } },
  { id: "sys-toldo", origin: "system", name: "Toldo", category: "structure", shape: "rectangle", width: 8, height: 4, rotationMode: "orthogonal", canRotate: true, collidable: false, seating: { enabled: false }, connection: { enabled: false, ports: [] }, metadata: { description: "Toldo / carpa (objeto alto, sin colisión)." } },
];

/**
 * The two canonical system objects (plus the existing NOVIOS head table).
 * All physical dimensions are taken from the EXISTING implemented model so we
 * do not silently change what's already in Firestore:
 *   - round wedding table: 1.8 m diameter, 10 seats (36° apart)
 *   - NOVIOS head table: 7 m × 1.5 m, 22 seats (11 north + 11 south)
 *   - standard rectangular banquet table: 2.4 m × 0.9 m (prompt canonical)
 */
export const SYSTEM_DEFINITIONS = [
  {
    id: "sys-table-round-10",
    origin: "system",
    name: "Mesa redonda",
    category: "table",
    shape: "circle",
    diameter: 1.8,
    radius: 0.9,
    rotationMode: "none",
    canRotate: false,
    seating: {
      enabled: true,
      mode: "fixed",
      seatCount: 10,
      startAngle: -90,
      seatRadius: 1.25, // 0.9 radius + 0.35 offset
    },
    connection: { enabled: false, ports: [] },
    metadata: {
      description: "Mesa redonda estándar para 10 invitados.",
      comfortableCapacity: 10,
      recommendedCapacity: 10,
      maximumCapacity: 10,
    },
  },
  {
    id: "sys-table-novios",
    origin: "system",
    name: "Mesa de novios",
    category: "table",
    shape: "rectangle",
    width: 7,
    height: 1.5,
    rotationMode: "orthogonal",
    canRotate: true,
    seating: {
      enabled: true,
      mode: "fixed",
      seatCount: 22,
      enabledEdges: ["north", "south"],
      startMargin: 0.3,
      endMargin: 0.3,
    },
    connection: { enabled: false, ports: [] },
    metadata: {
      description: "Mesa principal de los novios (11 al norte, 11 al sur).",
      comfortableCapacity: 22,
      recommendedCapacity: 22,
      maximumCapacity: 22,
    },
  },
  {
    id: "sys-table-rect",
    origin: "system",
    name: "Mesa rectangular",
    category: "table",
    shape: "rectangle",
    width: 2.4,
    height: 0.9,
    rotationMode: "orthogonal",
    canRotate: true,
    seating: {
      enabled: true,
      mode: "auto",
      enabledEdges: ["north", "south"],
      startMargin: 0.3,
      endMargin: 0.3,
    },
    connection: { enabled: true, ports: RECT_EDGES },
    metadata: {
      description: "Mesa rectangular de banquete.",
      comfortableCapacity: 6,
      recommendedCapacity: 6,
      maximumCapacity: 8,
    },
  },
];

/** Map of system definition id → definition. */
const SYSTEM_BY_ID = Object.fromEntries(
  [...SYSTEM_DEFINITIONS, ...PROVIDER_DEFINITIONS].map((d) => [d.id, d]),
);

/**
 * True if a definition id is a built-in system object.
 */
export function isSystemDefinition(def) {
  const id = typeof def === "string" ? def : def?.id;
  return Boolean(SYSTEM_BY_ID[id]);
}

/**
 * Default visual style per category. These are used when a definition (loaded
 * from `catalog_definitions`) does not carry explicit style fields, and are the
 * seed values written to the DB. zIndex controls SVG paint order (higher =
 * drawn later / on top), so a toldo renders OVER the tables placed beneath it.
 */
const CATEGORY_STYLES = {
  table: { strokeColor: "#8a6a36", fillColor: "#f4ead2", zIndex: 10 },
  floor: { strokeColor: "#5d6d8a", fillColor: "#e9edf4", zIndex: 0 },
  provider: { strokeColor: "#5d6d8a", fillColor: "#e9edf4", zIndex: 10 },
  structure: { strokeColor: "#7a6fa0", fillColor: "#ede9f8", zIndex: 20 },
  object: { strokeColor: "#8a6a36", fillColor: "#f4ead2", zIndex: 10 },
};

export function defaultStyleFor(def = {}) {
  return CATEGORY_STYLES[def.category] || CATEGORY_STYLES.object;
}

/**
 * Normalize a definition into a concrete, complete shape. Applies sane
 * defaults for missing fields and computes derived capacity when AUTO.
 */
export function normalizeDefinition(def = {}) {
  const shape = def.shape || "rectangle";
  const seating = {
    enabled: def.seating?.enabled ?? false,
    mode: def.seating?.mode ?? "auto",
    seatCount: def.seating?.seatCount ?? null,
    enabledEdges: def.seating?.enabledEdges || (shape === "rectangle" ? ["north", "south"] : undefined),
    startMargin: def.seating?.startMargin,
    endMargin: def.seating?.endMargin,
    startAngle: def.seating?.startAngle,
    seatRadius: def.seating?.seatRadius,
  };
  const norm = {
    id: def.id,
    origin: def.origin || "custom",
    name: def.name || def.id || "Objeto",
    category: def.category || "object",
    shape,
    width: def.width,
    height: def.height,
    diameter: def.diameter,
    radius: def.radius,
    side: def.side,
    rotationMode: def.rotationMode || (shape === "circle" ? "none" : "orthogonal"),
    canRotate: def.canRotate ?? shape !== "circle",
    // Overhead/tall objects (toldo, decor, stage trusses) occupy different
    // vertical space — they can overlap other objects, so collision is ignored.
    collidable: def.collidable ?? true,
    seating,
    connection: def.connection || { enabled: false, ports: [] },
    metadata: def.metadata || {},
    // Visual style (editable in the DB-backed catalog). Falls back to the
    // per-category default so older/hardcoded defs still render consistently.
    strokeColor: def.strokeColor || defaultStyleFor(def).strokeColor,
    fillColor: def.fillColor || defaultStyleFor(def).fillColor,
    strokeWidth: def.strokeWidth ?? 0.05,
    opacity: def.opacity ?? 1,
    zIndex: def.zIndex ?? defaultStyleFor(def).zIndex,
  };
  // Derive auto capacity when seating is enabled and no fixed count exists.
  if (seating.enabled && seating.mode !== "fixed") {
    norm.metadata.estimatedCapacity = estimateCapacity(norm);
  }
  return norm;
}

/**
 * Count how many placed instances reference a definition id.
 * @param {object[]} instances
 * @param {string} definitionId
 */
export function definitionUsageCount(instances, definitionId) {
  return (instances || []).filter((i) => i.definitionId === definitionId).length;
}

/**
 * Reason a custom definition can(n't) be DELETED.
 * Returns { canDelete:boolean, reason?:string, usage:number }.
 */
export function canDeleteDefinition(def, instances) {
  if (isSystemDefinition(def)) {
    return { canDelete: false, reason: "system", usage: 0 };
  }
  const usage = definitionUsageCount(instances, def.id);
  if (usage > 0) {
    return { canDelete: false, reason: "in-use", usage };
  }
  return { canDelete: true, usage: 0 };
}

/**
 * Reason a custom definition can(n't) be structurally EDITED.
 * Returns { canEdit:boolean, reason?:string, usage:number }.
 * A used custom definition MAY be edited, but the edit is flagged destructive.
 */
export function canEditDefinition(def, instances) {
  // All definitions (including the built-in catalog objects) are editable now.
  // Geometry-affecting fields (shape/size/seating) are LOCKED in the UI while
  // the definition is in use; style/collision/name remain editable.
  const usage = definitionUsageCount(instances, def.id);
  return { canEdit: true, usage, geometryLocked: usage > 0 };
}

/**
 * Which fields of a definition are "geometry-affecting" (require a
 * destructive-migration warning when the definition is in use).
 */
export const STRUCTURAL_FIELDS = new Set([
  "shape",
  "width",
  "height",
  "diameter",
  "radius",
  "side",
  "canRotate",
  "rotationMode",
  "collidable",
  "seating",
]);

/**
 * True if two normalized definitions differ on ANY structural field.
 */
export function isStructuralChange(before, after) {
  for (const field of STRUCTURAL_FIELDS) {
    if (JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field])) return true;
  }
  return false;
}

/**
 * Fields that change an object's physical footprint / seats. These are LOCKED
 * in the edit modal while the definition is in use. `collidable` is deliberately
 * NOT geometric — a table or toldo can toggle collision at any time (that's how
 * you place tables under a toldo).
 */
export const GEOMETRY_FIELDS = new Set([
  "shape",
  "width",
  "height",
  "diameter",
  "radius",
  "side",
  "canRotate",
  "rotationMode",
  "seating",
]);

/**
 * The effective seat count for a definition (used by renderers + seat logic).
 */
export function definitionSeatCount(definition, opts = {}) {
  return resolveSeatCount(normalizeDefinition(definition), opts);
}

export default {
  SYSTEM_DEFINITIONS,
  PROVIDER_DEFINITIONS,
  isSystemDefinition,
  normalizeDefinition,
  definitionUsageCount,
  canDeleteDefinition,
  canEditDefinition,
  isStructuralChange,
  definitionSeatCount,
  defaultStyleFor,
  STRUCTURAL_FIELDS,
  GEOMETRY_FIELDS,
};