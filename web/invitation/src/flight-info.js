/**
 * Guest flight information for the Travel section.
 *
 * Each guest can record their flight details (origin, connections,
 * destination, arrival date/time, final flight number) so the couple can
 * coordinate airport pickups. The data lives on the guest's own document in
 * the `guests` collection, inside the nested `flightInfo` map — the same
 * collection that holds contact details and RSVP answers, so all live guest
 * data stays in one place.
 *
 * The Firestore rules allow a guest to write `flightInfo` on their own guest
 * document (and on members of their own invitation group), and any
 * authenticated guest to read all guests.
 */

import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";
import { buildGuestFlightInfoPayload } from "../../shared/payload-builders.js";
import { validateGuestContactPayload } from "../../shared/validation.js";

function logDb(event, detail) {
  console.log(`[db][flight-info][${event}]`, detail);
}

/**
 * Save a guest's flight information.
 *
 * Writes to `guests/{guestId}` with `{ merge: true }` so only the `flightInfo`
 * map (plus metadata) is touched — other guest fields are left intact.
 *
 * @param {Object} input
 * @param {string} input.guestId        the guest's id (== auth uid)
 * @param {Object|null} input.origin        departure airport (normalized)
 * @param {Object|null} input.destination   arrival airport (normalized)
 * @param {Array<Object>} [input.connections]  connecting airports (0–3)
 * @param {Array<Object>} [input.legs]      flight legs (0–4)
 * @param {string} [input.arrivalDate]      YYYY-MM-DD
 * @param {string} [input.arrivalTime]      HH:MM
 * @param {string} [input.finalFlightNumber]
 * @param {Object} [input.departure]        return-trip details (origin,
 *   connections, destination, legs, departureDate, departureTime,
 *   finalFlightNumber)
 * @returns {Promise<void>}
 */
export async function saveFlightInfo({
  guestId,
  origin,
  destination,
  connections = [],
  legs = [],
  arrivalDate,
  arrivalTime,
  finalFlightNumber,
  departure,
}) {
  if (!guestId) {
    throw new Error("Missing guestId");
  }

  const ref = doc(db, collections.guests, guestId);
  const next = buildGuestFlightInfoPayload({
    guestId,
    origin,
    destination,
    connections,
    legs,
    arrivalDate,
    arrivalTime,
    finalFlightNumber,
    departure,
    editorGuestId: guestId,
    timestamp: serverTimestamp(),
  });

  // Runtime validation mirrors the Firestore rules (hasValidFlightInfo).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid flight info payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", {
    collection: collections.guests,
    docId: guestId,
    op: "setDoc(merge)",
    payload: next,
  });
  try {
    await setDoc(ref, next, { merge: true });
    logDb("write:success", {
      collection: collections.guests,
      docId: guestId,
      op: "setDoc(merge)",
      payload: next,
    });
  } catch (error) {
    logDb("write:error", {
      collection: collections.guests,
      docId: guestId,
      op: "setDoc(merge)",
      payload: next,
      error: error.message,
    });
    throw error;
  }
}
