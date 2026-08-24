/**
 * One-shot repair: dedupe `plans/main.guestAssignments`.
 *
 * Some guests ended up seated in MORE than one seat (legacy data). This keeps
 * the FIRST seat per guest (by iteration order) and drops later duplicates,
 * then writes the cleaned `guestAssignments` back to `plans/main` (merge).
 * Dry-run by default; `--execute` writes.
 *
 *   node scripts/dedupe-plan-guests.mjs
 *   node scripts/dedupe-plan-guests.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

const snap = await db.collection("plans").doc("main").get();
const data = snap.data();
const ga = data.guestAssignments || {};

const next = {};
const seen = new Set();
let removed = 0;
let kept = 0;
for (const [iid, seats] of Object.entries(ga)) {
  const keptSeats = {};
  for (const [sid, gid] of Object.entries(seats)) {
    if (gid == null) continue;
    if (seen.has(gid)) { removed += 1; continue; }
    seen.add(gid);
    keptSeats[sid] = gid;
    kept += 1;
  }
  if (Object.keys(keptSeats).length) next[iid] = keptSeats;
}

console.log(`seats before: ${kept + removed} · after: ${kept} · duplicates removed: ${removed}`);

if (EXECUTE) {
  await db.collection("plans").doc("main").set({ guestAssignments: next, updatedAt: new Date() }, { merge: true });
  console.log("✅ dedupe written to plans/main");
} else {
  console.log("Dry run — re-run with --execute to write.");
}
