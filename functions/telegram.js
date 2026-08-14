/**
 * Telegram notification helper.
 *
 * Sends messages to a Telegram chat via the Bot API. The bot token and the
 * target chat ID are passed in by the caller (from Firebase secrets), so the
 * secret never lives in the client or in source control.
 *
 * The module is defensive: if the config is missing or the API call fails, it
 * logs and swallows the error so a notification problem never breaks a guest's
 * write to Firestore.
 */

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Send a plain-text message to a Telegram chat.
 * @param {string} text  the message body
 * @param {object} [options]
 * @param {string} [options.token]  the bot token
 * @param {string} [options.chatId]  the target chat id
 * @param {"MarkdownV2"|"HTML"} [options.parseMode]  optional parse mode
 * @returns {Promise<boolean>}  true when the API call succeeded
 */
export async function sendTelegramMessage(text, options = {}) {
  const token = options.token || "";
  const chatId = options.chatId || "";
  if (!token || !chatId) {
    console.warn("[telegram] Missing token or chatId; skipping notification.");
    return false;
  }

  const body = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (options.parseMode) body.parse_mode = options.parseMode;

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data.ok) {
      console.warn("[telegram] sendMessage failed:", data.description);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[telegram] sendMessage error:", error.message);
    return false;
  }
}

/**
 * Escape a string for Telegram MarkdownV2 so user-provided text (names,
 * messages, notes) never breaks the message formatting.
 * @param {string} value
 * @returns {string}
 */
export function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape a string for Telegram HTML parse mode.
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  return String(value ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
}
