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
 *
 * NOTE: This file is intentionally kept free of business logic. It only maps
 * collection names and path builders so both apps stay in sync.
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
  /** Attendance responses (save-the-date). */
  attendanceResponses: "attendance_responses",

  /** Thanks / greetings (public content). */
  thanks: "thanks",
  /** RSVP scale config table (levels 1–5, localized messages + emoji). */
  rsvpScale: "rsvp_scale",
  /** Per-guest RSVP answers (questionId → scale level). */
  rsvpResponses: "rsvp_responses",
  /** Star ratings for experience cards (food flavours / music acts). */
  cardVotes: "card_votes",
  /** Per-guest ranked ordering of the guisos dishes (1–20) + top-9 selection. */
  guisoRankings: "guiso_rankings",
  /** Guest song requests (title/artist + intent) for the music section. */
  songRequests: "song_requests",
  /** Per-guest 1–5 star ratings for music genres (genre survey). */
  genreRatings: "genre_ratings",
  /** Guest sign-in events (written on every real login). Readable by admins. */
  loginEvents: "login_events",
  /** Table inventory + seating assignments (admin-only planning). */
  tables: "tables",

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
