// Audit how many guests are missing the top-level `id` field (which breaks
// saveGuestPhoto / saveGuestName because normalizeGuestRecord relies on data.id).
// Run: node scripts/audit-missing-guest-id.mjs
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

const snap = await db.collection("guests").get();
let missingId = [];
let missingGuestId = [];
let idMismatch = [];
let total = 0;
snap.forEach((d) => {
  total++;
  const data = d.data();
  const hasId = typeof data.id === "string" && data.id.length > 0;
  const hasGuestId = typeof data.guestId === "string" && data.guestId.length > 0;
  if (!hasId) missingId.push({ id: d.id, guestId: data.guestId, name: data.identity?.firstName + " " + data.identity?.lastName });
  if (!hasGuestId) missingGuestId.push(d.id);
  if (hasId && hasGuestId && data.id !== data.guestId) idMismatch.push({ id: d.id, dataId: data.id, guestId: data.guestId });
});

console.log(`Total guests: ${total}`);
console.log(`\nMissing top-level 'id' field: ${missingId.length}`);
missingId.slice(0, 40).forEach((g) => console.log(`  - ${g.id} | guestId=${g.guestId} | ${g.name}`));
if (missingId.length > 40) console.log(`  ... and ${missingId.length - 40} more`);
console.log(`\nMissing 'guestId' field: ${missingGuestId.length}`);
console.log(`\nid !== guestId mismatches: ${idMismatch.length}`);
idMismatch.slice(0, 20).forEach((g) => console.log(`  - ${g.id} | data.id=${g.dataId} | guestId=${g.guestId}`));
process.exit(0);
