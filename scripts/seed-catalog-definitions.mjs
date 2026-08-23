/**
 * Seed the spatial object catalog into Firestore.
 *
 * The dashboard's "Mesas" spatial editor previously hardcoded its 7 built-in
 * objects (SYSTEM_DEFINITIONS + PROVIDER_DEFINITIONS in
 * `web/dashboard/src/spatial/catalog.js`). We now keep the catalog in the
 * `catalog_definitions` collection (one doc per object type) so the objects are
 * editable (dimensions, collision, colors, opacity, z-index, capacity, shape)
 * directly from Firestore data.
 *
 * This script writes those 7 objects (with default style fields) to
 * `catalog_definitions/{id}`. It does NOT delete anything; re-running is
 * idempotent (setDoc merge). Dry-run by default.
 *
 *   node scripts/seed-catalog-definitions.mjs
 *   node scripts/seed-catalog-definitions.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// Import the canonical definitions + style defaults from the pure catalog module.
const { SYSTEM_DEFINITIONS, PROVIDER_DEFINITIONS, defaultStyleFor } = await import(
  "../web/dashboard/src/spatial/catalog.js"
);

const definitions = [...SYSTEM_DEFINITIONS, ...PROVIDER_DEFINITIONS];

for (const def of definitions) {
  const style = defaultStyleFor(def);
  const doc = {
    ...def,
    // Make the DB doc self-describing: mesas explicitly `collidable: true`
    // (they collide), toldo/floor/mariachis `false` (they can overlap tables).
    collidable: def.collidable ?? true,
    strokeColor: style.strokeColor,
    fillColor: style.fillColor,
    strokeWidth: 0.05,
    opacity: 1,
    zIndex: style.zIndex,
    seededAt: new Date(),
  };
  if (EXECUTE) {
    await db.collection("catalog_definitions").doc(def.id).set(doc, { merge: true });
    console.log(`✅ wrote catalog_definitions/${def.id} → ${def.name}`);
  } else {
    console.log(`[dry-run] would write catalog_definitions/${def.id} → ${def.name} (${doc.shape}${doc.width ? ` ${doc.width}×${doc.height ?? doc.width}` : ""}, collidable=${doc.collidable ?? true})`);
  }
}

console.log(
  EXECUTE
    ? `Done. Seeded ${definitions.length} catalog definitions.`
    : `Dry run complete (${definitions.length} objects). Re-run with --execute to write.`,
);
