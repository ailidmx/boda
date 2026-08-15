/**
 * invitation_emails.gs
 *
 * Google Apps Script bound to the wedding Google Sheet.
 *
 * Sends a personalised invitation email to each guest, in their preferred
 * language (es / fr / en), from the script owner's Gmail account, with the
 * couple in CC.
 *
 * ── Two ways to send ───────────────────────────────────────────────────────
 * 1. AUTO (recommended): an installable onEdit trigger fires whenever the
 *    `_enviado` checkbox is set to TRUE on a guest row, and sends that guest's
 *    invitation immediately. See `setupTrigger()` below.
 * 2. MANUAL: run `sendInvitationEmails()` (bulk, skips already-sent) or
 *    `sendSelectedRow()` (single row) from the Apps Script editor or a button.
 *
 * ── Email content ──────────────────────────────────────────────────────────
 * The email BODY is read from the guest's row, from the column matching their
 * language:
 *   - `_msgInvitFR`  (French)
 *   - `_msgInvitES`  (Spanish)
 *   - `_msgInvitEN`  (English)
 * The language is taken from the `lang` column (es / fr / en). The body may
 * contain the placeholders {name} and {link}, which are replaced with the
 * guest's name and their personalised invitation link.
 *
 * ── Invitation link ────────────────────────────────────────────────────────
 * The invitation app's `decodeInvitationCode()` only accepts PROFILE codes
 * (e.g. `azalea_compartida_porpagar`, `sin_cabaña`), NOT per-guest IDs. So the
 * email link MUST use the guest's profile code. The script reads it from the
 * `perfil` column; if that column is missing it derives the code from the
 * cabin + payment columns (see `deriveProfileCode`).
 *
 * ── Setup (one time) ───────────────────────────────────────────────────────
 * 1. Open the Google Sheet → Extensions → Apps Script.
 * 2. Paste the contents of this file into the editor and save.
 * 3. The script runs as the account that owns the spreadsheet. To send FROM
 *    `bodadavidyayde@gmail.com`, that account must own (or be the active
 *    account of) the spreadsheet, and Gmail must be enabled for it.
 * 4. Run `setupTrigger()` once from the editor to install the onEdit trigger
 *    (this also authorises Gmail + Sheets access).
 * 5. (Optional) Attach `sendInvitationEmails` to a button:
 *    Insert → Drawing → draw a button → ⋮ → Assign script → `sendInvitationEmails`.
 *
 * ── Safety ─────────────────────────────────────────────────────────────────
 * - Guests whose `_enviado` column is already TRUE are SKIPPED (no duplicates).
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
var COL_EMAIL = "firebase.Identifier"; // primary; falls back to firebase_email / _email / email
var COL_LANG = "lang";                 // es / fr / en
var COL_SENT = "_enviado";             // checkbox; also accepts "sent"
var COL_NAME = "Nombre";               // used only for the log / fallback greeting

// Email content template columns (per language). The script picks the one that
// matches the guest's `lang` value.
var COL_MSG_FR = "_msgInvitFR";
var COL_MSG_ES = "_msgInvitES";
var COL_MSG_EN = "_msgInvitEN";

// Profile code column. If present, it is used directly for the invitation
// link. If absent, the script derives the code from the cabin columns below.
var COL_PROFILE_CODE = "perfil";

// Columns used to DERIVE the profile code when COL_PROFILE_CODE is absent.
var COL_CABIN = "Cabaña";            // e.g. "AZALEA - 12p", "CABAÑA_5 - 6p", "sin_cabaña"
var COL_IS_PRIVATE = "isPrivate";    // "TRUE"/"FALSE" — cabin privacy
var COL_IS_PAID = "isCabinPaidByNovios"; // "TRUE"/"FALSE" — cabin paid by the couple

// ── Trilingual subjects (the body comes from the sheet) ───────────────────

var SUBJECTS = {
  es: "Invitación a la boda de David & Aydé 💍",
  fr: "Invitation au mariage de David & Aydé 💍",
  en: "Invitation to David & Aydé's wedding 💍",
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

/**
 * Build the personalised invitation link for a profile code, including the
 * analytics query-string params the invitation app reads to pre-fill the login
 * field and to measure which channel drove the visit + how quickly the guest
 * answered.
 *
 * Params appended:
 *   - `guest`      the guest's login email (pre-fills the login field)
 *   - `utm_source` "email" (these are invitation emails)
 *   - `utm_medium` "email"
 *   - `utm_campaign` "invitacion"
 *   - `sent_at`    epoch ms when the email is sent (for time-to-answer)
 */
