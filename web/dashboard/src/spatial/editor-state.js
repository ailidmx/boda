// ─────────────────────────────────────────────────────────────────────────
// editor-state.js — pure editor plan reducer.
//
// The PLAN state is the only persistent domain state. It is a single JSON-safe
// object (persisted as one Firestore document). Transient editor state
// (selection, drag preview, zoom/pan, history) lives OUTSIDE this module.
//
// Every action is a SEMANTIC command. A drag from A → B is ONE action
// (MOVE_INSTANCES) so it becomes ONE undo entry, not one per grid position.
//
// All functions are pure: they return a NEW plan (or null when rejected) and
// never mutate inputs. Persistence is handled by a thin repository layer,
// NOT here.
// ─────────────────────────────────────────────────────────────────────────

import {
  snapToGrid,
  footprintsCollide,
  footprintInsideZone,
  rectsOverlap,
  getFootprintBounds,
  getFootprint,
} from "./geometry.js";
import { normalizeDefinition, isSystemDefinition, definitionUsageCount } from "./catalog.js";
import { findMagneticConnection } from "./connections.js";
import { translateGroup, rotateGroup } from "./groups.js";

// ── Guards / helpers ────────────────────────────────────────────────────

export function createPlan({ id = "main", name = "Evento", width = 30, height = 30 } = {}) {
  return {
    id,
    name,
    venue: { width, height },
    zones: [{ id: "main", name: "Salón principal", x: 0, y: 0, width, height, locked: false, visible: true }],
    definitions: [],
    instances: [],
    groups: [],
    connections: [],
    guestAssignments: {}, // { [instanceId]: { [seatId]: guestId } }
  };
}

function upsertById(list, id, next) {
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return [...list, next];
  const copy = list.slice();
  copy[i] = next;
  return copy;
}

function removeById(list, id) {
  return list.filter((x) => x.id !== id);
}

export function findDefinition(plan, id) {
  return plan.definitions.find((d) => d.id === id);
}

export function findInstance(plan, id) {
  return plan.instances.find((i) => i.id === id);
}

/** Resolve a placed instance → its (normalized) definition. */
export function instanceDefinition(plan, instance) {
  const def = findDefinition(plan, instance.definitionId);
  return def ? normalizeDefinition(def) : null;
}

/** Footprint of an instance in world meters. */
export function instanceFootprint(plan, instance) {
  const def = instanceDefinition(plan, instance);
  if (!def) return null;
  return footprintOf(def, instance.transform);
}

function footprintOf(def, transform) {
  return getFootprint(def, transform);
}

// ── Seating (guest assignment) helpers ───────────────────────────────────

// Remove a guest from EVERY seat so each guest sits in exactly one seat.
// Returns a NEW guestAssignments map.
function purgeGuest(guestAssignments, guestId) {
  const next = {};
  for (const [iid, seats] of Object.entries(guestAssignments || {})) {
    const kept = { ...seats };
    for (const [sid, gid] of Object.entries(kept)) {
      if (gid === guestId) delete kept[sid];
    }
    if (Object.keys(kept).length) next[iid] = kept;
  }
  return next;
}

// ── Placement validation (collision + zone) ─────────────────────────────

/**
 * Is a candidate transform valid for an instance within a plan?
 * Returns { valid, reason? }.
 *   - must stay entirely inside its zone
 *   - must not overlap any OTHER instance (touching allowed)
 */
export function validatePlacement(plan, instance, candidateTransform) {
  const def = instanceDefinition(plan, instance);
  if (!def) return { valid: false, reason: "missing-definition" };

  const fp = footprintOf(def, candidateTransform);

  const zone = plan.zones.find((z) => z.id === instance.zoneId) || plan.zones[0];
  if (zone && !footprintInsideZone(fp, zone)) {
    return { valid: false, reason: "outside-zone" };
  }

  // Non-collidable objects (toldo, decor, stage) overlap freely — they occupy
  // different vertical space, so a non-collidable moving object ignores others.
  if (def.collidable === false) return { valid: true };

  for (const other of plan.instances) {
    if (other.id === instance.id) continue;
    // Unplaced instances don't occupy canvas space (they sit in the sidebar
    // "Mesas" list), so they never collide with a placed instance.
    if (other.unplaced) continue;
    const otherDef = instanceDefinition(plan, other);
    if (!otherDef) continue;
    // Also skip other non-collidable objects as obstacles.
    if (otherDef.collidable === false) continue;
    const otherFp = footprintOf(otherDef, other.transform);
    if (footprintsCollide(fp, otherFp)) {
      return { valid: false, reason: "collision", collidingWith: other.id };
    }
  }
  return { valid: true };
}

