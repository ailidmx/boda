/**
 * invitation_emails.gs
 *
 * Google Apps Script bound to the wedding Google Sheet.
 *
 * Sends a personalised invitation email to each guest, in their preferred
 * language (es / fr / en), from the script owner's Gmail account, with the
 * couple in CC. It reads the guest's email + language from the INVITADOS tab
 * and builds the invitation link from the guest's PROFILE CODE (Base64URL-
 * encoded), which is what the invitation app accepts.
 *
 * ── IMPORTANT: profile code, not guest UID ────────────────────────────────
 * The invitation app's `decodeInvitationCode()` only accepts PROFILE codes
 * (e.g. `azalea_compartida_porpagar`, `sin_cabaña`), NOT per-guest IDs. So the
 * email link MUST use the guest's profile code. The script reads it from the
 * `perfil` column; if that column is missing it derives the code from the
 * cabin + payment columns (see `deriveProfileCode`).
 *
 * ── Setup ─────────────────────────────────────────────────────────────────
 * 1. Open the Google Sheet → Extensions → Apps Script.
 * 2. Paste the contents of this file into the editor and save.
 * 3. The script runs as the account that owns the spreadsheet. To send FROM
 *    `bodadavidyayde@gmail.com`, that account must own (or be the active
 *    account of) the spreadsheet, and Gmail must be enabled for it.
 * 4. Run `sendInvitationEmails()` once to authorise Gmail + Sheets access.
 * 5. (Optional) Attach `sendInvitationEmails` to a button:
 *    Insert → Drawing → draw a button → ⋮ → Assign script → `sendInvitationEmails`.
 *
 * ── Safety ────────────────────────────────────────────────────────────────
 * - Guests whose `sent` column is already "TRUE" are SKIPPED (no duplicates).
 * - Guests without an email are skipped and reported.
 * - Set `DRY_RUN = true` to preview without sending.
 * - Set `LIMIT` to cap how many emails are sent per run (0 = no limit).
 */

// ── Configuration ─────────────────────────────────────────────────────────

/** Set to true to preview emails without actually sending them. */
var DRY_RUN = false;

/** Max emails to send per run. 0 = no limit. */
var LIMIT = 0;

/** Sender display name shown in the From header. */
var SENDER_NAME = "David & Aydé";

/** Couple's emails — always CC'd on every invitation. */
var CC_RECIPIENTS = ["david.aili.mx@gmail.com", "aydemiss@gmail.com"];

/** Base URL of the invitation site. */
var INVITATION_BASE_URL = "https://boda-david-y-ayde.web.app/";

/** Name of the INVITADOS worksheet. */
var SHEET_NAME = "Invitados";

// ── Column names (must match the INVITADOS header row) ────────────────────

var COL_ID = "UID";
var COL_EMAIL = "email";
var COL_LANG = "lang";
var COL_SENT = "sent";
var COL_NAME = "Nombre"; // used only for the log / fallback greeting

// Profile code column. If present, it is used directly for the invitation
// link. If absent, the script derives the code from the cabin columns below.
var COL_PROFILE_CODE = "perfil";

// Columns used to DERIVE the profile code when COL_PROFILE_CODE is absent.
var COL_CABIN = "Cabaña";            // e.g. "AZALEA - 12p", "CABAÑA_5 - 6p", "sin_cabaña"
var COL_IS_PRIVATE = "isPrivate";    // "TRUE"/"FALSE" — cabin privacy
var COL_IS_PAID = "isCabinPaidByNovios"; // "TRUE"/"FALSE" — cabin paid by the couple

// ── Trilingual copy ───────────────────────────────────────────────────────

var SUBJECTS = {
  es: "Invitación a la boda de David & Aydé 💍",
  fr: "Invitation au mariage de David & Aydé 💍",
  en: "Invitation to David & Aydé's wedding 💍",
};

