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
import { onSchedule } from "firebase-functions/v2/scheduler";

import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

import { sendTelegramMessage, sendTelegramPhoto, escapeMarkdown } from "./telegram.js";
import { google } from "googleapis";




initializeApp();

// The app uses a named Firestore database (migrated to us-central1 so Cloud
// Functions can run in the same region). All reads/writes target this database.
const DB_ID = "boda-us-central1";

// Shared default password for guest login accounts. The email invitation tells
// the guest to sign in with this password (no password-reset link).
const DEFAULT_PASSWORD = "vivamexico";

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
// safe to hard-code here.
const CLOUD_NAME = "k2ajcgxv";

/**
 * Build a small square Cloudinary delivery URL for a guest's avatar photo.
 * The guest's `cloudinaryId` is a FULL Cloudinary public id (the same value the
 * client renders directly via `guestAvatarUrl` / `resolveGuestPhoto`), so we
 * use it verbatim WITHOUT prepending `boda/`. Returns null when absent.
 * @param {object} guest  a guest document (or the identity sub-object)
 * @returns {string|null}
 */
function resolveGuestPhotoUrl(guest) {
  const publicId = guest?.identity?.cloudinaryId || guest?.cloudinaryId;
  if (!publicId) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_256,h_256,c_fill,g_auto/${publicId}`;
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
    // available. If the photo send fails (e.g. a stale/broken Cloudinary id that
    // Telegram can't fetch), fall back to a plain text message so the couple
    // NEVER misses an update notification.
    const photoUrl = resolveGuestPhotoUrl(after);
    const photoSent = photoUrl
      ? await sendTelegramPhoto(photoUrl, {
          token: TELEGRAM_TOKEN.value(),
          chatId: TELEGRAM_CHAT_ID.value(),
          caption: text,
          parseMode: "MarkdownV2",
        })
      : false;
    if (!photoSent) {
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

// ── Update a guest's login email (admin dashboard) ─────────────────────────

/**
 * Update a guest's Firebase Auth login email (their "identifier") and keep the
 * guest's `firebaseEmail` field in Firestore in sync.
 *
 * The guest's auth uid IS their guest doc id, so we update the auth user by
 * uid. This lets the couple replace a default-domain email
 * (e.g. `fred_38t@boda-david-y-ayde.web.app`) with the guest's real inbox
 * (e.g. `fred.lebref@gmail.com`) so the invitation email / password-reset link
 * actually reaches them.
 *
 * Admin-only. Notifies the couple on Telegram.
 */
export const updateGuestEmail = onCall(
  { secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
  async (request) => {
    // Reject unauthenticated callers.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    // Only admins may update a guest's email.
    const db = getFirestore(DB_ID);
    const adminSnap = await db.collection("guests").doc(request.auth.uid).get();
    const admin = adminSnap.exists ? adminSnap.data() : null;
    if (!admin || admin.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Solo los administradores pueden actualizar el correo de un invitado.");
    }

    const { guestId, email } = request.data || {};
    if (!guestId) {
      throw new HttpsError("invalid-argument", "Falta el guestId.");
    }
    const newEmail = String(email || "").trim().toLowerCase();
    if (!newEmail) {
      throw new HttpsError("invalid-argument", "El correo no puede estar vacío.");
    }
    // Basic email shape check (must contain an @ and a dot after it).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new HttpsError("invalid-argument", "El correo no tiene un formato válido.");
    }

    // Load the target guest so we can report the old email and resolve the name.
    const guestSnap = await db.collection("guests").doc(guestId).get();
    if (!guestSnap.exists) {
      throw new HttpsError("not-found", "No se encontró al invitado.");
    }
    const guest = guestSnap.data();
    const oldEmail = guest.firebaseEmail || "";

    // Update the Firebase Auth user's email (the auth uid IS the guest doc id).
    // If the guest has no auth account yet, create one so the email is usable.
    try {
      let authUser;
      try {
        authUser = await getAuth().getUser(guestId);
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          authUser = await getAuth().createUser({
            uid: guestId,
            email: newEmail,
            password: DEFAULT_PASSWORD,
            displayName: guest.identity?.firstName || guest.firstName || guestId,
          });
        } else {
          throw e;
        }
      }
      if (authUser.email !== newEmail) {
        await getAuth().updateUser(guestId, { email: newEmail });
      }
    } catch (e) {
      // Surface a friendly message for the common "email already in use" case.
      if (e.code === "auth/email-already-in-use") {
        throw new HttpsError("already-exists", "Ese correo ya está en uso por otro invitado.");
      }
      throw new HttpsError("internal", `No se pudo actualizar el correo de acceso: ${e.message}`);
    }

    // Keep the guest's `firebaseEmail` field in sync (server-side write bypasses
    // the client rules). Also backfill `guestId` and `firebaseUid` (both equal
    // the auth uid, which IS the guest doc id) so the AUTH ⇄ GUEST relation is
    // explicit, even for guests originally created without it (e.g. from the
    // Google Sheets sync).
    await db.collection("guests").doc(guestId).set(
      {
        guestId,
        firebaseUid: guestId,
        firebaseEmail: newEmail,
        updatedBy: request.auth.uid,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Notify the couple on Telegram.
    const guestName = await resolveGuestName(guestId);
    const notifyLines = [
      "✉️ *Correo de acceso actualizado*",
      kv("Invitado", guestName || guestId),
      kv("Antes", oldEmail || "—"),
      kv("Ahora", newEmail),
      kv("Hora", formatTime(new Date())),
    ];
    await notify(notifyLines.filter(Boolean).join("\n"));

    return { ok: true, guestId, email: newEmail };
  },
);

// ── Create a guest's Firebase Auth account (admin dashboard) ───────────────

/**
 * Create (or ensure) a Firebase Auth account for a guest, with the auth uid
 * equal to the guest's Firestore doc id. This is the "Add Guest" companion to
 * `updateGuestEmail`: the dashboard first creates the guest doc (via the
 * `createGuest` repository), then calls this function to provision the login
 * account so the guest can sign in to the invitation.
 *
 * The auth uid IS the guest doc id, so the account is created with
 * `uid: guestId`. If the account already exists, its email is updated to the
 * requested one. The guest's `firebaseEmail` field is kept in sync (server-side
 * write bypasses the client rules).
 *
 * Access control: only admins (guests whose `guests` doc has `isAdmin: true`)
 * may call it. The caller's auth `uid` IS their guest doc id, so we look the
 * guest up by uid and check `isAdmin`.
 */
export const createGuestAuth = onCall(
  { secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
  async (request) => {
    // Reject unauthenticated callers.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    // Only admins may create a guest's auth account.
    const db = getFirestore(DB_ID);
    const adminSnap = await db.collection("guests").doc(request.auth.uid).get();
    const admin = adminSnap.exists ? adminSnap.data() : null;
    if (!admin || admin.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Solo los administradores pueden crear la cuenta de acceso de un invitado.");
    }

    const { guestId, email } = request.data || {};
    if (!guestId) {
      throw new HttpsError("invalid-argument", "Falta el guestId.");
    }
    const newEmail = String(email || "").trim().toLowerCase();
    if (!newEmail) {
      throw new HttpsError("invalid-argument", "El correo no puede estar vacío.");
    }
    // Basic email shape check (must contain an @ and a dot after it).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new HttpsError("invalid-argument", "El correo no tiene un formato válido.");
    }

    // Load the target guest so we can resolve the name for the notification.
    const guestSnap = await db.collection("guests").doc(guestId).get();
    if (!guestSnap.exists) {
      throw new HttpsError("not-found", "No se encontró al invitado.");
    }
    const guest = guestSnap.data();

    // Create the Firebase Auth account with uid == guest doc id. If it already
    // exists, just update its email to the requested one.
    try {
      let authUser;
      try {
        authUser = await getAuth().getUser(guestId);
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          authUser = await getAuth().createUser({
            uid: guestId,
            email: newEmail,
            password: DEFAULT_PASSWORD,
            displayName: guest.identity?.firstName || guest.firstName || guestId,
          });
        } else {
          throw e;
        }
      }
      if (authUser.email !== newEmail) {
        await getAuth().updateUser(guestId, { email: newEmail });
      }
    } catch (e) {
      // Surface a friendly message for the common "email already in use" case.
      if (e.code === "auth/email-already-in-use") {
        throw new HttpsError("already-exists", "Ese correo ya está en uso por otro invitado.");
      }
      throw new HttpsError("internal", `No se pudo crear la cuenta de acceso: ${e.message}`);
    }

    // Keep the guest's `firebaseEmail` field in sync (server-side write bypasses
    // the client rules). Also backfill `guestId` and `firebaseUid` (both equal
    // the auth uid, which IS the guest doc id) so the AUTH ⇄ GUEST relation is
    // explicit, and the top-level id field is always present even for guests
    // originally created without it.
    await db.collection("guests").doc(guestId).set(
      {
        guestId,
        firebaseUid: guestId,
        firebaseEmail: newEmail,
        updatedBy: request.auth.uid,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Notify the couple on Telegram.
    const guestName = await resolveGuestName(guestId);
    const notifyLines = [
      "🔑 *Cuenta de acceso creada*",
      kv("Invitado", guestName || guestId),
      kv("Correo", newEmail),
      kv("Hora", formatTime(new Date())),
    ];
    await notify(notifyLines.filter(Boolean).join("\n"));

    return { ok: true, guestId, email: newEmail };
  },
);

// ── Send invitation email (admin dashboard) ────────────────────────────────



/**
 * Build the guest-facing invitation URL. The guest's login email is passed as
 * a query param so the invitation can pre-fill the login form, plus UTM
 * tracking params and an `inviteType` so we can tell email vs WhatsApp.
 *
 * The plaintext password is ONLY included for the WhatsApp channel (where the
 * couple sends the link directly and may rely on it). For the email channel we
 * omit it — the email instead shows the shared default password inline (no
 * plaintext password in the URL, which would otherwise be logged in browser
 * history / referrer headers).
 *
 * @param {object} guest  the guest document
 * @param {string} inviteType  "email" | "whatsapp"
 * @param {string} email  the resolved login email (may come from Firebase Auth)
 * @param {boolean} includePassword  include the stored password as a query param
 * @returns {string}
 */
function buildInvitationUrl(guest, inviteType, email, includePassword = false) {
  const base = "https://boda-david-y-ayde.web.app/";
  const params = new URLSearchParams({
    guest: email || "",
    sent_at: new Date().toISOString(),
    utm_source: "invitacion",
    utm_medium: inviteType === "whatsapp" ? "whatsapp" : "email",
    utm_campaign: "invitacion",
    inviteType,
  });
  if (includePassword && guest.firebasePassword) {
    params.set("password", guest.firebasePassword);
  }
  return `${base}?${params.toString()}`;
}



/**
 * Escape a string for safe inclusion in HTML text or an attribute value.
 * The entity strings are built via String.fromCharCode so they survive any
 * tooling that normalises literal HTML entities in source files.
 */
function escapeHtml(value) {
  const amp = String.fromCharCode(38, 97, 109, 112, 59); // &
  const lt = String.fromCharCode(38, 108, 116, 59); // <
  const gt = String.fromCharCode(38, 103, 116, 59); // >
  const quot = String.fromCharCode(38, 113, 117, 111, 116, 59); // "
  return String(value ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
}

/**
 * The three invitation email templates (ES / FR / EN). Each is an HTML body
 * with the couple's message, the invitation link embedded as a real clickable
 * <a href> (so the long URL is hidden behind a "CLIQUE ICI!"-style link), and
 * the shared default password shown inline. The couple's shared Gmail account
 * sends these.
 *
 * @param {string} lang  "es" | "fr" | "en"
 * @param {object} guest  the guest document
 * @param {string} inviteUrl  the invitation URL (pre-fills the login email)
 * @param {string} email  the guest's login email
 */
function invitationEmailBody(lang, guest, inviteUrl, email) {

  const name = guest.identity?.firstName || guest.firstName || guest.guestId || "";

  // Escape the invite URL for safe use inside an href attribute.
  const href = escapeHtml(inviteUrl);


  // The couple's copy. The French text is the reference (STICK TO THE TEXT);
  // ES and EN are faithful translations of the same message.
  const copy = {
    es: {
      title: "¡Nos casamos!",
      body: "Estaríamos muy felices de tenerte a nuestro lado para compartir con nosotros este día, e incluso todo este fin de semana tan especial.",
      cta: "Encuentra toda la información sobre la boda aquí:",
      ctaLabel: "CLIC AQUÍ",
      login: "Tus datos de acceso son:",
      emailLabel: "Correo",
      passwordLabel: "Contraseña",
      help: "Si tienes cualquier duda, escríbenos por WhatsApp.",
      helpPhones: "David: +52 33 3201 7504 · Aydé: +52 33 3661 6738",
      signoff: "¡Te esperamos!",
    },
    fr: {
      title: "On se marie !",
      body: "Nous serions très heureux de vous avoir à nos côtés pour partager avec nous ce jour, voire tout ce week-end si spécial.",
      cta: "Vous trouverez toutes les informations sur le mariage ici :",
      ctaLabel: "CLIQUE ICI",
      login: "Vos identifiants de connexion sont :",
      emailLabel: "E-mail",
      passwordLabel: "Mot de passe",
      help: "Si vous avez la moindre question, écrivez-nous sur WhatsApp.",
      helpPhones: "David : +52 33 3201 7504 · Aydé : +52 33 3661 6738",
      signoff: "À très bientôt !",
    },
    en: {
      title: "We're getting married!",
      body: "We would be so happy to have you by our side to share this day with us, or even this whole very special weekend.",
      cta: "You'll find all the information about the wedding here:",
      ctaLabel: "CLICK HERE",
      login: "Your login details are:",
      emailLabel: "Email",
      passwordLabel: "Password",
      help: "If you have any questions, message us on WhatsApp.",
      helpPhones: "David: +52 33 3201 7504 · Aydé: +52 33 3661 6738",
      signoff: "See you soon!",
    },
  };


  const t = copy[lang] || copy.es;

  const esc = escapeHtml;



  return `<!DOCTYPE html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:Georgia,'Times New Roman',serif;color:#3a2f1e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6dcc8;">
            <tr>
              <td style="padding:40px 40px 24px;text-align:center;">
                <h1 style="margin:0 0 8px;font-size:28px;font-weight:400;color:#8a6a36;">${esc(t.title)}</h1>
                <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#b09a6f;">David & Aydé</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 24px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${esc(name)},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${esc(t.body)}</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">${esc(t.cta)}</p>
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${href}" style="display:inline-block;background:#8a6a36;color:#ffffff;text-decoration:none;font-size:15px;letter-spacing:0.06em;padding:14px 32px;border-radius:8px;">${esc(t.ctaLabel)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 24px;background:#faf6ee;border-top:1px solid #efe7d6;">
                <p style="margin:0 0 8px;font-size:13px;color:#8a6a36;">${esc(t.login)}</p>
                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;">${esc(t.emailLabel)} : ${esc(email)}</p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${esc(t.passwordLabel)} : <strong style="letter-spacing:0.02em;">${esc(DEFAULT_PASSWORD)}</strong></p>
                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;">${esc(t.help)}</p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">
                  <a href="https://wa.me/523332017504" style="color:#1ebe5b;text-decoration:none;">David : +52 33 3201 7504</a>
                  &nbsp;·&nbsp;
                  <a href="https://wa.me/523336616738" style="color:#1ebe5b;text-decoration:none;">Aydé : +52 33 3661 6738</a>
                </p>
                <p style="margin:0;font-size:15px;color:#8a6a36;">${esc(t.signoff)}</p>


              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}


