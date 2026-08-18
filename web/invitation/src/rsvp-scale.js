/**
 * RSVP scale — the 5-point likelihood scale used for every RSVP question.
 *
 * Each level (1–5) carries an illustration emoji and a message in the three
 * languages (fr, es, en). Level 3 is the default (50/50). Level 0 is used
 * internally to mean "unanswered".
 *
 * The scale is stored in the Firestore `rsvp_scale` collection (writable only
 * by admins) so the couple can tweak the wording without a redeploy. The
 * bundled defaults below are used as a fallback until the collection loads.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";

/** @type {Map<number, { level: number, emoji: string, fr: string, es: string, en: string }>} */
let scaleCache = new Map();

/** @type {boolean} */
let scaleLoaded = false;

function logDb(event, detail) {
  console.log(`[db][rsvp-scale][${event}]`, detail);
}

/**
 * Bundled default scale (used until the Firestore collection loads, and as a
 * safe fallback if the read fails). Keyed by level 1–5.
 */
export const DEFAULT_RSVP_SCALE = [
  {
    level: 1,
    emoji: "🙅",
    fr: "Non, je ne viens pas",
    es: "No, no voy a venir",
    en: "No, I'm not coming",
  },
  {
    level: 2,
    emoji: "🤔",
    fr: "Probablement pas, mais je ne ferme pas la porte",
    es: "Probablemente no, pero no cierro la puerta",
    en: "Probably not, but I'm not closing the door",
  },
  {
    level: 3,
    emoji: "😐",
    fr: "50/50, je ne sais pas encore",
    es: "50/50, todavía no lo sé",
    en: "50/50, I don't know yet",
  },
  {
    level: 4,
    emoji: "🙂",
    fr: "Très probablement, je dois encore organiser quelques détails",
    es: "Muy probablemente, aún debo organizar algunos detalles",
    en: "Very likely, I still need to arrange a few details",
  },
  {
    level: 5,
    emoji: "🎉",
    fr: "Oui, je viens !",
    es: "¡Sí, voy!",
    en: "Yes, I'm coming!",
  },
];

/** The default (50/50) level. */
export const DEFAULT_RSVP_LEVEL = 3;

/** The "unanswered" sentinel. */
export const UNANSWERED_LEVEL = 0;

/**
 * Load the `rsvp_scale` collection from Firestore and cache it. Safe to call
 * multiple times (idempotent). Falls back to the bundled defaults on error.
 * @returns {Promise<Map<number, Object>>}
 */
export async function loadRsvpScale() {
  if (scaleLoaded) return scaleCache;
  try {
    logDb("read:start", { collection: collections.rsvpScale, op: "getDocs" });
    const snapshot = await getDocs(collection(db, collections.rsvpScale));
    const map = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const level = Number(data.level);
      if (Number.isInteger(level) && level >= 1 && level <= 5) {
        map.set(level, {
          level,
          emoji: String(data.emoji || ""),
          fr: String(data.fr || ""),
          es: String(data.es || ""),
          en: String(data.en || ""),
        });
      }
    });
    if (map.size > 0) {
      scaleCache = map;
      scaleLoaded = true;
      logDb("read:success", {
        collection: collections.rsvpScale,
        op: "getDocs",
        size: map.size,
      });
      console.log(`[rsvp-scale] Loaded ${map.size} scale levels from Firestore`);
    } else {
      // Collection exists but is empty — keep the bundled defaults.
      scaleCache = new Map(DEFAULT_RSVP_SCALE.map((s) => [s.level, s]));
      scaleLoaded = true;
      logDb("read:empty", { collection: collections.rsvpScale, op: "getDocs" });
    }
  } catch (error) {
    logDb("read:error", {
      collection: collections.rsvpScale,
      op: "getDocs",
      error: error.message,
    });
    console.warn("[rsvp-scale] Could not load scale; using defaults", error.message);
    scaleCache = new Map(DEFAULT_RSVP_SCALE.map((s) => [s.level, s]));
    scaleLoaded = true;
  }
  return scaleCache;
}

/**
 * Get the scale as an ordered array (levels 1–5), falling back to defaults.
 * @returns {Array<{ level: number, emoji: string, fr: string, es: string, en: string }>}
 */
export function getRsvpScale() {
  if (scaleCache.size > 0) {
    return [1, 2, 3, 4, 5]
      .map((level) => scaleCache.get(level))
      .filter(Boolean);
  }
  return DEFAULT_RSVP_SCALE;
}

/**
 * Get a single scale level by number (1–5). Returns null if unknown.
 * @param {number} level
 * @returns {Object|null}
 */
export function getRsvpScaleLevel(level) {
  const n = Number(level);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return scaleCache.get(n) || DEFAULT_RSVP_SCALE.find((s) => s.level === n) || null;
}

/**
 * Get the localized message for a scale level.
 * @param {number} level
 * @param {string} language  "es" | "fr" | "en"
 * @returns {string}
 */
export function getRsvpScaleMessage(level, language = "es") {
  const entry = getRsvpScaleLevel(level);
  if (!entry) return "";
  return entry[language] || entry.es || "";
}
