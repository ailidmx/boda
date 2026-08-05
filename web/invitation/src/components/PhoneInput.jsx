import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * A modern international phone number input.
 *
 * - Country selector (flag + dial code) dropdown, defaulting to Mexico (+52).
 * - The number field formats as you type (spaces every 2 digits after the
 *   area code, matching the local convention).
 * - Emits the full E.164 value (e.g. "+523332017504") via onChange.
 *
 * Props:
 *   value      string  full E.164 value (e.g. "+523332017504")
 *   onChange   (e164: string) => void
 *   id, name, autoComplete, placeholder, disabled
 */

// Curated country list (flag, dial code, ISO). Mexico first as the default.
const COUNTRIES = [
  { iso: "MX", flag: "🇲🇽", code: "+52", name: "México" },
  { iso: "US", flag: "🇺🇸", code: "+1", name: "United States" },
  { iso: "CA", flag: "🇨🇦", code: "+1", name: "Canada" },
  { iso: "GB", flag: "🇬🇧", code: "+44", name: "United Kingdom" },
  { iso: "FR", flag: "🇫🇷", code: "+33", name: "France" },
  { iso: "ES", flag: "🇪🇸", code: "+34", name: "Spain" },
  { iso: "DE", flag: "🇩🇪", code: "+49", name: "Germany" },
  { iso: "IT", flag: "🇮🇹", code: "+39", name: "Italy" },
  { iso: "NL", flag: "🇳🇱", code: "+31", name: "Netherlands" },
  { iso: "BE", flag: "🇧🇪", code: "+32", name: "Belgium" },
  { iso: "CH", flag: "🇨🇭", code: "+41", name: "Switzerland" },
  { iso: "AT", flag: "🇦🇹", code: "+43", name: "Austria" },
  { iso: "PT", flag: "🇵🇹", code: "+351", name: "Portugal" },
  { iso: "IE", flag: "🇮🇪", code: "+353", name: "Ireland" },
  { iso: "SE", flag: "🇸🇪", code: "+46", name: "Sweden" },
  { iso: "NO", flag: "🇳🇴", code: "+47", name: "Norway" },
  { iso: "DK", flag: "🇩🇰", code: "+45", name: "Denmark" },
  { iso: "FI", flag: "🇫🇮", code: "+358", name: "Finland" },
  { iso: "PL", flag: "🇵🇱", code: "+48", name: "Poland" },
  { iso: "CZ", flag: "🇨🇿", code: "+420", name: "Czechia" },
  { iso: "GR", flag: "🇬🇷", code: "+30", name: "Greece" },
  { iso: "TR", flag: "🇹🇷", code: "+90", name: "Türkiye" },
  { iso: "AR", flag: "🇦🇷", code: "+54", name: "Argentina" },
  { iso: "BR", flag: "🇧🇷", code: "+55", name: "Brazil" },
  { iso: "CL", flag: "🇨🇱", code: "+56", name: "Chile" },
  { iso: "CO", flag: "🇨🇴", code: "+57", name: "Colombia" },
  { iso: "PE", flag: "🇵🇪", code: "+51", name: "Peru" },
  { iso: "EC", flag: "🇪🇨", code: "+593", name: "Ecuador" },
  { iso: "GT", flag: "🇬🇹", code: "+502", name: "Guatemala" },
  { iso: "CR", flag: "🇨🇷", code: "+506", name: "Costa Rica" },
  { iso: "PA", flag: "🇵🇦", code: "+507", name: "Panamá" },
  { iso: "DO", flag: "🇩🇴", code: "+1", name: "Dominican Republic" },
  { iso: "CU", flag: "🇨🇺", code: "+53", name: "Cuba" },
  { iso: "JP", flag: "🇯🇵", code: "+81", name: "Japan" },
  { iso: "KR", flag: "🇰🇷", code: "+82", name: "South Korea" },
  { iso: "CN", flag: "🇨🇳", code: "+86", name: "China" },
  { iso: "IN", flag: "🇮🇳", code: "+91", name: "India" },
  { iso: "AU", flag: "🇦🇺", code: "+61", name: "Australia" },
  { iso: "NZ", flag: "🇳🇿", code: "+64", name: "New Zealand" },
  { iso: "ZA", flag: "🇿🇦", code: "+27", name: "South Africa" },
  { iso: "AE", flag: "🇦🇪", code: "+971", name: "United Arab Emirates" },
  { iso: "IL", flag: "🇮🇱", code: "+972", name: "Israel" },
];

// Sort alphabetically by name for the dropdown (Mexico stays pinned first).
const SORTED_COUNTRIES = [
  COUNTRIES[0],
  ...COUNTRIES.slice(1).sort((a, b) => a.name.localeCompare(b.name)),
];