/**
 * Build the plain-text WhatsApp invitation message. It carries the SAME content
 * as the email template (title, body, CTA, login details, default password,
 * help line with both phone numbers, signoff) but adapted for WhatsApp: no
 * HTML, no buttons — just readable plain text with the invitation link pasted
 * inline.
 *
 * @param {string} lang  "es" | "fr" | "en"
 * @param {object} guest  the guest document
 * @param {string} inviteUrl  the invitation URL (pre-fills the login email)
 * @param {string} email  the guest's login email
 * @returns {string}  the plain-text message body
 */
function buildWhatsAppMessage(lang, guest, inviteUrl, email) {

  const name = guest.identity?.firstName || guest.firstName || guest.guestId || "";

  const copy = {
    es: {
      title: "¡Nos casamos!",
      body: "Estaríamos muy felices de tenerte a nuestro lado para compartir con nosotros este día, e incluso todo este fin de semana tan especial.",
      cta: "Encuentra toda la información sobre la boda aquí:",
      login: "Tus datos de acceso son:",
      emailLabel: "Correo",
      passwordLabel: "Contraseña",
      help: "Si tienes cualquier duda, escríbenos por WhatsApp.",
      helpPhones: "David: +52 33 3201 7504 · Aydé: +52 33 3661 6738",
      signoff: "¡Te esperamos!",
    },
    fr: {
      title: "On se marie !",
      body: "Nous serions très heureux de vous avoir à nos côtés pour partager avec nous ce jour, voire tout ce week-end si spécial.",
      cta: "Vous trouverez toutes les informations sur le mariage ici :",
      login: "Vos identifiants de connexion sont :",
      emailLabel: "E-mail",
      passwordLabel: "Mot de passe",
      help: "Si vous avez la moindre question, écrivez-nous sur WhatsApp.",
      helpPhones: "David : +52 33 3201 7504 · Aydé : +52 33 3661 6738",
      signoff: "À très bientôt !",
    },
    en: {
      title: "We're getting married!",
      body: "We would be so happy to have you by our side to share this day with us, or even this whole very special weekend.",
      cta: "You'll find all the information about the wedding here:",
      login: "Your login details are:",
      emailLabel: "Email",
      passwordLabel: "Password",
      help: "If you have any questions, message us on WhatsApp.",
      helpPhones: "David: +52 33 3201 7504 · Aydé: +52 33 3661 6738",
      signoff: "See you soon!",
    },
  };

  const t = copy[lang] || copy.es;

  return [
    `${t.title} 🎉`,
    ``,
    `${name},`,
    ``,
    t.body,
    ``,
    `${t.cta}`,
    inviteUrl,
    ``,
    `${t.login}`,
    `${t.emailLabel}: ${email}`,
    `${t.passwordLabel}: ${DEFAULT_PASSWORD}`,
    ``,
    `${t.help}`,
    t.helpPhones,
    ``,
    t.signoff,
  ].join("\n");
}




