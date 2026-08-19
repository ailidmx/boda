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

/**
 * Per-genre cache of loaded ratings, keyed by `genreId`. This lets
 * `loadGenreRatings()` return from memory on subsequent calls for the same
 * genre instead of hitting Firestore once per rendered `GenreVote` widget.
 * Without it, a survey with N genres fires N identical `getDocs` queries on
 * page load.
 * @type {Map<string, Object[]>}
 */
const ratingsByGenre = new Map();

/**
 * Cache of ALL ratings loaded, keyed by `"all"`. Once `loadAllGenreRatings()`
 * resolves, every genre's ratings are available from `ratingsByGenre` and no
 * further per-genre queries are needed.
 * @type {Map<string, Object[]>}
 */
const allRatingsByKey = new Map();

/**
 * In-flight `loadAllGenreRatings()` promise. This dedups concurrent calls so N
 * rendered `GenreVote` widgets share a SINGLE `getDocs` query instead of firing
 * N identical queries.
 * @type {Promise<Object[]> | null}
 */
let allRatingsPromise = null;

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
    // Return from the per-genre cache when already loaded so multiple rendered
    // `GenreVote` widgets for the same genre don't each fire a Firestore query.
    if (ratingsByGenre.has(genreId)) {
      return ratingsByGenre.get(genreId);
    }
    // Load ALL ratings in a single query. `loadAllGenreRatings()` populates the
    // per-genre cache for every genre, so the first `GenreVote` to mount
    // triggers one `getDocs` and every other genre reads from memory — N genres
    // → 1 query instead of N queries.
    await loadAllGenreRatings();
    return ratingsByGenre.get(genreId) || [];
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
 * Load ALL genre ratings in a single query.
 *
 * Populates the per-genre cache (`ratingsByGenre`) for every genre so a later
 * `loadGenreRatings(genreId)` returns from memory. Concurrent calls share one
 * in-flight promise so N rendered `GenreVote` widgets fire a single `getDocs`.
 *
 * @returns {Promise<Object[]>} array of all rating documents
 */
export async function loadAllGenreRatings() {
  // Return from the all-ratings cache when already loaded.
  if (allRatingsByKey.has("all")) {
    return allRatingsByKey.get("all");
  }
  // Dedup concurrent calls: if a load is already in flight, await the SAME
  // promise instead of firing another `getDocs`.
  if (allRatingsPromise) {
    return allRatingsPromise;
  }
  const promise = (async () => {
    try {
      logDb("read:start", {
        collection: collections.genreRatings,
        op: "getDocs",
        where: {},
      });
      const q = query(collection(db, collections.genreRatings));

      const snapshot = await getDocs(q);
      const ratings = [];
      // Group the loaded ratings by genre so the per-genre cache is populated
      // too. This way a later `loadGenreRatings(genreId)` for any of these
      // genres returns from memory instead of firing another query.
      const byGenre = new Map();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ratingCache.set(docSnap.id, data);
        ratings.push(data);
        const genreId = data.genreId;
        if (!byGenre.has(genreId)) byGenre.set(genreId, []);
        byGenre.get(genreId).push(data);
      });
      byGenre.forEach((genreRatings, genreId) =>
        ratingsByGenre.set(genreId, genreRatings),
      );
      allRatingsByKey.set("all", ratings);
      logDb("read:success", {
        collection: collections.genreRatings,
        op: "getDocs",
        where: {},
        size: snapshot.size,
      });
      return ratings;
    } catch (error) {
      logDb("read:error", {
        collection: collections.genreRatings,
        op: "getDocs",
        where: {},
        error: error.message,
      });
      console.warn("[genre-ratings] Could not load genre ratings", error.message);
      return [];
    } finally {
      // Allow a future reload after a failure (don't cache a rejected promise).
      allRatingsPromise = null;
    }
  })();
  allRatingsPromise = promise;
  return promise;
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
    // Keep the per-genre cache in sync so the widget's average/count reflect
    // the new rating without a re-fetch.
    const existing = ratingsByGenre.get(genreId) || [];
    const withoutMine = existing.filter((r) => r.guestId !== guestId);
    ratingsByGenre.set(genreId, [...withoutMine, { ...next }]);
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
