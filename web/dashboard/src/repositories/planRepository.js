/**
 * planRepository — the ONLY module that touches the Firestore `plans`
 * collection for the spatial editor.
 *
 * Responsibilities (per the architecture contract):
 *   - collection path (via `collections.plans`)
 *   - read (get + live onSnapshot) and write (set with merge)
 *   - Firestore-specific errors
 *
 * The repository owns all Firestore access. It contains NO UI behavior and NO
 * business rules. The editor state lives in `spatial/editor-state.js`.
 *
 * Autosave writes happen ONLY on semantic commits (valid drop, rotation, group
 * action, connection action, guest assignment). Pointer movement never writes.
 */

import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";
import { isSystemDefinition } from "../spatial/catalog.js";

const DEFAULT_PLAN_ID = "main";

/**
 * Write the full plan document (a single flat JSON object) to Firestore.
 * The plan lives at `plans/{planId}` (e.g. `plans/main`) — a FLAT path that the
 * Firestore rule `match /plans/{planId}` covers directly. (Do NOT nest it under
 * `plans/{planId}/plans/{docId}` — the rules deny that deeper path.)
 * @param {object} plan
 * @param {string} planId
 */
export async function savePlan(plan, planId = DEFAULT_PLAN_ID) {
  const definitions = plan.definitions || [];
  const instances = plan.instances || [];
  const defIds = definitions.map((d) => d.id);
  const instDefIds = instances.map((i) => i.definitionId);
  const missing = [...new Set(instDefIds.filter((id) => !defIds.includes(id)))];
  console.log(
    `[planRepository] savePlan → plans/${planId} · ` +
    `${instances.length} instancias, ${Object.keys(plan.guestAssignments || {}).length} con invitados, ` +
    `${definitions.length} definiciones [${defIds.join(", ")}]`,
  );
  if (missing.length) {
    console.warn(
      `[planRepository] savePlan → instancias apuntan a definiciones INEXISTENTES: ${missing.join(", ")}`,
    );
  }
  // Built-in catalog objects live in `catalog_definitions` (not the plan), so
  // they are NOT duplicated into `plans/main.definitions` — only custom
  // definitions are persisted here. Instances still reference them by id.
  const persistedDefinitions = definitions.filter((d) => !isSystemDefinition(d));
  await setDoc(
    doc(db, collections.plans, planId),
    { ...plan, definitions: persistedDefinitions, id: planId, updatedAt: new Date() },
    { merge: true },
  );
}

/**
 * Load the authoritative plan document from Firestore. Falls back to null.
 * @param {string} planId
 */
export async function loadPlan(planId = DEFAULT_PLAN_ID) {
  const ref = doc(db, collections.plans, planId);
  const snap = await getDoc(ref);
  const exists = snap.exists();
  console.log(
    `[planRepository] loadPlan → plans/${planId} · exists=${exists}` +
    (exists ? ` · ${snap.data()?.instances?.length ?? 0} instancias` : ""),
  );
  return exists ? { id: planId, ...snap.data() } : null;
}

/**
 * Subscribe to live changes of the plan document. Returns an unsubscribe fn.
 */
export function subscribePlan(onPlan, planId = DEFAULT_PLAN_ID) {
  const ref = doc(db, collections.plans, planId);
  return onSnapshot(
    ref,
    (snap) => {
      const plan = snap.exists() ? { id: planId, ...snap.data() } : null;
      console.log(
        `[planRepository] subscribePlan update · exists=${snap.exists()}` +
        (plan ? ` · ${plan.instances?.length ?? 0} instancias` : ""),
      );
      onPlan(plan);
    },
    (error) => {
      console.error("[planRepository] Failed to load plan", error);
      onPlan(null);
    },
  );
}

export default { savePlan, loadPlan, subscribePlan, DEFAULT_PLAN_ID };
