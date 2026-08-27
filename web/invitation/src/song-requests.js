/**
 * Guest song requests for the music section.
 *
 * Each guest can submit one or more song requests (title/artist + intent).
 * Requests live in Firestore under `song_requests/{requestId}` — one document
 * per request, with an auto-generated id. The Firestore rules allow a guest to
 * create their own requests (guestId == auth.uid) and any authenticated guest
 * to read all requests so the couple can aggregate the results.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";


import { db } from "./firebase.js";
import { sourceHost } from "./environment.js";
import { collections } from "../../shared/firestore-paths.js";
import { buildSongRequestPayload } from "../../shared/payload-builders.js";
import { validateSongRequestPayload } from "../../shared/validation.js";

function logDb(event, detail) {
  console.log(`[db][song-requests][${event}]`, detail);
}

/**
 * Load all song requests (for aggregation by the couple).
 * @returns {Promise<Object[]>} array of song request documents
 */
export async function loadAllSongRequests() {
  try {
    logDb("read:start", {
      collection: collections.songRequests,
      op: "getDocs",
    });
    const q = collection(db, collections.songRequests);
    const snapshot = await getDocs(q);
    const requests = [];
    snapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() });
    });
    logDb("read:success", {
      collection: collections.songRequests,
      op: "getDocs",
      size: snapshot.size,
    });
    return requests;
  } catch (error) {
    logDb("read:error", {
      collection: collections.songRequests,
      op: "getDocs",
      error: error.message,
    });
    console.warn("[song-requests] Could not load all requests", error.message);
    return [];
  }
}

/**
 * Save a guest's song request.
 *
 * @param {Object} input
 * @param {string} input.guestId   the requesting guest's id (== auth uid)
 * @param {string} input.song      the requested song title (and artist)
 * @param {string} input.intent    one of: hear, sing, karaoke, band
 * @param {string} [input.bandType] which live band should play it, only when
 *                                  intent == "band" (marimba | mariachi |
 *                                  norteno | frenchBand). Optional.
 * @param {Object} [input.songMeta] normalized song identity (optional, from the
 *                                  autocomplete: title, artist, year, externalId,
 *                                  source, isrc)
 * @param {string} [input.assignedGuestId] the guest the song is FOR (defaults
 *                                  to the requesting guest). Lets a guest
 *                                  request a song on behalf of a group member.
 * @returns {Promise<void>}
 */
export async function saveSongRequest({ guestId, song, intent, bandType, songMeta, assignedGuestId }) {
  if (!guestId) {
    throw new Error("Missing guestId");
  }
  const ref = collection(db, collections.songRequests);
  const next = buildSongRequestPayload({
    guestId,
    song,
    intent,
    bandType,
    songMeta,
    assignedGuestId,
    timestamp: serverTimestamp(),
  });




  // Runtime validation mirrors the Firestore rules (hasValidSongRequestFields).
  const result = validateSongRequestPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid song request payload: ${result.errors.join("; ")}`);
  }

  next.sourceHost = sourceHost();

  logDb("write:start", {
    collection: collections.songRequests,
    op: "addDoc",
    payload: next,
  });
  try {
    await addDoc(ref, next);
    logDb("write:success", {
      collection: collections.songRequests,
      op: "addDoc",
      payload: next,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.songRequests,
      op: "addDoc",
      payload: next,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Load the song requests submitted by a single guest.
 * @param {string} guestId the requesting guest's id (== auth uid)
 * @returns {Promise<Object[]>} array of that guest's song request documents
 */
export async function loadGuestSongRequests(guestId) {
  if (!guestId) {
    return [];
  }
  try {
    logDb("read:start", {
      collection: collections.songRequests,
      op: "getDocs",
      guestId,
    });
    const q = query(
      collection(db, collections.songRequests),
      where("guestId", "==", guestId)
    );
    const snapshot = await getDocs(q);
    const requests = [];
    snapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() });
    });
    logDb("read:success", {
      collection: collections.songRequests,
      op: "getDocs",
      guestId,
      size: snapshot.size,
    });
    return requests;
  } catch (error) {
    logDb("read:error", {
      collection: collections.songRequests,
      op: "getDocs",
      guestId,
      error: error.message,
    });
    console.warn("[song-requests] Could not load guest requests", error.message);
    return [];
  }
}

/**
 * Update an existing song request (e.g. change the song, intent, or band).
 *
 * @param {Object} input
 * @param {string} input.requestId the song request document id
 * @param {string} input.guestId   the requesting guest's id (== auth uid)
 * @param {string} input.song      the requested song title (and artist)
 * @param {string} input.intent    one of: hear, sing, karaoke, band
 * @param {string} [input.bandType] which live band should play it, only when
 *                                  intent == "band". Optional.
 * @param {Object} [input.songMeta] normalized song identity (optional)
 * @param {string} [input.assignedGuestId] the guest the song is FOR (defaults
 *                                  to the requesting guest).
 * @returns {Promise<void>}
 */
export async function updateSongRequest({ requestId, guestId, song, intent, bandType, songMeta, assignedGuestId }) {
  if (!requestId || !guestId) {
    throw new Error("Missing requestId or guestId");
  }
  const ref = doc(db, collections.songRequests, requestId);
  const next = buildSongRequestPayload({
    guestId,
    song,
    intent,
    bandType,
    songMeta,
    assignedGuestId,
    timestamp: serverTimestamp(),
  });


  const result = validateSongRequestPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid song request payload: ${result.errors.join("; ")}`);
  }

  next.sourceHost = sourceHost();

  logDb("write:start", {
    collection: collections.songRequests,
    op: "setDoc",
    requestId,
    payload: next,
  });
  try {
    await setDoc(ref, next, { merge: true });
    logDb("write:success", {
      collection: collections.songRequests,
      op: "setDoc",
      requestId,
      payload: next,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.songRequests,
      op: "setDoc",
      requestId,
      payload: next,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete a guest's own song request.
 * @param {string} requestId the song request document id
 * @returns {Promise<void>}
 */
export async function deleteSongRequest(requestId) {
  if (!requestId) {
    throw new Error("Missing requestId");
  }
  const ref = doc(db, collections.songRequests, requestId);
  logDb("write:start", {
    collection: collections.songRequests,
    op: "deleteDoc",
    requestId,
  });
  try {
    await deleteDoc(ref);
    logDb("write:success", {
      collection: collections.songRequests,
      op: "deleteDoc",
      requestId,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.songRequests,
      op: "deleteDoc",
      requestId,
      error: error.message,
    });
    throw error;
  }
}

