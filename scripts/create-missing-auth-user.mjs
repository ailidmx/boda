/**
 * Create the missing Firebase Auth account for `acompagnante_de_jenny`.
 * The sheet row had a duplicate email (dimitar2@...) which the user corrected
 * to jenny2@boda-david-y-ayde.web.app. UID = guest ID = acompagnante_de_jenny.
 *
 * Uses dynamic import() of firebase-admin (ESM) to avoid the CJS/ESM interop
 * issue with jwks-rsa/jose in firebase-admin v14.
 *
 * Usage:
 *   node scripts/create-missing-auth-user.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

// Resolve the firebase-admin entry points from the invitation app's node_modules.
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { getAuth } = await import(authPath);

if (admin.getApps().length === 0) {
  admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const uid = "acompagnante_de_jenny";
const email = "jenny2@boda-david-y-ayde.web.app";
const password = "vivamexico";
const displayName = "Acompagnante de Jenny";

try {
  const user = await getAuth().createUser({
    uid,
    email,
    password,
    displayName,
  });
  console.log("Created auth user:");
  console.log("  uid:", user.uid);
  console.log("  email:", user.email);
  console.log("  displayName:", user.displayName);
} catch (err) {
  console.error("Failed to create user:", err.message);
  process.exit(1);
}
