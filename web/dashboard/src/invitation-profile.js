/**
 * Invitation code system.
 *
 * Two kinds of codes are accepted:
 *   1. Profile codes (e.g. "azalea_compartida_porpagar")
 *   2. Per-guest codes (e.g. "sebastien") — the guest ID from guests.js
 *
 * On decode, we return a GuestProfile-like object that the rest of the
 * app can consume without changes.
 */

import { collection, getDocs, limit, query } from "firebase/firestore";

import { db } from "./firebase.js";
import { getGuest } from "./guests.js";
import { getRoom, getRoomDescription } from "./rooms.js";
import { collections } from "../../shared/firestore-paths.js";



// ── Group-level custom content cache ──────────────────────────────────

/** @type {Map<string, Object>} */
const groupContentCache = new Map();

/**
 * Full group data cache (includes tag, customContent, etc.).
 * @type {Map<string, Object>}
 */
const groupDataCache = new Map();

/**
 * Load custom content for all invitation groups from Firestore.
 * Call once at startup alongside loadGuestOverrides().
 * @returns {Promise<void>}
 */
export async function loadGroupCustomContent() {
  try {
    const snapshot = await getDocs(
      query(collection(db, collections.invitationGroups), limit(500)),
    );


    snapshot.forEach((doc) => {
      const data = doc.data();
      // Store full data
      groupDataCache.set(doc.id, data);
      // Store customContent separately for backward compat
      if (data.customContent) {
        groupContentCache.set(doc.id, data.customContent);
      }
    });
    if (!snapshot.empty) {
      console.log(`[invitation] Loaded ${snapshot.size} group custom contents`);
    }
  } catch (error) {
    console.warn("[invitation] Could not load group custom content", error.message);
  }
}

// ── Profile codes ──────────────────────────────────────────────────────

export const INVITATION_CODES = [
  "hortencia_privada_pagada",
  "cabaña_33_privada_porpagar",
  "azalea_compartida_porpagar",
  "sin_cabaña",
  "cabaña_5_privada_porpagar",
  "cabaña_34_privada_pagada",
  "cabaña_4_compartida_pagada",
  "lavanda_compartida_porpagar",
  "casona_compartida_pagada",
  "margarita_compartida_porpagar",
  "cabaña_6_privada_porpagar",
  "dalia_compartida_porpagar",
  "cabaña_31_privada_porpagar",
  "cabaña_32_privada_porpagar",
];

const knownProfileCodes = new Set(INVITATION_CODES);

// ── i18n copy ─────────────────────────────────────────────────────────

const copy = {
  es: {
    detected: "Enlace personalizado detectado",
    eyebrow: "Tu invitación",
    noCabinTitle: "Alojamiento por tu cuenta",
    noCabinBody:
      "Este grupo no tiene una cabaña reservada. En el RSVP podrás indicarnos cuándo piensas llegar y si nos veremos el domingo.",
    cabinTitle: (unit) => `Alojamiento previsto · ${unit}`,
    cabinBody: {
      privada: "Cabaña privada para tu grupo",
      compartida: "Alojamiento compartido con otros invitados",
    },
    payment: {
      pagada: "Alojamiento ya cubierto",
      porpagar: "Alojamiento pendiente de pago",
    },
    note:
      "Este perfil nos ayuda a mostrarte la información adecuada. Para cualquier ajuste, escríbenos directamente.",
  },
  fr: {
    detected: "Lien personnalisé détecté",
    eyebrow: "Votre invitation",
    noCabinTitle: "Hébergement organisé de votre côté",
    noCabinBody:
      "Aucune cabane n’est réservée pour ce groupe. Dans le RSVP, vous pourrez préciser votre arrivée et votre présence le dimanche.",
    cabinTitle: (unit) => `Hébergement prévu · ${unit}`,
    cabinBody: {
      privada: "Cabane privée pour votre groupe",
      compartida: "Hébergement partagé avec d’autres invités",
    },
    payment: {
      pagada: "Hébergement déjà pris en charge",
      porpagar: "Hébergement restant à régler",
    },
    note:
      "Ce profil nous permet d’afficher les informations adaptées. Pour tout changement, contactez-nous directement.",
  },
  en: {
    detected: "Personalised link detected",
    eyebrow: "Your invitation",
    noCabinTitle: "Independent accommodation",
    noCabinBody:
      "No cabin is reserved for this group. In the RSVP, you can tell us when you plan to arrive and whether we will see you on Sunday.",
    cabinTitle: (unit) => `Planned accommodation · ${unit}`,
    cabinBody: {
      privada: "Private cabin for your group",
      compartida: "Accommodation shared with other guests",
    },
    payment: {
      pagada: "Accommodation already covered",
      porpagar: "Accommodation awaiting payment",
    },
    note:
      "This profile helps us show the right information. Contact us directly if anything needs changing.",
  },
};

// ── Base64 helpers ────────────────────────────────────────────────────

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// ── Encode / decode ───────────────────────────────────────────────────

/**
 * Encode any plain-text code (profile code or guest ID) into a
 * URL-safe base64 string.
 */