// ── Snapping candidate (used by the editor during drag) ─────────────────

/**
 * Compute the final candidate transform for a dragged instance:
 *   1. connection snap (strongest) if compatible object is within threshold
 *   2. grid snap (falls back)
 *
 * Returns { transform, connection?, gridStep }.
 */
export function computeDragCandidate(plan, instance, pointerWorld, gridStep = 0.25) {
  const def = instanceDefinition(plan, instance);
  if (!def) return { transform: pointerWorld };

  // 1. Connection snap — search other connectable instances.
  let best = null;
  for (const other of plan.instances) {
    if (other.id === instance.id) continue;
    const otherDef = instanceDefinition(plan, other);
    if (!otherDef) continue;
    const conn = findMagneticConnection({
      movingDefinition: def,
      movingTransform: pointerWorld,
      staticDefinition: otherDef,
      staticTransform: other.transform,
      staticId: other.id,
    });
    if (conn && (!best || conn.dist < best.dist)) best = conn;
  }

  if (best) {
    return {
      transform: best.snappedTransform,
      connection: {
        staticId: best.staticId,
        movingEdge: best.movingEdge,
        staticEdge: best.staticEdge,
      },
      gridStep,
    };
  }

  // 2. Grid snap.
  return {
    transform: {
      ...pointerWorld,
      x: snapToGrid(pointerWorld.x, gridStep),
      y: snapToGrid(pointerWorld.y, gridStep),
    },
    gridStep,
  };
}

/**
 * Find the first collision-free, in-zone position for an UNPLACED instance,
 * scanning the zone in a grid (top-left → bottom-right). Returns a transform or
 * null. Unplaced instances are ignored as obstacles (they hold no space yet).
 * @param {object} plan
 * @param {object} instance
 * @param {object} opts { step }
 */
export function findFreePosition(plan, instance, { step = 0.5 } = {}) {
  const def = instanceDefinition(plan, instance);
  if (!def) return null;
  const zone = plan.zones.find((z) => z.id === instance.zoneId) || plan.zones[0];
  if (!zone) return null;

  const fp = footprintOf(def, { x: zone.x, y: zone.y, rotation: instance.transform?.rotation || 0 });
  const bounds = getFootprintBounds(fp);
  const w = bounds.maxX - bounds.minX || 1;
  const h = bounds.maxY - bounds.minY || 1;

  const minX = zone.x + w / 2;
  const minY = zone.y + h / 2;
  const maxX = zone.x + zone.width - w / 2;
  const maxY = zone.y + zone.height - h / 2;

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const candidate = {
        ...instance.transform,
        x: snapToGrid(x, 0.25),
        y: snapToGrid(y, 0.25),
      };
      if (validatePlacement(plan, instance, candidate).valid) return candidate;
    }
  }
  // Fallback: the very first cell.
  const candidate = { ...instance.transform, x: minX, y: minY };
  return validatePlacement(plan, instance, candidate).valid ? candidate : null;
}

// ── Reducer ─────────────────────────────────────────────────────────────

/**
 * Apply a semantic action to the plan. Returns a NEW plan; throws on invalid.
 * @param {object} plan
 * @param {object} action { type, ...payload }
 */
