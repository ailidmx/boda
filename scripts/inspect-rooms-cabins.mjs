/**
 * Inspect the LIVE `rooms` and `cabins` collections in the US Firestore DB
 * (boda-500805 / boda-us-central1) to answer:
 *   - Where does "Cabaña de madera 31-34" come from?
 *   - Does it exist in the `cabins` collection?
 *   - What `cabin` values do the `rooms` docs actually use?
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

console.log("=== ROOMS collection ===");
const roomsSnap = await db.collection("rooms").get();
console.log(`Total rooms docs: ${roomsSnap.size}`);
const cabinCounts = {};
const roomRows = [];
roomsSnap.forEach((doc) => {
  const d = doc.data();
  const cabin = d.cabin ?? "(no cabin field)";
  cabinCounts[cabin] = (cabinCounts[cabin] || 0) + 1;
  roomRows.push({ id: doc.id, cabin, capacity: d.capacity, isShared: d.isShared });
});
console.log("\nDistinct `cabin` values in rooms collection:");
for (const [cabin, count] of Object.entries(cabinCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${count}x  "${cabin}"`);
}
console.log("\nRoom docs (id | cabin | capacity):");
roomRows.sort((a, b) => a.id.localeCompare(b.id)).forEach((r) => {
  console.log(`  ${r.id}  |  "${r.cabin}"  |  cap ${r.capacity}`);
});

console.log("\n\n=== CABINS collection ===");
const cabinsSnap = await db.collection("cabins").get();
console.log(`Total cabins docs: ${cabinsSnap.size}`);
cabinsSnap.forEach((doc) => {
  const d = doc.data();
  console.log(`  id="${d.id ?? doc.id}"  name="${d.name ?? ""}"  cloudinaryIds=${JSON.stringify(d.cloudinaryIds)}`);
});

process.exit(0);
