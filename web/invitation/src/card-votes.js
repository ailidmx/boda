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
import { collections } from "../../shared/firestore-paths.js";
import { buildCardVotePayload } from "../../shared/payload-builders.js";
import { validateCardVotePayload } from "../../shared/validation.js";

/** @type {Map<string, Object>} */
const voteCache = new Map();

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
    logDb("read:start", {
      collection: collections.cardVotes,
      op: "getDocs",
      where: { cardType, cardKey },
    });
    const q = query(
      collection(db, collections.cardVotes),
      where("cardType", "==", cardType),
      where("cardKey", "==", cardKey),
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
      where: { cardType, cardKey },
      size: snapshot.size,
    });
    return votes;
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
