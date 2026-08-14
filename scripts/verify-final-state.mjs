/**
 * Final verification of the migration for boda-500805.
 * Confirms:
 *   - Firestore collections present and their doc counts
 *   - guests count == 214
 *   - cabins count == 13
 *   - obsolete collections (guest_auth, guest_profiles) are gone/empty
 *   - Auth user count == 214
 *
 * Run with Node 20 (avoids the jwks-rsa/jose ESM issue on Node 22):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/verify-final-state.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);
const { getAuth } = await import(authPath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");
const auth = getAuth(app);

// 1. Collections
console.log("=== FIRESTORE COLLECTIONS ===");
const collections = await db.listCollections();
const counts = {};
for (const col of collections) {
  const snap = await col.get();
  counts[col.id] = snap.size;
  console.log(`  ${col.id}: ${snap.size} docs`);
}

// 2. Guests count
const guests = counts["guests"] ?? 0;
console.log(`\nGuests: ${guests} (expected 214)`);

// 3. Cabins count
const cabins = counts["cabins"] ?? 0;
console.log(`Cabins: ${cabins} (expected 13)`);

// 4. Obsolete collections
const obsolete = ["guest_auth", "guest_profiles"];
for (const name of obsolete) {
  const n = counts[name] ?? 0;
  console.log(`Obsolete "${name}": ${n} docs ${n === 0 ? "(OK)" : "(STILL PRESENT!)"}`);
}

// 5. Auth users
let authCount = 0;
try {
  const listUsersResult = await auth.listUsers(1000);
  authCount = listUsersResult.users.length;
  console.log(`\nAuth users: ${authCount} (expected 214)`);
} catch (e) {
  console.log(`\nAuth users: ERROR ${e.message}`);
}

// 6. Couple guest docs exist (needed by isCouple() rules)
for (const id of ["david_aïli", "aydé_juárez_guadalupe"]) {
  const doc = await db.collection("guests").doc(id).get();
  console.log(`Couple guest "${id}": ${doc.exists ? "EXISTS" : "MISSING"}`);
}

process.exit(0);
