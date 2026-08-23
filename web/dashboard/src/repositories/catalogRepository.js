/**
 * catalogRepository — the ONLY module that touches the Firestore
 * `catalog_definitions` collection for the spatial editor.
 *
 * Responsibilities (per the architecture contract):
 *   - collection path (via `collections.catalogDefinitions`)
 *   - read (all definitions) and write (upsert one definition)
 *   - Firestore-specific errors
 *
 * The catalog holds the REUSABLE object types (mesa redonda, mesa de novios,
 * pista de baile, barra de comida, mariachis, toldo, ...). Placed instances in
 * the plan reference these via `instance.definitionId`. Geometry edits are only
 * allowed while no instance references a definition (enforced in the UI).
 */

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

/**
 * Load every catalog definition (one doc per object type).
 * @returns {Promise<Array<{id: string, ...definition}>>}
 */
export async function loadCatalogDefinitions() {
  const snap = await getDocs(collection(db, collections.catalogDefinitions));
  const defs = [];
  snap.forEach((d) => defs.push({ id: d.id, ...d.data() }));
  console.log(`[catalogRepository] loadCatalogDefinitions → ${defs.length} objetos`);
  return defs;
}

/**
 * Upsert a single catalog definition into `catalog_definitions/{id}`.
 * @param {object} definition  must include an `id`
 */
export async function saveCatalogDefinition(definition) {
  const id = definition?.id;
  if (!id) throw new Error("[catalogRepository] definition missing id");
  await setDoc(
    doc(db, collections.catalogDefinitions, id),
    { ...definition, id, updatedAt: new Date() },
    { merge: true },
  );
  console.log(`[catalogRepository] saveCatalogDefinition → catalog_definitions/${id}`);
}

export default { loadCatalogDefinitions, saveCatalogDefinition };
