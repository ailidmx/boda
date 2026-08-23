import assert from "node:assert/strict";
import test from "node:test";

import {
  snapToGrid,
  rotatePoint,
  getFootprint,
  getFootprintBounds,
  footprintsCollide,
  footprintInsideZone,
  rectsOverlap,
} from "../src/spatial/geometry.js";

import {
  roundSeatAnchors,
  rectSeatAnchors,
  estimateCapacity,
  resolveSeatCount,
} from "../src/spatial/seating.js";

import {
  SYSTEM_DEFINITIONS,
  isSystemDefinition,
  canDeleteDefinition,
  canEditDefinition,
  isStructuralChange,
} from "../src/spatial/catalog.js";

import {
  connectionPorts,
  findMagneticConnection,
  blockedSeatIds,
  deriveSeatStates,
} from "../src/spatial/connections.js";

import { translateGroup, rotateGroup } from "../src/spatial/groups.js";

import {
  createPlan,
  reducePlan,
  computeDragCandidate,
  findFreePosition,
} from "../src/spatial/editor-state.js";

import { createHistory } from "../src/spatial/history.js";

import { worldToScreen, screenToWorld, gridSteps } from "../src/spatial/viewport.js";

// ── Grid snapping ────────────────────────────────────────────────────────
test("snapToGrid snaps 12.37 → 12.25", () => {
  assert.equal(snapToGrid(12.37, 0.25), 12.25);
});

test("snapToGrid snaps negative + fine step", () => {
  assert.equal(snapToGrid(3.96, 0.1), 4.0);
  assert.equal(snapToGrid(-2.13, 0.5), -2.0);
});

// ── Round seat generation ────────────────────────────────────────────────
test("round table: 10 seats → 36° spacing, first at top", () => {
  const anchors = roundSeatAnchors(10, { radius: 0.9, seatRadius: 1.25, startAngle: -90 });
  assert.equal(anchors.length, 10);
  assert.equal(anchors[0].angle, -90);
  assert.equal(anchors[1].angle, -90 + 36);
  // First seat points "north" (top): x ≈ 0, y negative.
  assert.ok(Math.abs(anchors[0].x) < 1e-9);
  assert.ok(anchors[0].y < 0);
});

test("round table: seat ids are deterministic", () => {
  const a = roundSeatAnchors(10);
  const b = roundSeatAnchors(10);
  assert.deepEqual(a.map((s) => s.id), b.map((s) => s.id));
});

// ── Rectangular seat generation ─────────────────────────────────────────
test("rect table: seats distributed along edges with corner margins", () => {
  // 2.4 m × 0.9 m, 6 seats, north+south edges.
  const anchors = rectSeatAnchors({ width: 2.4, height: 0.9 }, 6, {
    enabledEdges: ["north", "south"],
  });
  assert.equal(anchors.length, 6);
  // North seats have y < 0, south seats y > 0.
  const north = anchors.filter((a) => a.edge === "north");
  const south = anchors.filter((a) => a.edge === "south");
  assert.ok(north.length > 0 && south.length > 0);
  // No seat sits at the extreme corner: |x| never reaches half-width.
  for (const a of [...north, ...south]) {
    assert.ok(Math.abs(a.x) < 1.2 + 1e-6);
  }
});

test("rect table: seats avoid corners (margin respected)", () => {
  const anchors = rectSeatAnchors({ width: 2.4, height: 0.9 }, 20, {
    enabledEdges: ["north", "south"],
  });
  for (const a of anchors) {
    assert.ok(Math.abs(a.x) <= 1.2 - 0.3 + 1e-6);
  }
});

// ── Capacity estimation ──────────────────────────────────────────────────
test("circle capacity from circumference", () => {
  // radius 0.9 → seatRadius 1.25 → C ≈ 7.85 / 0.6 ≈ 13
  const cap = estimateCapacity({ shape: "circle", radius: 0.9 });
  assert.ok(cap >= 12 && cap <= 14);
});

test("fixed seat count wins over auto", () => {
  const def = { shape: "circle", radius: 0.9, seating: { mode: "fixed", seatCount: 10 } };
  assert.equal(resolveSeatCount(def), 10);
});

