/**
 * invitation_emails.gs
 *
 * Google Apps Script bound to the wedding Google Sheet.
 *
 * Sends a personalised, BEAUTIFUL HTML invitation email to each guest, in their
 * preferred language (es / fr / en), from the script owner's Gmail account,
 * with the couple in CC.
 *
 * ── Two ways to send ───────────────────────────────────────────────────────
 * 1. AUTO (recommended): an installable onEdit trigger fires whenever the
 *    `_enviado` checkbox is set to TRUE on a guest row, and sends that guest's
 *    invitation immediately. See `setupTrigger()` below.
 * 2. MANUAL: run `sendInvitationEmails()` (bulk, skips already-sent) or
 *    `sendSelectedRow()` (single row) from the Apps Script editor or a button.
 *
 * ── Source of truth: Firestore ─────────────────────────────────────────────
 * The guest's LANGUAGE (`identity.lang`) is read from the LIVE Firestore
 * `guests` collection (the authoritative source), falling back to the sheet
 * `lang` column when Firestore is unreachable. This keeps the email correct
 * even when the sheet is out of sync (e.g. the sheet `lang` column says "es"
 * but Firestore `identity.lang` is "fr"). The script authenticates to
 * Firestore with the project's service account (see SERVICE_ACCOUNT_* below).

 *
 * ── Email content ──────────────────────────────────────────────────────────
 * The email is a hand-built HTML template (inline CSS, UTF-8) with:
 *   - the couple's names + a warm greeting in the guest's language
 *   - a big "Open your invitation" button (the personalised link)
 *   - the guest's login email + password (so they can auto-fill the login form)
 *   - the invite type ("email")
 * The body may also be overridden per-language via the sheet columns
 * `_msgInvitFR` / `_msgInvitES` / `_msgInvitEN` (placeholders {name} and {link}).
 *
 * ── Invitation link ────────────────────────────────────────────────────────
 * The link carries the analytics + login pre-fill params the invitation app
 * reads:
 *   - `guest`        the guest's login email (pre-fills the username field)
 *   - `password`     the shared login password (pre-fills the password field)
 *   - `inviteType`   "email" (how the guest was invited)
 *   - `utm_source`/`utm_medium`/`utm_campaign` = email / email / invitacion
 *   - `sent_at`      epoch ms when the email is sent (for time-to-answer)


 *
 * ── Setup (one time) ───────────────────────────────────────────────────────
 * 1. Open the Google Sheet → Extensions → Apps Script.
 * 2. Paste the contents of this file into the editor and save.
 * 3. Set the SERVICE_ACCOUNT_* constants below to the project's service
 *    account (client_email + private_key). These are used to read Firestore.
 * 4. The script runs as the account that owns the spreadsheet. To send FROM
 *    `bodadavidyayde@gmail.com`, that account must own the spreadsheet.
 * 5. Run `setupTrigger()` once from the editor to install the onEdit trigger.
 * 6. (Optional) Attach `sendInvitationEmails` to a button.
 *
 * ── Safety ─────────────────────────────────────────────────────────────────
 * - Emails are ALWAYS re-sent, even if the `_enviado` column is already TRUE
 *   (the couple wants to be able to resend invitations freely).
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

/** Shared login password for all guests (Firebase Auth). */
var SHARED_PASSWORD = "vivamexico";

/** How the guest was invited — shown in the email + link. */
var INVITE_TYPE = "email";

// ── Firestore service account (used to read the authoritative guest data) ──
// Fill these in from integraciones/google_sheets/service_account.json.
var SERVICE_ACCOUNT_CLIENT_EMAIL = "firebase-adminsdk@boda-500805.iam.gserviceaccount.com";
var SERVICE_ACCOUNT_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nREPLACE_ME\n-----END PRIVATE KEY-----\n";
var FIRESTORE_PROJECT_ID = "boda-500805";

// ── Column names (must match the INVITADOS header row) ────────────────────

var COL_ID = "UID";
var COL_EMAIL = "firebase.Identifier"; // primary; falls back to firebase_email / _email / email
var COL_LANG = "lang";                 // es / fr / en (fallback when Firestore unreachable)
var COL_SENT = "_enviado";             // checkbox; also accepts "sent"
var COL_NAME = "Nombre";               // used only for the log / fallback greeting

// Email content template columns (per language). The script picks the one that
// matches the guest's language.
var COL_MSG_FR = "_msgInvitFR";
var COL_MSG_ES = "_msgInvitES";
var COL_MSG_EN = "_msgInvitEN";

// ── Trilingual subjects ───────────────────────────────────────────────────


