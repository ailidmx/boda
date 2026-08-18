/**
 * Migrate the mock FE "thanks/credits" data into the Firestore `thanks`
 * collection, mapping each credit to a real guest ID (from the Google Sheet
 * `ID` column) with per-language translations (fr/es/en).
 *
 * The `thanks` collection mirrors the Google Sheet THANKS table:
 *   - one document per credit record
 *   - a guest may appear in many records
 *   - fields: guest, fr, es, en
 *
 * Run with Node 20 (avoids the jwks-rsa/jose ESM issue on Node 22):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/migrate-thanks.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

// ── Mock FE credits → real guest mapping ──────────────────────────────────
// Each record: guestId + the thanks text in fr/es/en (derived from the mock
// `role` values in content.js). The typo duplicate "Manuel Amuzeca / Pizzas
// del viernes" is skipped (same person + same role as the Amezcua entry).
const CREDITS = [
  {
    guest: "manuel_amezcua",
    fr: "Wedding planner",
    es: "Wedding planner",
    en: "Wedding planner",
  },
  {
    guest: "manuel_amezcua",
    fr: "Pizzas du vendredi",
    es: "Pizzas del viernes",
    en: "Friday pizzas",
  },
  {
    guest: "ismael",
    fr: "Pizzas",
    es: "Pizzas",
    en: "Pizzas",
  },
  {
    guest: "isabel_guadalupe",
    fr: "Tenues des mariés",
    es: "Vestuario de los novios",
    en: "The couple’s outfits",
  },
];

// Deterministic document ID: guestId + slug of the es text.
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function docId(credit) {
  return `${credit.guest}__${slugify(credit.es)}`;
}

// ── Verify all guest IDs exist before writing ─────────────────────────────
console.log("Verifying guest IDs exist in `guests` collection...");
const missing = [];
for (const c of CREDITS) {
  const doc = await db.collection("guests").doc(c.guest).get();
  if (!doc.exists) missing.push(c.guest);
}
if (missing.length > 0) {
  console.error(`ABORT: guest IDs not found in Firestore: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`All ${CREDITS.length} credits reference existing guests.\n`);

// ── Write to Firestore ────────────────────────────────────────────────────
const batch = db.batch();
for (const c of CREDITS) {
  const id = docId(c);
  batch.set(db.collection("thanks").doc(id), {
    guest: c.guest,
    fr: c.fr,
    es: c.es,
    en: c.en,
    _source: "mock_fe_migration",
    _migratedAt: new Date().toISOString(),
  });
  console.log(`  + thanks/${id}  (guest=${c.guest})`);
}
await batch.commit();
console.log(`\nWrote ${CREDITS.length} documents to the 'thanks' collection.`);

// ── Export to JSON (for pasting into the THANKS sheet) ────────────────────
const exportRows = CREDITS.map((c) => ({ guest: c.guest, fr: c.fr, es: c.es, en: c.en }));
const exportPath = join(__dirname, "../invitados/thanks_export.json");
writeFileSync(exportPath, JSON.stringify(exportRows, null, 2), "utf-8");
console.log(`Exported ${exportRows.length} rows to ${exportPath}`);

process.exit(0);