// ── Rotation ─────────────────────────────────────────────────────────────
test("rotatePoint rotates 90° around origin", () => {
  const p = rotatePoint(1, 0, 0, 0, 90);
  assert.ok(Math.abs(p.x) < 1e-9);
  assert.ok(Math.abs(p.y - 1) < 1e-9);
});

test("rotated rectangle corners form correct footprint", () => {
  const fp = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 10, y: 10, rotation: 90 });
  const b = getFootprintBounds(fp);
  // After 90°, the 2.4 m side is now vertical; bounding box ≈ 0.9 wide × 2.4 tall.
  assert.ok(Math.abs((b.maxX - b.minX) - 0.9) < 1e-6);
  assert.ok(Math.abs((b.maxY - b.minY) - 2.4) < 1e-6);
});

// ── Collision ────────────────────────────────────────────────────────────
const roundDef = { shape: "circle", diameter: 1.8 };

test("collision: overlap rejected (round tables)", () => {
  const a = getFootprint(roundDef, { x: 0, y: 0 });
  const b = getFootprint(roundDef, { x: 1.0, y: 0 }); // centers 1 m apart, radii 0.9 → overlap
  assert.equal(footprintsCollide(a, b), true);
});

test("collision: touching allowed (round tables flush)", () => {
  const a = getFootprint(roundDef, { x: 0, y: 0 });
  const b = getFootprint(roundDef, { x: 1.8, y: 0 }); // exactly tangent
  assert.equal(footprintsCollide(a, b), false);
});

test("collision: rectangle overlap rejected", () => {
  const a = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 0, y: 0 });
  const b = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 1.0, y: 0 });
  assert.equal(footprintsCollide(a, b), true);
});

test("collision: connected flush edge accepted (rectangles touching)", () => {
  // A east edge at x=1.2; B west edge at x=1.2 → flush, no overlap.
  const a = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 0, y: 0 });
  const b = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 2.4, y: 0 });
  assert.equal(footprintsCollide(a, b), false);
});

test("collision: circle vs rectangle overlap", () => {
  const circle = getFootprint(roundDef, { x: 0, y: 0 });
  const rect = getFootprint({ shape: "rectangle", width: 2.4, height: 0.9 }, { x: 0.3, y: 0 });
  assert.equal(footprintsCollide(circle, rect), true);
});

// ── Zone containment ─────────────────────────────────────────────────────
const zone = { x: 0, y: 0, width: 30, height: 30 };

test("zone containment: valid inside", () => {
  const fp = getFootprint(roundDef, { x: 5, y: 5 });
  assert.equal(footprintInsideZone(fp, zone), true);
});

test("zone containment: boundary crossing rejected", () => {
  const fp = getFootprint(roundDef, { x: 29.5, y: 5 }); // radius 0.9 → extends past x=30
  assert.equal(footprintInsideZone(fp, zone), false);
});

test("zones overlap detection", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 5, height: 5 }, { x: 5, y: 0, width: 5, height: 5 }), false);
});

// ── Connections ──────────────────────────────────────────────────────────
const rectDef = SYSTEM_DEFINITIONS.find((d) => d.id === "sys-table-rect");

test("connection ports only when enabled", () => {
  assert.deepEqual(connectionPorts(rectDef), ["north", "east", "south", "west"]);
  assert.deepEqual(connectionPorts(SYSTEM_DEFINITIONS[0]), []);
});

test("magnetic connection: east-west flush engages", () => {
  // B (static) sits at x=2.4, so its WEST edge midpoint is at x=1.2.
  // A (moving) approaches with its EAST edge near x=1.2 → center ≈ 0.
  const b = { x: 2.4, y: 0, rotation: 0 };
  const conn = findMagneticConnection({
    movingDefinition: rectDef,
    movingTransform: { x: 0.15, y: 0, rotation: 0 },
    staticDefinition: rectDef,
    staticTransform: b,
    staticId: "B",
    threshold: 0.25,
  });
  assert.ok(conn);
  assert.equal(conn.staticId, "B");
  // Snap flushes A's east edge against B's west edge → A center x = 0.
  assert.ok(Math.abs(conn.snappedTransform.x - 0) < 1e-6);
});

