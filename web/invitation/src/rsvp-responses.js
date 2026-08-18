/**
 * RSVP responses — per-guest answers to the RSVP scale questions.
 *
 * Each guest's answers live on their OWN document in the `guests` collection,
 * inside the nested `rsvp.answers` map (questionId → scale level, int 0–5).
 * This keeps all live guest data in one place (the `guests` collection) rather
 * than a separate `rsvp_responses` collection.
 *
 * The `guests` collection is already kept in sync in memory by
 * `loadGuestProfiles()` (an `onSnapshot` listener), so reads resolve straight
 * from that cache. Writes go to `guests/{guestId}` with a `rsvp.answers` map.
 *
 * Firestore rules allow any authenticated guest to update the `rsvp` field of
 * themselves and of the other members of their invitation group (see
 * firebase/firestore.rules).
 */

import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";
import { resolveGuestInvitationGroup, resolveLiveGuest } from "./guest-profiles.js";
import { buildGuestRsvpPayload } from "../../shared/payload-builders.js";
import { validateGuestContactPayload } from "../../shared/validation.js";
import { UNANSWERED_LEVEL } from "./rsvp-scale.js";

function logDb(event, detail) {
  console.log(`[db][rsvp-responses][${event}]`, detail);
}

/**
 * Load the RSVP responses for the signed-in guest's OWN invitation group.
 *
 * The `guests` collection is already loaded and kept in sync by
 * `loadGuestProfiles()` (an `onSnapshot` listener), so there is nothing extra
 * to fetch here. This function is kept for backward compatibility with the
 * startup wiring in AppContext.
 *
 * @param {string} invitationGroup  the signed-in guest's invitation group
 * @returns {Promise<void>}
 */
export async function loadRsvpResponses(invitationGroup) {
  if (!invitationGroup) {
    console.warn("[rsvp-responses] No invitationGroup provided; skipping load");
    return;
  }
  // The `guests` collection is already live-synced via loadGuestProfiles().
  logDb("read:skip", {
    collection: collections.guests,
    reason: "guests collection already live-synced via loadGuestProfiles",
    invitationGroup,
  });
}

/**
 * Get the cached RSVP answers map for a guest id (or null).
 * @param {string} guestId
 * @returns {Object|null}
 */
export function getRsvpResponse(guestId) {
  if (!guestId) return null;
  const live = resolveLiveGuest({ id: guestId });
  return live?.rsvp?.answers || null;
}

/**
 * Resolve a guest's answer (scale level) for a given question.
 * Returns 0 (UNANSWERED_LEVEL) when no answer exists.
 * @param {Object} guest  static guest from guests.js
 * @param {string} questionId
 * @returns {number}
 */
export function resolveRsvpAnswer(guest, questionId) {
  if (!guest?.id) return UNANSWERED_LEVEL;
  const live = resolveLiveGuest(guest);
  const value = live?.rsvp?.answers?.[questionId];
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : UNANSWERED_LEVEL;
}

/**
 * Whether a question is fully answered by every guest in the group.
 *
 * A guest counts as "answered" when their level is > 0 — this covers both the
 * scale variant (levels 1–5) and the boolean variant (1 = yes, 2 = no). Level 0
 * (UNANSWERED_LEVEL) means the guest has not answered yet.
 *
 * @param {string} questionId
 * @param {Array<Object>} guests  the group members
 * @param {Object} answers  questionId → { guestId → level }
 * @param {Array<Object>} [applicableGuests]  optional subset of guests that
 *   must answer this question. When provided, only these guests are checked
 *   (e.g. a conditional question that only applies to some group members).
 * @returns {boolean}
 */
export function isQuestionAnswered(questionId, guests, answers, applicableGuests) {
  const toCheck = applicableGuests || guests;
  if (!toCheck || toCheck.length === 0) return false;
  const qAnswers = answers?.[questionId] || {};
  return toCheck.every((guest) => Number(qAnswers[guest.id]) > 0);
}


/**
 * Compute the initial step index for a FlipStepCard RSVP flow.
 *
 * Walks the question steps in order and returns the index of the first question
 * that is NOT fully answered by every group member. When every question is
 * answered, it returns the index of the last step (the recap / "resumen") so
 * the flow opens directly on the summary.
 *
 * @param {Array<{ id: string }>} questions  the question steps (in order)
 * @param {Array<Object>} guests  the group members
 * @param {Object} answers  questionId → { guestId → level }
 * @param {Object} [questionGuests]  optional map of questionId → array of
 *   guests that must answer that question. When a question is present in this
 *   map, only those guests are checked for completion (e.g. a conditional
 *   question that only applies to a subset of the group).
 * @returns {number}  the initial step index (0-based)
 */
export function computeInitialStepIndex(questions, guests, answers, questionGuests) {
  for (let i = 0; i < questions.length; i++) {
    const applicable = questionGuests?.[questions[i].id];
    if (!isQuestionAnswered(questions[i].id, guests, answers, applicable)) {
      return i;
    }
  }
  // Every question is answered → jump straight to the recap (last step).
  return questions.length;
}



/**
 * Save a guest's RSVP answers (a map of questionId → scale level). The
 * authenticated user must be the guest themselves or a member of the same
 * invitation group (enforced by rules).
 *
 * Answers are stored on the `guests` collection document, inside the nested
 * `rsvp.answers` map.
 *
 * @param {Object} guest  static guest from guests.js
 * @param {Record<string, number>} answers  questionId → level (0–5)
 * @param {string} editorGuestId  the signed-in guest id performing the edit
 * @returns {Promise<void>}
 */
export async function saveRsvpAnswers(guest, answers, editorGuestId) {
  if (!guest?.id) throw new Error("No guest id");
  const ref = doc(db, collections.guests, guest.id);
  const invitationGroup = resolveGuestInvitationGroup(guest);
  if (!invitationGroup) {
    logDb("write:blocked", {
      collection: collections.guests,
      docId: guest.id,
      reason: "missing-invitation-group",
    });
    throw new Error("Guest invitation group is missing in Firestore.");
  }

  const next = buildGuestRsvpPayload({
    guestId: guest.id,
    answers,
    editorGuestId,
    timestamp: serverTimestamp(),
  });


  // Runtime validation mirrors the Firestore rules (hasValidGuestContactFields).
  const result = validateGuestContactPayload(next);
  if (!result.valid) {
    throw new Error(`Invalid RSVP payload: ${result.errors.join("; ")}`);
  }

  logDb("write:start", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  try {
    await setDoc(ref, next, { merge: true });
    logDb("write:success", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next });
  } catch (error) {
    logDb("write:error", { collection: collections.guests, docId: guest.id, op: "setDoc", merge: true, payload: next, error: error.message });
    throw error;
  }
}
