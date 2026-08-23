// ─────────────────────────────────────────────────────────────────────────
// history.js — local in-session undo/redo (NOT persisted to Firestore).
//
// History operates at the SEMANTIC ACTION level. A drag from A → B produces
// exactly ONE entry (the MOVE_INSTANCES action), never one per grid position.
//
// The store keeps PAST and FUTURE stacks of plain action objects. Undo
// re-applies the INVERSE of the latest action; redo re-applies the action.
// Because actions are semantic and idempotent-inverse, this is safe.
// ─────────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 200;

/**
 * Build the INVERSE action for a semantic action (for undo).
 * Returns an action that, when reduced, restores the prior state.
 */
export function invertAction(plan, action) {
  switch (action.type) {
    case "MOVE_INSTANCES": {
      const moves = action.moves
        .map(({ id }) => {
          const inst = plan.instances.find((i) => i.id === id);
          return inst ? { id, transform: inst.transform } : null;
        })
        .filter(Boolean);
      return { type: "MOVE_INSTANCES", moves };
    }
    case "ROTATE_INSTANCE": {
      const inst = plan.instances.find((i) => i.id === action.id);
      return inst ? { type: "ROTATE_INSTANCE", id: action.id, rotation: inst.transform.rotation } : null;
    }
    case "ADD_INSTANCE": {
      return { type: "REMOVE_INSTANCE", id: action.instance.id };
    }
    case "REMOVE_INSTANCE": {
      const inst = plan.instances.find((i) => i.id === action.id);
      if (!inst) return null;
      // Re-adding an instance after undo-restores it; also restore its group/assignments
      // are handled separately by the caller if needed (minimal: re-add instance).
      return { type: "ADD_INSTANCE", instance: inst };
    }
    case "CONNECT": {
      const id = `conn-${action.connection.objectAId}-${action.connection.portA}-${action.connection.objectBId}-${action.connection.portB}`;
      return { type: "DISCONNECT", id };
    }
    case "DISCONNECT": {
      const conn = plan.connections.find((c) => c.id === action.id);
      return conn ? { type: "CONNECT", connection: conn } : null;
    }
    case "GROUP": {
      return { type: "UNGROUP", id: action.id };
    }
    case "UNGROUP": {
      const group = plan.groups.find((g) => g.id === action.id);
      if (!group) return null;
      return { type: "GROUP", id: group.id, zoneId: group.zoneId, name: group.name, objectIds: group.objectIds };
    }
    case "MOVE_GROUP": {
      return { type: "MOVE_GROUP", id: action.id, dx: -action.dx, dy: -action.dy };
    }
    case "ROTATE_GROUP": {
      return { type: "ROTATE_GROUP", id: action.id, deg: -action.deg };
    }
    case "ASSIGN_GUEST": {
      const prev = plan.guestAssignments?.[action.instanceId]?.[action.seatId];
      return prev !== undefined
        ? { type: "ASSIGN_GUEST", instanceId: action.instanceId, seatId: action.seatId, guestId: prev }
        : { type: "UNASSIGN_GUEST", instanceId: action.instanceId, seatId: action.seatId };
    }
    case "UNASSIGN_GUEST": {
      const prev = plan.guestAssignments?.[action.instanceId]?.[action.seatId];
      return prev !== undefined
        ? { type: "ASSIGN_GUEST", instanceId: action.instanceId, seatId: action.seatId, guestId: prev }
        : null;
    }
    case "MOVE_GUEST": {
      // Inverse swaps source and destination back.
      return {
        type: "MOVE_GUEST",
        fromInstanceId: action.toInstanceId,
        fromSeatId: action.toSeatId,
        toInstanceId: action.fromInstanceId,
        toSeatId: action.fromSeatId,
        guestId: action.guestId,
      };
    }
    case "UPDATE_DEFINITION": {
      const before = plan.definitions.find((d) => d.id === action.id);
      if (!before) return null;
      const prevFields = {};
      for (const key of Object.keys(action.definition)) prevFields[key] = before[key];
      return { type: "UPDATE_DEFINITION", id: action.id, definition: prevFields };
    }
    case "ADD_DEFINITION": {
      return { type: "DELETE_DEFINITION", id: action.definition.id };
    }
    case "DELETE_DEFINITION": {
      const def = plan.definitions.find((d) => d.id === action.id);
      return def ? { type: "ADD_DEFINITION", definition: def } : null;
    }
    case "ADD_ZONE": {
      return { type: "DELETE_ZONE", id: action.zone.id };
    }
    case "DELETE_ZONE": {
      const zone = plan.zones.find((z) => z.id === action.id);
      return zone ? { type: "ADD_ZONE", zone } : null;
    }
    case "UPDATE_ZONE": {
      const before = plan.zones.find((z) => z.id === action.id);
      if (!before) return null;
      const prevFields = {};
      for (const key of Object.keys(action.zone)) prevFields[key] = before[key];
      return { type: "UPDATE_ZONE", id: action.id, zone: prevFields };
    }
    default:
      return null;
  }
}

/**
 * A local (non-persisted) history manager.
 *
 *   const history = createHistory();
 *   history.commit(plan, action); // push action, clear redo
 *   history.undo() → inverse action (or null)
 *   history.redo() → redo action (or null)
 */
export function createHistory(limit = MAX_HISTORY) {
  let past = [];
  let future = [];

  return {
    commit(plan, action) {
      past.push({ plan, action });
      if (past.length > limit) past.shift();
      future = [];
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    /** Pop the latest entry and return { plan, inverseAction }. */
    undo() {
      if (!past.length) return null;
      const entry = past.pop();
      future.push(entry);
      // The inverse must be computed against the PRE-ACTION plan (entry.plan).
      const inverse = invertAction(entry.plan, entry.action);
      if (!inverse) return null;
      return { plan: entry.plan, action: inverse };
    },
    /** Re-apply the latest undone action. */
    redo() {
      if (!future.length) return null;
      const entry = future.pop();
      past.push(entry);
      return { plan: entry.plan, action: entry.action };
    },
    reset() {
      past = [];
      future = [];
    },
    snapshot() {
      return { canUndo: past.length > 0, canRedo: future.length > 0, pastCount: past.length, futureCount: future.length };
    },
  };
}

export default { createHistory, invertAction, MAX_HISTORY };