test("magnetic connection: gap beyond threshold does NOT engage", () => {
  const conn = findMagneticConnection({
    movingDefinition: rectDef,
    movingTransform: { x: 2.0, y: 0, rotation: 0 },
    staticDefinition: rectDef,
    staticTransform: { x: 2.4, y: 0, rotation: 0 },
    staticId: "B",
    threshold: 0.25,
  });
  // moving east edge midpoint ≈ 2.0+1.2=3.2, static west ≈ 1.2 → dist 2.0 > 0.25 → null
  assert.equal(conn, null);
});

test("blocked seats: connected edge blocks, disconnect restores", () => {
  // A square table so all four edges hold seats (8 seats → 2 per edge).
  const anchors = rectSeatAnchors({ width: 1.4, height: 1.4 }, 8, {
    enabledEdges: ["north", "south", "east", "west"],
  });
  const eastSeat = anchors.find((s) => s.edge === "east");
  const westSeat = anchors.find((s) => s.edge === "west");
  assert.ok(eastSeat && westSeat);

  const connections = [
    { id: "c1", objectAId: "A", portA: "east", objectBId: "B", portB: "west" },
  ];
  const blockedA = blockedSeatIds(anchors, connections, "A");
  const blockedB = blockedSeatIds(anchors, connections, "B");
  assert.ok(blockedA.has(eastSeat.id));
  assert.ok(blockedB.has(westSeat.id));
  // No connections → no blocked seats.
  assert.equal(blockedSeatIds(anchors, [], "A").size, 0);
});

test("deriveSeatStates flags blockedByConnection", () => {
  const anchors = rectSeatAnchors({ width: 2.4, height: 0.9 }, 4, { enabledEdges: ["north", "south", "east", "west"] });
  const states = deriveSeatStates(anchors, new Set(["north"]));
  const north = states.filter((s) => s.edge === "north" && s.state === "blockedByConnection");
  const south = states.filter((s) => s.edge === "south" && s.state === "available");
  assert.ok(north.length > 0);
  assert.equal(south.length, states.filter((s) => s.edge === "south").length);
});

// ── Group transforms ─────────────────────────────────────────────────────
test("group translate preserves relative layout", () => {
  const members = [
    { id: "a", transform: { x: 0, y: 0, rotation: 0 } },
    { id: "b", transform: { x: 3, y: 0, rotation: 0 } },
  ];
  const out = translateGroup(members, 5, 2);
  assert.deepEqual(out.a, { x: 5, y: 2, rotation: 0 });
  assert.deepEqual(out.b, { x: 8, y: 2, rotation: 0 });
});

test("group rotation preserves relative layout (90°)", () => {
  const members = [
    { id: "a", transform: { x: 0, y: 0, rotation: 0 } },
    { id: "b", transform: { x: 3, y: 0, rotation: 0 } },
  ];
  const out = rotateGroup(members, { x: 0, y: 0 }, 90);
  // a stays at origin (rotated), b rotates to (0,3).
  assert.ok(Math.abs(out.b.x) < 1e-9 && Math.abs(out.b.y - 3) < 1e-9);
  assert.equal(out.b.rotation, 90);
});

// ── Editor state / history ───────────────────────────────────────────────
function seededPlan() {
  const plan = createPlan();
  plan.definitions = [
    SYSTEM_DEFINITIONS[0], // round
    rectDef,
  ];
  plan.instances = [
    { id: "a", definitionId: "sys-table-round-10", zoneId: "main", transform: { x: 5, y: 5, rotation: 0 } },
    { id: "b", definitionId: "sys-table-rect", zoneId: "main", transform: { x: 10, y: 5, rotation: 0 } },
  ];
  return plan;
}

test("MOVE_INSTANCES: one drag → one action → one position", () => {
  const plan = seededPlan();
  const next = reducePlan(plan, {
    type: "MOVE_INSTANCES",
    moves: [{ id: "b", transform: { x: 15, y: 5, rotation: 0 } }],
  });
  assert.equal(next.instances.find((i) => i.id === "b").transform.x, 15);
  assert.equal(next.instances.find((i) => i.id === "a").transform.x, 5);
});