var SUBJECTS = {
  es: "Invitación a la boda de David & Aydé 💍",
  fr: "Invitation au mariage de David & Aydé 💍",
  en: "Invitation to David & Aydé's wedding 💍",
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Base64URL-encode a string (RFC 4648 §5) — matches the app's encoder. */
function base64UrlEncode(str) {
  var bytes = Utilities.newBlob(str).getBytes();
  var b64 = Utilities.base64Encode(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * RFC 2047-encode a subject line so non-ASCII characters (emoji, accents)
 * display correctly in the recipient's mail client.
 *
 * GmailApp.sendEmail does NOT encode the subject itself — it passes it through
 * as-is, which mangles emoji (e.g. 💍 → ) because the subject header is
 * not UTF-8 encoded. Encoding it as an RFC 2047 "encoded-word"
 * ( =?UTF-8?B?...?= ) makes Gmail display the emoji correctly.
 */
function encodeSubject(subject) {
  // Repair any mojibake first so the encoded subject is the real text.
  var clean = repairMojibake(String(subject));
  var bytes = Utilities.newBlob(clean).getBytes();
  var b64 = Utilities.base64Encode(bytes);
  return "=?UTF-8?B?" + b64 + "?=";
}

/**
 * Best-effort repair of common mojibake in text read from the sheet.
 *
 * If a cell's emoji were double-encoded (UTF-8 bytes interpreted as Latin-1
 * and then re-encoded as UTF-8), they come back as mojibake like "Ã°Å¸ÅŽâ€°".
 * This detects the typical markers and, when present, re-encodes the string
 * as Latin-1 and decodes it as UTF-8 to restore the original characters.
 * Returns the input unchanged if it doesn't look like mojibake or the repair
 * doesn't help.
 */
function repairMojibake(s) {
  if (!s) return s;
  try {
    var str = String(s);
    // Typical mojibake markers for double-encoded UTF-8, written as Unicode
    // escapes so they survive any file encoding round-trip:
    //   \u00C3 = Ã, \u00E2\u20AC = â€, \u00C2 = Â, \u00F0\u0178 = ðŸ
    var MOJIBAKE = /[\uFFFD]|\u00C3|\u00E2\u20AC|\u00C2|\u00F0\u0178/;
    if (!MOJIBAKE.test(str)) return str;
    var latin1 = Utilities.newBlob(str, "iso-8859-1").getBytes();
    var repaired = Utilities.newBlob(latin1, "utf-8").getDataAsString();
    if (repaired !== str && !MOJIBAKE.test(repaired)) {
      return repaired;
    }
    return str;
  } catch (e) {
    return s;
  }
}

/** Normalise a language value to es / fr / en (default es). */
function normaliseLang(raw) {
  var v = String(raw || "").trim().toLowerCase();
  if (v.indexOf("fr") === 0) return "fr";
  if (v.indexOf("en") === 0) return "en";
  return "es";
}

// ── Firestore access (authoritative guest data) ───────────────────────────


/**
 * Build a signed JWT (RS256) for the service account and exchange it for a
 * Google OAuth2 access token scoped to Firestore.
 */
function getFirestoreAccessToken() {
  var now = Math.floor(Date.now() / 1000);
  var header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  var payload = base64UrlEncode(JSON.stringify({
    iss: SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  var signingInput = header + "." + payload;
  var signature = Utilities.computeRsaSha256Signature(
    signingInput,
    SERVICE_ACCOUNT_PRIVATE_KEY
  );
  var jwt = signingInput + "." + Utilities.base64Encode(signature)
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  var tokenRes = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" +
      encodeURIComponent(jwt),
    muteHttpExceptions: true,
  });
  var tokenJson = JSON.parse(tokenRes.getContentText());
  if (!tokenJson.access_token) {
    throw new Error("Firestore token exchange failed: " + tokenRes.getContentText());
  }
  return tokenJson.access_token;
}

/**
 * Read a guest document from Firestore by id.
 * Returns the document data object, or null if not found / on error.
 *
 * Uses the `runQuery` API with a `__name__` filter instead of the direct
 * `documents/{document_path}` endpoint. Guest IDs can contain non-ASCII
 * characters (e.g. "david_aïli", "aydé_juárez_guadalupe"); the direct
 * document-path endpoint rejects those with "Invalid argument: key" because
 * the percent-encoded characters in the path are not decoded properly.
 * `runQuery` matches on the document reference value in the JSON body, which
 * handles special characters correctly.
 *
 * The document ID is percent-encoded in the reference value (Firestore
 * resource names require URL-encoded path segments). This also keeps raw
 * non-ASCII bytes out of the JSON payload, which Apps Script's
 * `UrlFetchApp.fetch` otherwise rejects with "Invalid argument: key".
 */
function readGuestFromFirestore(guestId) {
  if (!guestId) return null;
  try {
    var token = getFirestoreAccessToken();
    var url = "https://firestore.googleapis.com/v1/projects/" +
      FIRESTORE_PROJECT_ID + "/databases/(default)/documents:runQuery";
    var reference = "projects/" + FIRESTORE_PROJECT_ID +
      "/databases/(default)/documents/guests/" + encodeURIComponent(guestId);

    var body = {
      structuredQuery: {
        from: [{ collectionId: "guests" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "__name__" },
            op: "EQUAL",
            value: { referenceValue: reference },
          },
        },
        limit: 1,
      },
    };
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body),
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      console.warn("[firestore] read %s failed (%s): %s",
        guestId, res.getResponseCode(), res.getContentText());
      return null;
    }
    var results = JSON.parse(res.getContentText());
    if (!results || results.length === 0 || !results[0].document) return null;
    return firestoreFieldsToObject(results[0].document.fields);
  } catch (err) {
    console.warn("[firestore] read %s error: %s", guestId, err);
    return null;
  }
}

/** Convert Firestore REST `fields` map into a plain JS object. */
function firestoreFieldsToObject(fields) {
  var out = {};
  Object.keys(fields || {}).forEach(function (key) {
    out[key] = firestoreValueToJs(fields[key]);
  });
  return out;
}

/** Convert a single Firestore REST value into a JS value. */
function firestoreValueToJs(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.mapValue) return firestoreFieldsToObject(v.mapValue.fields);
  if (v.arrayValue) return (v.arrayValue.values || []).map(firestoreValueToJs);
  if (v.nullValue !== undefined) return null;
  return null;
}

