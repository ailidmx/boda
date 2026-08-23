// ─────────────────────────────────────────────────────────────────────────
// viewport.js — camera transform (world meters ↔ screen pixels).
//
// Rendering maps world → screen via:  screen = (world - pan) * pxPerMeter.
// Zoom modifies ONLY the viewport (pxPerMeter + pan), never world geometry.
// The same plan stays geometrically correct at any screen size / zoom.
//
// This module is PURE (no DOM): it just computes. The editor owns the mutable
// camera state (pan/zoom) as TRANSIENT editor state.
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param {object} camera { pxPerMeter, panX, panY } — pan in WORLD meters.
 */
export function worldToScreen(point, camera) {
  return {
    x: (point.x - camera.panX) * camera.pxPerMeter,
    y: (point.y - camera.panY) * camera.pxPerMeter,
  };
}

export function screenToWorld(point, camera) {
  return {
    x: point.x / camera.pxPerMeter + camera.panX,
    y: point.y / camera.pxPerMeter + camera.panY,
  };
}

/**
 * Adaptive grid density from zoom level (pxPerMeter). Returns
 * { major, minor } step sizes in meters.
 *
 *   far    → 2 m major / 1 m minor
 *   normal → 1 m major / 0.5 m minor
 *   close  → 1 m major / 0.25 m minor
 */
export function gridSteps(pxPerMeter) {
  if (pxPerMeter <= 14) return { major: 2, minor: 1 };
  if (pxPerMeter <= 30) return { major: 1, minor: 0.5 };
  return { major: 1, minor: 0.25 };
}

/**
 * Recommended editor settings defaults (meters).
 */
export const EDITOR_DEFAULTS = {
  snap: 0.25,
  fineSnap: 0.1,
  coarseSnap: 0.5,
  minZoom: 6,
  maxZoom: 120,
  defaultPxPerMeter: 20,
  connectionThreshold: 0.25,
};

/**
 * Clamp / normalize a zoom value to the allowed range.
 */
export function clampZoom(pxPerMeter, min = EDITOR_DEFAULTS.minZoom, max = EDITOR_DEFAULTS.maxZoom) {
  return Math.max(min, Math.min(max, pxPerMeter));
}

/**
 * Zoom toward a screen anchor point (keeps the world point under the cursor
 * stationary). Returns a new camera.
 */
export function zoomAt(camera, pxPerMeter, anchorScreen) {
  const worldAnchor = screenToWorld(anchorScreen, camera);
  const next = clampZoom(pxPerMeter);
  return {
    pxPerMeter: next,
    panX: worldAnchor.x - anchorScreen.x / next,
    panY: worldAnchor.y - anchorScreen.y / next,
  };
}

/**
 * Pan the camera by a SCREEN delta (pixels).
 */
export function panByScreen(camera, dx, dy) {
  return {
    pxPerMeter: camera.pxPerMeter,
    panX: camera.panX - dx / camera.pxPerMeter,
    panY: camera.panY - dy / camera.pxPerMeter,
  };
}

export default {
  worldToScreen,
  screenToWorld,
  gridSteps,
  EDITOR_DEFAULTS,
  clampZoom,
  zoomAt,
  panByScreen,
};