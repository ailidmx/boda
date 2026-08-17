// Inspect the current `tables` collection and `guests.table` field.
// Run: node scripts/inspect-tables.mjs
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// 1. Tables collection
console.log("=== TABLES COLLECTION ===");
const tablesSnap = await db.collection("tables").get();
console.log(`  total tables: ${tablesSnap.size}`);
for (const doc of tablesSnap.docs) {
  const d = doc.data();
  console.log(`\n  [${doc.id}]`);
  console.log(`    name: ${d.name}`);
  console.log(`    shape: ${d.shape}`);
  console.log(`    capacity: ${d.capacity}`);
  console.log(`    x: ${d.x}, y: ${d.y}`);
  console.log(`    rotation: ${d.rotation}`);
  console.log(`    slots: ${JSON.stringify(d.slots)}`);
  console.log(`    guestIds: ${JSON.stringify(d.guestIds)}`);
  console.log(`    other keys: ${Object.keys(d).filter((k) => !["name","shape","capacity","x","y","rotation","slots","guestIds"].includes(k)).join(", ")}`);
}

// 2. Guests with a `table` field
console.log("\n=== GUESTS WITH table FIELD ===");
const guestsSnap = await db.collection("guests").get();
let withTable = 0;
const tableCounts = {};
for (const doc of guestsSnap.docs) {
  const d = doc.data();
  const t = d.table;
  if (t) {
    withTable++;
    tableCounts[t] = (tableCounts[t] || 0) + 1;
  }
}
console.log(`  total guests: ${guestsSnap.size}`);
console.log(`  guests with table: ${withTable}`);
console.log("  table -> count:");
for (const [t, c] of Object.entries(tableCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`    ${t}: ${c}`);
}

process.exit(0);
