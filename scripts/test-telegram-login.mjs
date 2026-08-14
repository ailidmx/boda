// Test the Telegram notification end-to-end by writing a document to the
// `login_events` collection in the `boda-us-central1` database. This triggers
// the `onLogin` Cloud Function, which should send a Telegram notification.
//
// Run: node scripts/test-telegram-login.mjs
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
const { getFirestore, Timestamp } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const docRef = db.collection("login_events").doc();
await docRef.set({
  guestId: "test-guest-ayde",
  guestName: "Test de Notificación",
  username: "test@boda.mx",
  createdAt: Timestamp.now(),
});

console.log("✅ Wrote test login event:", docRef.id);
console.log("Check Telegram for the notification (should arrive within ~10s).");
process.exit(0);
