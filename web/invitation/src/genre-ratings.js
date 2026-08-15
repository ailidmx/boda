/**
 * 1–5 star ratings for music genres (the genre survey).
 *
 * Each guest can rate each genre once with 1–5 stars. Ratings live in Firestore
 * under `genre_ratings/{genreId}_{guestId}` — one document per (genre, guest)
 * pair. The document ID is enforced by the Firestore rules so a guest can only
 * ever create/update their own single rating for a given genre.
 *
 * A parent genre and its subgenres are rated independently — rating a parent
 * never overwrites a child's rating (each has its own document).
 *
 * Firestore rules allow any authenticated guest to read all ratings so the app
 * can compute the average rating and vote count for each genre.
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
import { buildGenreRatingPayload } from "../../shared/payload-builders.js";
import { validateGenreRatingPayload } from "../../shared/validation.js";

/** @type {Map<string, Object>} */
const ratingCache = new Map();

function logDb(event, detail) {
  console.log(`[db][genre-ratings][${event}]`, detail);
}

/**
 * Build the deterministic document ID for a (genre, guest) rating.
 * @param {string} genreId  the stable curated genre id
 * @param {string} guestId  the rating guest's id
 * @returns {string}
 */
export function genreRatingDocId(genreId, guestId) {
  return `${genreId}_${guestId}`;
}

/**
 * Load all ratings for a given genre into the cache and return them.
 * @param {string} genreId  the stable curated genre id
 * @returns {Promise<Object[]>} array of rating documents
 */
export async function loadGenreRatings(genreId) {
  try {
    if (!genreId) {
      console.warn("[genre-ratings] Missing genreId; skipping load");
      return [];
    }
    logDb("read:start", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { genreId },
    });
    const q = query(
      collection(db, collections.genreRatings),
      where("genreId", "==", genreId),
    );

    const snapshot = await getDocs(q);
    const ratings = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      ratingCache.set(docSnap.id, data);
      ratings.push(data);
    });
    logDb("read:success", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { genreId },
      size: snapshot.size,
    });
    return ratings;
  } catch (error) {
    logDb("read:error", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { genreId },
      error: error.message,
    });
    console.warn("[genre-ratings] Could not load genre ratings", error.message);
    return [];
  }
}

/**
 * Load all of a single guest's genre ratings.
 *
 * Useful for pre-filling the survey with the guest's own star ratings.
 *
 * @param {string} guestId  the rating guest's id (== auth uid)
 * @returns {Promise<Object[]>} array of rating documents for this guest
 */
export async function loadGuestGenreRatings(guestId) {
  try {
    if (!guestId) {
      console.warn("[genre-ratings] Missing guestId; skipping load");
      return [];
    }
    logDb("read:start", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { guestId },
    });
    const q = query(
      collection(db, collections.genreRatings),
      where("guestId", "==", guestId),
    );

    const snapshot = await getDocs(q);
    const ratings = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      ratingCache.set(docSnap.id, data);
      ratings.push(data);
    });
    logDb("read:success", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { guestId },
      size: snapshot.size,
    });
    return ratings;
  } catch (error) {
    logDb("read:error", {
      collection: collections.genreRatings,
      op: "getDocs",
      where: { guestId },
      error: error.message,
    });
    console.warn("[genre-ratings] Could not load guest genre ratings", error.message);
    return [];
  }
}

/**
 * Save (create or update) a guest's star rating for a genre.
 *
 * @param {Object} input
 * @param {string} input.genreId    the stable curated genre id
 * @param {string} input.genreName  the human-readable genre name
 * @param {string} input.guestId    the rating guest's id (== auth uid)
 * @param {number} input.rating     integer 1–5
 * @returns {Promise<void>}
 */
export async function saveGenreRating({ genreId, genreName, guestId, rating }) {
  if (!genreId || !genreName || !guestId) {
    throw new Error("Missing genreId, genreName or guestId");
  }
  const docId = genreRatingDocId(genreId, guestId);
  const ref = doc(db, collections.genreRatings, docId);
  const next = buildGenreRatingPayload({
    genreId,
    genreName,
    guestId,
    rating,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidGenreRatingFields).
  const result = validateGenreRatingPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid genre rating payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", {
    collection: collections.genreRatings,
    docId,
    op: "setDoc",
    merge: true,
    payload: next,
  });
  try {
    await setDoc(ref, next, { merge: true });
    ratingCache.set(docId, { ...next });
    logDb("write:success", {
      collection: collections.genreRatings,
      docId,
      op: "setDoc",
      merge: true,
      payload: next,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.genreRatings,
      docId,
      op: "setDoc",
      merge: true,
      payload: next,
      error: error.message,
    });
    throw error;
  }
}
