/**
 * Star ratings for experience cards (food flavours / music acts).
 *
 * Each guest can rate each card once with 1–5 stars. Votes live in Firestore
 * under `card_votes/{cardType}_{cardKey}_{guestId}` — one document per
 * (card, guest) pair. The document ID is enforced by the Firestore rules so a
 * guest can only ever create/update their own single vote for a given card.
 *
 * Firestore rules allow any authenticated guest to read all votes so the app
 * can compute the average rating and vote count for each card.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { sourceHost } from "./environment.js";
import { collections } from "../../shared/firestore-paths.js";
import { buildCardVotePayload } from "../../shared/payload-builders.js";
import { validateCardVotePayload } from "../../shared/validation.js";

/** @type {Map<string, Object>} */
const voteCache = new Map();

/**
 * Per-card cache of loaded votes, keyed by `${cardType}::${cardKey}`. This lets
 * `loadCardVotes()` return from memory on subsequent calls for the same card
 * instead of hitting Firestore once per rendered `StarVote` widget. Without it,
 * a section with N cards fires N identical `getDocs` queries on page load.
 * @type {Map<string, Object[]>}
 */
const cardVotesByKey = new Map();

/**
 * Cache of ALL votes loaded per card type, keyed by `cardType`. Once
 * `loadAllCardVotes(cardType)` resolves, every card of that type is available
 * from `cardVotesByKey` and no further per-card queries are needed.
 * @type {Map<string, Object[]>}
 */
const allVotesByType = new Map();

/**
 * In-flight `loadAllCardVotes(cardType)` promises, keyed by `cardType`. This
 * dedups concurrent calls so N rendered `StarVote` widgets for the same card
 * type share a SINGLE `getDocs` query instead of firing N identical queries.
 * @type {Map<string, Promise<Object[]>>}
 */
const allVotesPromiseByType = new Map();

function cardCacheKey(cardType, cardKey) {
  return `${cardType}::${cardKey}`;
}


function logDb(event, detail) {
  console.log(`[db][card-votes][${event}]`, detail);
}


/**
 * Build the deterministic document ID for a (card, guest) vote.
 * @param {string} cardType  "food" | "music"
 * @param {string} cardKey   the flavour key or act name
 * @param {string} guestId   the voting guest's id
 * @returns {string}
 */
export function cardVoteDocId(cardType, cardKey, guestId) {
  return `${cardType}_${cardKey}_${guestId}`;
}

/**
 * Load all votes for a given card into the cache and return them.
 * @param {string} cardType  "food" | "music"
 * @param {string} cardKey   the flavour key or act name
 * @returns {Promise<Object[]>} array of vote documents
 */
export async function loadCardVotes(cardType, cardKey) {
  try {
    if (!cardType || !cardKey) {
      console.warn("[card-votes] Missing cardType/cardKey; skipping load");
      return [];
    }
    const cacheKey = cardCacheKey(cardType, cardKey);
    // Return from the per-card cache when already loaded so multiple rendered
    // `StarVote` widgets for the same card don't each fire a Firestore query.
    if (cardVotesByKey.has(cacheKey)) {
      return cardVotesByKey.get(cacheKey);
    }
    // Load ALL votes for this card type in a single query. `loadAllCardVotes`
    // populates the per-card cache for every card of the type, so the first
    // `StarVote` to mount triggers one `getDocs` and every other card reads
    // from memory — N cards → 1 query instead of N queries.
    await loadAllCardVotes(cardType);
    return cardVotesByKey.get(cacheKey) || [];
  } catch (error) {
    logDb("read:error", {
      collection: collections.cardVotes,
      op: "getDocs",
      where: { cardType, cardKey },
      error: error.message,
    });
    console.warn("[card-votes] Could not load card votes", error.message);
    return [];
  }
}



/**
 * Load ALL votes for a given card type in a single query.
 *
 * Useful for computing the aggregate ("general") score per card across all
 * guests (e.g. the average star rating shown next to each dish in the guisos
 * reorder panel).
 *
 * @param {string} cardType  "food" | "music" | "guiso"
 * @returns {Promise<Object[]>} array of all vote documents of this card type
 */
