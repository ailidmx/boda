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
import { getAuth } from "firebase-admin/auth";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

import { sendTelegramMessage, sendTelegramPhoto, escapeMarkdown } from "./telegram.js";
import { google } from "googleapis";



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

// Gmail API credentials for sending invitation emails from the dashboard.
// The couple's shared Gmail account (bodadavidyayde@gmail.com) sends the
// invitations via the Gmail API using OAuth2 (client id + secret + refresh
// token). These are wired via Secret Manager and must be listed in the
// function's `secrets: [...]` dependency array.
const GMAIL_CLIENT_ID = defineSecret("GMAIL_CLIENT_ID");
const GMAIL_CLIENT_SECRET = defineSecret("GMAIL_CLIENT_SECRET");
const GMAIL_REFRESH_TOKEN = defineSecret("GMAIL_REFRESH_TOKEN");
const GMAIL_FROM = defineSecret("GMAIL_FROM");

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

/**
 * Format a duration in seconds as a short human-readable string
 * (e.g. "2 h 5 min", "45 s"). Returns "" when the value is missing.
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes < 60) return secs ? `${minutes} min ${secs} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours} h ${mins} min` : `${hours} h`;
}

/** Map a normalised source slug to a friendly label for the notification. */
function sourceLabel(source) {
  const map = {
    email: "Correo",
    whatsapp: "WhatsApp",
    other: "Otro",
  };
  return map[source] || "Otro";
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

    // When the guest arrived via an invitation link, the client also records
    // the channel (source) and how long it took them to answer (timeToAnswer).
    const source = sourceLabel(data.source);
    const duration = formatDuration(data.timeToAnswer);

    const lines = [
      "🔓 *Nuevo inicio de sesión*",
      kv("Invitado", name),
      kv("Usuario", data.username || ""),
      kv("Canal", source),
      kv("Tiempo de respuesta", duration),
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

// ── Live Firebase Auth user list (admin dashboard) ─────────────────────────

/**
 * Callable function that returns the LIVE Firebase Auth user list (uid + email)
 * for the admin dashboard's INVITADOS table.
 *
 * Firebase Auth has NO client-side API to list all users — only the Admin SDK
 * (`auth.listUsers()`) can do that, and it runs server-side. Instead of keeping
 * a stale `auth_users` mirror collection (which required a manual sync script),
 * the dashboard calls this function on demand to get the authoritative, always
 * current list of auth accounts. No static config, no mirror, no sync.
 *
 * Access control: only admins (guests whose `guests` doc has `isAdmin: true`)
 * may call it. The caller's auth `uid` IS their guest doc id, so we look the
 * guest up by uid and check `isAdmin`.
 */
export const listAuthUsers = onCall(
  async (request) => {

    // Reject unauthenticated callers.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    // The caller's auth uid IS their guest doc id. Only admins may list users.
    const db = getFirestore(DB_ID);
    const guestSnap = await db.collection("guests").doc(request.auth.uid).get();
    const guest = guestSnap.exists ? guestSnap.data() : null;
    if (!guest || guest.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Solo los administradores pueden ver la lista de usuarios.");
    }

    // Paginate through the FULL Firebase Auth user list (listUsers caps at 1000
    // per call, so loop with a page token until exhausted).
    const users = [];
    let pageToken;
    do {
      const result = await getAuth().listUsers(1000, pageToken);
      for (const record of result.users) {
        users.push({ uid: record.uid, email: record.email || "" });
      }
      pageToken = result.pageToken;
    } while (pageToken);

    return { users };
  },
);

// ── Send invitation email (admin dashboard) ────────────────────────────────

/**
 * Build the guest-facing invitation URL. Mirrors the format the couple's
 * Google Apps Script used to generate: the guest's login email + password are
 * passed as query params so the invitation can pre-fill the login form, plus
 * UTM tracking params and an `inviteType` so we can tell email vs WhatsApp.
 *
 * @param {object} guest  the guest document (must have `firebaseEmail` and
 *                        `firebasePassword`)
 * @param {string} inviteType  "email" | "whatsapp"
 * @returns {string}
 */
function buildInvitationUrl(guest, inviteType) {
  const base = "https://boda-david-y-ayde.web.app/";
  const params = new URLSearchParams({
    guest: guest.firebaseEmail || "",
    password: guest.firebasePassword || "",
    sent_at: new Date().toISOString(),
    utm_source: "invitacion",
    utm_medium: inviteType === "whatsapp" ? "whatsapp" : "email",
    utm_campaign: "invitacion",
    inviteType,
  });
  return `${base}?${params.toString()}`;
}

/**
 * The three invitation email templates (ES / FR / EN). Each is a plain-text
 * body with the guest's name, the invitation link, and their login email +
 * password. The couple's shared Gmail account sends these.
 */
function invitationEmailBody(lang, guest, inviteUrl) {
  const name = guest.identity?.firstName || guest.firstName || guest.guestId || "";
  const email = guest.firebaseEmail || "";
  const password = guest.firebasePassword || "";

  const templates = {
    es: `¡Hola ${name}!

David y Aydé te invitamos a celebrar nuestra boda. Estamos muy felices de que nos acompañes.

Para ver tu invitación personalizada, entra al siguiente enlace:

${inviteUrl}

Tus datos de acceso son:
  Correo: ${email}
  Contraseña: ${password}

Si tienes cualquier duda, escríbenos por WhatsApp.

¡Te esperamos!
David & Aydé`,
    fr: `Bonjour ${name} !

David et Aydé t'invitons à célébrer notre mariage. Nous sommes très heureux que tu sois des nôtres.

Pour voir ton invitation personnalisée, clique sur le lien suivant :

${inviteUrl}

Tes identifiants de connexion sont :
  E-mail : ${email}
  Mot de passe : ${password}

Si tu as la moindre question, écris-nous sur WhatsApp.

À très bientôt !
David & Aydé`,
    en: `Hello ${name}!

David and Aydé invite you to celebrate our wedding. We are so happy to have you with us.

To see your personalised invitation, open the following link:

${inviteUrl}

Your login details are:
  Email: ${email}
  Password: ${password}

If you have any questions, message us on WhatsApp.

See you soon!
David & Aydé`,
  };

  return templates[lang] || templates.es;
}

/**
 * Send an email through the couple's shared Gmail account using the Gmail API
 * (OAuth2). The credentials come from Secret Manager.
 *
 * @param {object} opts  { to, subject, body }
 */
async function sendGmail({ to, subject, body }) {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID.value(),
    GMAIL_CLIENT_SECRET.value(),
  );
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN.value() });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build a raw RFC-2822 message and base64url-encode it for the Gmail API.
  const raw = Buffer.from(
    `From: ${GMAIL_FROM.value()}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `MIME-Version: 1.0\r\n` +
      `\r\n` +
      `${body}`,
    "utf-8",
  ).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

/**
 * Callable function that sends a wedding invitation to a guest, either by
 * email (via the Gmail API) or by returning a pre-built WhatsApp link.
 *
 * The dashboard's INVITADOS table calls this when the couple clicks
 * "Enviar invitación". Only admins may call it.
 *
 * Request payload:
 *   { guestId: string, channel: "email" | "whatsapp" }
 *
 * Response:
 *   { ok: true, channel, inviteUrl, sentAt }
 *   (for "whatsapp", `inviteUrl` is the wa.me link the dashboard opens)
 */
export const sendInvitation = onCall(
  { secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM] },
  async (request) => {

    // Reject unauthenticated callers.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    // Only admins may send invitations.
    const db = getFirestore(DB_ID);
    const adminSnap = await db.collection("guests").doc(request.auth.uid).get();
    const admin = adminSnap.exists ? adminSnap.data() : null;
    if (!admin || admin.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Solo los administradores pueden enviar invitaciones.");
    }

    const { guestId, channel } = request.data || {};
    if (!guestId) {
      throw new HttpsError("invalid-argument", "Falta el guestId.");
    }
    if (channel !== "email" && channel !== "whatsapp") {
      throw new HttpsError("invalid-argument", "El canal debe ser 'email' o 'whatsapp'.");
    }

    // Load the target guest.
    const guestSnap = await db.collection("guests").doc(guestId).get();
    if (!guestSnap.exists) {
      throw new HttpsError("not-found", "No se encontró al invitado.");
    }
    const guest = guestSnap.data();

    const email = guest.firebaseEmail || guest.identity?.email || "";
    const password = guest.firebasePassword || "";
    if (!email) {
      throw new HttpsError("failed-precondition", "El invitado no tiene correo de acceso (firebaseEmail).");
    }
    if (!password) {
      throw new HttpsError("failed-precondition", "El invitado no tiene contraseña guardada (firebasePassword).");
    }

    const lang = guest.lang || guest.identity?.lang || "es";
    const inviteUrl = buildInvitationUrl(guest, channel);
    const sentAt = new Date().toISOString();

    if (channel === "email") {
      const subject = lang === "fr"
        ? "Votre invitation au mariage de David & Aydé"
        : lang === "en"
          ? "Your invitation to David & Aydé's wedding"
          : "Tu invitación a la boda de David & Aydé";
      await sendGmail({ to: email, subject, body: invitationEmailBody(lang, guest, inviteUrl) });
    }

    return { ok: true, channel, inviteUrl, sentAt };
  },
);


