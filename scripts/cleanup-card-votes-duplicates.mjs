/**
 * Find and remove duplicate `card_votes` documents.
 *
 * Why:
 * - Each guest may rate each card exactly once. The canonical document ID is
 *   deterministic: `${cardType}_${cardKey}_${guestId}` (see
 *   `web/invitation/src/card-votes.js` → `cardVoteDocId`), and the Firestore
 *   rules enforce that a guest can only write their own single vote doc.
 * - Before that doc-ID enforcement existed, a guest could end up with more
 *   than one vote doc for the same (cardType, cardKey, guestId) — which makes
 *   the UI show "2 votes" for a single guest.
 *
 * This script groups all `card_votes` docs by (cardType, cardKey, guestId) and
 * reports any group with more than one doc. In `--execute` mode it deletes the
 * extra duplicate docs, keeping the one whose ID matches the deterministic
 * pattern (falling back to the most recently updated doc).
 *
 * Usage:
 *   node scripts/cleanup-card-votes-duplicates.mjs            # dry-run
 *   node scripts/cleanup-card-votes-duplicates.mjs --execute  # apply
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const EXECUTE = process.argv.includes("--execute");
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));

const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../integraciones/google_sheets/service_account.json"), "utf8"),
);

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore(app, "boda-us-central1");
const votesRef = db.collection("card_votes");

/**
 * Build the canonical deterministic doc ID for a (card, guest) vote.
 * Mirrors `cardVoteDocId` in `web/invitation/src/card-votes.js`.
 */
function canonicalDocId(cardType, cardKey, guestId) {
  return `${cardType}_${cardKey}_${guestId}`;
}

async function main() {
  console.log(`cleanup-card-votes-duplicates :: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);

  const snap = await votesRef.get();
  const docs = [];
  snap.forEach((doc) => {
    const data = doc.data();
    docs.push({
      id: doc.id,
      cardType: data?.cardType ?? "",
      cardKey: data?.cardKey ?? "",
      guestId: data?.guestId ?? "",
      rating: data?.rating ?? null,
      updatedAt: data?.updatedAt?.toDate?.() ?? null,
    });
  });

  console.log(`card_votes total: ${docs.length}`);

  // Group by (cardType, cardKey, guestId).
  const groups = new Map();
  for (const d of docs) {
    const key = `${d.cardType}\u0000${d.cardKey}\u0000${d.guestId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`unique (cardType, cardKey, guestId) groups: ${groups.size}`);
  console.log(`groups with >1 doc (duplicates): ${duplicateGroups.length}`);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate card_votes found. Nothing to clean.");
    return;
  }

  // Decide which doc to keep per group and which to delete.
  const toDelete = [];
  for (const group of duplicateGroups) {
    // Prefer the doc whose ID matches the deterministic pattern.
    const canonical = group.find(
      (d) => d.id === canonicalDocId(d.cardType, d.cardKey, d.guestId),
    );
    let keep;
    if (canonical) {
      keep = canonical;
    } else {
      // No canonical ID: keep the most recently updated doc.
      keep = group.reduce((a, b) => {
        const at = a.updatedAt?.getTime?.() ?? 0;
        const bt = b.updatedAt?.getTime?.() ?? 0;
        return bt > at ? b : a;
      });
    }
    for (const d of group) {
      if (d.id !== keep.id) toDelete.push(d);
    }
  }

  console.log(`Docs to delete: ${toDelete.length}`);
  for (const d of toDelete) {
    console.log(
      `  delete ${d.id}  (cardType=${d.cardType}, cardKey=${d.cardKey}, guestId=${d.guestId}, rating=${d.rating})`,
    );
  }

  if (!EXECUTE) {
    console.log("Dry-run complete. Re-run with --execute to delete duplicates.");
    return;
  }

  let writes = 0;
  let batch = db.batch();
  for (const d of toDelete) {
    batch.delete(votesRef.doc(d.id));
    writes++;
    if (writes % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (writes % 400 !== 0) {
    await batch.commit();
  }
  console.log(`Deleted ${writes} duplicate card_votes docs.`);

  // Verify.
  const verifySnap = await votesRef.get();
  const verifyGroups = new Map();
  verifySnap.forEach((doc) => {
    const data = doc.data();
    const key = `${data?.cardType ?? ""}\u0000${data?.cardKey ?? ""}\u0000${data?.guestId ?? ""}`;
    if (!verifyGroups.has(key)) verifyGroups.set(key, []);
    verifyGroups.get(key).push(doc.id);
  });
  const remainingDups = [...verifyGroups.values()].filter((g) => g.length > 1).length;
  console.log(`Verification - remaining duplicate groups: ${remainingDups}`);
}

main().catch((error) => {
  console.error("cleanup failed", error);
  process.exit(1);
});