/**
 * RFC 2047-encode a header value (e.g. the Subject) so non-ASCII characters
 * (accents like é) survive the trip through the Gmail API. Without this, the
 * raw UTF-8 bytes in the header are misinterpreted by the receiving client and
 * "Aydé" shows up as "AydÃƒÂ©".
 */
function encodeHeader(value) {
  // Only encode when there are non-ASCII characters.
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const encoded = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * Send an email through the couple's shared Gmail account using the Gmail API
 * (OAuth2). The credentials come from Secret Manager.
 *
 * @param {object} opts  { to, subject, body } — body is HTML.
 */
async function sendGmail({ to, subject, body }) {
  // Secret Manager values can carry a trailing newline (e.g. when set via
  // `firebase functions:secrets:set`). Trim them so the OAuth2 client sends a
  // clean client_id/secret/refresh_token — otherwise Google rejects the
  // client_id with `invalid_client: The OAuth client was not found`.
  const clientId = GMAIL_CLIENT_ID.value().trim();
  const clientSecret = GMAIL_CLIENT_SECRET.value().trim();
  const refreshToken = GMAIL_REFRESH_TOKEN.value().trim();
  const from = GMAIL_FROM.value().trim();

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build a raw RFC-2822 message and base64url-encode it for the Gmail API.
  // The Subject is RFC 2047-encoded so accents render correctly; the body is
  // HTML so the invitation link can be a real clickable <a href>.
  const raw = Buffer.from(
    `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${encodeHeader(subject)}\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
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
  { secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
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

    // Resolve the guest's login email. Prefer the explicit `firebaseEmail`
    // field, then `identity.email`, then fall back to the LIVE Firebase Auth
    // user's email (the same source the dashboard's identity column shows).
    // This lets the couple email a guest who has an auth account but no
    // `firebaseEmail` field on their Firestore record (e.g. david_aïli).
    let email = guest.firebaseEmail || guest.identity?.email || "";
    if (!email) {
      try {
        const authUser = await getAuth().getUser(guestId);
        email = authUser?.email || "";
      } catch {
        // No auth user for this guest — leave email empty.
      }
    }
    // The email is only REQUIRED for the email channel. The WhatsApp channel
    // only needs a phone to build the `wa.me` link — the email is used (when
    // available) just to pre-fill the login details in the message text. So we
    // only throw when the email channel is selected and no email can be found.
    if (!email && channel === "email") {
      throw new HttpsError("failed-precondition", "El invitado no tiene correo de acceso (firebaseEmail).");
    }

    const lang = guest.lang || guest.identity?.lang || "es";

    // The invitation URL pre-fills the login email. For WhatsApp the stored
    // password is also included as a query param; for email it is omitted.
    const inviteUrl = buildInvitationUrl(guest, channel, email, channel === "whatsapp");
    const sentAt = new Date().toISOString();

    // Ensure the guest has a Firebase Auth account with the shared default
    // password ("vivamexico"). The message/email tells the guest to sign in
    // with this password, so we keep it in sync here (no password-reset link).
    if (email) {
      try {
        let authUser;
        try {
          authUser = await getAuth().getUserByEmail(email);
        } catch (e) {
          if (e.code === "auth/user-not-found") {
            authUser = await getAuth().createUser({
              uid: guestId,
              email,
              password: DEFAULT_PASSWORD,
              displayName: guest.identity?.firstName || guest.firstName || guestId,
            });
          } else {
            throw e;
          }
        }
        // Enforce the shared default password so the message is accurate.
        await getAuth().updateUser(authUser.uid, { password: DEFAULT_PASSWORD });
      } catch (e) {
        // If auth provisioning fails, the message still goes out; the guest can
        // contact the couple for access.
      }
    }

    // For the WhatsApp channel we build a `wa.me` deep link that opens the
    // guest's chat with the invitation message pre-filled. The admin reviews
    // and sends it themselves in WhatsApp — nothing is auto-sent. The phone is
    // read from the live guest record (identity.phone wins, then phone).
    let waLink = null;
    if (channel === "whatsapp") {
      const phone = guest.identity?.phone || guest.phone || "";
      if (!phone) {
        throw new HttpsError("failed-precondition", "El invitado no tiene teléfono para WhatsApp.");
      }
      // Normalise the phone to digits only (strip spaces, dashes, +, parens).
      const digits = String(phone).replace(/[^\d]/g, "");
      const message = buildWhatsAppMessage(lang, guest, inviteUrl, email);
      waLink = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    }

    if (channel === "email") {

      const subject = lang === "fr"
        ? "Votre invitation au mariage de David & Aydé"
        : lang === "en"
          ? "Your invitation to David & Aydé's wedding"
          : "Tu invitación a la boda de David & Aydé";

      await sendGmail({ to: email, subject, body: invitationEmailBody(lang, guest, inviteUrl, email) });
    }


    // Mark the guest as invited so the dashboard's "Enviada" checkbox reflects
    // it automatically. This write happens server-side (via the Admin SDK, which
    // bypasses the client rules) so the flag is set reliably regardless of the
    // client — the dashboard no longer needs to call saveGuestInline for this.
    await db.collection("guests").doc(guestId).set(
      {
        guestId,
        invitationSent: true,
        invitationSentAt: sentAt,
        invitationChannel: channel,
        updatedBy: request.auth.uid,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Notify the couple on Telegram that an invitation was sent. This lets them
    // track who has been invited and via which channel, without opening the
    // dashboard. The guest's name is resolved from their Firestore record.
    const guestName = await resolveGuestName(guestId);

    const channelLabel = channel === "email" ? "Correo" : "WhatsApp";
    const notifyLines = [
      "📨 *Invitación enviada*",
      kv("Invitado", guestName || guestId),
      kv("Canal", channelLabel),
      kv("Correo", email),
      kv("Hora", formatTime(new Date())),
    ];
    await notify(notifyLines.filter(Boolean).join("\n"));

    return { ok: true, channel, inviteUrl, sentAt, waLink };

  },
);

// ── Analytics summary (scheduled) ─────────────────────────────────────────
//
// Sends a periodic recap of the three analytics collections to the couple so
// they get a high-level pulse without receiving a Telegram message for EVERY
// page view / activity document (which would be extremely noisy). Real-time
// notifications remain for the meaningful, low-volume events (login via
// `onLogin`, inactivity via `onActivityEvent`); this scheduled function batches
// the page_views + activity_events + login_events counts into one digest.
//
// Schedule: every 6 hours, in Mexico City time.

async function countSince(collectionName, since) {
  const db = getFirestore(DB_ID);
  const snapshot = await db.collection(collectionName)
    .where("createdAt", ">", since)
    .count()
    .get();
  return snapshot.data().count;
}

export const analyticsDigest = onSchedule(
  { schedule: "0 */6 * * *", timeZone: "America/Mexico_City", secrets: [TELEGRAM_TOKEN, TELEGRAM_CHAT_ID] },
  async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    let pageViews = 0;
    let activityEvents = 0;
    let loginEvents = 0;
    try {
      [pageViews, activityEvents, loginEvents] = await Promise.all([
        countSince("page_views", since),
        countSince("activity_events", since),
        countSince("login_events", since),
      ]);
    } catch (error) {
      console.error("[analytics-digest] count failed", error);
      return;
    }

    // If nothing happened in this window, skip the message to avoid noise.
    if (pageViews === 0 && activityEvents === 0 && loginEvents === 0) return;

    const lines = [
      "📊 *Resumen de actividad (6 h)*",
      kv("Vistas de sección", String(pageViews)),
      kv("Eventos de inactividad", String(activityEvents)),
      kv("Inicios de sesión", String(loginEvents)),
      kv("Desde", formatTime(since)),
      kv("Hasta", formatTime(now)),
    ];
    await notify(lines.join("\n"));
  },
);