/** Strip everything except digits from a string. */
function digitsOnly(value) {
  return (value || "").replace(/\D/g, "");
}

function normalizeE164ish(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = digitsOnly(raw);
  return digits ? `+${digits}` : "";
}

/** Find the country whose dial code matches the start of an E.164 value. */
function countryFromE164(e164) {
  const digits = digitsOnly(normalizeE164ish(e164));
  if (!digits) return COUNTRIES[0];
  // Longest match wins (e.g. +351 Portugal vs +35).
  let best = null;
  for (const c of COUNTRIES) {
    const codeDigits = digitsOnly(c.code);
    if (
      digits.startsWith(codeDigits) &&
      (!best || codeDigits.length > digitsOnly(best.code).length)
    ) {
      best = c;
    }
  }
  return best || COUNTRIES[0];
}

/**
 * Format the national number for display. For Mexico we group as
 * "33 1234 5678" (area code + 8 digits). For other countries we fall back to
 * grouping in pairs, which is a reasonable generic default.
 */
function formatNational(country, nationalDigits) {
  if (!nationalDigits) return "";
  if (country.iso === "MX") {
    const area = nationalDigits.slice(0, 2);
    const rest = nationalDigits.slice(2);
    const parts = [area];
    if (rest.length) parts.push(rest.slice(0, 4));
    if (rest.length > 4) parts.push(rest.slice(4, 8));
    return parts.filter(Boolean).join(" ");
  }
  // Generic: group in pairs.
  return nationalDigits.match(/.{1,2}/g)?.join(" ") || nationalDigits;
}

export function PhoneInput({
  value = "",
  onChange,
  id,
  name,
  autoComplete = "tel",
  placeholder,
  disabled = false,
}) {
  const initialCountry = useMemo(() => countryFromE164(value), [value]);
  const [country, setCountry] = useState(initialCountry);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const normalizedValue = normalizeE164ish(value);

  // Keep the country in sync if the value changes externally.
  useEffect(() => {
    setCountry(countryFromE164(value));
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const codeDigits = digitsOnly(country.code);
  const currentDigits = digitsOnly(normalizedValue);
  const nationalDigits = currentDigits.startsWith(codeDigits)
    ? currentDigits.slice(codeDigits.length)
    : currentDigits;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED_COUNTRIES;
    return SORTED_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q) ||
        c.code.includes(q),
    );
  }, [query]);

  const handleNationalChange = (event) => {
    const raw = event.target.value;
    // Keep only digits and spaces.
    const cleaned = raw.replace(/[^\d ]/g, "");
    const digits = digitsOnly(cleaned);
    // Cap at a reasonable national length (e.g. 10 for MX).
    const capped = digits.slice(0, 12);
    const formatted = formatNational(country, capped);
    onChange(`${country.code}${capped}`);
    // We let the input reflect the formatted value via the controlled value.
    // Store the formatted text in a local state so the cursor behaves well.
    setLocalText(formatted);
  };

  const [localText, setLocalText] = useState(
    formatNational(country, nationalDigits),
  );
  useEffect(() => {
    setLocalText(formatNational(country, nationalDigits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, value]);

  const selectCountry = (c) => {
    setCountry(c);
    setOpen(false);
    setQuery("");
    const digits = digitsOnly(localText);
    onChange(`${c.code}${digits}`);
  };

  return (
    <div className="phone-input" ref={wrapRef}>
      <div className="phone-input__field">
        <button
          type="button"
          className="phone-input__country"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
        >
          <span className="phone-input__flag" aria-hidden="true">
            {country.flag}
          </span>
          <span className="phone-input__code">{country.code}</span>
          <span
            className={`phone-input__caret${open ? " is-open" : ""}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          value={localText}
          onChange={handleNationalChange}
          placeholder={placeholder}
          disabled={disabled}
          className="phone-input__number"
        />
      </div>

      {open && (
        <div
          className="phone-input__dropdown"
          role="listbox"
          aria-label="Country"
        >
          <div className="phone-input__search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país…"
              autoFocus
            />
          </div>
          <ul className="phone-input__list" ref={listRef}>
            {filtered.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso === country.iso}
                  className={`phone-input__option${c.iso === country.iso ? " is-active" : ""}`}
                  onClick={() => selectCountry(c)}
                >
                  <span className="phone-input__flag" aria-hidden="true">
                    {c.flag}
                  </span>
                  <span className="phone-input__option-name">{c.name}</span>
                  <span className="phone-input__option-code">{c.code}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="phone-input__empty">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