/**
 * Resolve the guest's authoritative language from Firestore, falling back to
 * the sheet row. Returns { lang }.
 */
function resolveGuestData(row, guestId) {
  var fs = readGuestFromFirestore(guestId);
  var lang = normaliseLang(row[COL_LANG]);

  if (fs && fs.identity && fs.identity.lang) {
    lang = normaliseLang(fs.identity.lang);
  }

  return { lang: lang };
}



// ── Email HTML template ───────────────────────────────────────────────────

/** Escape HTML special chars in user-provided strings. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Trilingual greeting + body copy for the HTML email. */
function emailCopy(lang, name) {
  var n = esc(name);
  if (lang === "fr") {
    return {
      greeting: "Nous nous marions !",
      body: "Nous serions ravis de vous avoir à nos côtés pour partager ce jour, et même tout ce week-end si spécial.",
      cta: "Ouvrir mon invitation",
      loginLabel: "Votre identifiant",
      passwordLabel: "Votre mot de passe",
      inviteLabel: "Invitation envoyée par",
      footer: "Avec tout notre amour, David & Aydé",
    };
  }
  if (lang === "en") {
    return {
      greeting: "We're getting married!",
      body: "We would be so happy to have you by our side to share this day with us — and even this whole special weekend.",
      cta: "Open my invitation",
      loginLabel: "Your username",
      passwordLabel: "Your password",
      inviteLabel: "Invitation sent by",
      footer: "With all our love, David & Aydé",
    };
  }
  return {
    greeting: "¡Nos casamos!",
    body: "Estaríamos muy felices de tenerlos a nuestro lado para compartir con nosotros este día, e incluso todo este fin de semana tan especial.",
    cta: "Abrir mi invitación",
    loginLabel: "Tu usuario",
    passwordLabel: "Tu contraseña",
    inviteLabel: "Invitación enviada por",
    footer: "Con todo nuestro amor, David & Aydé",
  };
}

/**
 * Build the beautiful HTML email body.
 * @param {string} lang  es / fr / en
 * @param {string} name  guest display name
 * @param {string} link  personalised invitation link
 * @param {string} email guest login email
 * @param {string} password shared login password
 */
