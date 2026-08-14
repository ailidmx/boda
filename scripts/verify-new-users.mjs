/**
 * Verify the 6 new users have:
 *   1. Firestore guest documents with correct schema (invitationGroup, phone, rsvp)
 *   2. Firebase Auth accounts with UID = guest ID
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

const GUEST_IDS = [
  "michel_passelande",
  "nicole_passelande",
  "sébastien_passelande",
  "gilles",
  "habiba",
  "yvon_leborgne",
];

for (const id of GUEST_IDS) {
  console.log(`\n=== ${id} ===`);
  
  // Check Firestore guest doc
  const doc = await db.collection("guests").doc(id).get();
  if (doc.exists) {
    const data = doc.data();
    console.log(`  Firestore: EXISTS`);
    console.log(`    firstName: ${data.firstName}`);
    console.log(`    lastName: ${data.lastName}`);
    console.log(`    invitationGroup: ${data.invitationGroup || "(none)"}`);
    console.log(`    phone: ${data.phone || "(none)"}`);
    console.log(`    rsvp: ${data.rsvp ? JSON.stringify(data.rsvp) : "(none)"}`);
    
    // Check for any Spanish field names
    const spanishFields = Object.keys(data).filter(k => 
      /invitacion|celular|capacidad|ocupacion|nombre|apellido|cuarto|mesa/.test(k)
    );
    if (spanishFields.length > 0) {
      console.log(`    ⚠️ SPANISH FIELDS: ${spanishFields.join(", ")}`);
    } else {
      console.log(`    ✓ No Spanish field names`);
    }
  } else {
    console.log(`  Firestore: NOT FOUND`);
  }

  // Check Auth
  try {
    const user = await auth.getUser(id);
    console.log(`  Auth: EXISTS (email: ${user.email})`);
  } catch (e) {
    console.log(`  Auth: NOT FOUND (${e.code})`);
  }
}

process.exit(0);
