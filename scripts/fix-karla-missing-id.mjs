// Fix Karla's guest doc missing the top-level `id` field.
// The audit (scripts/audit-missing-guest-id.mjs) showed only karla_ujecić is
// missing `id`, which broke saveGuestPhoto/saveGuestName (normalizeGuestRecord
// relied on data.id). Her `guestId` already equals the doc id, so we backfill
// `id` from `guestId` (or the doc id).
// Run: node scripts/fix-karla-missing-id.mjs
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
const { getFirestore, FieldValue } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const snap = await db.collection("guests").get();
let fixed = 0;
let skipped = 0;
snap.forEach((d) => {
  const data = d.data();
  const hasId = typeof data.id === "string" && data.id.length > 0;
  if (hasId) {
    skipped++;
    return;
  }
  const id = data.guestId || d.id;
  console.log(`Fixing ${d.id}: setting id="${id}"`);
  // Use setDoc merge so we only add the `id` field.
  d.ref.set({ id }, { merge: true }).then(() => {
    fixed++;
    console.log(`  -> done ${d.id}`);
  });
});

// Wait for all writes to settle.
setTimeout(() => {
  console.log(`\nFixed: ${fixed}, skipped (already had id): ${skipped}`);
  process.exit(0);
}, 5000);