function buildHtmlEmail(lang, name, link, email, password) {
  var c = emailCopy(lang, name);
  var login = esc(email);
  var pass = esc(password);
  var href = esc(link);
  return [
    '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + SUBJECTS[lang] + '</title></head>',
    '<body style="margin:0;padding:0;background-color:#f6f1e7;font-family:Georgia,serif;color:#3a2e22;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f1e7;padding:24px 12px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(58,46,34,0.12);">',
    // Header band
    '<tr><td style="background:linear-gradient(135deg,#8a6d4f,#b08d5f);padding:36px 32px;text-align:center;">',
    '<div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#f3e9d8;">David & Aydé</div>',
    '<div style="font-size:30px;color:#ffffff;margin-top:10px;font-family:Georgia,serif;">' + c.greeting + '</div>',
    '<div style="font-size:14px;color:#f3e9d8;margin-top:6px;">' + SUBJECTS[lang] + '</div>',
    '</td></tr>',
    // Body
    '<tr><td style="padding:36px 40px;">',
    '<p style="font-size:17px;line-height:1.7;margin:0 0 18px;">' + c.body + '</p>',
    // CTA button
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;"><tr><td align="center">',
    '<a href="' + href + '" style="display:inline-block;background-color:#8a6d4f;color:#ffffff;text-decoration:none;font-size:16px;font-family:Georgia,serif;padding:15px 34px;border-radius:40px;">' + c.cta + '</a>',
    '</td></tr></table>',
    // Login credentials card
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6ee;border:1px solid #e6dcc8;border-radius:12px;padding:20px 24px;margin:22px 0;">',
    '<tr><td style="font-size:13px;color:#8a6d4f;letter-spacing:1px;text-transform:uppercase;padding-bottom:10px;">' + c.loginLabel + '</td></tr>',
    '<tr><td style="font-size:16px;font-family:Menlo,monospace;color:#3a2e22;padding-bottom:14px;">' + login + '</td></tr>',
    '<tr><td style="font-size:13px;color:#8a6d4f;letter-spacing:1px;text-transform:uppercase;padding-bottom:10px;">' + c.passwordLabel + '</td></tr>',
    '<tr><td style="font-size:16px;font-family:Menlo,monospace;color:#3a2e22;padding-bottom:14px;">' + pass + '</td></tr>',
    '<tr><td style="font-size:13px;color:#8a6d4f;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;">' + c.inviteLabel + '</td></tr>',
    '<tr><td style="font-size:15px;color:#3a2e22;">' + esc(INVITE_TYPE) + '</td></tr>',
    '</table>',
    '<p style="font-size:14px;color:#8a6d4f;line-height:1.6;margin:0;">' + c.footer + '</p>',
    '</td></tr>',
    // Footer band
    '<tr><td style="background-color:#f3ece0;padding:18px 32px;text-align:center;font-size:12px;color:#a08a6a;">',
    'boda-david-y-ayde.web.app',
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join("");
}

// ── Invitation link ───────────────────────────────────────────────────────

/**
 * Build the personalised invitation link, including the analytics + login
 * pre-fill params the invitation app reads.
 */
function buildInvitationLink(email, sentAt) {
  var params = [
    "guest=" + encodeURIComponent(email || ""),
    "password=" + encodeURIComponent(SHARED_PASSWORD),
    "inviteType=" + encodeURIComponent(INVITE_TYPE),
    "utm_source=email",
    "utm_medium=email",
    "utm_campaign=invitacion",
    "sent_at=" + (sentAt || Date.now()),
  ];
  return INVITATION_BASE_URL + "?" + params.join("&");
}


/** Read the email content template for a guest row, in their language. */
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
function sendOne(row, rowIndex, force) {
  var guestId = String(row[COL_ID] || "").trim();
  var email = String(row[COL_EMAIL] || row.firebase_email || row._email || row.email || "").trim();
  var name = String(row[COL_NAME] || guestId || "amigo").trim();

  console.log("[sendOne] row=%s guest=%s email=%s force=%s",
    rowIndex, guestId, email, force ? "true" : "false");

  if (!guestId) {
    var m = "row " + rowIndex + ": no UID, skipped";
    console.log("[sendOne] " + m);
    return m;
  }
  if (!email) {
    var m2 = "row " + rowIndex + " (" + guestId + "): no email, skipped";
    console.log("[sendOne] " + m2);
    return m2;
  }
  // NOTE: We ALWAYS resend — the `_enviado` checkbox is intentionally ignored
  // so invitations can be re-sent freely (the couple's requirement).

  // Authoritative language from Firestore (falls back to the sheet `lang`).
  var data = resolveGuestData(row, guestId);
  var lang = data.lang;
  console.log("[sendOne] resolved lang=%s", lang);

  var link = buildInvitationLink(email, Date.now());


  // RFC 2047-encode the subject so emoji/accents display correctly (GmailApp
  // does not encode the subject itself, which mangles emoji).
  var subject = encodeSubject(SUBJECTS[lang]);

  // Body: use the sheet template if present, else the beautiful HTML template.
  // Repair any mojibake in the sheet template so emoji come through intact.
  var template = repairMojibake(readMessageTemplate(row, lang));
  var htmlBody;
  if (template) {
    var plain = fillTemplate(template, name, link);
    htmlBody = "<div style=\"font-family:Georgia,serif;color:#3a2e22;line-height:1.7;\">" +
      plain.replace(/\n/g, "<br>") + "</div>";
  } else {
    htmlBody = buildHtmlEmail(lang, name, link, email, SHARED_PASSWORD);
  }

  if (DRY_RUN) {
    Logger.log("[DRY RUN] To: %s | Lang: %s | Subject: %s", email, lang, subject);
    Logger.log(htmlBody);
    console.log("[sendOne] [DRY RUN] would send to %s", email);
    return "row " + rowIndex + " (" + guestId + "): [DRY RUN] would send to " + email;
  }

  try {
    GmailApp.sendEmail(email, subject, "", {
      htmlBody: htmlBody,
      cc: CC_RECIPIENTS.join(","),
      name: SENDER_NAME,
    });
    var ok = "row " + rowIndex + " (" + guestId + "): sent to " + email + " [" + lang + "]";
    console.log("[sendOne] EMAIL SENT: " + ok);
    return ok;

  } catch (err) {
    var fail = "row " + rowIndex + " (" + guestId + "): SEND FAILED: " + err;
    console.error("[sendOne] " + fail);
    return fail;
  }
}

/**
 * Send invitation emails to all guests in the INVITADOS tab.
 * ALWAYS re-sends (the `_enviado` checkbox is ignored). Marks the `_enviado`
 * column after sending.
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

/**
 * Force-resend the invitation email for the currently selected row, even if
 * the `_enviado` checkbox is already TRUE. Useful for testing, or for
 * re-sending after editing a guest's details (language, cabin, email, etc.).
 * Attach this to a "Resend" button or run it from the Apps Script editor.
 */
function resendSelectedRow() {
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
  var status = sendOne(row, rowIndex, true); // force = true → bypasses _enviado
  Logger.log(status);
  SpreadsheetApp.getUi().alert(status);
}

/**
 * Force-resend invitation emails to ALL guests, ignoring the `_enviado`
 * checkbox. Asks for confirmation first. Use with care — this sends to
 * everyone, including those already sent.
 */
function resendAll() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    "Resend all invitations?",
    "This will re-send an invitation email to EVERY guest, ignoring the " +
      "'_enviado' checkbox. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Worksheet '" + SHEET_NAME + "' not found.");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = {};
  headers.forEach(function (h, i) { colIndex[String(h).trim()] = i; });

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
    var status = sendOne(row, r + 2, true); // force = true → bypasses _enviado
    results.push(status);
    if (status.indexOf("sent to") !== -1) sentCount++;
  }

  Logger.log("=== Resend all: %d sent, %d total rows ===", sentCount, values.length);
  results.forEach(function (s) { Logger.log(s); });
  ui.alert("Invitaciones reenviadas: " + sentCount + ".\n\n" + results.join("\n"));
}


