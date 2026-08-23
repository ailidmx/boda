// ─────────────────────────────────────────────────────────────────────────
// seating.js — pure seat/chair generation derived from object geometry.
//
// Seat positions are ALWAYS derived, never stored as coordinates. They are
// computed in METERS, relative to the object's CENTER (0,0). The caller maps
// them into world space with the object's transform.
//
// Seat identity is deterministic from slot index + edge, so guest assignments
// survive whenever the seating configuration stays structurally compatible.
//
// IMPORTANT: a circle's seat radius must consider the seat offset OUTSIDE the
// table footprint so chairs don't sit on the table itself. `seatRadius`
// defaults to table radius + SEAT_OFFSET. `startAngle` (degrees) rotates the
// first seat; 0 or -90 puts the first seat at the top.
// ─────────────────────────────────────────────────────────────────────────

import { degToRad } from "./geometry.js";

// Default real-world spacing (all in METERS).
export const SEAT_WIDTH_MIN = 0.6; // minimum arc/linear width per chair
export const SEAT_START_MARGIN = 0.3; // corner margin on rectangle edges
export const SEAT_END_MARGIN = 0.3;
export const SEAT_OFFSET = 0.35; // how far beyond the table edge chairs sit

// Rectangle edges usable for seating (clockwise).
export const RECT_EDGES = ["north", "east", "south", "west"];

/**
 * Round-table seat anchors.
 * @param {number} seatCount
 * @param {object} opts { radius, seatRadius, startAngle }
 * @returns {{id:string, x:number, y:number, angle:number}[]}
 */
export function roundSeatAnchors(seatCount, opts = {}) {
  const radius = opts.radius ?? 0.9;
  const seatRadius = opts.seatRadius ?? radius + SEAT_OFFSET;
  const startAngle = opts.startAngle ?? -90; // first seat at top
  const anchors = [];
  for (let i = 0; i < seatCount; i++) {
    const angle = startAngle + i * (360 / seatCount);
    const rad = degToRad(angle);
    anchors.push({
      id: `seat-${i}`,
      index: i,
      x: Math.cos(rad) * seatRadius,
      y: Math.sin(rad) * seatRadius,
      angle, // degrees; 0 = east, -90 = north (toward center)
    });
  }
  return anchors;
}

/**
 * Rectangle/square edge-based seat anchors.
 *
 * Seats are distributed over each ENABLED edge's usable length (edge minus
 * start/end margins) so chairs never sit at corners.
 *
 * @param {object} dims { width, height }
 * @param {number} seatCount total seats
 * @param {object} opts { enabledEdges, startMargin, endMargin, seatWidth }
 * @returns {{id:string, x:number, y:number, edge:string, index:number, angle:number}[]}
 */
export function rectSeatAnchors(dims, seatCount, opts = {}) {
  const { width, height } = dims;
  const enabledEdges = opts.enabledEdges || ["north", "south"];
  const startMargin = opts.startMargin ?? SEAT_START_MARGIN;
  const endMargin = opts.endMargin ?? SEAT_END_MARGIN;
  const seatWidth = opts.seatWidth ?? SEAT_WIDTH_MIN;

  const hw = width / 2;
  const hh = height / 2;

  // Usable length per edge (north/south use width; east/west use height).
  const edgeLength = (edge) => (edge === "north" || edge === "south" ? width : height);
  // Number of seats that fit per edge; distribute total seats proportionally.
  const perEdgeSeats = {};
  let totalUsable = 0;
  for (const edge of enabledEdges) {
    const usable = Math.max(0, edgeLength(edge) - startMargin - endMargin);
    perEdgeSeats[edge] = { usable, count: 0 };
    totalUsable += usable;
  }

  // Distribute `seatCount` seats proportionally to usable edge length.
  let assigned = 0;
  for (const edge of enabledEdges) {
    if (edge === enabledEdges[enabledEdges.length - 1]) {
      // Last edge gets the remainder (avoids rounding drift).
      perEdgeSeats[edge].count = seatCount - assigned;
    } else {
      perEdgeSeats[edge].count =
        totalUsable > 0 ? Math.round((perEdgeSeats[edge].usable / totalUsable) * seatCount) : 0;
      assigned += perEdgeSeats[edge].count;
    }
  }
  // Clamp any negative remainder from rounding.
  let sum = 0;
  for (const edge of enabledEdges) sum += perEdgeSeats[edge].count;
  if (sum > seatCount) {
    const last = enabledEdges[enabledEdges.length - 1];
    perEdgeSeats[last].count -= sum - seatCount;
  }

  // Build per-edge anchors, preserving each seat's LOCAL index (`i`) and its
  // stable id (`<edge>-<i>`), geometry, and facing angle. The local index keeps
  // guest assignments stable across any future ordering change.
  const byEdge = {};
  for (const edge of enabledEdges) {
    const { usable, count } = perEdgeSeats[edge];
    const len = edgeLength(edge);
    const along = (t) => -len / 2 + startMargin + t * usable; // from edge start
    const list = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const offset = along(t);
      let x = 0;
      let y = 0;
      let angle = 0;
      switch (edge) {
        case "north":
          x = offset;
          y = -hh - SEAT_OFFSET;
          angle = -90;
          break;
        case "south":
          x = offset;
          y = hh + SEAT_OFFSET;
          angle = 90;
          break;
        case "east":
          x = hw + SEAT_OFFSET;
          y = offset;
          angle = 0;
          break;
        case "west":
          x = -hw - SEAT_OFFSET;
          y = offset;
          angle = 180;
          break;
        default:
          break;
      }
      list.push({ id: `${edge}-${i}`, edge, x, y, angle });
    }
    byEdge[edge] = list;
  }

  // Facing-pair ordering: interleave NORTH/SOUTH so pairs look into each
  // other's eyes — seat 1 (north) faces seat 2 (south), seat 3 faces seat 4,
  // and so on. This is the human-friendly numbering the couple asked for.
  const anchors = [];
  const north = byEdge.north || [];
  const south = byEdge.south || [];
  const pairCount = Math.max(north.length, south.length);
  for (let i = 0; i < pairCount; i++) {
    if (i < north.length) anchors.push(north[i]);
    if (i < south.length) anchors.push(south[i]);
  }
  // Append any remaining (non N/S) edges in their declared order.
  for (const edge of enabledEdges) {
    if (edge === "north" || edge === "south") continue;
    if (byEdge[edge]) anchors.push(...byEdge[edge]);
  }

  // Assign the 0-based position index in the FINAL (facing-pair) order.
  anchors.forEach((a, idx) => { a.index = idx; });
  return anchors;
}