test("MOVE_INSTANCES: collision is rejected atomically", () => {
  const plan = seededPlan();
  const next = reducePlan(plan, {
    type: "MOVE_INSTANCES",
    moves: [{ id: "b", transform: { x: 5.4, y: 5, rotation: 0 } }], // overlaps round table at x=5
  });
  // Rejected → unchanged.
  assert.equal(next.instances.find((i) => i.id === "b").transform.x, 10);
});

test("MOVE_INSTANCES: outside-zone is rejected", () => {
  const plan = seededPlan();
  const next = reducePlan(plan, {
    type: "MOVE_INSTANCES",
    moves: [{ id: "b", transform: { x: 29.6, y: 5, rotation: 0 } }], // 2.4 wide → extends past x=30
  });
  assert.equal(next.instances.find((i) => i.id === "b").transform.x, 10);
});

test("computeDragCandidate snaps to grid by default", () => {
  const plan = seededPlan();
  const cand = computeDragCandidate(plan, plan.instances[1], { x: 12.37, y: 7.13, rotation: 0 }, 0.25);
  assert.equal(cand.transform.x, 12.25);
  assert.equal(cand.transform.y, 7.25);
});

test("UPDATE_VENUE resizes the venue + main zone around its center", () => {
  const plan = seededPlan(); // main zone 30×30 from x=0,y=0 → center 15,15
  const next = reducePlan(plan, { type: "UPDATE_VENUE", width: 46, height: 26 });
  assert.deepEqual(next.venue, { width: 46, height: 26 });
  // New main zone centered on the old center (15,15): x = 15-23 = -8, y = 15-13 = 2
  assert.equal(next.zones[0].width, 46);
  assert.equal(next.zones[0].height, 26);
  assert.equal(next.zones[0].x, -8);
  assert.equal(next.zones[0].y, 2);
});

test("UPDATE_VENUE rejects non-positive dims", () => {
  const plan = seededPlan();
  assert.equal(reducePlan(plan, { type: "UPDATE_VENUE", width: 0, height: 10 }), plan);
});

test("findFreePosition returns a collision-free, in-zone transform", () => {
  const plan = createPlan();
  plan.definitions = [SYSTEM_DEFINITIONS[0]]; // round table
  // One placed round table at the zone's top-left.
  plan.instances = [
    { id: "a", definitionId: "sys-table-round-10", zoneId: "main", transform: { x: 0.9, y: 0.9, rotation: 0 } },
  ];
  const unplaced = { id: "b", definitionId: "sys-table-round-10", zoneId: "main", transform: { x: 0, y: 0, rotation: 0 }, unplaced: true };

  const pos = findFreePosition(plan, unplaced);
  assert.ok(pos, "should find a free position");
  // Directly assert no collision with the placed table.
  const dist = Math.hypot(pos.x - 0.9, pos.y - 0.9);
  assert.ok(dist >= 1.8, `must not overlap the placed round table (min 1.8 m gap, got ${dist})`);
});

test("findFreePosition returns null when instance missing definition", () => {
  const plan = createPlan();
  const inst = { id: "x", definitionId: "nope", zoneId: "main", transform: { x: 0, y: 0, rotation: 0 }, unplaced: true };
  assert.equal(findFreePosition(plan, inst), null);
});

test("history: one drag → one undo → restore → redo reapplies", () => {
  const plan = seededPlan();
  const h = createHistory();
  const action = { type: "MOVE_INSTANCES", moves: [{ id: "b", transform: { x: 15, y: 5, rotation: 0 } }] };
  const moved = reducePlan(plan, action);
  h.commit(plan, action);

  const undo = h.undo();
  assert.ok(undo);
  const undone = reducePlan(moved, undo.action);
  assert.equal(undone.instances.find((i) => i.id === "b").transform.x, 10);

  const redo = h.redo();
  assert.ok(redo);
  const redone = reducePlan(undone, redo.action);
  assert.equal(redone.instances.find((i) => i.id === "b").transform.x, 15);
});

test("REORDER_INSTANCES moves an instance up/down in the list", () => {
  const plan = seededPlan(); // [a, b]
  const movedUp = reducePlan(plan, { type: "REORDER_INSTANCES", id: "b", dir: "up" });
  assert.deepEqual(movedUp.instances.map((i) => i.id), ["b", "a"]);

  const movedDown = reducePlan(movedUp, { type: "REORDER_INSTANCES", id: "b", dir: "down" });
  assert.deepEqual(movedDown.instances.map((i) => i.id), ["a", "b"]);
});