// ── Auto-send on checkbox (installable onEdit trigger) ────────────────────

/**
 * Install the onEdit trigger that auto-sends an invitation when the `_enviado`
 * checkbox is set to TRUE. Run this once from the Apps Script editor.
 */
function setupTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onEditSendInvitation") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onEditSendInvitation")
    .forSpreadsheet(ss)
    .onChange()
    .create();
  Logger.log("onEditSendInvitation trigger installed.");
}

/**
 * List the currently installed triggers. Run this to confirm the onEdit
 * trigger is installed (the checkbox auto-send only works when it is).
 */
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log("Installed triggers: " + triggers.length);
  triggers.forEach(function (t) {
    Logger.log(" - " + t.getHandlerFunction() + " (" + t.getEventType() + ")");
  });
  return triggers.map(function (t) {
    return t.getHandlerFunction() + " (" + t.getEventType() + ")";
  });
}


/**
 * Installable onEdit trigger handler. When the `_enviado` checkbox on a guest
 * row is set to TRUE, sends that guest's invitation immediately.
 */
function onEditSendInvitation(e) {
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = {};
  headers.forEach(function (h, i) { colIndex[String(h).trim()] = i; });

  var sentCol = colIndex[COL_SENT];
  if (sentCol === undefined) return;
  if (range.getColumn() !== sentCol + 1) return;

  var rowIndex = range.getRow();
  if (rowIndex < 2) return;

  var value = sheet.getRange(rowIndex, sentCol + 1).getValue();
  if (String(value).trim().toUpperCase() !== "TRUE") return;

  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = {};
  headers.forEach(function (h, i) { row[String(h).trim()] = values[i]; });

  var status = sendOne(row, rowIndex);
  Logger.log(status);
}
