import { AUTH_EMAIL_DOMAIN } from "../../guests.js";

// Curated country list (flag, dial code) used to derive the flag shown next
// to a stored E.164 phone number. Kept in sync with PhoneInput's list.
const FLAG_BY_CODE = {
  "+52": "🇲🇽",
  "+1": "🇺🇸",
  "+44": "🇬🇧",
  "+33": "🇫🇷",
  "+34": "🇪🇸",
  "+49": "🇩🇪",
  "+39": "🇮🇹",
  "+31": "🇳🇱",
  "+32": "🇧🇪",
  "+41": "🇨🇭",
  "+43": "🇦🇹",
  "+351": "🇵🇹",
  "+353": "🇮🇪",
  "+46": "🇸🇪",
  "+47": "🇳🇴",
  "+45": "🇩🇰",
  "+358": "🇫🇮",
  "+48": "🇵🇱",
  "+420": "🇨🇿",
  "+30": "🇬🇷",
  "+90": "🇹🇷",
  "+54": "🇦🇷",
  "+55": "🇧🇷",
  "+56": "🇨🇱",
  "+57": "🇨🇴",
  "+51": "🇵🇪",
  "+593": "🇪🇨",
  "+502": "🇬🇹",
  "+506": "🇨🇷",
  "+507": "🇵🇦",
  "+53": "🇨🇺",
  "+81": "🇯🇵",
  "+82": "🇰🇷",
  "+86": "🇨🇳",
  "+91": "🇮🇳",
  "+61": "🇦🇺",
  "+64": "🇳🇿",
  "+27": "🇿🇦",
  "+971": "🇦🇪",
  "+972": "🇮🇱",
};

// Fallback flag per UI language, used when a phone number is unknown.
const LANG_FLAG = {
  es: "🇲🇽",
  fr: "🇫🇷",
  en: "🇬🇧",
};

/** Derive the flag emoji for an E.164 phone number (longest dial-code match).
 *  When no number is known, fall back to the flag of the user's language. */
export function flagForPhone(e164, lang = "es") {
  const digits = (e164 || "").replace(/\D/g, "");
  if (!digits) return LANG_FLAG[lang] || "🌐";
  let best = null;
  for (const code of Object.keys(FLAG_BY_CODE)) {
    const codeDigits = code.replace(/\D/g, "");
    if (
      digits.startsWith(codeDigits) &&
      (!best || codeDigits.length > best.length)
    ) {
      best = codeDigits;
    }
  }
  return best ? FLAG_BY_CODE[`+${best}`] : LANG_FLAG[lang] || "🌐";
}

/** Format an E.164 phone number for display (e.g. "+52 33 1234 5678"). */
export function formatPhone(e164) {
  const digits = (e164 || "").replace(/\D/g, "");
  if (!digits) return "";
  // Find the dial code.
  let code = "";
  for (const c of Object.keys(FLAG_BY_CODE)) {
    const cd = c.replace(/\D/g, "");
    if (digits.startsWith(cd) && cd.length > code.length) code = cd;
  }
  const national = code ? digits.slice(code.length) : digits;

  // Localized grouping for French numbers: the leading digit is the carrier
  // (e.g. "6"), then digits are paired → "+33 6 69 36 94 20". Other countries
  // keep the generic two-by-two pairing.
  let grouped;
  if (code === "33" && national.length > 1) {
    grouped = national[0] + " " + (national.slice(1).match(/.{1,2}/g)?.join(" ") || "");
  } else {
    grouped = national.match(/.{1,2}/g)?.join(" ") || national;
  }
  return code ? `+${code} ${grouped}` : grouped;
}

/** Strip the default auth domain suffix from an email for display. */
export function formatDisplayEmail(email) {
  const normalized = String(email || "").trim();
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  if (!normalized) return "";
  if (normalized.toLowerCase().endsWith(suffix.toLowerCase())) {
    return normalized.slice(0, -suffix.length);
  }
  return normalized;
}