test("REORDER_INSTANCES clamps at boundaries", () => {
  const plan = seededPlan(); // [a, b]
  const top = reducePlan(plan, { type: "REORDER_INSTANCES", id: "a", dir: "up" });
  assert.equal(top, plan, "moving top instance up is a no-op");

  const bottom = reducePlan(plan, { type: "REORDER_INSTANCES", id: "b", dir: "down" });
  assert.equal(bottom, plan, "moving bottom instance down is a no-op");
});

test("MOVE_GUEST swaps guests when target seat is occupied", () => {
  const plan = seededPlan();
  const assigned = reducePlan(plan, { type: "ASSIGN_GUEST", instanceId: "a", seatId: "seat-0", guestId: "g1" });
  const assigned2 = reducePlan(assigned, { type: "ASSIGN_GUEST", instanceId: "a", seatId: "seat-1", guestId: "g2" });
  const moved = reducePlan(assigned2, {
    type: "MOVE_GUEST",
    fromInstanceId: "a", fromSeatId: "seat-0",
    toInstanceId: "a", toSeatId: "seat-1",
    guestId: "g1",
  });
  // g1 is now in seat-1, and g2 (the displaced guest) is back in seat-0.
  assert.equal(moved.guestAssignments.a["seat-1"], "g1");
  assert.equal(moved.guestAssignments.a["seat-0"], "g2");
});

test("history: guest assignment undo works", () => {
  const plan = seededPlan();
  const h = createHistory();
  const action = { type: "ASSIGN_GUEST", instanceId: "a", seatId: "seat-0", guestId: "guest-1" };
  const assigned = reducePlan(plan, action);
  h.commit(plan, action);
  const undo = h.undo();
  const undone = reducePlan(assigned, undo.action);
  assert.equal(undone.guestAssignments.a?.["seat-0"], undefined);
});

// ── Catalog guards ───────────────────────────────────────────────────────
test("system definitions are immutable + undeletable", () => {
  const sys = SYSTEM_DEFINITIONS[0];
  assert.equal(isSystemDefinition(sys), true);
  assert.deepEqual(canDeleteDefinition(sys, []), { canDelete: false, reason: "system", usage: 0 });
  assert.deepEqual(canEditDefinition(sys, []), { canEdit: false, reason: "system", usage: 0 });
});

test("custom definition in use cannot be deleted", () => {
  const def = { id: "custom-1", origin: "custom", shape: "circle", diameter: 2 };
  const instances = [{ id: "i1", definitionId: "custom-1" }];
  assert.deepEqual(canDeleteDefinition(def, instances), { canDelete: false, reason: "in-use", usage: 1 });
});

test("used custom definition editable but destructive", () => {
  const def = { id: "custom-1", origin: "custom", shape: "circle", diameter: 2 };
  const instances = [{ id: "i1", definitionId: "custom-1" }];
  assert.deepEqual(canEditDefinition(def, instances), { canEdit: true, destructive: true, usage: 1 });
});

test("structural change detection", () => {
  const a = { shape: "circle", width: 2, metadata: { description: "x" } };
  const b = { shape: "circle", width: 3, metadata: { description: "x" } };
  const c = { shape: "circle", width: 2, metadata: { description: "y" } };
  assert.equal(isStructuralChange(a, b), true);
  assert.equal(isStructuralChange(a, c), false);
});

// ── Viewport ─────────────────────────────────────────────────────────────
test("worldToScreen / screenToWorld round-trip", () => {
  const camera = { pxPerMeter: 20, panX: 2, panY: 3 };
  const world = { x: 12.5, y: 7.5 };
  const screen = worldToScreen(world, camera);
  const back = screenToWorld(screen, camera);
  assert.ok(Math.abs(back.x - world.x) < 1e-9);
  assert.ok(Math.abs(back.y - world.y) < 1e-9);
});

test("gridSteps adapt to zoom", () => {
  assert.deepEqual(gridSteps(10), { major: 2, minor: 1 });
  assert.deepEqual(gridSteps(20), { major: 1, minor: 0.5 });
  assert.deepEqual(gridSteps(40), { major: 1, minor: 0.25 });
});