var BODIES = {
  es: function (name, link) {
    return [
      "Hola " + name + ",",
      "",
      "¡Nos casamos! 💍 Y nos encantaría que nos acompañaras en este día tan especial.",
      "",
      "Hemos preparado una invitación personalizada para ti con todos los detalles:",
      "fechas, alojamiento, comida, música y mucho más.",
      "",
      "👉 Abre tu invitación aquí: " + link,
      "",
      "Por favor confirma tu asistencia y responde las preguntas que encontrarás",
      "dentro de la invitación. ¡Tu respuesta es muy importante para nosotros!",
      "",
      "Con todo el cariño,",
      "David & Aydé",
    ].join("\n");
  },
  fr: function (name, link) {
    return [
      "Bonjour " + name + ",",
      "",
      "Nous nous marions ! 💍 Et nous serions ravis que tu nous accompagnes",
      "pour ce jour si spécial.",
      "",
      "Nous avons préparé une invitation personnalisée pour toi avec tous les",
      "détails : dates, hébergement, repas, musique et bien plus encore.",
      "",
      "👉 Ouvre ton invitation ici : " + link,
      "",
      "Merci de confirmer ta présence et de répondre aux questions que tu",
      "trouveras dans l'invitation. Ta réponse est très importante pour nous !",
      "",
      "Avec toute notre affection,",
      "David & Aydé",
    ].join("\n");
  },
  en: function (name, link) {
    return [
      "Hello " + name + ",",
      "",
      "We're getting married! 💍 And we'd love for you to join us on this very",
      "special day.",
      "",
      "We've prepared a personalised invitation for you with all the details:",
      "dates, accommodation, food, music and much more.",
      "",
      "👉 Open your invitation here: " + link,
      "",
      "Please confirm your attendance and answer the questions you'll find",
      "inside the invitation. Your reply means the world to us!",
      "",
      "With all our love,",
      "David & Aydé",
    ].join("\n");
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Base64URL-encode a string (RFC 4648 §5) — matches the invitation app's
 * `encodeInvitationCode()` (UTF-8 bytes → base64 → URL-safe, no padding).
 */
function base64UrlEncode(str) {
  var bytes = Utilities.newBlob(str).getBytes();
  var b64 = Utilities.base64Encode(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Normalise a language value to es / fr / en (default es). */
function normaliseLang(raw) {
  var v = String(raw || "").trim().toLowerCase();
  if (v.indexOf("fr") === 0) return "fr";
  if (v.indexOf("en") === 0) return "en";
  return "es";
}

/** Normalise a boolean-ish cell value to true/false. */
function toBool(v) {
  var s = String(v || "").trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES" || s === "SI";
}

/**
 * Map a cabin display name to the unit slug used in profile codes.
 * Add/rename entries as needed to match the sheet's cabin names.
 */
function cabinUnitSlug(cabin) {
  var c = String(cabin || "").trim().toLowerCase();
  if (!c || c.indexOf("sin") === 0) return "";
  if (c.indexOf("azalea") !== -1) return "azalea";
  if (c.indexOf("hortencia") !== -1) return "hortencia";
  if (c.indexOf("lavanda") !== -1 || c.indexOf("lavande") !== -1) return "lavanda";
  if (c.indexOf("casona") !== -1) return "casona";
  if (c.indexOf("margarita") !== -1 || c.indexOf("marguerite") !== -1) return "margarita";
  if (c.indexOf("dalia") !== -1) return "dalia";
  // Generic "CABAÑA_N" / "CABANA_N" / "CABAÑA N" → "cabaña_N"
  var m = c.match(/caba[ñn]a[_\s-]*(\d+)/i);
  if (m) return "cabaña_" + m[1];
  return "";
}

/**
 * Derive the profile code from the cabin + payment columns.
 * Returns "" when it cannot be derived (caller should skip / warn).
 */
function deriveProfileCode(row) {
  var cabin = String(row[COL_CABIN] || "").trim();
  if (!cabin || cabin.toLowerCase().indexOf("sin") === 0) return "sin_cabaña";

  var unit = cabinUnitSlug(cabin);
  if (!unit) return "";

  var occupancy = toBool(row[COL_IS_PRIVATE]) ? "privada" : "compartida";
  var payment = toBool(row[COL_IS_PAID]) ? "pagada" : "porpagar";
  return unit + "_" + occupancy + "_" + payment;
}

/**
 * Resolve the profile code for a guest row: prefer the `perfil` column,
 * otherwise derive it from the cabin columns.
 */
function resolveProfileCode(row) {
  var direct = String(row[COL_PROFILE_CODE] || "").trim();
  if (direct) return direct;
  return deriveProfileCode(row);
}

/** Build the personalised invitation link for a profile code. */
function buildInvitationLink(profileCode) {
  return INVITATION_BASE_URL + "?invitationCode=" + base64UrlEncode(profileCode);
}

// ── Sending ───────────────────────────────────────────────────────────────

/**
 * Send one invitation email to a single guest row.
 * Returns a status string for logging.
 */
function sendOne(row, rowIndex) {
  var guestId = String(row[COL_ID] || "").trim();
  var email = String(row[COL_EMAIL] || "").trim();
  var lang = normaliseLang(row[COL_LANG]);
  var name = String(row[COL_NAME] || guestId || "amigo").trim();

  if (!guestId) return "row " + rowIndex + ": no UID, skipped";
  if (!email) return "row " + rowIndex + " (" + guestId + "): no email, skipped";
  if (String(row[COL_SENT] || "").trim().toUpperCase() === "TRUE") {
    return "row " + rowIndex + " (" + guestId + "): already sent, skipped";
  }

  var profileCode = resolveProfileCode(row);
  if (!profileCode) {
    return "row " + rowIndex + " (" + guestId + "): could not determine profile code, skipped";
  }

  var link = buildInvitationLink(profileCode);
  var subject = SUBJECTS[lang];
  var body = BODIES[lang](name, link);

  if (DRY_RUN) {
    Logger.log("[DRY RUN] To: %s | Lang: %s | Code: %s | Subject: %s", email, lang, profileCode, subject);
    Logger.log(body);
    return "row " + rowIndex + " (" + guestId + "): [DRY RUN] would send to " + email + " [code " + profileCode + "]";
  }

  GmailApp.sendEmail(email, subject, body, {
    cc: CC_RECIPIENTS.join(","),
    name: SENDER_NAME,
  });

  return "row " + rowIndex + " (" + guestId + "): sent to " + email + " [" + lang + "] [code " + profileCode + "]";
}

/**
 * Send invitation emails to all guests in the INVITADOS tab.
 * Skips guests already marked as sent. Marks the `sent` column after sending.
 */
function sendInvitationEmails() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Worksheet '" + SHEET_NAME + "' not found.");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = {};
  headers.forEach(function (h, i) { colIndex[String(h).trim()] = i; });

  var required = [COL_ID, COL_EMAIL, COL_LANG, COL_SENT];
  required.forEach(function (col) {
    if (!(col in colIndex)) {
      throw new Error("Missing required column '" + col + "' in " + SHEET_NAME + ".");
    }
  });

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No guest rows found.");
    return;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var sentCount = 0;
  var results = [];

  for (var r = 0; r < values.length; r++) {
    if (LIMIT > 0 && sentCount >= LIMIT) {
      results.push("Limit of " + LIMIT + " reached, stopping.");
      break;
    }
    var row = {};
    headers.forEach(function (h, i) { row[String(h).trim()] = values[r][i]; });
    var status = sendOne(row, r + 2);
    results.push(status);
    if (status.indexOf("sent to") !== -1) {
      sentCount++;
      if (!DRY_RUN) {
        // Mark the sent column (colIndex[COL_SENT] + 1 is the 1-based column).
        sheet.getRange(r + 2, colIndex[COL_SENT] + 1).setValue("TRUE");
      }
    }
  }

  Logger.log("=== Invitation emails: %d sent, %d total rows ===", sentCount, values.length);
  results.forEach(function (s) { Logger.log(s); });
  SpreadsheetApp.getUi().alert(
    "Invitaciones: " + sentCount + " enviadas.\n\n" + results.join("\n")
  );
}

/**
 * Send a single invitation email for the currently selected row.
 * Useful when attached to a per-row button.
 */
function sendSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rowIndex = sheet.getActiveRange().getRow();
  if (rowIndex < 2) {
    SpreadsheetApp.getUi().alert("Select a guest row first.");
    return;
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = {};
  headers.forEach(function (h, i) { row[String(h).trim()] = values[i]; });
  var status = sendOne(row, rowIndex);
  Logger.log(status);
  SpreadsheetApp.getUi().alert(status);
}
