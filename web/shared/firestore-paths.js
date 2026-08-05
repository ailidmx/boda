/**
 * Centralized Firestore collection names and path builders.
 *
 * This is the single source of truth for Firestore collection names and
 * document paths across BOTH the guest-facing invitation app and the
 * back-office dashboard. No other file should hard-code a collection name
 * or construct a document path directly.
 *
 * Usage:
 *   import { collections, guestDoc, attendanceDoc, groupDoc } from "../../shared/firestore-paths.js";
 *
 *   const ref = doc(db, collections.guests, guestId);
 *   const q = query(collection(db, collections.guests), where("invitationGroup", "==", group));
 */

/** All Firestore collection names used by the application. */
export const collections = {
  /** Guest records (live, user-editable data). Source of truth for contact details. */
  guests: "guests",
  /** Invitation groups (custom content, tags). */
  invitationGroups: "invitation_groups",
  /** Room inventory (public content). */
  rooms: "rooms",
  /** Cabin inventory + showcase (public content). */
  cabins: "cabins",
  /** RSVP form submissions. */
  rsvpSubmissions: "rsvp_submissions",
  /** Petanque participation form submissions. */
  petanqueParticipation: "petanque_participation",
  /** Coast interest form submissions. */
  coastInterest: "coast_interest",
  /** Experience suggestions form submissions. */
  experienceSuggestions: "experience_suggestions",
  /** Attendance responses (save-the-date). */
  attendanceResponses: "attendance_responses",
  /** Thanks / greetings (public content). */
  thanks: "thanks",
};


/**
 * Build a document reference path for a guest.
 * @param {string} guestId
 * @returns {string} e.g. "guests/abc123"
 */
export function guestDoc(guestId) {
  return `${collections.guests}/${guestId}`;
}

/**
 * Build a document reference path for an invitation group.
 * @param {string} groupName
 * @returns {string} e.g. "invitation_groups/familia-david"
 */
export function groupDoc(groupName) {
  return `${collections.invitationGroups}/${groupName}`;
}

/**
 * Build a document reference path for an attendance response.
 * @param {string} guestId
 * @returns {string} e.g. "attendance_responses/abc123"
 */
export function attendanceDoc(guestId) {
  return `${collections.attendanceResponses}/${guestId}`;
}

/**
 * Build a document reference path for a room.
 * @param {string} roomId
 * @returns {string} e.g. "rooms/VILLA MARGARITA-1"
 */
export function roomDoc(roomId) {
  return `${collections.rooms}/${roomId}`;
}
