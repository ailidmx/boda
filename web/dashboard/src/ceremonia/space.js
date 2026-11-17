/**
 * Real space around EL FARO (Jocotepec), taken from the couple's Google Maps
 * measurement. Pure data + geometry, no DOM.
 *
 * Source: Maps polygon 1,967.99 ft² = 182.83 m² and 168.10 ft = 51.24 m of
 * perimeter. Vertices were read from the capture, calibrated with the 50 ft
 * scale bar (≈9.05 px/m), re-centred on the tower and rotated so the tower is
 * UP (east, as the couple asked). Sanity check in the tests: recomputing the
 * area/perimeter of these points reproduces the Maps numbers within ~1 %.
 */

/** Vertices in meters: u = right, v = down, tower at (0, 0). */
export const TERRACE_POLYGON = [
  [-7.73, 7.18],
  [-5.75, -1.66],
  [1.1, -6.3],
  [6.85, 0.99],
  [3.31, 11.6],
  [-2.76, 12.49],
];

/** Values reported by Google Maps for that polygon (source of truth). */
export const MAPS_AREA_M2 = 182.83;
export const MAPS_PERIMETER_M = 51.24;

/** Tower footprint diameter measured on the map (meters). */
export const TOWER_DIAMETER_M = 3.5;

/** The dance circle the couple measured: 10 m across. */
export const DANCE_DIAMETER_M = 10;

/** Area (m²) and perimeter (m) of a closed polygon. */
export function polygonMetrics(points = []) {
  let twiceArea = 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twiceArea += x1 * y2 - x2 * y1;
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }
  return { area: Math.abs(twiceArea) / 2, perimeter };
}

/** Area centroid (not the average of vertices). */
export function polygonCentroid(points = []) {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (!twiceArea) return { x: 0, y: 0 };
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

/**
 * Fit the polygon into a `width × height` box: meters → viewBox units.
 * Returns the scale (px per meter) and the offset of the origin.
 */
export function fitTransform(points, width, height, padding = 16) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(0.001, maxX - minX);
  const spanY = Math.max(0.001, maxY - minY);
  const scale = Math.min(
    (width - padding * 2) / spanX,
    (height - padding * 2) / spanY,
  );
  const offsetX = (width - spanX * scale) / 2 - minX * scale;
  const offsetY = (height - spanY * scale) / 2 - minY * scale;
  return { scale, offsetX, offsetY };
}
