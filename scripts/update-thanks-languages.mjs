/**
 * Fill in missing language fields on `thanks` documents.
 *
 * The invitation's "Gracias" section renders a thank-you message per guest in
 * the active language (es/fr/en). If a `thanks` doc only has one language
 * filled in (e.g. only `es`), the other two render blank. This script scans
 * every `thanks` doc and, for any doc missing a language, copies the text from
 * the first available language into the missing ones.
 *
 * This is a one-off data-fix helper for the couple. The dashboard's "Gracias"
 * panel already enforces "at least one language" on create/edit, so going
 * forward docs should always have at least one language; this script backfills
 * the rest so the invitation never shows an empty thank-you.
 *
 * Run with Node 20 (avoids the jwks-rsa/jose ESM issue on Node 22):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/update-thanks-languages.mjs
 *
 * Flags:
 *   --dry-run   Print what would change without writing.
 *   --lang=es   Only fill docs that are missing THIS language (default: all).
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

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const LANGS = ["es", "fr", "en"];
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const langFlag = args.find((a) => a.startsWith("--lang="));
const onlyLang = langFlag ? langFlag.split("=")[1] : null;

if (onlyLang && !LANGS.includes(onlyLang)) {
  console.error(`Invalid --lang="${onlyLang}". Valid: ${LANGS.join(", ")}`);
  process.exit(1);
}

console.log(`Scanning 'thanks' collection${dryRun ? " (DRY RUN — no writes)" : ""}...`);

const snapshot = await db.collection("thanks").get();
console.log(`Found ${snapshot.size} thanks documents.\n`);

const batch = db.batch();
let changed = 0;
let skipped = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const present = LANGS.filter((l) => String(data[l] || "").trim());
  const missing = LANGS.filter((l) => !String(data[l] || "").trim());

  // If a specific language was requested, only act on docs missing that one.
  const relevantMissing = onlyLang ? missing.filter((l) => l === onlyLang) : missing;
  if (relevantMissing.length === 0) {
    skipped++;
    continue;
  }

  // Source text = the first available language (prefer es, then fr, then en).
  const sourceLang = present.find((l) => l === "es") || present[0];
  if (!sourceLang) {
    console.log(`  - ${doc.id}: NO language filled in — skipping (nothing to copy).`);
    skipped++;
    continue;
  }

  const sourceText = String(data[sourceLang]).trim();
  const update = {};
  relevantMissing.forEach((l) => { update[l] = sourceText; });

  console.log(`  ~ ${doc.id}: missing [${relevantMissing.join(", ")}] ← copy from ${sourceLang}`);
  if (!dryRun) {
    batch.update(doc.ref, update);
  }
  changed++;
}

if (dryRun) {
  console.log(`\nDRY RUN complete. ${changed} doc(s) would be updated, ${skipped} unchanged.`);
} else {
  if (changed > 0) {
    await batch.commit();
    console.log(`\nUpdated ${changed} doc(s), ${skipped} unchanged.`);
  } else {
    console.log(`\nNothing to update (${skipped} unchanged).`);
  }
}

process.exit(0);
