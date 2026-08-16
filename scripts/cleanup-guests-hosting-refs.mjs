/**
 * DB CLEANING — guests hosting references.
 *
 * Ensures no guest document references a non-existent cabin/room/xtraCabin/
 * xtraRoom. If a reference does not resolve to a real document in the
 * `cabins` / `rooms` collections, it is set back to null.
 *
 * Usage:
 *   node scripts/cleanup-guests-hosting-refs.mjs --dry-run   # inspect only
 *   node scripts/cleanup-guests-hosting-refs.mjs --execute   # write changes
 *
 * Valid reference sources (source of truth):
 *   - `cabins` collection: valid cabin identifiers = each doc's `id` and `name`
 *   - `rooms`  collection: valid room identifiers = each doc's `id`;
 *     valid cabin identifiers also include each room's `cabin` value
 *
 * Fields validated on each guest's `hosting` map:
 *   - hosting.cabin     → must match a valid cabin identifier
 *   - hosting.room      → must match a valid room identifier
 *   - hosting.xtraCabin → must match a valid cabin identifier
 *   - hosting.xtraRoom  → must match a valid room identifier
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const DRY_RUN = !process.argv.includes("--execute");

// ── Build valid identifier sets ──────────────────────────────────────────
const norm = (s) => (typeof s === "string" ? s.trim().toLocaleUpperCase() : "");

const validCabinIds = new Set();
const validRoomIds = new Set();

const cabinsSnap = await db.collection("cabins").get();
cabinsSnap.forEach((doc) => {
  const d = doc.data();
  if (d.id) validCabinIds.add(norm(d.id));
  if (d.name) validCabinIds.add(norm(d.name));
  if (doc.id) validCabinIds.add(norm(doc.id));
});

const roomsSnap = await db.collection("rooms").get();
roomsSnap.forEach((doc) => {
  const d = doc.data();
  if (d.id) validRoomIds.add(norm(d.id));
  if (doc.id) validRoomIds.add(norm(doc.id));
  if (d.cabin) validCabinIds.add(norm(d.cabin));
});

console.log(`Valid cabin identifiers: ${validCabinIds.size}`);
console.log(`Valid room identifiers:  ${validRoomIds.size}`);
console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE (writes changes)"}\n`);

// ── Validate each guest's hosting references ─────────────────────────────
const guestsSnap = await db.collection("guests").get();
console.log(`Total guests: ${guestsSnap.size}\n`);

const FIELD_LABELS = {
  cabin: "cabin",
  room: "room",
  xtraCabin: "xtraCabin",
  xtraRoom: "xtraRoom",
};

const changes = []; // { id, name, field, value, reason }
let guestsWithHosting = 0;

guestsSnap.forEach((doc) => {
  const d = doc.data();
  const hosting = d.hosting;
  if (!hosting || typeof hosting !== "object") return;
  guestsWithHosting++;

  const name = d.identity?.firstName || d.firstName || d.name || doc.id;

  for (const field of Object.keys(FIELD_LABELS)) {
    const value = hosting[field];
    if (value === undefined || value === null || value === "") continue;

    const isCabinField = field === "cabin" || field === "xtraCabin";
    const validSet = isCabinField ? validCabinIds : validRoomIds;

    if (!validSet.has(norm(value))) {
      changes.push({ id: doc.id, name, field, value, reason: "not in valid set" });
    }
  }
});

// ── Report ───────────────────────────────────────────────────────────────
console.log(`Guests with a hosting map: ${guestsWithHosting}`);
console.log(`Invalid references found: ${changes.length}\n`);

if (changes.length === 0) {
  console.log("✅ No invalid references. Nothing to clean.");
  process.exit(0);
}

// Group by field for a readable summary
const byField = {};
for (const c of changes) {
  byField[c.field] = byField[c.field] || [];
  byField[c.field].push(c);
}
for (const field of Object.keys(FIELD_LABELS)) {
  const list = byField[field];
  if (!list) continue;
  console.log(`\n── ${field} (${list.length}) ──`);
  for (const c of list) {
    console.log(`  ${c.id}  "${c.name}"  →  "${c.value}"`);
  }
}

// ── Execute ──────────────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log(`\n[DRY RUN] Would null ${changes.length} reference(s) across ${new Set(changes.map((c) => c.id)).size} guest(s).`);
  console.log("Re-run with --execute to apply.");
  process.exit(0);
}

console.log(`\nApplying ${changes.length} change(s)...`);
const byGuest = {};
for (const c of changes) {
  (byGuest[c.id] = byGuest[c.id] || []).push(c.field);
}

let applied = 0;
for (const [guestId, fields] of Object.entries(byGuest)) {
  const patch = {};
  for (const field of fields) patch[field] = null;
  await db.collection("guests").doc(guestId).update(patch);
  applied += fields.length;
  console.log(`  updated ${guestId}: ${fields.join(", ")} → null`);
}

console.log(`\n✅ Applied ${applied} change(s) across ${Object.keys(byGuest).length} guest(s).`);
process.exit(0);
