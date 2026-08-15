/**
 * Explicit, allowlisted payload builders and submission helpers for the
 * guest-facing RSVP, Coast, and petanque forms.
 *
 * These functions deliberately do NOT spread raw form values into Firestore.
 * Each payload is built field-by-field so that only the fields allowed by the
 * Firestore Security Rules (see firebase/firestore.rules) are ever written.
 *
 * The `invitationCode` field is intentionally omitted: it is no longer part of
 * the guest-facing schema (per-guest invitation links were removed in favor of
 * profile codes). It can be added later if the couple needs it for grouping.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";
import {
  validateRsvpPayload,
  validatePetanquePayload,
  validateCoastPayload,
} from "../../shared/validation.js";



/**
 * Split a combined "First Last" string into firstName and lastName.
 * The RSVP form collects a single `fullName` field, but the Firestore schema
 * stores `firstName`/`lastName` separately.
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

/**
 * Read a named field from a FormData object, returning a trimmed string.
 * @param {FormData} formData
 * @param {string} name
 * @returns {string}
 */
function field(formData, name) {
  const value = formData.get(name);
  return value == null ? "" : String(value).trim();
}

/**
 * Submit the RSVP form to `rsvp_submissions`.
 *
 * @param {FormData} formData  the RSVP form's FormData
 * @param {{ email: string, language: string }} context  signed-in user email + language
 * @returns {Promise<void>}
 */
export async function submitRsvp(formData, context) {
  const { firstName, lastName } = splitFullName(field(formData, "fullName"));
  const language = context.language || "es";

  const payload = {
    firstName,
    lastName,
    email: String(context.email || "").trim(),
    whatsapp: field(formData, "whatsapp"),
    attendance: field(formData, "attendance"),
    groupMode: field(formData, "groupMode"),
    groupName: field(formData, "groupName"),
    partySize: field(formData, "partySize"),
    adults: field(formData, "adults"),
    children: field(formData, "children"),
    guests: field(formData, "guests"),
    accommodation: field(formData, "accommodation"),
    travelStatus: field(formData, "travelStatus"),
    arrivalFrom: field(formData, "arrivalFrom"),
    arrivalTo: field(formData, "arrivalTo"),
    arrivalDate: field(formData, "arrivalDate"),
    arrivalTime: field(formData, "arrivalTime"),
    arrivalAirline: field(formData, "arrivalAirline"),
    arrivalFlight: field(formData, "arrivalFlight"),
    departureFrom: field(formData, "departureFrom"),
    departureTo: field(formData, "departureTo"),
    departureDate: field(formData, "departureDate"),
    departureTime: field(formData, "departureTime"),
    departureAirline: field(formData, "departureAirline"),
    departureFlight: field(formData, "departureFlight"),
    route: field(formData, "route"),
    notes: field(formData, "notes"),
    language,
    schemaVersion: 3,
    createdAt: serverTimestamp(),
  };

  // Runtime validation mirrors the Firestore rules (hasValidRsvpFields).
  const result = validateRsvpPayload(payload);
  if (!result.valid) {
    throw new Error(`Invalid RSVP payload: ${result.errors.join("; ")}`);
  }

  await addDoc(collection(db, collections.rsvpSubmissions), payload);

}


/**
 * Submit the petanque section of the RSVP form to `petanque_participation`.
 *
 * @param {FormData} formData  the RSVP form's FormData
 * @param {{ language: string }} context
 * @returns {Promise<void>}
 */
export async function submitPetanque(formData, context) {
  const language = context.language || "es";

  const payload = {
    petanqueParticipation: field(formData, "petanqueParticipation"),
    petanquePartySize: field(formData, "petanquePartySize"),
    petanqueNames: field(formData, "petanqueNames"),
    petanqueOwnBoules: field(formData, "petanqueOwnBoules"),
    language,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
  };

  // Runtime validation mirrors the Firestore rules (petanque rules).
  const result = validatePetanquePayload(payload);
  if (!result.valid) {
    throw new Error(`Invalid petanque payload: ${result.errors.join("; ")}`);
  }

  await addDoc(collection(db, collections.petanqueParticipation), payload);

}


/**
 * Submit the Coast form to `coast_interest`.
 *
 * @param {FormData} formData  the Coast form's FormData
 * @param {{ language: string }} context
 * @returns {Promise<void>}
 */
export async function submitCoast(formData, context) {
  const language = context.language || "es";

  const payload = {
    name: field(formData, "name"),
    interest: field(formData, "interest"),
    partySize: field(formData, "partySize"),
    nights: field(formData, "nights"),
    destination: field(formData, "destination"),
    style: field(formData, "style"),
    note: field(formData, "note"),
    language,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
  };

  // Runtime validation mirrors the Firestore rules (coast rules).
  const result = validateCoastPayload(payload);
  if (!result.valid) {
    throw new Error(`Invalid coast payload: ${result.errors.join("; ")}`);
  }

  await addDoc(collection(db, collections.coastInterest), payload);

}

