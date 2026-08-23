// ─────────────────────────────────────────────────────────────────────────
// groups.js — pure group transforms.
//
// MODEL DECISION (§34 prompt): we store child transforms ONLY (no group-local
// coordinate system). A group is just `{ id, zoneId, name, objectIds[] }`.
// This makes group move/rotate/ungroup, collision, and persistence most
// reliable:
//   - move a group → mutate each child's x/y by the same delta
//   - rotate a group → rotate each child's center + own rotation around the
//     group pivot, preserving relative layout and internal connections
//   - ungroup → delete the group entity; children are already independent
//
// All functions are PURE and take/return plain state fragments.
// ─────────────────────────────────────────────────────────────────────────

import { rotatePointAround, getFootprintBounds } from "./geometry.js";

/**
 * Compute the pivot of a group from its members' footprints.
 * @param {object[]} members placed instances (with definitionId, transform)
 * @param {function} footprintOf (member) => footprint
 */
export function groupPivot(members, footprintOf) {
  const footprints = members.map(footprintOf).filter(Boolean);
  if (!footprints.length) return { x: 0, y: 0 };
  const xs = [];
  const ys = [];
  for (const fp of footprints) {
    const b = getFootprintBounds(fp);
    xs.push(b.minX, b.maxX);
    ys.push(b.minY, b.maxY);
  }
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/**
 * Apply a translation delta to each member's transform.
 * Pure — returns a new map of id → transform.
 */
export function translateGroup(members, dx, dy) {
  const out = {};
  for (const m of members) {
    out[m.id] = {
      ...m.transform,
      x: m.transform.x + dx,
      y: m.transform.y + dy,
    };
  }
  return out;
}

/**
 * Apply a rotation (degrees) around the group pivot to each member. Each
 * child's own rotation is added to the group rotation (preserves orientation
 * relative to the assembly).
 * Pure — returns a new map of id → transform.
 */
export function rotateGroup(members, pivot, deg) {
  const out = {};
  for (const m of members) {
    const center = rotatePointAround({ x: m.transform.x, y: m.transform.y }, pivot, deg);
    out[m.id] = {
      ...m.transform,
      x: center.x,
      y: center.y,
      rotation: ((m.transform.rotation || 0) + deg) % 360,
    };
  }
  return out;
}

export default { groupPivot, translateGroup, rotateGroup };