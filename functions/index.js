/**
 * Firebase Cloud Functions that send Telegram notifications when guests
 * interact with the wedding invitation.
 *
 * Each function is a Firestore trigger that fires when a document is created
 * or updated in a key collection, formats a human-readable message, and sends
 * it to the configured Telegram chat.
 *
 * Collections watched:
 *   - login_events            (guest signs in)
 *   - activity_events         (guest goes inactive)
 *   - rsvp_submissions        (RSVP form submitted)
 *   - petanque_participation  (petanque form submitted)
 *   - coast_interest          (coast form submitted)
 *   - attendance_responses    (save-the-date attendance saved)
 *   - card_votes              (star rating on an experience card)
 *   - guiso_rankings          (guest orders their guisos)
 *   - song_requests           (guest requests a song)
 *   - genre_ratings           (guest rates a music genre 1–5 stars)
 *   - guests                  (identity check, name/photo/phone, RSVP answers,
 *                              flight details, travel mode, messages, hosting)
 *                             Notifications include the guest's avatar photo.


 *
 * Configuration (set once, secrets stay server-side):
 *   firebase functions:config:set telegram.token="<BOT_TOKEN>" telegram.chat_id="<CHAT_ID>"
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

import { sendTelegramMessage, sendTelegramPhoto, escapeMarkdown } from "./telegram.js";


initializeApp();

// The app uses a named Firestore database (migrated to us-central1 so Cloud
// Functions can run in the same region). All reads/writes target this database.
const DB_ID = "boda-us-central1";

// Force all functions to deploy to us-central1 (the region of the Firestore
// database). Without this, the CLI defaults to the project's original region
// (northamerica-south1), where Cloud Functions is not available.
setGlobalOptions({ region: "us-central1" });



// Secrets are read from Firebase environment config. Using defineSecret keeps
// them out of the function source and lets the emulator read them from
// `firebase functions:config:get`.
const TELEGRAM_TOKEN = defineSecret("TELEGRAM_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");

/** Send a message using the configured secrets. */
async function notify(text) {
  return sendTelegramMessage(text, {
    token: TELEGRAM_TOKEN.value(),
    chatId: TELEGRAM_CHAT_ID.value(),
    parseMode: "MarkdownV2",
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

// The couple is in Mexico City. Cloud Functions run in UTC by default, so we
// must pass an explicit timeZone or the notification timestamps would show UTC.
const NOTIFICATION_TIME_ZONE = "America/Mexico_City";

/** Format a Firestore timestamp as a short Mexico City time string. */
function formatTime(value) {
  if (!value) return "";
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString("es-MX", {
      timeZone: NOTIFICATION_TIME_ZONE,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Resolve a guest's display name from a guestId by reading the guests doc. */
async function resolveGuestName(guestId) {
  if (!guestId) return "";
  try {
    const db = getFirestore(DB_ID);
    const snap = await db.collection("guests").doc(guestId).get();

    if (!snap.exists) return "";
    const data = snap.data() || {};
    const identity = data.identity || {};
    const parts = [
      identity.firstName || data.firstName,
      identity.middleName || data.middleName,
      identity.lastName || data.lastName,
      identity.maternalLastName || data.maternalLastName,
    ].filter(Boolean);
    return parts.join(" ") || data.guestId || guestId;
  } catch {
    return guestId;
  }
}

/** Build a MarkdownV2-safe key/value line. */
function kv(key, value) {
  return `${escapeMarkdown(key)}: ${escapeMarkdown(value)}`;
}

// Cloudinary cloud name is public (embedded in every delivery URL), so it is
// safe to hard-code here. Guest avatars are stored under the `boda/` folder.
const CLOUD_NAME = "k2ajcgxv";

/**
 * Build a small square Cloudinary delivery URL for a guest's avatar photo.
 * The guest's `cloudinaryId` is stored relative to the `boda/` prefix, so the
 * full public id is `boda/<cloudinaryId>`. Returns null when absent.
 * @param {object} guest  a guest document (or the identity sub-object)
 * @returns {string|null}
 */
function resolveGuestPhotoUrl(guest) {
  const publicId = guest?.identity?.cloudinaryId || guest?.cloudinaryId;
  if (!publicId) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_256,h_256,c_fill,g_auto/boda/${publicId}`;
}


// ── Login events ───────────────────────────────────────────────────────────

/**
 * Fires when a guest signs in. The client writes a lightweight document to the
 * `login_events` collection on each successful sign-in.
 */
export const onLogin = onDocumentCreated(
  { document: "login_events/{eventId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
  async (event) => {


    const data = event.data?.data() || {};
    const guestId = data.guestId || event.params.eventId || "";
    const name = data.guestName || (await resolveGuestName(guestId)) || guestId;
    const time = formatTime(data.createdAt);

    const lines = [
      "🔓 *Nuevo inicio de sesión*",
      kv("Invitado", name),
      kv("Usuario", data.username || ""),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Activity events (inactivity) ───────────────────────────────────────────

/**
 * Fires when a guest goes inactive (stops interacting for the idle threshold).
 * The client writes a lightweight document to the `activity_events` collection
 * on each inactivity episode. This lets the couple see who stopped browsing
 * and for how long they were idle.
 */
export const onActivityEvent = onDocumentCreated(
  { document: "activity_events/{eventId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
  async (event) => {

    const data = event.data?.data() || {};
    const guestId = data.guestId || event.params.eventId || "";
    const name = (await resolveGuestName(guestId)) || guestId;
    const time = formatTime(data.createdAt);
    const idleSeconds = Number(data.idleSeconds) || 0;
    const idleMinutes = Math.max(1, Math.round(idleSeconds / 60));

    const lines = [
      "💤 *Invitado inactivo*",
      kv("Invitado", name),
      kv("Inactivo", `${idleMinutes} min`),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── RSVP form ──────────────────────────────────────────────────────────────


/** Fires when a guest submits the main RSVP form. */
export const onRsvpSubmission = onDocumentCreated(
  { document: "rsvp_submissions/{submissionId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const time = formatTime(data.createdAt);

    const lines = [
      "📋 *Nueva respuesta RSVP*",
      kv("Nombre", data.firstName || ""),
      kv("Apellido", data.lastName || ""),
      kv("Email", data.email || ""),
      kv("WhatsApp", data.whatsapp || ""),
      kv("Asistencia", data.attendance || ""),
      kv("Modalidad", data.groupMode || ""),
      kv("Grupo", data.groupName || ""),
      kv("Personas", data.partySize || ""),
      kv("Adultos", data.adults || ""),
      kv("Niños", data.children || ""),
      kv("Alojamiento", data.accommodation || ""),
      kv("Viaje", data.travelStatus || ""),
      kv("Llegada", data.arrivalDate ? `${data.arrivalDate} ${data.arrivalTime || ""}`.trim() : ""),
      kv("Salida", data.departureDate ? `${data.departureDate} ${data.departureTime || ""}`.trim() : ""),
      kv("Notas", data.notes || ""),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));
  },
);

// ── Petanque form ──────────────────────────────────────────────────────────


/** Fires when a guest submits the petanque participation form. */
export const onPetanqueSubmission = onDocumentCreated(
  { document: "petanque_participation/{submissionId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const time = formatTime(data.createdAt);

    const lines = [
      "🎳 *Participación petanca*",
      kv("Participa", data.petanqueParticipation || ""),
      kv("Personas", data.petanquePartySize || ""),
      kv("Nombres", data.petanqueNames || ""),
      kv("Bochas propias", data.petanqueOwnBoules || ""),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Coast form ─────────────────────────────────────────────────────────────

/** Fires when a guest submits the coast ("Et après ?") interest form. */
export const onCoastSubmission = onDocumentCreated(
  { document: "coast_interest/{submissionId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const time = formatTime(data.createdAt);

    const lines = [
      "🌊 *Interés en la costa*",
      kv("Nombre", data.name || ""),
      kv("Interés", data.interest || ""),
      kv("Personas", data.partySize || ""),
      kv("Noches", data.nights || ""),
      kv("Destino", data.destination || ""),
      kv("Estilo", data.style || ""),
      kv("Nota", data.note || ""),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Attendance responses ───────────────────────────────────────────────────

/** Fires when a guest saves their save-the-date attendance response. */
export const onAttendanceResponse = onDocumentCreated(
  { document: "attendance_responses/{guestId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const guestId = event.params.guestId || "";
    const name = await resolveGuestName(guestId);
    const time = formatTime(data.updatedAt);

    const day = (value) => {
      if (value === "yes") return "Sí ✅";
      if (value === "no") return "No ❌";
      if (value === "maybe") return "Quizás 🤔";
      return "—";
    };

    const lines = [
      "🗓️ *Asistencia (save-the-date)*",
      kv("Invitado", name || guestId),
      kv("Viernes", day(data.friday)),
      kv("Sábado", day(data.saturday)),
      kv("Domingo", day(data.sunday)),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Card votes ─────────────────────────────────────────────────────────────

/** Fires when a guest rates an experience card (food / music). */
export const onCardVote = onDocumentCreated(
  { document: "card_votes/{voteId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const guestId = data.guestId || "";
    const name = await resolveGuestName(guestId);
    const time = formatTime(data.updatedAt);
    const stars = "⭐".repeat(Math.max(0, Math.min(5, Number(data.rating) || 0)));

    const lines = [
      "⭐ *Nueva votación*",
      kv("Invitado", name || guestId),
      kv("Tipo", data.cardType || ""),
      kv("Tarjeta", data.cardKey || ""),
      kv("Calificación", `${data.rating || ""} ${stars}`),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Guisos ranking (guest orders their guisos) ─────────────────────────────

/**
 * Fires when a guest saves or updates their guisos ranking (their "order").
 * The document lives at `guiso_rankings/{guestId}` — one doc per guest. We
 * notify on create and on update so the couple knows a guest has ordered.
 */
export const onGuisoRanking = onDocumentWritten(
  { document: "guiso_rankings/{guestId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.after?.data() || {};
    const guestId = event.params.guestId || data.guestId || "";
    const name = await resolveGuestName(guestId);
    const time = formatTime(data.updatedAt);

    const ranking = Array.isArray(data.ranking) ? data.ranking : [];
    const selected = Array.isArray(data.selected) ? data.selected : [];

    const lines = [
      "🍲 *Nuevo pedido de guisos*",
      kv("Invitado", name || guestId),
      kv("Platillos en menú", selected.length ? selected.join(", ") : "—"),
      kv("Orden completo", ranking.length ? ranking.join(" → ") : "—"),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Song requests (guest asks for a song) ──────────────────────────────────

/**
 * Fires when a guest submits a song request ("Pide tu canción"). The client
 * writes a document to the `song_requests` collection via `addDoc` (one doc
 * per request). We notify on create so the couple sees each new request.
 */
export const onSongRequest = onDocumentCreated(
  { document: "song_requests/{requestId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.data() || {};
    const guestId = data.guestId || "";
    const name = (await resolveGuestName(guestId)) || guestId;
    const time = formatTime(data.createdAt || data.timestamp);

    const intentLabels = {
      hear: "Escuchar",
      sing: "Cantar",
      karaoke: "Karaoke",
      band: "Con banda",
    };
    const intent = intentLabels[data.intent] || data.intent || "";

    const songMeta = data.songMeta || {};
    const title = songMeta.title || data.song || "";
    const artist = songMeta.artist || "";

    const lines = [
      "🎵 *Nueva petición de canción*",
      kv("Invitado", name),
      kv("Canción", title),
      kv("Artista", artist),
      kv("Intención", intent),
      kv("Banda", data.bandType || ""),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Genre ratings (guest rates a music genre) ──────────────────────────────

/**
 * Fires when a guest saves or updates a 1–5 star rating for a music genre in
 * the "Califica la música" survey. The document lives at
 * `genre_ratings/{genreId}_{guestId}` — one doc per (genre, guest). We notify
 * on create and on update so the couple sees each new/updated rating.
 */
export const onGenreRating = onDocumentWritten(
  { document: "genre_ratings/{ratingId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const data = event.data?.after?.data() || {};
    const guestId = data.guestId || "";
    const name = (await resolveGuestName(guestId)) || guestId;
    const time = formatTime(data.updatedAt || data.timestamp);
    const stars = "⭐".repeat(Math.max(0, Math.min(5, Number(data.rating) || 0)));

    const lines = [
      "🎧 *Nueva calificación de género*",
      kv("Invitado", name),
      kv("Género", data.genreName || data.genreId || ""),
      kv("Calificación", `${data.rating || ""} ${stars}`),
      kv("Hora", time),
    ];
    await notify(lines.filter(Boolean).join("\n"));

  },
);

// ── Guests collection (identity, RSVP answers) ─────────────────────────────

/**
 * Fires when a guest document is updated. We only notify for meaningful
 * changes (identity check, name/photo/phone, RSVP answers) and skip the
 * frequent metadata-only touches (updatedBy/updatedAt) that the app performs.
 */
export const onGuestUpdated = onDocumentUpdated(
  { document: "guests/{guestId}", database: DB_ID, secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },

  async (event) => {

    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const guestId = event.params.guestId || "";
    const name = await resolveGuestName(guestId);

    const changes = [];

    // Identity check acknowledgement.
    const idCheckBefore = before.idCheckUser === true;
    const idCheckAfter = after.idCheckUser === true;
    if (!idCheckBefore && idCheckAfter) {
      changes.push("✅ *Confirmó su identidad*");
    }

    // Name correction.
    const beforeName = [
      before.identity?.firstName || before.firstName,
      before.identity?.lastName || before.lastName,
    ].filter(Boolean).join(" ");
    const afterName = [
      after.identity?.firstName || after.firstName,
      after.identity?.lastName || after.lastName,
    ].filter(Boolean).join(" ");
    if (beforeName && afterName && beforeName !== afterName) {
      changes.push(`✏️ *Corrigió su nombre*: ${escapeMarkdown(beforeName)} → ${escapeMarkdown(afterName)}`);
    }

    // Phone added/changed.
    const beforePhone = before.identity?.phone || before.phone || "";
    const afterPhone = after.identity?.phone || after.phone || "";
    if (beforePhone !== afterPhone && afterPhone) {
      changes.push(`📱 *Teléfono*: ${escapeMarkdown(afterPhone)}`);
    }

    // Photo added/changed.
    const beforePhoto = before.identity?.cloudinaryId || before.cloudinaryId || "";
    const afterPhoto = after.identity?.cloudinaryId || after.cloudinaryId || "";
    if (beforePhoto !== afterPhoto && afterPhoto) {
      changes.push("🖼️ *Actualizó su foto*");
    }

    // RSVP scale answers changed.
    const beforeAnswers = before.rsvp?.answers || {};
    const afterAnswers = after.rsvp?.answers || {};
    const answerKeys = new Set([
      ...Object.keys(beforeAnswers),
      ...Object.keys(afterAnswers),
    ]);
    let answerChanged = false;
    for (const key of answerKeys) {
      if (beforeAnswers[key] !== afterAnswers[key]) {
        answerChanged = true;
        break;
      }
    }
    if (answerChanged) {
      changes.push("📝 *Actualizó sus respuestas RSVP*");
    }

    // Flight details added/changed (arrival and/or return trip).
    const beforeFlight = JSON.stringify(before.flightInfo || {});
    const afterFlight = JSON.stringify(after.flightInfo || {});
    if (beforeFlight !== afterFlight && Object.keys(after.flightInfo || {}).length > 0) {
      changes.push("✈️ *Actualizó sus datos de vuelo*");
    }

    // Travel mode changed (flies in vs. local).
    const beforePlane = before.travelsByPlane === true;
    const afterPlane = after.travelsByPlane === true;
    if (beforePlane !== afterPlane) {
      changes.push(afterPlane ? "✈️ *Indicó que viaja en avión*" : "🚗 *Indicó que no viaja en avión*");
    }

    // Guest wrote a message to the couple.
    const beforeMsg = before.messageAuthor || "";
    const afterMsg = after.messageAuthor || "";
    if (beforeMsg !== afterMsg && afterMsg) {
      changes.push("💬 *Escribió un mensaje*");
    }

    // Cabin / hosting assignment changed.
    const beforeHosting = JSON.stringify(before.hosting || {});
    const afterHosting = JSON.stringify(after.hosting || {});
    if (beforeHosting !== afterHosting && Object.keys(after.hosting || {}).length > 0) {
      changes.push("🏠 *Actualizó su alojamiento*");
    }

    if (changes.length === 0) return;

    const lines = [
      "👤 *Actualización de invitado*",
      kv("Invitado", name || guestId),
      ...changes,
      kv("Hora", formatTime(after.updatedAt)),
    ];
    const text = lines.filter(Boolean).join("\n");

    // Send the guest's avatar photo with the notification as its caption when
    // available; otherwise fall back to a plain text message.
    const photoUrl = resolveGuestPhotoUrl(after);
    if (photoUrl) {
      await sendTelegramPhoto(photoUrl, {
        token: TELEGRAM_TOKEN.value(),
        chatId: TELEGRAM_CHAT_ID.value(),
        caption: text,
        parseMode: "MarkdownV2",
      });
    } else {
      await notify(text);
    }

  },
);

