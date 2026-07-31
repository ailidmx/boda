/**
 * Clean up duplicate/bad RSVP submissions from Firestore.
 *
 * Deletes records that:
 * 1. Have no invitationCode (empty or undefined)
 * 2. Have duplicate invitationCode entries (keep the most recent)
 *
 * Usage:
 *   node scripts/cleanup-rsvp-duplicates.mjs [--dry-run]
 *
 * Options:
 *   --dry-run   Log what would be deleted without actually deleting
 *
 * Environment:
 *   Must be authenticated via `firebase login` with a default project set.
 */

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n  🧹 RSVP cleanup (${DRY_RUN ? "DRY RUN" : "LIVE"})\n`);

  // Initialize Firebase Admin
  const { initializeApp, applicationDefault, getApps } = await import("firebase-admin");
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
    });
  }

  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore();

  const collectionRef = db.collection("rsvp_submissions");
  const snapshot = await collectionRef.get();

  console.log(`  📋 Total records: ${snapshot.size}\n`);

  const toDelete = [];
  const seenCodes = new Map(); // invitationCode -> docId (keep latest)

  snapshot.forEach((doc) => {
    const data = doc.data();
    const code = data.invitationCode;

    if (!code || code === "") {
      toDelete.push({ id: doc.id, reason: "empty invitationCode", data: { firstName: data.firstName, lastName: data.lastName } });
      return;
    }

    // Check for duplicates
    if (seenCodes.has(code)) {
      const existing = seenCodes.get(code);
      // Keep the one with the later createdAt
      const existingTime = existing.createdAt?.toMillis?.() || 0;
      const currentTime = data.createdAt?.toMillis?.() || 0;
      if (currentTime > existingTime) {
        // Current doc is newer, mark existing for deletion
        toDelete.push({ id: existing.id, reason: `duplicate code: ${code} (older)` });
        seenCodes.set(code, { id: doc.id, createdAt: data.createdAt });
      } else {
        // Existing is newer, mark current for deletion
        toDelete.push({ id: doc.id, reason: `duplicate code: ${code} (older)` });
      }
    } else {
      seenCodes.set(code, { id: doc.id, createdAt: data.createdAt });
    }
  });

  if (toDelete.length === 0) {
    console.log("  ✅ No records to delete.\n");
    return;
  }

  console.log(`  🗑️  Records to delete: ${toDelete.length}\n`);
  toDelete.forEach((d) => {
    console.log(`    - ${d.id} (${d.reason})`);
    if (d.data) {
      console.log(`      Name: ${d.data.firstName} ${d.data.lastName}`);
    }
  });

  if (DRY_RUN) {
    console.log("\n  ✅ Dry run complete — no data deleted.\n");
    return;
  }

  // Delete in batches of 500
  const batchSize = 500;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + batchSize);
    for (const { id } of chunk) {
      batch.delete(collectionRef.doc(id));
    }
    await batch.commit();
    console.log(`    Deleted ${Math.min(i + batchSize, toDelete.length)}/${toDelete.length}`);
  }

  console.log("\n  🎉 Cleanup complete!\n");
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
