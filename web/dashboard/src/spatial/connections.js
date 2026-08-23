// ─────────────────────────────────────────────────────────────────────────
// connections.js — pure magnetic connection detection + derived seat blocking.
//
// A connection is an EXPLICIT semantic relationship between two compatible
// rectangle edges (e.g. A's east edge to B's west edge). It is NOT the same
// as grouping, and it is NOT inferred from mere permanent proximity: the
// connection snap must explicitly engage (see findMagneticConnection).
//
// Seat blocking is DERIVED from explicit connections and never persisted.
// Breaking a connection automatically restores those seats.
// ─────────────────────────────────────────────────────────────────────────

import { normalizeDims, edgeNormal } from "./geometry.js";
import { RECT_EDGES } from "./seating.js";

/** Compatible edge → opposite edge it can mate flush against. */
const OPPOSITE_EDGE = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/**
 * The edges a rectangle definition exposes for connection. Defaults to all
 * four for rectangles with `connection.enabled`, otherwise none.
 */
export function connectionPorts(definition) {
  if (!definition?.connection?.enabled) return [];
  return definition.connection.ports || RECT_EDGES;
}

/**
 * Outward-facing world normal of a placed rectangle's edge (accounts for
 * the object's rotation).
 */
export function rotatedEdgeNormal(edge, rotation = 0) {
  const base = edgeNormal(edge);
  if (!rotation) return base;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: base.x * cos - base.y * sin,
    y: base.x * sin + base.y * cos,
  };
}

/**
 * Find the strongest magnetic connection between a MOVING object (definition +
 * candidate transform) and a STATIC object. Returns null or:
 *   {
 *     movingEdge, staticEdge, staticId,
 *     // candidate transform for the moving object snapped flush
 *     snappedTransform
 *   }
 *
 * Rules:
 *   - both objects must be rectangles and have connection enabled
 *   - the moving object's candidate edge midpoint must be within `threshold`
 *     of the static object's compatible edge midpoint
 *   - the edge normals must be opposite (facing each other)
 */
export function findMagneticConnection({
  movingDefinition,
  movingTransform,
  staticDefinition,
  staticTransform,
  staticId,
  threshold = 0.25,
}) {
  const movingPorts = connectionPorts(movingDefinition);
  const staticPorts = connectionPorts(staticDefinition);
  if (!movingPorts.length || !staticPorts.length) return null;

  const movingDims = normalizeDims(movingDefinition);
  const staticDims = normalizeDims(staticDefinition);
  // Edges only make sense on rectangles/square (not circles).
  if (movingDims.shape === "circle" || staticDims.shape === "circle") return null;

  const movingCenter = { x: movingTransform.x ?? 0, y: movingTransform.y ?? 0 };
  const staticCenter = { x: staticTransform.x ?? 0, y: staticTransform.y ?? 0 };
  const movingRot = movingTransform.rotation ?? 0;
  const staticRot = staticTransform.rotation ?? 0;

  let best = null;
  for (const mEdge of movingPorts) {
    const mMid = edgeMidpointWorld(mEdge, movingCenter, movingDims, movingRot);
    const mNormal = rotatedEdgeNormal(mEdge, movingRot);
    for (const sEdge of staticPorts) {
      // Only opposite edges mate.
      if (OPPOSITE_EDGE[sEdge] !== mEdge) continue;
      const sMid = edgeMidpointWorld(sEdge, staticCenter, staticDims, staticRot);
      const dist = Math.hypot(mMid.x - sMid.x, mMid.y - sMid.y);
      if (dist > threshold) continue;

      // The normals must be roughly OPPOSITE (facing each other). For an east
      // edge (normal +x) connecting to a west edge (normal -x), the dot product
      // ≈ -1.
      const sNormal = rotatedEdgeNormal(sEdge, staticRot);
      const dot = mNormal.x * sNormal.x + mNormal.y * sNormal.y;
      if (dot > -0.5) continue;

      // Compute the snapped transform: translate the moving object so its edge
      // midpoint coincides with the static edge midpoint (flush).
      const snappedCenter = {
        x: movingCenter.x + (sMid.x - mMid.x),
        y: movingCenter.y + (sMid.y - mMid.y),
      };
      if (!best || dist < best.dist) {
        best = {
          movingEdge: mEdge,
          staticEdge: sEdge,
          staticId,
          dist,
          snappedTransform: { ...movingTransform, x: snappedCenter.x, y: snappedCenter.y },
        };
      }
    }
  }
  return best;
}

/** Re-export edgeMidpoint from geometry as a world-space helper alias. */
export { edgeMidpointWorld };

function edgeMidpointWorld(edge, center, dims, rotation) {
  const { width, height } = dims;
  const hw = width / 2;
  const hh = height / 2;
  let local;
  switch (edge) {
    case "north": local = { x: 0, y: -hh }; break;
    case "east": local = { x: hw, y: 0 }; break;
    case "south": local = { x: 0, y: hh }; break;
    case "west": local = { x: -hw, y: 0 }; break;
    default: local = { x: 0, y: 0 };
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = local.x * cos - local.y * sin;
  const ry = local.x * sin + local.y * cos;
  return { x: rx + center.x, y: ry + center.y };
}

/**
 * Return the connection (if any) between two placed objects, used to derive
 * seat blocking. A connection object is:
 *   { id, objectAId, portA, objectBId, portB }
 */
export function connectionBetween(connection, aId, bId) {
  if (!connection) return false;
  return (
    (connection.objectAId === aId && connection.objectBId === bId) ||
    (connection.objectAId === bId && connection.objectBId === aId)
  );
}

/**
 * Which seats on a PLACED object are blocked by an explicit connection.
 * Returns a Set of seat anchor IDs whose `edge` matches a connected edge.
 *
 * @param {object} placed { definitionId, transform }
 * @param {object} definition normalized definition
 * @param {object[]} seatAnchors from seatAnchorsForDefinition
 * @param {object[]} connections explicit connection entities involving this instance
 * @param {string} instanceId
 */
export function blockedSeatIds(seatAnchors, connections, instanceId) {
  const blockedEdges = new Set();
  for (const conn of connections || []) {
    if (conn.objectAId === instanceId) blockedEdges.add(conn.portA);
    if (conn.objectBId === instanceId) blockedEdges.add(conn.portB);
  }
  if (!blockedEdges.size) return new Set();
  const out = new Set();
  for (const a of seatAnchors) {
    if (a.edge && blockedEdges.has(a.edge)) out.add(a.id);
  }
  return out;
}

/**
 * Given a definition's seat anchors and the blocked-edge set, produce seat
 * STATE for every slot: "blockedByConnection" | "available".
 * Occupied/disabled are layered on top by the editor state (guest assignments).
 */
export function deriveSeatStates(seatAnchors, blockedEdges) {
  return seatAnchors.map((a) => ({
    id: a.id,
    edge: a.edge,
    index: a.index,
    state: a.edge && blockedEdges.has(a.edge) ? "blockedByConnection" : "available",
  }));
}

export default {
  OPPOSITE_EDGE,
  connectionPorts,
  rotatedEdgeNormal,
  findMagneticConnection,
  edgeMidpointWorld,
  connectionBetween,
  blockedSeatIds,
  deriveSeatStates,
};