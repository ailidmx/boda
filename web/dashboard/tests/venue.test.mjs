import assert from "node:assert/strict";
import test from "node:test";

import {
  areaCapacity,
  arrivalComparison,
  densitySqm,
  entryPlan,
  formatDuration,
  gateFitsAbreast,
  metersFromPixels,
  planVenue,
  seatingLayout,
  wallSeats,
} from "../src/venue/capacity.js";

// ── Areas and chairs ─────────────────────────────────────────────────────
test("standing capacity depends on the density", () => {
  assert.equal(densitySqm("cocktail"), 1);
  assert.equal(densitySqm("standing"), 0.7);
  assert.equal(densitySqm("nope"), 0.7);
  assert.equal(areaCapacity(270, 0.7), 385);
  assert.equal(areaCapacity(270, 1), 270);
  assert.equal(areaCapacity(0, 0.7), 0);
});

test("chair rows leave the aisle and use a walking pitch", () => {
  const layout = seatingLayout({
    widthM: 16,
    depthM: 17,
    seatWidthM: 0.55,
    rowPitchM: 0.85,
    aisleM: 1.2,
  });
  assert.equal(layout.seatsPerRow, 26); // (16 - 1.2) / 0.55
  assert.equal(layout.rows, 20); // 17 / 0.85
  assert.equal(layout.seats, 520);
  assert.equal(layout.usedWidthM, 14.3);
  assert.equal(layout.usedDepthM, 17);
});

test("150 seated need a modest block", () => {
  const layout = seatingLayout({ widthM: 8.25, depthM: 8.5, aisleM: 0 });
  assert.ok(layout.seats >= 150, `seats ${layout.seats}`);
});

// ── Wall ─────────────────────────────────────────────────────────────────
test("the wall seats one person every 0.55 m", () => {
  assert.deepEqual(wallSeats({ lengthM: 20 }), { perSide: 36, total: 36 });
  assert.deepEqual(wallSeats({ lengthM: 20, bothSides: true }), {
    perSide: 36,
    total: 72,
  });
  assert.deepEqual(wallSeats({ lengthM: 0 }), { perSide: 0, total: 0 });
});

// ── Gate ─────────────────────────────────────────────────────────────────
test("the gate only fits two abreast when it is wide enough", () => {
  assert.equal(gateFitsAbreast({ clearWidthM: 1.2, abreast: 1 }), true);
  assert.equal(gateFitsAbreast({ clearWidthM: 1.2, abreast: 2 }), true);
  assert.equal(gateFitsAbreast({ clearWidthM: 0.9, abreast: 2 }), false);
});

test("one by one and two by two take different times", () => {
  const single = entryPlan({ people: 150, mode: 1, secondsPerGroup: 5 });
  assert.equal(single.groups, 150);
  assert.equal(single.totalSeconds, 750);
  assert.equal(single.totalMinutes, 12.5);
  assert.equal(single.perMinute, 12);

  const pairs = entryPlan({ people: 150, mode: 2, secondsPerGroup: 7 });
  assert.equal(pairs.groups, 75);
  assert.equal(pairs.totalSeconds, 525);
  assert.equal(pairs.totalMinutes, 8.75);
});

test("the arrival window decides whether a queue forms", () => {
  const fast = arrivalComparison({ people: 150, windowMinutes: 30, perMinute: 12 });
  assert.equal(fast.arrivalRate, 5);
  assert.equal(fast.clears, true);

  const burst = arrivalComparison({ people: 150, windowMinutes: 10, perMinute: 12 });
  assert.equal(burst.arrivalRate, 15);
  assert.equal(burst.clears, false);
});

test("durations read like a human wrote them", () => {
  assert.equal(formatDuration(12.5), "12.5 min");
  assert.equal(formatDuration(60), "1 h 00 min");
  assert.equal(formatDuration(65), "1 h 05 min");
});

// ── Map calibration ──────────────────────────────────────────────────────
test("50 ft on the map becomes meters", () => {
  // The screenshot's scale bar: ~210 px for 50 ft (15.24 m).
  assert.ok(Math.abs(metersFromPixels({ pixels: 210, referencePixels: 210, referenceMeters: 15.24 }) - 15.24) < 1e-9);
  assert.ok(Math.abs(metersFromPixels({ pixels: 105, referencePixels: 210, referenceMeters: 15.24 }) - 7.62) < 1e-9);
  assert.equal(metersFromPixels({ pixels: 0, referencePixels: 210, referenceMeters: 15.24 }), 0);
});

// ── Whole plan ───────────────────────────────────────────────────────────
test("150 people fit standing and seated on a 16 × 17 m terrace", () => {
  const plan = planVenue({ widthM: 16, depthM: 17, wallLengthM: 20, people: 150 });
  assert.equal(plan.areaSqm, 272);
  assert.equal(plan.standing, 388);
  assert.equal(plan.fitsStanding, true);
  assert.equal(plan.seatsTotal, 556); // 520 chairs + 36 wall
  assert.equal(plan.fitsSeated, true);
  assert.equal(plan.gate.twoFits, true);
  assert.ok(plan.entry.oneByOne.totalMinutes > 10);
});

test("a tight space reports honestly what does not fit", () => {
  const plan = planVenue({
    widthM: 8,
    depthM: 9,
    wallLengthM: 0,
    people: 150,
    densityId: "cocktail",
  });
  assert.equal(plan.areaSqm, 72);
  assert.equal(plan.standing, 72);
  assert.equal(plan.fitsStanding, false);
  assert.equal(plan.seatsTotal, 120); // 12 per row × 10 rows
  assert.equal(plan.fitsSeated, false);
});