function buildInvitationLink(profileCode, email, sentAt) {
  var params = [
    "invitationCode=" + base64UrlEncode(profileCode),
    "guest=" + encodeURIComponent(email || ""),
    "utm_source=email",
    "utm_medium=email",
    "utm_campaign=invitacion",
    "sent_at=" + (sentAt || Date.now()),
  ];
  return INVITATION_BASE_URL + "?" + params.join("&");
}


/**
 * Read the email content template for a guest row, in their language.
 * Returns the raw template text (may contain {name} and {link} placeholders),
 * or "" if the column is missing/empty.
 */
function readMessageTemplate(row, lang) {
  var col = lang === "fr" ? COL_MSG_FR : (lang === "en" ? COL_MSG_EN : COL_MSG_ES);
  return String(row[col] || "").trim();
}

/** Replace {name} and {link} placeholders in a template. */
function fillTemplate(template, name, link) {
  return String(template || "")
    .replace(/\{name\}/g, name)
    .replace(/\{link\}/g, link);
}

// ── Sending ───────────────────────────────────────────────────────────────

/**
 * Send one invitation email to a single guest row.
 * Returns a status string for logging.
 */
function sendOne(row, rowIndex) {
  var guestId = String(row[COL_ID] || "").trim();
  var email = String(row[COL_EMAIL] || row.firebase_email || row._email || row.email || "").trim();
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

  var link = buildInvitationLink(profileCode, email, Date.now());
  var subject = SUBJECTS[lang];


  // Body comes from the sheet template column for the guest's language.
  var template = readMessageTemplate(row, lang);
  var body = template
    ? fillTemplate(template, name, link)
    : "Hola " + name + ",\n\nAbre tu invitación aquí: " + link + "\n\nDavid & Aydé";

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
 * Skips guests already marked as sent. Marks the `_enviado` column after sending.
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

// ── Auto-send on checkbox (installable onEdit trigger) ────────────────────

/**
 * Install the onEdit trigger that auto-sends an invitation when the `_enviado`
 * checkbox is set to TRUE. Run this once from the Apps Script editor.
 * It runs as the script owner (the couple's Gmail account), so GmailApp works.
 */
function setupTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Remove any existing onEditSendInvitation triggers to avoid duplicates.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onEditSendInvitation") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onEditSendInvitation")
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  Logger.log("onEditSendInvitation trigger installed for spreadsheet: " + ss.getName());
  SpreadsheetApp.getUi().alert("Trigger instalado. Ahora, al marcar _enviado = TRUE se enviará el correo.");
}

/**
 * Installable onEdit trigger handler.
 * Detects when the `_enviado` (or `sent`) checkbox on a guest row is set to
 * TRUE and sends that guest's invitation email.
 *
 * NOTE: This must be installed as an INSTALLABLE trigger (see setupTrigger),
 * not a simple onEdit, because it uses GmailApp which requires authorisation.
 */
function onEditSendInvitation(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var rowIndex = e.range.getRow();
  if (rowIndex < 2) return; // header row

  var col = e.range.getColumn();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerName = String(headers[col - 1] || "").trim();

  // Only react to the sent checkbox column (accept _enviado or sent).
  var isSentCol = headerName === COL_SENT || headerName === "sent";
  if (!isSentCol) return;

  // Only react when the checkbox is turned ON (value TRUE).
  var newValue = String(e.value || "").trim().toUpperCase();
  var oldValue = String(e.oldValue || "").trim().toUpperCase();
  if (newValue !== "TRUE") return;
  if (oldValue === "TRUE") return; // already true before — no change

  // Read the full row.
  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = {};
  headers.forEach(function (h, i) { row[String(h).trim()] = values[i]; });

  var status = sendOne(row, rowIndex);
  Logger.log(status);
}
