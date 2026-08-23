// ─────────────────────────────────────────────────────────────────────────
// geometry.js — pure, side-effect-free spatial math.
//
// The canonical unit is METERS. Degrees for rotation. Coordinates are
// world-space (x = east, y = south). Rendering maps world → screen; no
// geometry here ever persists or returns pixels.
//
// All functions are PURE and must NOT import from React, Firestore, or DOM.
// They are the single source of truth for:
//   - snapping
//   - transformation
//   - footprint / bounds
//   - collision
//   - zone containment
//   - connection detection
//   - group bounds / transforms
// ─────────────────────────────────────────────────────────────────────────

const EPS = 1e-9;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// Floating-point helpers (never compare floats with strict equality).
export function nearlyEqual(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function degToRad(deg) {
  return deg * DEG_TO_RAD;
}

export function radToDeg(rad) {
  return rad * RAD_TO_DEG;
}

// ── Snapping ────────────────────────────────────────────────────────────

/**
 * Snap a scalar to the nearest step on a grid, guarding against float error.
 * `12.37` with step `0.25` → `12.25`.
 */
export function snapToGrid(value, step = 0.25) {
  if (!step || step <= 0) return value;
  const snapped = Math.round(value / step) * step;
  // Round away infinitesimal float noise (e.g. 12.250000000000002).
  return Number(snapped.toFixed(6));
}

/**
 * Snap a point vector {x,y} to a grid step. Used for fine/coarse snapping.
 */
export function snapPointToGrid(point, step = 0.25) {
  return {
    x: snapToGrid(point.x, step),
    y: snapToGrid(point.y, step),
  };
}

// ── Point / vector transformation ───────────────────────────────────────

/**
 * Rotate a point around a pivot (world coords, degrees).
 */
export function rotatePoint(px, py, cx, cy, deg) {
  const rad = degToRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function rotatePointAround(point, pivot, deg) {
  return rotatePoint(point.x, point.y, pivot.x, pivot.y, deg);
}

/**
 * Rotate a whole set of points around a pivot (used by group rotation).
 * Returns a new array; the inputs are never mutated.
 */
export function rotatePoints(points, pivot, deg) {
  return points.map((p) => rotatePointAround(p, pivot, deg));
}

// ── Footprint / geometry descriptors ────────────────────────────────────

/**
 * Normalize a definition's dimensions into a concrete {shape, width, height, radius}.
 * square is treated as a rectangle with equal sides.
 */
export function normalizeDims(def) {
  const shape = def?.shape || "rectangle";
  if (shape === "circle") {
    const diameter = def?.diameter ?? def?.width ?? 1.8;
    const radius = def?.radius ?? diameter / 2;
    return { shape: "circle", width: radius * 2, height: radius * 2, radius };
  }
  // rectangle | square | anything else
  const width = def?.width ?? def?.diameter ?? 1.8;
  const height = def?.height ?? width;
  return { shape: shape === "circle" ? "circle" : "rectangle", width, height, radius: null };
}

/**
 * Return the 4 corners (clockwise, starting at top-left in local space) of a
 * rotated rectangle, in world coordinates. For `circle` the footprint is the
 * axis-aligned bounding box corners (collision uses the circle descriptor).
 */
export function getRectangleCorners(center, dims, rotation = 0) {
  const { width, height } = dims;
  const hw = width / 2;
  const hh = height / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return rotation ? corners.map((c) => rotatePointAround(c, { x: 0, y: 0 }, rotation)).map((c) => ({
    x: c.x + center.x,
    y: c.y + center.y,
  })) : corners.map((c) => ({ x: c.x + center.x, y: c.y + center.y }));
}

/**
 * Get the collision footprint of a placed object.
 *   circle    → { type: "circle", cx, cy, r }
 *   rectangle → { type: "polygon", corners: [...] }
 */
export function getFootprint(definition, transform) {
  const dims = normalizeDims(definition);
  const cx = transform.x ?? 0;
  const cy = transform.y ?? 0;
  const rotation = transform.rotation ?? 0;
  if (dims.shape === "circle") {
    return { type: "circle", cx, cy, r: dims.radius, shape: "circle", dims };
  }
  return {
    type: "polygon",
    shape: "rectangle",
    corners: getRectangleCorners({ x: cx, y: cy }, dims, rotation),
    dims,
  };
}

/**
 * Axis-aligned bounding box of a footprint (in world meters).
 */
export function getFootprintBounds(footprint) {
  if (footprint.type === "circle") {
    return {
      minX: footprint.cx - footprint.r,
      minY: footprint.cy - footprint.r,
      maxX: footprint.cx + footprint.r,
      maxY: footprint.cy + footprint.r,
    };
  }
  const xs = footprint.corners.map((c) => c.x);
  const ys = footprint.corners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

// ── Collision (SAT + circle) ────────────────────────────────────────────

/** Project a polygon onto an axis; returns [min, max]. */
function projectPolygon(corners, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const c of corners) {
    const p = c.x * axis.x + c.y * axis.y;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

/** Perpendicular normal of each polygon edge. */
function polygonAxes(corners) {
  const axes = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const edge = { x: b.x - a.x, y: b.y - a.y };
    const len = Math.hypot(edge.x, edge.y) || 1;
    axes.push({ x: -edge.y / len, y: edge.x / len });
  }
  return axes;
}

/** True if two convex polygons OVERLAP (area > epsilon); touching is allowed. */
function polygonsOverlap(a, b) {
  const cornersA = a;
  const cornersB = b;
  const axes = [...polygonAxes(cornersA), ...polygonAxes(cornersB)];
  for (const axis of axes) {
    const [aMin, aMax] = projectPolygon(cornersA, axis);
    const [bMin, bMax] = projectPolygon(cornersB, axis);
    if (aMax <= bMin + EPS || bMax <= aMin + EPS) {
      return false; // separated on this axis
    }
  }
  return true; // overlap on every axis
}

/** Circle vs convex polygon overlap (touching allowed, overlap rejected). */
function circlePolygonOverlap(circle, corners) {
  const { cx, cy, r } = circle;
  // 1. If the circle center is inside the polygon → overlap.
  if (pointInPolygon({ x: cx, y: cy }, corners)) return true;

  // 2. Distance from center to each edge; if < r → overlap.
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const d = pointSegmentDistance(cx, cy, a.x, a.y, b.x, b.y);
    if (d < r - EPS) return true;
  }
  return false;
}

export function pointInPolygon(point, corners) {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    const intersect = (yi > point.y) !== (yj > point.y) &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

/**
 * Collision between two footprints. Touching (shared boundary) is allowed;
 * only true area overlap returns `true`.
 */
export function footprintsCollide(a, b) {
  if (a.type === "circle" && b.type === "circle") {
    const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    return dist < a.r + b.r - EPS;
  }
  if (a.type === "circle") {
    return circlePolygonOverlap(a, b.corners);
  }
  if (b.type === "circle") {
    return circlePolygonOverlap(b, a.corners);
  }
  return polygonsOverlap(a.corners, b.corners);
}

// ── Zone containment ────────────────────────────────────────────────────

/**
 * A zone is a rectangle {x, y, width, height} (top-left origin, meters).
 * Return true if `footprint` lies ENTIRELY inside the zone (touching the
 * boundary is allowed).
 */
export function footprintInsideZone(footprint, zone) {
  const bounds = getFootprintBounds(footprint);
  const zx2 = zone.x + zone.width;
  const zy2 = zone.y + zone.height;
  return (
    bounds.minX >= zone.x - EPS &&
    bounds.minY >= zone.y - EPS &&
    bounds.maxX <= zx2 + EPS &&
    bounds.maxY <= zy2 + EPS
  );
}

/**
 * True if two axis-aligned rectangles OVERLAP (zones must not overlap,
 * so touching/sharing a boundary is allowed).
 */
export function rectsOverlap(a, b) {
  return !(
    a.x + a.width <= b.x + EPS ||
    b.x + b.width <= a.x + EPS ||
    a.y + a.height <= b.y + EPS ||
    b.y + b.height <= a.y + EPS
  );
}

// ── Group bounds ────────────────────────────────────────────────────────

/**
 * Axis-aligned bounds of a set of footprints; returns {minX,minY,maxX,maxY,center}.
 */
export function getGroupBounds(footprints) {
  if (!footprints.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, center: { x: 0, y: 0 } };
  const xs = [];
  const ys = [];
  for (const fp of footprints) {
    const b = getFootprintBounds(fp);
    xs.push(b.minX, b.maxX);
    ys.push(b.minY, b.maxY);
  }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } };
}

// ── Connection port helpers ─────────────────────────────────────────────

export const EDGES = ["north", "east", "south", "west"];

/**
 * The outward-facing unit normal for a rectangle edge (before rotation).
 *   north → (0,-1), east → (1,0), south → (0,1), west → (-1,0)
 */
export function edgeNormal(edge) {
  switch (edge) {
    case "north": return { x: 0, y: -1 };
    case "east": return { x: 1, y: 0 };
    case "south": return { x: 0, y: 1 };
    case "west": return { x: -1, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

/** Return the world-space midpoint of a rectangle edge for a placed object. */
export function edgeMidpoint(edge, center, dims, rotation = 0) {
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
  const rotated = rotatePointAround(local, { x: 0, y: 0 }, rotation);
  return { x: rotated.x + center.x, y: rotated.y + center.y };
}

// ─────────────────────────────────────────────────────────────────────────
// (Convenience: also export a single aggregated namespace-like default.)
// ─────────────────────────────────────────────────────────────────────────
export default {
  EPS,
  DEG_TO_RAD,
  RAD_TO_DEG,
  nearlyEqual,
  clamp,
  degToRad,
  radToDeg,
  snapToGrid,
  snapPointToGrid,
  rotatePoint,
  rotatePointAround,
  rotatePoints,
  normalizeDims,
  getRectangleCorners,
  getFootprint,
  getFootprintBounds,
  footprintsCollide,
  pointInPolygon,
  footprintInsideZone,
  rectsOverlap,
  getGroupBounds,
  edgeNormal,
  edgeMidpoint,
};