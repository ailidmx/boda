/**
 * Ranked ordering of the guisos dishes.
 *
 * Each guest ranks the guisos dishes in their preferred order (1st element =
 * favourite) and marks the dishes they want "in the menu" (the top 9). The
 * ranking lives in Firestore under `guiso_rankings/{guestId}` — one document
 * per guest. The document ID is enforced by the Firestore rules so a guest can
 * only ever create/update their own ranking.
 *
 * Firestore rules allow any authenticated guest to read all rankings so the
 * couple can aggregate the results.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { sourceHost } from "./environment.js";
import { collections } from "../../shared/firestore-paths.js";
import { buildGuisoRankingPayload } from "../../shared/payload-builders.js";
import { validateGuisoRankingPayload } from "../../shared/validation.js";

/** @type {Map<string, Object>} */
const rankingCache = new Map();

function logDb(event, detail) {
  console.log(`[db][guiso-rankings][${event}]`, detail);
}

/**
 * Load a single guest's ranking into the cache and return it.
 * @param {string} guestId  the ranking guest's id (== auth uid)
 * @returns {Promise<Object|null>} the ranking document, or null if none saved
 */
export async function loadGuisoRanking(guestId) {
  if (!guestId) {
    console.warn("[guiso-rankings] Missing guestId; skipping load");
    return null;
  }
  try {
    logDb("read:start", {
      collection: collections.guisoRankings,
      docId: guestId,
      op: "getDoc",
    });
    const ref = doc(db, collections.guisoRankings, guestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      logDb("read:empty", {
        collection: collections.guisoRankings,
        docId: guestId,
        op: "getDoc",
      });
      return null;
    }
    const data = snap.data();
    rankingCache.set(guestId, data);
    logDb("read:success", {
      collection: collections.guisoRankings,
      docId: guestId,
      op: "getDoc",
    });
    return data;
  } catch (error) {
    logDb("read:error", {
      collection: collections.guisoRankings,
      docId: guestId,
      op: "getDoc",
      error: error.message,
    });
    console.warn("[guiso-rankings] Could not load ranking", error.message);
    return null;
  }
}

/**
 * Load all guest rankings (for aggregation by the couple).
 * @returns {Promise<Object[]>} array of ranking documents
 */
export async function loadAllGuisoRankings() {
  try {
    logDb("read:start", {
      collection: collections.guisoRankings,
      op: "getDocs",
    });
    const q = collection(db, collections.guisoRankings);
    const snapshot = await getDocs(q);
    const rankings = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rankingCache.set(docSnap.id, data);
      rankings.push(data);
    });
    logDb("read:success", {
      collection: collections.guisoRankings,
      op: "getDocs",
      size: snapshot.size,
    });
    return rankings;
  } catch (error) {
    logDb("read:error", {
      collection: collections.guisoRankings,
      op: "getDocs",
      error: error.message,
    });
    console.warn("[guiso-rankings] Could not load all rankings", error.message);
    return [];
  }
}

/**
 * Save (create or update) a guest's guiso ranking.
 *
 * @param {Object} input
 * @param {string} input.guestId   the ranking guest's id (== auth uid)
 * @param {string[]} input.ranking  dish names in order 1..N (all 20 dishes)
 * @param {string[]} input.selected dish names marked as in the menu (top 9)
 * @returns {Promise<void>}
 */
export async function saveGuisoRanking({ guestId, ranking, selected }) {
  if (!guestId) {
    throw new Error("Missing guestId");
  }
  const ref = doc(db, collections.guisoRankings, guestId);
  const next = buildGuisoRankingPayload({
    guestId,
    ranking,
    selected,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGuisoRankingFields).
  const result = validateGuisoRankingPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid guiso ranking payload: ${result.errors.join("; ")}`);
  }

  next.sourceHost = sourceHost();

  logDb("write:start", {
    collection: collections.guisoRankings,
    docId: guestId,
    op: "setDoc",
    merge: true,
    payload: next,
  });
  try {
    await setDoc(ref, next, { merge: true });
    rankingCache.set(guestId, { ...next });
    logDb("write:success", {
      collection: collections.guisoRankings,
      docId: guestId,
      op: "setDoc",
      merge: true,
      payload: next,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.guisoRankings,
      docId: guestId,
      op: "setDoc",
      merge: true,
      payload: next,
      error: error.message,
    });
    throw error;
  }
}
