/**
 * Inspect the 4 UUID conflicts (old and new guest docs + auth users) to
 * determine whether they are the same person (merge) or different people.
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
const db = getFirestore(app);
const auth = getAuth(app);

const conflicts = [
  ["aldo_díaz_de_sandi", "aldo"],
  ["juan_ignacio_sánchez", "juan"],
  ["erik_montañez", "erik"],
  ["antoine_faure", "antoine"],
];

function pick(data, keys) {
  const out = {};
  for (const k of keys) {
    if (data && data[k] !== undefined) out[k] = data[k];
  }
  return out;
}

for (const [oldId, newId] of conflicts) {
  console.log(`\n========== ${oldId}  ->  ${newId} ==========`);

  for (const id of [oldId, newId]) {
    const guestSnap = await db.collection("guests").doc(id).get();
    console.log(`\n--- guests/${id} ---`);
    if (guestSnap.exists) {
      const d = guestSnap.data();
      console.log("  identity:", JSON.stringify(d.identity || {}));
      console.log("  firstName/middleName/lastName/maternalLastName:",
        d.firstName, "/", d.middleName, "/", d.lastName, "/", d.maternalLastName);
      console.log("  invitationGroup:", d.invitationGroup);
      console.log("  tagGroup:", d.tagGroup);
      console.log("  isAdmin:", d.isAdmin);
      console.log("  _deleted:", d._deleted);
      console.log("  id:", d.id, "guestId:", d.guestId);
    } else {
      console.log("  (does not exist)");
    }

    try {
      const user = await auth.getUser(id);
      console.log(`  auth ${id}: email=${user.email}, displayName=${user.displayName}, disabled=${user.disabled}`);
    } catch (e) {
      console.log(`  auth ${id}: (no auth user)`);
    }
  }
}
process.exit(0);