export async function loadAllCardVotes(cardType) {
  if (!cardType) {
    console.warn("[card-votes] Missing cardType; skipping load");
    return [];
  }
  // Return from the all-votes cache when already loaded.
  if (allVotesByType.has(cardType)) {
    return allVotesByType.get(cardType);
  }
  // Dedup concurrent calls: if a load for this cardType is already in flight,
  // await the SAME promise instead of firing another `getDocs`.
  if (allVotesPromiseByType.has(cardType)) {
    return allVotesPromiseByType.get(cardType);
  }
  const promise = (async () => {
    try {
      logDb("read:start", {
        collection: collections.cardVotes,
        op: "getDocs",
        where: { cardType },
      });
      const q = query(
        collection(db, collections.cardVotes),
        where("cardType", "==", cardType),
      );

      const snapshot = await getDocs(q);
      const votes = [];
      // Group the loaded votes by card so the per-card cache is populated too.
      // This way a later `loadCardVotes(cardType, cardKey)` for any of these
      // cards returns from memory instead of firing another query.
      const byCard = new Map();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        voteCache.set(docSnap.id, data);
        votes.push(data);
        const key = cardCacheKey(data.cardType, data.cardKey);
        if (!byCard.has(key)) byCard.set(key, []);
        byCard.get(key).push(data);
      });
      byCard.forEach((cardVotes, key) => cardVotesByKey.set(key, cardVotes));
      allVotesByType.set(cardType, votes);
      logDb("read:success", {
        collection: collections.cardVotes,
        op: "getDocs",
        where: { cardType },
        size: snapshot.size,
      });
      return votes;
    } catch (error) {
      logDb("read:error", {
        collection: collections.cardVotes,
        op: "getDocs",
        where: { cardType },
        error: error.message,
      });
      console.warn("[card-votes] Could not load card votes", error.message);
      return [];
    } finally {
      // Allow a future reload after a failure (don't cache a rejected promise).
      allVotesPromiseByType.delete(cardType);
    }
  })();
  allVotesPromiseByType.set(cardType, promise);
  return promise;
}


/**
 * Load all of a single guest's votes for a given card type.
 *
 * Useful for building a "pre-order" from the guest's own star ratings (e.g.
 * rank the guisos by their 5-star dishes first, then 4-star, etc.).
 *
 * @param {string} cardType  "food" | "music" | "guiso"
 * @param {string} guestId   the voting guest's id (== auth uid)
 * @returns {Promise<Object[]>} array of vote documents for this guest
 */
export async function loadGuestCardVotes(cardType, guestId) {
  try {
    if (!cardType || !guestId) {
      console.warn("[card-votes] Missing cardType/guestId; skipping load");
      return [];
    }
    logDb("read:start", {
      collection: collections.cardVotes,
      op: "getDocs",
      where: { cardType, guestId },
    });
    const q = query(
      collection(db, collections.cardVotes),
      where("cardType", "==", cardType),
      where("guestId", "==", guestId),
    );

    const snapshot = await getDocs(q);
    const votes = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      voteCache.set(docSnap.id, data);
      votes.push(data);
    });
    logDb("read:success", {
      collection: collections.cardVotes,
      op: "getDocs",
      where: { cardType, guestId },
      size: snapshot.size,
    });
    return votes;
  } catch (error) {
    logDb("read:error", {
      collection: collections.cardVotes,
      op: "getDocs",
      where: { cardType, guestId },
      error: error.message,
    });
    console.warn("[card-votes] Could not load guest card votes", error.message);
    return [];
  }
}


/**
 * Save (create or update) a guest's star rating for a card.
 *
 * @param {Object} input
 * @param {string} input.cardType  "food" | "music"
 * @param {string} input.cardKey   the flavour key or act name
 * @param {string} input.guestId   the voting guest's id (== auth uid)
 * @param {number} input.rating    integer 1–5
 * @returns {Promise<void>}
 */
export async function saveCardVote({ cardType, cardKey, guestId, rating }) {

  if (!cardType || !cardKey || !guestId) {
    throw new Error("Missing cardType, cardKey or guestId");
  }
  const docId = cardVoteDocId(cardType, cardKey, guestId);
  const ref = doc(db, collections.cardVotes, docId);
  const next = buildCardVotePayload({
    cardType,
    cardKey,
    guestId,
    rating,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidCardVoteFields).
  const result = validateCardVotePayload(next);
  if (!result.valid) {
    throw new Error(`Invalid card vote payload: ${result.errors.join("; ")}`);
  }

  next.sourceHost = sourceHost();

  logDb("write:start", {
    collection: collections.cardVotes,
    docId,
    op: "setDoc",
    merge: true,
    payload: next,
  });
  try {
    await setDoc(ref, next, { merge: true });
    voteCache.set(docId, { ...next });
    // Keep the per-card cache in sync so the widget's average/count reflect
    // the new vote without a re-fetch.
    const cacheKey = cardCacheKey(cardType, cardKey);
    const existing = cardVotesByKey.get(cacheKey) || [];
    const withoutMine = existing.filter((v) => v.guestId !== guestId);
    cardVotesByKey.set(cacheKey, [...withoutMine, { ...next }]);
    logDb("write:success", {
      collection: collections.cardVotes,
      docId,
      op: "setDoc",
      merge: true,
      payload: next,
    });
  } catch (error) {

    logDb("write:error", {
      collection: collections.cardVotes,
      docId,
      op: "setDoc",
      merge: true,
      payload: next,
      error: error.message,
    });
    throw error;
  }
}