export function reducePlan(plan, action) {
  switch (action.type) {
    case "REPLACE_PLAN":
      return action.plan;

    case "ADD_INSTANCE": {
      const { instance } = action;
      if (plan.instances.some((i) => i.id === instance.id)) return plan;
      return { ...plan, instances: [...plan.instances, instance] };
    }

    case "REMOVE_INSTANCE": {
      const { id } = action;
      const inst = plan.instances.find((i) => i.id === id);
      if (!inst) return plan;
      const instances = removeById(plan.instances, id);
      // Drop guest assignments on this instance, drop the instance from any group,
      // and drop any connections referencing it.
      const guestAssignments = { ...plan.guestAssignments };
      delete guestAssignments[id];
      const groups = plan.groups.map((g) => (g.objectIds.includes(id)
        ? { ...g, objectIds: g.objectIds.filter((x) => x !== id) } : g));
      const connections = plan.connections.filter((c) => c.objectAId !== id && c.objectBId !== id);
      return { ...plan, instances, groups, connections, guestAssignments };
    }

    case "MOVE_INSTANCES": {
      // ONE drag = ONE history entry. `moves` is [{ id, transform }].
      const moves = new Map(action.moves.map((m) => [m.id, m.transform]));
      // Validate ALL moves first (atomic: reject the whole drag if any invalid).
      for (const [id, transform] of moves) {
        const inst = plan.instances.find((i) => i.id === id);
        if (!inst) return plan;
        const validation = validatePlacement(plan, inst, transform);
        if (!validation.valid) return plan; // reject atomically
      }
      // Clear `unplaced` on moved instances (dropping an unplaced instance
      // onto the canvas "places" it).
      const instances = plan.instances.map((i) => {
        if (!moves.has(i.id)) return i;
        const next = { ...i, transform: moves.get(i.id) };
        if (next.unplaced) delete next.unplaced;
        return next;
      });
      return { ...plan, instances };
    }

    case "ROTATE_INSTANCE": {
      const { id, rotation } = action;
      const inst = plan.instances.find((i) => i.id === id);
      if (!inst) return plan;
      const def = instanceDefinition(plan, inst);
      if (def && !def.canRotate) return plan;
      const transform = { ...inst.transform, rotation };
      const validation = validatePlacement(plan, inst, transform);
      if (!validation.valid) return plan;
      return { ...plan, instances: upsertById(plan.instances, id, { ...inst, transform }) };
    }

    case "CONNECT": {
      const { connection } = action;
      const exists = plan.connections.some(
        (c) =>
          (c.objectAId === connection.objectAId && c.objectBId === connection.objectBId && c.portA === connection.portA) ||
          (c.objectAId === connection.objectBId && c.objectBId === connection.objectAId && c.portB === connection.portA),
      );
      if (exists) return plan;
      const id = connection.id || `conn-${connection.objectAId}-${connection.portA}-${connection.objectBId}-${connection.portB}`;
      return { ...plan, connections: [...plan.connections, { ...connection, id }] };
    }

    case "DISCONNECT": {
      const { id } = action;
      return { ...plan, connections: plan.connections.filter((c) => c.id !== id) };
    }

    case "GROUP": {
      const { id, objectIds, zoneId, name } = action;
      const groups = [...plan.groups, { id, zoneId, name: name || `Grupo ${plan.groups.length + 1}`, objectIds }];
      const instances = plan.instances.map((i) => (objectIds.includes(i.id) ? { ...i, groupId: id } : i));
      return { ...plan, groups, instances };
    }

    case "UNGROUP": {
      const { id } = action;
      const group = plan.groups.find((g) => g.id === id);
      if (!group) return plan;
      const groups = removeById(plan.groups, id);
      const instances = plan.instances.map((i) => (i.groupId === id ? { ...i, groupId: null } : i));
      return { ...plan, groups, instances };
    }

    case "MOVE_GROUP": {
      const { id, dx, dy } = action;
      const group = plan.groups.find((g) => g.id === id);
      if (!group) return plan;
      const members = plan.instances.filter((i) => group.objectIds.includes(i.id));
      const newTransforms = translateGroup(members, dx, dy);
      // Validate all member moves atomically.
      for (const m of members) {
        if (!validatePlacement(plan, m, newTransforms[m.id]).valid) return plan;
      }
      const instances = plan.instances.map((i) => (newTransforms[i.id] ? { ...i, transform: newTransforms[i.id] } : i));
      return { ...plan, instances };
    }

    case "ROTATE_GROUP": {
      const { id, deg } = action;
      const group = plan.groups.find((g) => g.id === id);
      if (!group) return plan;
      const members = plan.instances.filter((i) => group.objectIds.includes(i.id));
      const fpList = members.map((m) => instanceFootprint(plan, m)).filter(Boolean);
      const xs = [];
      const ys = [];
      for (const fp of fpList) {
        const b = getFootprintBounds(fp);
        xs.push(b.minX, b.maxX);
        ys.push(b.minY, b.maxY);
      }
      const p = fpList.length
        ? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
        : { x: 0, y: 0 };

      const newTransforms = rotateGroup(members, p, deg);
      for (const m of members) {
        if (!validatePlacement(plan, m, newTransforms[m.id]).valid) return plan;
      }
      const instances = plan.instances.map((i) => (newTransforms[i.id] ? { ...i, transform: newTransforms[i.id] } : i));
      return { ...plan, instances };
    }

    case "UPDATE_INSTANCE_META": {
      const { id, metadata } = action;
      const inst = plan.instances.find((i) => i.id === id);
      if (!inst) return plan;
      return {
        ...plan,
        instances: upsertById(plan.instances, id, { ...inst, metadata: { ...(inst.metadata || {}), ...metadata } }),
      };
    }

    case "REORDER_INSTANCES": {
      const { id, dir } = action;
      const idx = plan.instances.findIndex((i) => i.id === id);
      if (idx === -1) return plan;
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= plan.instances.length) return plan;
      const instances = plan.instances.slice();
      [instances[idx], instances[target]] = [instances[target], instances[idx]];
      return { ...plan, instances };
    }

    case "MOVE_INSTANCE_INDEX": {
      // Drag-and-drop reorder: move `id` to absolute `toIndex` (index in the
      // array AFTER the moved item has been removed).
      const { id, toIndex } = action;
      const from = plan.instances.findIndex((i) => i.id === id);
      if (from === -1) return plan;
      const instances = plan.instances.slice();
      const [moved] = instances.splice(from, 1);
      const clamped = Math.max(0, Math.min(toIndex, instances.length));
      instances.splice(clamped, 0, moved);
      return { ...plan, instances };
    }

    case "ASSIGN_GUEST": {
      const { instanceId, seatId, guestId } = action;
      if (guestId == null) return plan;
      // 1 guest = 1 seat: purge the guest from everywhere first, then place.
      const purged = purgeGuest(plan.guestAssignments, guestId);
      const assign = { ...(purged[instanceId] || {}) };
      assign[seatId] = guestId;
      return { ...plan, guestAssignments: { ...purged, [instanceId]: assign } };
    }

    case "UNASSIGN_GUEST": {
      const { instanceId, seatId } = action;
      const guestId = plan.guestAssignments?.[instanceId]?.[seatId];
      if (guestId === undefined) {
        // Seat is already empty — still clean the key defensively.
        const assign = { ...(plan.guestAssignments[instanceId] || {}) };
        delete assign[seatId];
        return { ...plan, guestAssignments: { ...plan.guestAssignments, [instanceId]: assign } };
      }
      // 1 guest = 1 seat: unassigning a guest removes them from EVERY seat.
      // This also repairs legacy duplicate assignments (a guest can only sit once).
      return { ...plan, guestAssignments: purgeGuest(plan.guestAssignments, guestId) };
    }

    case "DEDUPE_GUESTS": {
      // Repair action: keep only the FIRST seat per guest, drop later duplicates.
      const next = {};
      const seen = new Set();
      for (const [iid, seats] of Object.entries(plan.guestAssignments || {})) {
        const kept = {};
        for (const [sid, gid] of Object.entries(seats)) {
          if (gid == null || seen.has(gid)) continue;
          seen.add(gid);
          kept[sid] = gid;
        }
        if (Object.keys(kept).length) next[iid] = kept;
      }
      return { ...plan, guestAssignments: next };
    }

    case "MOVE_GUEST": {
      const { fromInstanceId, fromSeatId, toInstanceId, toSeatId, guestId } = action;
      const fromSeat = plan.guestAssignments?.[fromInstanceId]?.[fromSeatId];
      const movedGuest = guestId ?? fromSeat;
      if (movedGuest === undefined) return plan;
      if (fromInstanceId === toInstanceId && fromSeatId === toSeatId) return plan;

      // Unique seating: purge the moved guest from wherever they currently sit.
      const guestAssignments = purgeGuest(plan.guestAssignments, movedGuest);

      if (fromInstanceId === toInstanceId) {
        // Same table: SWAP within the one map.
        const from = { ...(guestAssignments[fromInstanceId] || {}) };
        const targetGuest = from[toSeatId];
        from[fromSeatId] = targetGuest !== undefined && targetGuest !== movedGuest ? targetGuest : undefined;
        from[toSeatId] = movedGuest;
        if (from[fromSeatId] === undefined) delete from[fromSeatId];
        guestAssignments[fromInstanceId] = from;
        return { ...plan, guestAssignments };
      }

      // Cross table: SWAP the displaced guest back to the source seat so no
      // guest is silently dropped.
      const from = { ...(guestAssignments[fromInstanceId] || {}) };
      const to = { ...(guestAssignments[toInstanceId] || {}) };
      const targetGuest = to[toSeatId]; // may be undefined (empty slot)
      delete from[fromSeatId];
      to[toSeatId] = movedGuest;
      if (targetGuest !== undefined && targetGuest !== movedGuest) {
        from[fromSeatId] = targetGuest;
      }
      guestAssignments[fromInstanceId] = from;
      guestAssignments[toInstanceId] = to;
      return { ...plan, guestAssignments };
    }

    case "ADD_DEFINITION": {
      const { definition } = action;
      if (plan.definitions.some((d) => d.id === definition.id)) return plan;
      return { ...plan, definitions: [...plan.definitions, definition] };
    }

    case "UPDATE_DEFINITION": {
      const { id, definition } = action;
      const before = plan.definitions.find((d) => d.id === id);
      if (!before) return plan;
      // Built-in catalog objects are now editable (geometry is locked in the UI
      // while in use, but style/collision/name may change at any time).
      return { ...plan, definitions: upsertById(plan.definitions, id, { ...before, ...definition }) };
    }

    case "DELETE_DEFINITION": {
      const { id } = action;
      const def = plan.definitions.find((d) => d.id === id);
      if (!def) return plan;
      if (isSystemDefinition(def)) return plan;
      if (definitionUsageCount(plan.instances, id) > 0) return plan; // in use
      return { ...plan, definitions: removeById(plan.definitions, id) };
    }

    case "ADD_ZONE": {
      const { zone } = action;
      if (plan.zones.some((z) => z.id === zone.id)) return plan;
      // Zones cannot overlap.
      for (const existing of plan.zones) {
        if (rectsOverlap(existing, zone)) return plan;
      }
      return { ...plan, zones: [...plan.zones, zone] };
    }

    case "UPDATE_ZONE": {
      const { id, zone } = action;
      const next = { ...(plan.zones.find((z) => z.id === id) || {}), ...zone };
      // Zones cannot overlap (exclude self).
      for (const existing of plan.zones) {
        if (existing.id === id) continue;
        if (rectsOverlap(existing, next)) return plan;
      }
      return { ...plan, zones: upsertById(plan.zones, id, next) };
    }

    case "DELETE_ZONE": {
      const { id } = action;
      const zone = plan.zones.find((z) => z.id === id);
      if (!zone) return plan;
      // Cannot delete a zone that still contains instances.
      const hasInstances = plan.instances.some((i) => i.zoneId === id);
      if (hasInstances) return plan;
      return { ...plan, zones: removeById(plan.zones, id) };
    }

    case "UPDATE_VENUE": {
      const width = Number(action.width);
      const height = Number(action.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return plan;
      const mainZone = plan.zones[0];
      // Keep the main zone's CENTER fixed so the room grows/shrinks around it.
      const center = mainZone
        ? { x: mainZone.x + mainZone.width / 2, y: mainZone.y + mainZone.height / 2 }
        : { x: 0, y: 0 };
      const zones = plan.zones.map((z, i) =>
        i === 0 ? { ...z, x: center.x - width / 2, y: center.y - height / 2, width, height } : z,
      );
      return { ...plan, venue: { ...plan.venue, width, height }, zones };
    }

    default:
      return plan;
  }
}

export default {
  createPlan,
  findDefinition,
  findInstance,
  instanceDefinition,
  instanceFootprint,
  validatePlacement,
  computeDragCandidate,
  findFreePosition,
  reducePlan,
};
