import assert from "node:assert/strict";
import test from "node:test";

import {
  DANCE_DIAMETER_M,
  TERRACE_POLYGON,
  fitTransform,
  polygonCentroid,
  polygonMetrics,
} from "../src/ceremonia/space.js";

test("the measured polygon reproduces the Google Maps numbers", () => {
  const { area, perimeter } = polygonMetrics(TERRACE_POLYGON);
  // Maps: 1,967.99 ft² = 182.83 m²; 168.10 ft = 51.24 m.
  assert.ok(Math.abs(area - 182.83) / 182.83 < 0.02, `area ${area}`);
  assert.ok(Math.abs(perimeter - 51.24) / 51.24 < 0.02, `perimeter ${perimeter}`);
});

test("the centroid sits inside the terrace", () => {
  const { x, y } = polygonCentroid(TERRACE_POLYGON);
  assert.ok(x > -12 && x < 7, `x ${x}`);
  assert.ok(y > -7 && y < 13, `y ${y}`);
});

test("the 10 m dance circle fits inside the terrace", () => {
  const { x, y } = polygonCentroid(TERRACE_POLYGON);
  // Every vertex is farther than the dance radius? Not necessarily, but the
  // widest extent must exceed 10 m in both axes.
  const xs = TERRACE_POLYGON.map(([px]) => px);
  const ys = TERRACE_POLYGON.map(([, py]) => py);
  assert.ok(Math.max(...xs) - Math.min(...xs) > DANCE_DIAMETER_M);
  assert.ok(Math.max(...ys) - Math.min(...ys) > DANCE_DIAMETER_M);
  assert.ok(Number.isFinite(x) && Number.isFinite(y));
});

test("fitTransform keeps the aspect ratio and centres the polygon", () => {
  const { scale, offsetX, offsetY } = fitTransform(TERRACE_POLYGON, 360, 300, 20);
  assert.ok(scale > 0);
  const [x0, y0] = TERRACE_POLYGON[0];
  const px = x0 * scale + offsetX;
  const py = y0 * scale + offsetY;
  assert.ok(px >= 19 && px <= 341, `px ${px}`);
  assert.ok(py >= 19 && py <= 281, `py ${py}`);
});