/**
 * Square-table seat anchors (seats around all 4 edges). Delegates to
 * `rectSeatAnchors` with a square's equal sides and all edges enabled.
 */
export function squareSeatAnchors(side, seatCount, opts = {}) {
  return rectSeatAnchors(
    { width: side, height: side },
    seatCount,
    { enabledEdges: opts.enabledEdges || ["north", "east", "south", "west"], ...opts },
  );
}

/**
 * Generate seat anchors for an object DEFINITION.
 * Dispatching on `shape`: circle / rectangle / square.
 * @returns { { id, x, y, edge?, index, angle? }[] }
 */
export function seatAnchorsForDefinition(definition, seatCount, opts = {}) {
  if (seatCount <= 0) return [];
  const shape = definition?.shape || "rectangle";
  if (shape === "circle") {
    const diameter = definition?.diameter ?? definition?.width ?? 1.8;
    const radius = definition?.radius ?? diameter / 2;
    return roundSeatAnchors(seatCount, {
      radius,
      startAngle: definition?.seating?.startAngle ?? opts.startAngle ?? -90,
      seatRadius: definition?.seating?.seatRadius ?? opts.seatRadius,
      ...opts,
    });
  }
  if (shape === "square") {
    const side = definition?.width ?? definition?.diameter ?? definition?.side ?? 1.4;
    return squareSeatAnchors(side, seatCount, {
      enabledEdges: definition?.seating?.enabledEdges,
      ...opts,
    });
  }
  // rectangle
  return rectSeatAnchors(
    { width: definition?.width ?? 2.4, height: definition?.height ?? 0.9 },
    seatCount,
    { enabledEdges: definition?.seating?.enabledEdges, ...opts },
  );
}

/**
 * Estimate capacity for a definition (AUTO mode).
 *   circle → floor(circumference / seatWidth) using the SEATING radius
 *   rectangle/square → per-edge estimates summed (margins honored)
 */
export function estimateCapacity(definition, opts = {}) {
  // Objects with seating disabled have ZERO seats (e.g. a TOLDO, dance floor,
  // food bar, stage, speaker, decor) — not even one.
  if (definition?.seating?.enabled === false) return 0;
  const seatWidth = opts.seatWidth ?? SEAT_WIDTH_MIN;
  const shape = definition?.shape || "rectangle";
  if (shape === "circle") {
    const diameter = definition?.diameter ?? definition?.width ?? 1.8;
    const radius = definition?.radius ?? diameter / 2;
    const seatRadius = definition?.seating?.seatRadius ?? radius + SEAT_OFFSET;
    const circumference = 2 * Math.PI * seatRadius;
    return Math.max(1, Math.floor(circumference / seatWidth));
  }
  const width = definition?.width ?? 2.4;
  const height = definition?.height ?? 0.9;
  const edges = definition?.seating?.enabledEdges || (shape === "square" ? RECT_EDGES : ["north", "south"]);
  const startMargin = opts.startMargin ?? SEAT_START_MARGIN;
  const endMargin = opts.endMargin ?? SEAT_END_MARGIN;
  let total = 0;
  for (const edge of edges) {
    const len = edge === "north" || edge === "south" ? width : height;
    const usable = Math.max(0, len - startMargin - endMargin);
    total += Math.floor(usable / seatWidth);
  }
  return Math.max(1, total);
}

/**
 * Resolve the effective seat count for a definition, honoring a FIXED count
 * when the seating mode is `fixed`, otherwise AUTO-estimating.
 */
export function resolveSeatCount(definition, opts = {}) {
  const seating = definition?.seating || {};
  // Seating explicitly disabled → zero seats (no chair slots at all).
  if (seating.enabled === false) return 0;
  if (seating.mode === "fixed" && Number.isInteger(seating.seatCount) && seating.seatCount > 0) {
    return seating.seatCount;
  }
  if (Number.isInteger(opts.seatCount) && opts.seatCount > 0) return opts.seatCount;
  return estimateCapacity(definition, opts);
}

/**
 * Degree orientation of a seat facing TOWARD the table center (0 = east,
 * -90 = north). Used so avatars face inward. `-1` is returned for none.
 */
export function seatFacingAngle(seatAnchor) {
  if (typeof seatAnchor.angle === "number") return seatAnchor.angle;
  return -1;
}

export default {
  SEAT_WIDTH_MIN,
  SEAT_START_MARGIN,
  SEAT_END_MARGIN,
  SEAT_OFFSET,
  RECT_EDGES,
  roundSeatAnchors,
  rectSeatAnchors,
  squareSeatAnchors,
  seatAnchorsForDefinition,
  estimateCapacity,
  resolveSeatCount,
  seatFacingAngle,
};