export function encodeInvitationCode(code) {
  return bytesToBase64(new TextEncoder().encode(code.normalize("NFC")))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

/**
 * Decode a URL-safe base64 string back to the original code.
 * Returns null if decoding fails or the code is unknown.
 */
export function decodeInvitationCode(encoded) {
  if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded)) return null;
  try {
    const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const code = new TextDecoder("utf-8", { fatal: true })
      .decode(base64ToBytes(padded))
      .normalize("NFC");

    // Accept both profile codes and per-guest IDs
    if (knownProfileCodes.has(code)) return code;
    if (getGuest(code)) return code;
    return null;
  } catch {
    return null;
  }
}

// ── URL helpers ───────────────────────────────────────────────────────

export function getInvitationCodeFromUrl(url = window.location.href) {
  const parsed = new URL(url);
  const raw = parsed.searchParams.get("invitationCode");
  console.log("[invitation] URL:", url);
  console.log("[invitation] raw param:", raw);
  const decoded = decodeInvitationCode(raw);
  console.log("[invitation] decoded code:", decoded);
  return decoded;
}

export function buildInvitationUrl(baseUrl, code) {
  const url = new URL(baseUrl);
  url.searchParams.set("invitationCode", encodeInvitationCode(code));
  return url.toString();
}

// ── Profile parsing ───────────────────────────────────────────────────

/**
 * Parse a code (profile or per-guest) into a profile object.
 *
 * Returns an object with shape compatible with the existing app:
 *   { code, hasCabin, unit?, occupancy?, payment?, guest? }
 *
 * The `guest` property is set only for per-guest codes.
 */
export function parseInvitationProfile(code) {
  if (!code) return null;

  // 1. Try per-guest lookup first
  const guest = getGuest(code);
  if (guest) {
    const room = guest.room ? getRoom(guest.room) : null;
    return {
      code,
      hasCabin: guest.hasCabin,
      unit: guest.unit,
      occupancy: guest.occupancy,
      payment: guest.payment,
      room: guest.room,
      roomDescription: room?.description || null,
      guest, // full profile for personalised content
    };
  }

  // 2. Fall back to profile code parsing
  if (!knownProfileCodes.has(code)) return null;
  if (code === "sin_cabaña") {
    return { code, hasCabin: false };
  }

  const match = code.match(/^(.+)_(privada|compartida)_(pagada|porpagar)$/u);
  if (!match) return null;
  const [, unit, occupancy, payment] = match;
  return {
    code,
    hasCabin: true,
    unit,
    occupancy,
    payment,
  };
}

// ── Profile text generation ───────────────────────────────────────────

/**
 * Generate human-readable profile text for display.
 * Accepts the result of parseInvitationProfile().
 */
export function invitationProfileText(profile, language = "es") {
  if (!profile) return null;
  const labels = copy[language] || copy.es;

  if (!profile.hasCabin) {
    return {
      detected: labels.detected,
      eyebrow: labels.eyebrow,
      title: labels.noCabinTitle,
      body: labels.noCabinBody,
      facts: [],
      note: labels.note,
    };
  }

  const unit = profile.unit
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const facts = [
    labels.cabinBody[profile.occupancy],
    labels.payment[profile.payment],
  ];
  if (profile.room) {
    facts.push(`Cuarto: ${profile.room}`);
  }
  if (profile.roomDescription) {
    facts.push(getRoomDescription(profile.roomDescription, language));
  }

  return {
    detected: labels.detected,
    eyebrow: labels.eyebrow,
    title: labels.cabinTitle(unit),
    body: labels.cabinBody[profile.occupancy],
    facts,
    note: labels.note,
  };
}

/**
 * Get custom content for a guest profile.
 * Merges group-level content (from invitation_groups collection) with
 * per-guest content (per-guest overrides group-level).
 *
 * Returns an object with optional greeting, message, section, and hideSections,
 * or null if no custom content exists at any level.
 *
 * @param {Object} profile - result of parseInvitationProfile()
 * @returns {Object|null}
 */
export function getCustomContent(profile) {
  if (!profile?.guest) return null;

  const groupName = profile.guest.invitationGroup || profile.guest.group;
  const groupContent = groupName ? groupContentCache.get(groupName) : null;
  const guestContent = profile.guest.customContent;

  // If neither exists, return null
  if (!groupContent && !guestContent) return null;

  // Merge: guest overrides group
  const merged = { ...(groupContent || {}) };
  if (guestContent) {
    // Deep merge: each field from guest overrides group
    if (guestContent.greeting !== undefined) merged.greeting = guestContent.greeting;
    if (guestContent.message !== undefined) merged.message = guestContent.message;
    if (guestContent.section !== undefined) merged.section = guestContent.section;
    if (guestContent.hideSections !== undefined) merged.hideSections = guestContent.hideSections;
  }

  return merged;
}

/**
 * Get the group-level custom content cache (for debugging / dashboard).
 * @returns {Map<string, Object>}
 */
export function getGroupContentCache() {
  return groupContentCache;
}

/**
 * Get tag styling for a group name.
 * Looks up the group in the invitation_groups cache and returns
 * { color, textColor, label } or a default.
 *
 * @param {string} groupName
 * @returns {{ color: string, textColor: string, label: string }}
 */
export function getGroupTag(groupName) {
  if (!groupName) {
    return { color: "#55452d", textColor: "#ffffff", label: groupName || "" };
  }
  const group = groupDataCache.get(groupName);
  if (group?.tag) {
    return {
      color: group.tag.color || "#55452d",
      textColor: group.tag.textColor || "#ffffff",
      label: group.tag.label || groupName,
    };
  }
  return { color: "#55452d", textColor: "#ffffff", label: groupName };
}

