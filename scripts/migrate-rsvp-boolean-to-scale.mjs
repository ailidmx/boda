/**
 * Migrate legacy RSVP boolean fields into integer scale answers.
 *
 * The old `guests/{id}.rsvp` map stored attendance as booleans:
 *   rsvp.friday, rsvp.saturday, rsvp.sunday, rsvp.xtra, rsvp.playa
 *
 * The new model stores each answer as an integer scale level (0–5) inside
 * `rsvp.answers` (questionId → level), ready to hold a reference to a scaled
 * response. This script converts the impacted boolean fields to integers and
 * removes the legacy boolean keys.
 *
 * Boolean → scale mapping (mirrors the 5-point likelihood scale):
 *   true  → 5  ("Yes, I'm coming")
 *   false → 0  (unanswered — NOT "no", so the default is not a firm refusal)
 *   absent → left untouched (no answer created)
 *
 * Dry-run by default:
 *   node scripts/migrate-rsvp-boolean-to-scale.mjs
 * Apply changes:
 *   node scripts/migrate-rsvp-boolean-to-scale.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const { initializeApp, cert } = await import(appPath);
const { getFirestore, FieldValue } = await import(firestorePath);

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// The impacted boolean fields and their target questionId in rsvp.answers.
const BOOLEAN_TO_QUESTION = {
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
  xtra: "xtra",
  playa: "playa",
};

// Boolean → scale level. true = "yes" (5), false = "unanswered" (0).
// A false boolean is NOT a firm "no" — it just means the guest never
// answered, so it maps to 0 (unanswered) rather than 1 ("I won't come").
function booleanToLevel(value) {
  if (value === true) return 5;
  if (value === false) return 0;
  return null; // not a boolean → leave untouched
}

/**
 * Build the update for a guest document: move each impacted boolean into
 * `rsvp.answers` as an integer and delete the legacy boolean key.
 *
 * This also corrects a previous run that mapped `false` → 1 ("no"). Because
 * the legacy booleans were already deleted by that run, we detect the
 * wrongly-migrated answers by their value: any `rsvp.answers[questionId]`
 * equal to 1 for these boolean-derived question IDs is reset to 0
 * (unanswered). Real user answers (levels 2–5) are never touched.
 *
 * @param {Object} data  the guest document data
 * @returns {{ changed: boolean, update: Object }}
 */
function buildRsvpUpdate(data) {
  const rsvp = data.rsvp || {};
  const nextAnswers = { ...(rsvp.answers || {}) };
  const update = {};
  let changed = false;

  for (const [legacyKey, questionId] of Object.entries(BOOLEAN_TO_QUESTION)) {
    if (rsvp[legacyKey] !== undefined) {
      // Legacy boolean still present → migrate it with the corrected mapping.
      const level = booleanToLevel(rsvp[legacyKey]);
      if (level !== null) {
        nextAnswers[questionId] = level;
      }
      // Always remove the legacy boolean key once it has been processed.
      update[`rsvp.${legacyKey}`] = FieldValue.delete();
      changed = true;
    } else if (nextAnswers[questionId] === 1) {
      // Legacy boolean already deleted by a previous run that mapped
      // `false` → 1. Reset that wrongly-migrated "no" to 0 (unanswered).
      nextAnswers[questionId] = 0;
      changed = true;
    }
  }

  if (Object.keys(nextAnswers).length > 0) {
    update["rsvp.answers"] = nextAnswers;
  }

  return { changed, update };
}

// ── Backup ────────────────────────────────────────────────────────────────
const backupDir = join(__dirname, "../backups");
mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(backupDir, `pre-rsvp-boolean-to-scale-${ts}`);
mkdirSync(runDir, { recursive: true });

const snapshot = await db.collection("guests").get();
const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
writeFileSync(join(runDir, "guests.json"), JSON.stringify(docs, null, 2), "utf8");
console.log(`[backup] guests: ${docs.length} docs -> ${runDir}/guests.json`);

// ── Plan & apply ──────────────────────────────────────────────────────────
let changedCount = 0;
let migratedAnswers = 0;
for (const { id, data } of docs) {
  const { changed, update } = buildRsvpUpdate(data);
  if (!changed) continue;

  changedCount++;
  const migrated = Object.keys(update).filter((k) => k.startsWith("rsvp.") && k !== "rsvp.answers").length;
  migratedAnswers += migrated;
  console.log(`[plan] guests/${id}`, JSON.stringify(update));
  if (EXECUTE) {
    await db.collection("guests").doc(id).update(update);
  }
}

console.log(`\n[summary] guests needing update: ${changedCount}`);
console.log(`[summary] legacy boolean fields migrated: ${migratedAnswers}`);
if (!EXECUTE) {
  console.log("[dry-run] No writes applied. Re-run with --execute to update Firestore.");
} else {
  console.log("[ok] Firestore RSVP boolean → scale migration applied.");
}
