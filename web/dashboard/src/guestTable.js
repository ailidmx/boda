// ── Guest Manager table (flat, live, inline editable) ──────────────────
//
// This module owns the DOM rendering + event wiring for the INVITADOS table.
// It is a pure presentation module: it receives every dependency it needs via
// a single `ctx` object (injected by the dashboard adapter) and never touches
// Firestore directly. All data access, domain derivations and persistence go
// through the injected functions (guestService / guestDomain / repositories).
//
// The dashboard's `renderGuestManager()` is a thin adapter that builds `ctx`
// from its module scope and delegates here.

/**
 * Render the guest manager table into `ctx.container`.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function renderGuestManager(ctx) {
  const {
    container,
    state,
    getActiveGuests,
    getGuest,
    getFilteredGuests,
    getMergedGuest,

    guestStatusBadge,
    rsvpLevelChip,
    rsvpBooleanChip,
    rsvpScaleChip,
    paymentConfirmedChip,
    guestSortValue,
    GUEST_SORT_COLUMNS,

    saveGuestInline,
    saveGuestEmail,
    saveGuestRsvpAnswer,
    saveGuestHosting,
    getCabinNames,
    getCabinDisplayName,
    getRoomsByCabin,
    openGuestEditor,

    openCreateGuestModal,
    openSendInviteModal,
    openDeleteConfirm,

    applyInvitationGroupChange,
    getInvitationGroupOptions,
    invitationGroupCell,
    applyGroupChange,
    getGroupOptions,
    groupCell,
    guestAvatarUrl,

    guestInitials,
    guestFullName,
    guestIdentity,
    guestRoom,
    badgeHtml,
    badgeStyle,
    getInviteUrl,
    DEFAULT_AUTH_EMAIL_DOMAIN,
    guestCanWhatsapp,
    guestCanEmail,
    guestHasAuth,
    guestSendEmail,
    guestAgeGroup,
    guestHasPhoto,
    computeReadiness,
  } = ctx;


  let filtered = getFilteredGuests();

  // ── Sort by the active column ──
  const sortKey = GUEST_SORT_COLUMNS.includes(state.sortKey) ? state.sortKey : "name";
  const dir = state.sortDir === "desc" ? -1 : 1;
  filtered = [...filtered].sort((a, b) => {
    const av = guestSortValue(a, sortKey);
    const bv = guestSortValue(b, sortKey);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  // ── Sortable header helper ──
  const sortTh = (key, label) => {
    const active = state.sortKey === key;
    const arrow = active ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
    return `<th class="dashboard-sortable ${active ? "dashboard-sort-active" : ""}" data-sort-key="${key}" title="Ordenar por ${label}">${label}${arrow}</th>`;
  };

  // ── Phone formatting: international flag + masked display ──
  // Accepts a raw phone string (e.g. "523312828872" or "+52 33 1282 8872") and
  // returns { flag, display, href }. The flag is derived from the leading
  // country code; the display is a human-friendly masked grouping.
  const COUNTRY_FLAGS = {
    "52": "🇲🇽", // Mexico
    "1": "🇺🇸", // US / Canada
    "33": "🇫🇷", // France
    "34": "🇪🇸", // Spain
    "49": "🇩🇪", // Germany
    "44": "🇬🇧", // UK
    "381": "🇷🇸", // Serbia
    "39": "🇮🇹", // Italy
    "351": "🇵🇹", // Portugal
    "31": "🇳🇱", // Netherlands
    "32": "🇧🇪", // Belgium
    "41": "🇨🇭", // Switzerland
    "43": "🇦🇹", // Austria
    "48": "🇵🇱", // Poland
    "55": "🇧🇷", // Brazil
    "54": "🇦🇷", // Argentina
    "56": "🇨🇱", // Chile
    "57": "🇨🇴", // Colombia
    "58": "🇻🇪", // Venezuela
    "51": "🇵🇪", // Peru
    "593": "🇪🇨", // Ecuador
    "502": "🇬🇹", // Guatemala
    "506": "🇨🇷", // Costa Rica
    "507": "🇵🇦", // Panama
    "53": "🇨🇺", // Cuba
    "1-809": "🇩🇴", // Dominican Republic
  };
  const formatPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return null;
    // Detect the country code by trying the longest known prefixes first.
    const codes = Object.keys(COUNTRY_FLAGS).sort((a, b) => b.length - a.length);
    const countryCode = codes.find((c) => digits.startsWith(c.replace(/\D/g, ""))) || "";
    const flag = COUNTRY_FLAGS[countryCode] || "🌐";
    // Masked grouping: +52 33 1282 8872 (Mexico) or +1 555 123 4567 (US).
    let display = digits;
    if (digits.startsWith("52") && digits.length === 12) {
      display = `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    } else if (digits.startsWith("1") && digits.length === 11) {
      display = `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else {
      display = `+${digits}`;
    }
    return { flag, display, href: `tel:${digits}` };
  };

  // ── Identity cell helper: avatar + name (inline editor) + ID + phone + auth ──
  const identityCell = (guest) => {
    const url = guestAvatarUrl(guest);
    const initials = guestInitials(guest);
    const hasAuth = Boolean(state.authUsers[guest.id]);
    const authEmail = state.authUsers[guest.id]?.email || "";

    const img = url
      ? `<img class="dashboard-avatar" src="${url}" alt="${guestFullName(guest)}" loading="lazy" />`
      : `<span class="dashboard-avatar dashboard-avatar-initials">${initials}</span>`;

    // Badges on the avatar corners:
    //  - top-left: ID check (🔒 LOCK when verified, empty hollow chip when not)
    //  - top-right: edit photo (opens the guest editor modal)
    //  - bottom-right: auth (🔑 login emoji when the guest has a Firebase Auth
    //    account, ❌ red cross when they don't)
    const idCheckBadge = guest.idCheckUser
      ? '<span class="dashboard-avatar-badge dashboard-avatar-badge--idcheck is-locked" title="Identidad verificada (ID Check)">🔒</span>'
      : '<span class="dashboard-avatar-badge dashboard-avatar-badge--idcheck is-unlocked" title="Identidad no verificada (ID Check)"></span>';

    const editPhotoBadge = `<button class="dashboard-avatar-badge dashboard-avatar-badge--edit" data-edit-photo="${guest.id}" title="Editar foto de perfil" type="button">📷</button>`;
    const authBadge = hasAuth
      ? '<span class="dashboard-avatar-badge dashboard-avatar-badge--auth is-auth" title="Tiene cuenta de Firebase Auth">🔑</span>'
      : '<span class="dashboard-avatar-badge dashboard-avatar-badge--auth is-noauth" title="Sin cuenta de Firebase Auth">❌</span>';

    const avatar = `<span class="dashboard-avatar-wrap">${img}${idCheckBadge}${editPhotoBadge}${authBadge}</span>`;

    const phone = guest.identity?.phone || guest.phone || "";
    const phoneInfo = formatPhone(phone);
    const phoneHtml = phoneInfo
      ? `<a class="dashboard-phone" href="${phoneInfo.href}" title="Llamar"><span class="dashboard-phone-flag">${phoneInfo.flag}</span><span class="dashboard-phone-number">${phoneInfo.display}</span></a>`
      : '<span class="dashboard-badge dashboard-badge-muted">—</span>';
    // The auth email is inline-editable for EVERY guest (with or without a
    // Firebase Auth account yet). Clicking the display reveals a small email
    // input + a clear "Guardar" button. Saving calls the `updateGuestEmail`
    // Cloud Function (via `saveGuestEmail`), which updates the Firebase Auth
    // user's email (creating the account if needed) AND the guest's
    // `firebaseEmail`. View mode and edit mode are mutually exclusive — only
    // one is visible at a time.
    const authHtml = `
      <div class="dashboard-auth-email-cell" data-auth-email-cell="${guest.id}">
        <button type="button" class="dashboard-auth-email" data-auth-email-display="${guest.id}" title="Editar correo de acceso (Firebase Auth)">
          ${authEmail || "—"}
        </button>
        <span class="dashboard-auth-email-editor" data-auth-email-editor="${guest.id}" hidden>
          <input class="dashboard-inline-input" type="email" value="${authEmail}" data-auth-email-input="${guest.id}" title="Correo de acceso" placeholder="correo@ejemplo.com" />
          <button type="button" class="dashboard-link-btn dashboard-auth-email-save" data-auth-email-save="${guest.id}" title="Guardar correo">Guardar</button>
        </span>
      </div>`;

    return `
      <div class="dashboard-identity-cell">
        ${avatar}
        <div class="dashboard-identity-info">
          ${nameCell(guest)}
          <div class="dashboard-identity-meta">${phoneHtml}</div>
          ${authHtml ? `<div class="dashboard-identity-meta">${authHtml}</div>` : ""}
          <div class="dashboard-identity-meta">
            <code title="${guest.id}">${guest.id}</code>
          </div>
        </div>
      </div>`;
  };


  // ── Send-invite cell helper (dedicated "Enviar" column) ──
  // Renders the WhatsApp + Email send buttons. Each is disabled when the
  // channel is not available for this guest:
  //   - No Firebase Auth account → both disabled (can't send anything).
  //   - Auth but no real email (or only a default-domain email) → email disabled.
  //   - Auth but no phone → WhatsApp disabled.
  const sendCell = (guest) => {
    const canWhatsapp = guestCanWhatsapp(guest);
    const canEmail = guestCanEmail(guest);
    const hasAuth = guestHasAuth(guest);
    const email = guestSendEmail(guest);
    const phone = guest.identity?.phone || guest.phone || "";

    const waTitle = !hasAuth
      ? "Sin cuenta de Firebase Auth — no se puede enviar"
      : !phone
        ? "Sin teléfono — no se puede enviar por WhatsApp"
        : "Enviar invitación por WhatsApp";
    // The email channel no longer requires a Firebase Auth account — it only
    // needs a real (non-default-domain) email address.
    const emailTitle = !email
      ? "Sin correo — no se puede enviar por email"
      : email.endsWith(`@${DEFAULT_AUTH_EMAIL_DOMAIN}`)
        ? "Correo del dominio por defecto — no se puede enviar por email"
        : "Enviar invitación por email";

    return `
      <div class="dashboard-send-cell">
        <button class="dashboard-link-btn" data-send-whatsapp="${guest.id}" title="${waTitle}" ${canWhatsapp ? "" : "disabled"}>📱</button>
        <button class="dashboard-link-btn" data-send-email="${guest.id}" title="${emailTitle}" ${canEmail ? "" : "disabled"}>✉️</button>
      </div>`;
  };

  // ── Name cell helper ──
  const nameCell = (guest) => {
    const identity = guestIdentity(guest);
    const f = identity.firstName || guest.firstName || "";
    const m = identity.middleName || guest.middleName || "";
    const l = identity.lastName || guest.lastName || "";
    const ml = identity.maternalLastName || guest.maternalLastName || "";
    return `
      <div class="dashboard-name-cell" data-name-cell="${guest.id}">
        <button type="button" class="dashboard-name-display" data-name-display="${guest.id}" title="Editar nombre">
          ${guestFullName(guest) || "—"}
        </button>
        <div class="dashboard-name-editor" data-name-editor="${guest.id}" hidden>
          <input class="dashboard-inline-input" type="text" value="${f}" data-name-field="firstName" data-guest-id="${guest.id}" placeholder="Nombre" />
          <input class="dashboard-inline-input" type="text" value="${m}" data-name-field="middleName" data-guest-id="${guest.id}" placeholder="Nombre 2" />
          <input class="dashboard-inline-input" type="text" value="${l}" data-name-field="lastName" data-guest-id="${guest.id}" placeholder="Apellido" />
          <input class="dashboard-inline-input" type="text" value="${ml}" data-name-field="maternalLastName" data-guest-id="${guest.id}" placeholder="Apellido 2" />
          <button type="button" class="dashboard-link-btn" data-name-done="${guest.id}" title="Listo">✓</button>
        </div>
      </div>`;
  };

  // ── Gender cell helper (inline editable, toggle mode) ──
  // Shows the guest's gender as a clickable display (emoji + label). Clicking
  // it enters EDIT mode: the display is hidden and a small inline select
  // (👩 Mujer / 👨 Hombre / —) appears with a ✓ confirm and ✕ cancel button.
  // The display and editor are NEVER both visible at once. Confirm saves the
  // RAW value ("M" / "H" / "") via `saveGuestInline("gender", …)`; cancel
  // reverts without saving.
  const GENDER_OPTIONS = [
    { value: "", label: "—", emoji: "" },
    { value: "M", label: "Mujer", emoji: "👩" },
    { value: "H", label: "Hombre", emoji: "👨" },
  ];
  const genderCell = (guest) => {
    const gender = guest.identity?.gender || guest.gender || "";
    const options = GENDER_OPTIONS.map(
      (g) => `<option value="${g.value}" ${gender === g.value ? "selected" : ""}>${g.emoji ? `${g.emoji} ` : ""}${g.label}</option>`,
    ).join("");
    const opt = GENDER_OPTIONS.find((g) => g.value === gender);
    const displayLabel = opt?.label || "—";
    const displayEmoji = opt?.emoji || "";
    return `
      <div class="dashboard-gender-cell" data-gender-cell="${guest.id}">
        <button type="button" class="dashboard-gender-display ${gender ? "" : "is-empty"}" data-gender-display="${guest.id}" title="Editar género">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : ""}${displayLabel}
        </button>
        <span class="dashboard-inline-editor" data-gender-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-gender-select="${guest.id}" title="Elegir género">${options}</select>
          <button type="button" class="dashboard-link-btn" data-gender-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-gender-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };



  // ── Age cell helper (inline editable, toggle mode) ──
  // Shows the guest's age group as a clickable display (emoji + label).
  // Clicking it enters EDIT mode: the display is hidden and a small inline
  // select (🧑 Adulto / 🧒 Niño / —) appears with a ✓ confirm and ✕ cancel
  // button. The display and editor are NEVER both visible at once. Confirm
  // saves the RAW value ("Adulto" / "Niño" / "") via
  // `saveGuestInline("age", …)`; cancel reverts without saving. Matches the
  // values used by the guest editor modal (Adulto / Niño), NOT a raw number.
  const AGE_OPTIONS = [
    { value: "", label: "—", emoji: "" },
    { value: "Adulto", label: "Adulto", emoji: "🧑" },
    { value: "Niño", label: "Niño", emoji: "🧒" },
  ];
  const ageCell = (guest) => {
    const age = guest.identity?.age ?? guest.age ?? "";
    const options = AGE_OPTIONS.map(
      (a) => `<option value="${a.value}" ${age === a.value ? "selected" : ""}>${a.emoji ? `${a.emoji} ` : ""}${a.label}</option>`,
    ).join("");
    const opt = AGE_OPTIONS.find((a) => a.value === age);
    const displayLabel = opt?.label || "—";
    const displayEmoji = opt?.emoji || "";
    return `
      <div class="dashboard-age-cell" data-age-cell="${guest.id}">
        <button type="button" class="dashboard-age-display ${age ? "" : "is-empty"}" data-age-display="${guest.id}" title="Editar edad">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : ""}${displayLabel}
        </button>
        <span class="dashboard-inline-editor" data-age-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-age-select="${guest.id}" title="Elegir edad">${options}</select>
          <button type="button" class="dashboard-link-btn" data-age-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-age-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };



  // ── Language cell helper (inline editable, toggle mode) ──
  // Shows the guest's interface language as a clickable display (flag emoji +
  // name). Clicking it enters EDIT mode: the display is hidden and a small
  // inline select (🇪🇸 Español / 🇫🇷 Français / 🇬🇧 English / —) appears with a
  // ✓ confirm and ✕ cancel button. The display and editor are NEVER both
  // visible at once. Confirm saves the RAW code ("es" / "fr" / "en" / "") via
  // `saveGuestInline("lang", …)`; cancel reverts without saving. Matches the
  // three languages the invitation supports.
  const LANG_OPTIONS = [
    { value: "", label: "—", emoji: "" },
    { value: "es", label: "Español", emoji: "🇪🇸" },
    { value: "fr", label: "Français", emoji: "🇫🇷" },
    { value: "en", label: "English", emoji: "🇬🇧" },
  ];
  const langCell = (guest) => {
    const lang = guest.identity?.lang || guest.lang || "";
    const options = LANG_OPTIONS.map(
      (l) => `<option value="${l.value}" ${lang === l.value ? "selected" : ""}>${l.emoji ? `${l.emoji} ` : ""}${l.label}</option>`,
    ).join("");
    const opt = LANG_OPTIONS.find((l) => l.value === lang);
    const displayLabel = opt?.label || "—";
    const displayEmoji = opt?.emoji || "";
    return `
      <div class="dashboard-lang-cell" data-lang-cell="${guest.id}">
        <button type="button" class="dashboard-lang-display ${lang ? "" : "is-empty"}" data-lang-display="${guest.id}" title="Editar idioma">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : ""}${displayLabel}
        </button>
        <span class="dashboard-inline-editor" data-lang-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-lang-select="${guest.id}" title="Elegir idioma">${options}</select>
          <button type="button" class="dashboard-link-btn" data-lang-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-lang-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Travels-by-plane cell helper (simple checkbox) ──
  // Shows whether the guest flies in (`travelsByPlane` boolean) as a plain
  // checkbox. Checking it saves `true`, unchecking saves `false` — there is no
  // "unknown" state, so the checkbox is the single source of truth. Saves via
  // `saveGuestInline("travelsByPlane", …)`.
  const travelsByPlaneCell = (guest) => {

    const v = guest.travelsByPlane === true;
    return `
      <div class="dashboard-travels-cell" data-travels-cell="${guest.id}">
        <label class="dashboard-checkbox-cell" title="¿Viaja en avión?">
          <input type="checkbox" class="dashboard-travels-checkbox" data-travels-checkbox="${guest.id}" ${v ? "checked" : ""} />
          <span>${v ? "Sí" : "No"}</span>
        </label>
      </div>`;
  };




  // ── RSVP scale cell helper (inline editable, 0–5) ──
  // Shows the guest's attendance level for one day (friday/saturday/sunday) as
  // a clickable chip. Clicking it swaps to a small inline select (0–5) with a
  // ✓ confirm and ✕ cancel. The display and editor are NEVER both visible at
  // once. Confirm saves via `saveGuestRsvpAnswer(guestId, day, level)`; cancel
  // reverts without saving. The chip styling mirrors `rsvpLevelChip`.
  const rsvpScaleCell = (guest, day) => {
    const level = rsvpScaleValue(guest, day);
    const chipClass =
      level >= 4 ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
      : level >= 1 ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
    const options = [0, 1, 2, 3, 4, 5]
      .map((n) => `<option value="${n}" ${level === n ? "selected" : ""}>${n}</option>`)
      .join("");
    return `
      <div class="dashboard-rsvp-cell" data-rsvp-cell="${guest.id}" data-rsvp-day="${day}">
        <button type="button" class="${chipClass}" data-rsvp-display="${guest.id}" data-rsvp-day="${day}" title="Editar asistencia (0–5)">${level}</button>
        <span class="dashboard-inline-editor" data-rsvp-editor="${guest.id}" data-rsvp-day="${day}" hidden>
          <select class="dashboard-inline-select" data-rsvp-select="${guest.id}" data-rsvp-day="${day}" title="Nivel de asistencia (0–5)">${options}</select>
          <button type="button" class="dashboard-link-btn" data-rsvp-confirm="${guest.id}" data-rsvp-day="${day}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-rsvp-cancel="${guest.id}" data-rsvp-day="${day}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Boolean RSVP cell helper (inline editable, Sí/No/—) ──
  // Shows a yes/no RSVP answer (accommodationConfirm, cabinWaitingList,
  // petanqueParticipation, petanqueOwnBoules) as a clickable chip. Clicking it
  // swaps to a small inline select (— / Sí / No) with ✓/✕. Confirm saves via
  // `saveGuestRsvpAnswer(guestId, questionId, level)` where level is 1 (Sí),
  // 2 (No), or 0 (—). The chip styling mirrors `rsvpBooleanChip`.
  const rsvpBooleanCell = (guest, questionId) => {
    const value = rsvpBooleanValue(guest, questionId);
    const label = value === 1 ? "Sí" : value === 2 ? "No" : "—";
    const chipClass = value === 1
      ? "dashboard-badge dashboard-badge-yes"
      : value === 2
        ? "dashboard-badge dashboard-badge-no"
        : "dashboard-badge dashboard-badge-muted";
    const options = [
      { v: 0, l: "—" },
      { v: 1, l: "Sí" },
      { v: 2, l: "No" },
    ]
      .map((o) => `<option value="${o.v}" ${value === o.v ? "selected" : ""}>${o.l}</option>`)
      .join("");
    return `
      <div class="dashboard-rsvp-cell" data-rsvp-cell="${guest.id}" data-rsvp-question="${questionId}">
        <button type="button" class="${chipClass}" data-rsvp-boolean-display="${guest.id}" data-rsvp-question="${questionId}" title="Editar respuesta">${label}</button>
        <span class="dashboard-inline-editor" data-rsvp-boolean-editor="${guest.id}" data-rsvp-question="${questionId}" hidden>
          <select class="dashboard-inline-select" data-rsvp-boolean-select="${guest.id}" data-rsvp-question="${questionId}" title="Sí / No / —">${options}</select>
          <button type="button" class="dashboard-link-btn" data-rsvp-boolean-confirm="${guest.id}" data-rsvp-question="${questionId}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-rsvp-boolean-cancel="${guest.id}" data-rsvp-question="${questionId}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Scale RSVP cell helper (inline editable, 0–5) ──
  // Shows a SCALE RSVP answer (rocaAzul, playa — 0–5 likelihood) as a clickable
  // chip. Clicking it swaps to a small inline select (0–5) with ✓/✕. Confirm
  // saves via `saveGuestRsvpAnswer(guestId, questionId, level)`. The chip
  // styling mirrors `rsvpScaleChip`.
  const rsvpScaleQuestionCell = (guest, questionId) => {
    const value = rsvpScaleValue(guest, questionId);
    const chipClass = value >= 4
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
      : value >= 1
        ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
        : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
    const options = [0, 1, 2, 3, 4, 5]
      .map((n) => `<option value="${n}" ${value === n ? "selected" : ""}>${n}</option>`)
      .join("");
    return `
      <div class="dashboard-rsvp-cell" data-rsvp-cell="${guest.id}" data-rsvp-question="${questionId}">
        <button type="button" class="${chipClass}" data-rsvp-scale-display="${guest.id}" data-rsvp-question="${questionId}" title="Editar (0–5)">${value}</button>
        <span class="dashboard-inline-editor" data-rsvp-scale-editor="${guest.id}" data-rsvp-question="${questionId}" hidden>
          <select class="dashboard-inline-select" data-rsvp-scale-select="${guest.id}" data-rsvp-question="${questionId}" title="Nivel (0–5)">${options}</select>
          <button type="button" class="dashboard-link-btn" data-rsvp-scale-confirm="${guest.id}" data-rsvp-question="${questionId}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-rsvp-scale-cancel="${guest.id}" data-rsvp-question="${questionId}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Payment-confirmed cell helper (inline editable, Sí/No/—) ──
  // Shows the top-level `paymentConfirmed` boolean as a clickable chip. Clicking
  // it swaps to a small inline select (— / Sí / No) with ✓/✕. Confirm saves via
  // `saveGuestInline(guestId, "paymentConfirmed", value)`.
  const paymentConfirmedCell = (guest) => {
    const value = guest.paymentConfirmed;
    const label = value === true ? "Sí" : value === false ? "No" : "—";
    const chipClass = value === true
      ? "dashboard-badge dashboard-badge-yes"
      : value === false
        ? "dashboard-badge dashboard-badge-no"
        : "dashboard-badge dashboard-badge-muted";
    const options = [
      { v: "", l: "—" },
      { v: "1", l: "Sí" },
      { v: "2", l: "No" },
    ]
      .map((o) => `<option value="${o.v}" ${(value === true && o.v === "1") || (value === false && o.v === "2") || (value == null && o.v === "") ? "selected" : ""}>${o.l}</option>`)
      .join("");
    return `
      <div class="dashboard-rsvp-cell" data-payment-cell="${guest.id}">
        <button type="button" class="${chipClass}" data-payment-display="${guest.id}" title="Editar pago confirmado">${label}</button>
        <span class="dashboard-inline-editor" data-payment-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-payment-select="${guest.id}" title="Pago confirmado">${options}</select>
          <button type="button" class="dashboard-link-btn" data-payment-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-payment-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Cabin cell helper (inline editable, picker) ──
  // Shows the guest's cabin assignment for one period (primary `cabin` or extra
  // `xtraCabin`) as a clickable badge. Clicking it swaps to a small inline
  // select of all cabins (from `getCabinNames()`) with ✓/✕. Confirm saves via
  // `saveGuestHosting(guestId, period, cabinUnit, roomId)`. The cabin select
  // stores the DISPLAY name; on save we resolve it back to the internal unit
  // code via `getCabinDisplayName`'s inverse (the map is 1:1 for the values we
  // write). When a cabin is picked, the room is cleared (the admin assigns the
  // room separately via the room cell).
  const cabinCell = (guest, period) => {
    const isExtra = period === "extra";
    const cabinKey = isExtra ? "xtraCabin" : "cabin";
    const roomKey = isExtra ? "xtraRoom" : "room";
    const hosting = guest.hosting || {};
    const currentUnit = hosting[cabinKey] || "";
    const currentDisplay = currentUnit ? getCabinDisplayName(currentUnit) : "";
    const cabinNames = getCabinNames();
    const options = [
      `<option value="">—</option>`,
      ...cabinNames.map(
        (name) => `<option value="${name}" ${name === currentDisplay ? "selected" : ""}>${name}</option>`,
      ),
    ].join("");
    return `
      <div class="dashboard-rsvp-cell" data-cabin-cell="${guest.id}" data-cabin-period="${period}">
        <button type="button" class="dashboard-badge ${currentDisplay ? "" : "dashboard-badge-muted"}" data-cabin-display="${guest.id}" data-cabin-period="${period}" title="Editar cabaña">${currentDisplay || "—"}</button>
        <span class="dashboard-inline-editor" data-cabin-editor="${guest.id}" data-cabin-period="${period}" hidden>
          <select class="dashboard-inline-select" data-cabin-select="${guest.id}" data-cabin-period="${period}" title="Elegir cabaña">${options}</select>
          <button type="button" class="dashboard-link-btn" data-cabin-confirm="${guest.id}" data-cabin-period="${period}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-cabin-cancel="${guest.id}" data-cabin-period="${period}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Room cell helper (inline editable, picker) ──
  // Shows the guest's room assignment for one period (primary `room` or extra
  // `xtraRoom`) as a clickable badge. Clicking it swaps to a small inline
  // select of the rooms in the guest's CURRENT cabin (from `getRoomsByCabin`)
  // with ✓/✕. Confirm saves via `saveGuestHosting(guestId, period, cabinUnit,
  // roomId)`. If the guest has no cabin assigned yet, the room select is empty
  // (assign a cabin first).
  const roomCell = (guest, period) => {
    const isExtra = period === "extra";
    const cabinKey = isExtra ? "xtraCabin" : "cabin";
    const roomKey = isExtra ? "xtraRoom" : "room";
    const hosting = guest.hosting || {};
    const currentUnit = hosting[cabinKey] || "";
    const currentRoom = hosting[roomKey] || "";
    const cabinDisplay = currentUnit ? getCabinDisplayName(currentUnit) : "";
    const rooms = cabinDisplay ? getRoomsByCabin(cabinDisplay) : [];
    const options = [
      `<option value="">—</option>`,
      ...rooms.map(
        (r) => `<option value="${r.id}" ${r.id === currentRoom ? "selected" : ""}>${r.id}</option>`,
      ),
    ].join("");
    return `
      <div class="dashboard-rsvp-cell" data-room-cell="${guest.id}" data-room-period="${period}">
        <button type="button" class="dashboard-badge ${currentRoom ? "" : "dashboard-badge-muted"}" data-room-display="${guest.id}" data-room-period="${period}" title="Editar cuarto">${currentRoom || "—"}</button>
        <span class="dashboard-inline-editor" data-room-editor="${guest.id}" data-room-period="${period}" hidden>
          <select class="dashboard-inline-select" data-room-select="${guest.id}" data-room-period="${period}" title="Elegir cuarto">${options}</select>
          <button type="button" class="dashboard-link-btn" data-room-confirm="${guest.id}" data-room-period="${period}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-room-cancel="${guest.id}" data-room-period="${period}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  // ── Message cell helper ──
  // Shows the guest's written message (top-level `message` field) as a
  // truncated badge with a tooltip. Not inline-editable here (it's a free-text
  // note; edit it via the ✏️ modal).
  const messageCell = (guest) => {
    const msg = guest.message || guest.identity?.message || "";

    if (!msg) return '<span class="dashboard-badge dashboard-badge-muted">—</span>';
    const truncated = msg.length > 24 ? `${msg.slice(0, 24)}…` : msg;
    const safeTitle = msg.split('"').join(String.fromCharCode(38) + "quot;");
    return `<span class="dashboard-badge" title="${safeTitle}">${truncated}</span>`;

  };



  // ── Column-group filter nav bar ──
  // The INVITADOS table has many columns, so they are grouped by admin use case.
  // The "Identidad" column is ALWAYS shown; the rest are shown/hidden by the
  // active column group. This lets the couple focus on the columns they need
  // (identity/send, presence & lodging, pétanque, or beach) without scrolling
  // a huge table.
  const COLUMN_GROUPS = [
    { id: "identity", label: "Identidad" },
    { id: "presencia", label: "Presencia · Alojamiento" },
    { id: "petanque", label: "Pétanque" },
    { id: "playa", label: "Playa" },
  ];
  const activeColumnGroup = COLUMN_GROUPS.some((g) => g.id === state.columnGroup)
    ? state.columnGroup
    : "identity";
  const columnGroupNav = `
    <div class="dashboard-column-group-nav" title="Mostrar columnas por caso de uso">
      ${COLUMN_GROUPS.map(
        (g) => `
        <button type="button" class="dashboard-column-group-chip ${activeColumnGroup === g.id ? "dashboard-column-group-chip-active" : ""}" data-column-group="${g.id}">
          ${g.label}
        </button>`,
      ).join("")}
    </div>
  `;

  // ── Readiness card ──

  // A global summary of how much identity work remains for the guests. A guest
  // is "ready" when they have a complete name (≥2 of 4 fields AND at least one
  // first name AND one last/maternal name), a photo, and — IF they have a
  // Firebase Auth account — at least one reachable channel (a real email or a
  // phone). Guests without an auth account are fine without contact info. The
  // counts follow the active group filter so the couple can see the remaining
  // work per group.
  const readiness = computeReadiness();
  const groupKey = state.filterGroup || "_all";
  const readyCount = readiness.ready[groupKey] || 0;
  const totalCount = readiness.total;
  const pct = totalCount ? Math.round((readyCount / totalCount) * 100) : 0;
  const readinessCard = `
    <div class="dashboard-readiness-card">
      <div class="dashboard-readiness-head">
        <h3 class="dashboard-readiness-title">Identidad de invitados</h3>
        <span class="dashboard-readiness-pct">${pct}%</span>
      </div>
      <div class="dashboard-readiness-bar" title="${readyCount} de ${totalCount} listos">
        <span class="dashboard-readiness-bar-fill" style="width:${pct}%"></span>
      </div>
      <div class="dashboard-readiness-rows">
        <button type="button" class="dashboard-readiness-row ${state.filterName === "incomplete" ? "is-active" : ""}" data-readiness-filter="name" title="Filtrar por nombre incompleto">
          <span>Nombre incompleto</span>
          <span class="dashboard-readiness-count">${readiness.missingName[groupKey] || 0}</span>
        </button>
        <button type="button" class="dashboard-readiness-row ${state.filterPhoto === "without" ? "is-active" : ""}" data-readiness-filter="photo" title="Filtrar por sin foto">
          <span>Sin foto</span>
          <span class="dashboard-readiness-count">${readiness.missingPhoto[groupKey] || 0}</span>
        </button>
        <button type="button" class="dashboard-readiness-row ${state.filterContact === "without" ? "is-active" : ""}" data-readiness-filter="contact" title="Filtrar por sin contacto (auth sin correo ni teléfono)">
          <span>Sin contacto</span>
          <span class="dashboard-readiness-count">${readiness.missingContact[groupKey] || 0}</span>
        </button>
      </div>
    </div>
  `;

  // ── Filter dropdown active-count badge ──
  const filterCount =
    (state.filterAgeGroup ? 1 : 0) +
    (state.filterPhone ? 1 : 0) +
    (state.filterEmail ? 1 : 0) +
    (state.filterPhoto ? 1 : 0) +
    (state.filterName ? 1 : 0);

  container.innerHTML = `
    ${columnGroupNav}
    ${readinessCard}

    <div class="dashboard-guest-filters">
      <div class="dashboard-filter-group">
        <label for="filter-query">Buscar</label>
        <input
          id="filter-query"
          type="text"
          data-filter-query
          placeholder="Nombre, ID o grupo…"
          value="${state.filterQuery}"
        />
      </div>
      <div class="dashboard-filter-group">
        <div class="dashboard-filter-dropdown">
          <button type="button" class="dashboard-filter-dropdown-toggle" data-filter-dropdown-toggle title="Filtrar por atributos de identidad">
            <span>Filtros</span>
            <span class="dashboard-filter-dropdown-count" data-filter-dropdown-count>${filterCount}</span>
            <span class="dashboard-filter-dropdown-caret">▾</span>
          </button>
          <div class="dashboard-filter-dropdown-menu" data-filter-dropdown-menu hidden>
            <label class="dashboard-checkbox-cell" title="Mostrar solo niños">
              <input type="checkbox" data-filter-age-group ${state.filterAgeGroup === "nino" ? "checked" : ""} />
              <span>Niños</span>
            </label>
            <label class="dashboard-checkbox-cell" title="Mostrar solo invitados sin teléfono">
              <input type="checkbox" data-filter-phone ${state.filterPhone === "without" ? "checked" : ""} />
              <span>Sin teléfono</span>
            </label>
            <label class="dashboard-checkbox-cell" title="Mostrar solo invitados sin correo real">
              <input type="checkbox" data-filter-email ${state.filterEmail === "without" ? "checked" : ""} />
              <span>Sin correo</span>
            </label>
            <label class="dashboard-checkbox-cell" title="Mostrar solo invitados sin foto">
              <input type="checkbox" data-filter-photo ${state.filterPhoto === "without" ? "checked" : ""} />
              <span>Sin foto</span>
            </label>
            <label class="dashboard-checkbox-cell" title="Mostrar solo invitados con nombre incompleto (menos de 2 nombres o sin apellido)">
              <input type="checkbox" data-filter-name ${state.filterName === "incomplete" ? "checked" : ""} />
              <span>ID incompleto</span>
            </label>
          </div>
        </div>
      </div>

      <div class="dashboard-filter-count">
        <strong>${filtered.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
      <button class="dashboard-button" type="button" data-add-guest title="Agregar un nuevo invitado">+ Agregar invitado</button>
    </div>


    <div class="dashboard-rsvp-legend" title="Escala de asistencia por día">
      <span class="dashboard-rsvp-legend-title">Asistencia (Vie / Sáb / Dom):</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-empty">—</span> 0 · sin respuesta</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-partial">1–3</span> 1–3 · parcial</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-confirmed">4–5</span> 4–5 · confirmado</span>
    </div>
    <div class="dashboard-guest-table-wrap">

      <table class="dashboard-guest-table">
        <thead>
          <tr>
            ${sortTh("actions", "Acciones")}
            ${sortTh("name", "Identidad")}
            ${activeColumnGroup === "identity"
              ? `
                ${sortTh("send", "Enviar")}
                ${sortTh("invitationSent", "Enviada")}


                ${sortTh("invitationGroup", "Invitación")}
                ${sortTh("group", "Grupo")}
                ${sortTh("lang", "Idioma")}
                ${sortTh("gender", "Género")}
                ${sortTh("age", "Edad")}
                ${sortTh("message", "Mensaje")}
                ${sortTh("travelsByPlane", "Avión")}
                ${sortTh("status", "Estado")}
              `
              : ""}
            ${activeColumnGroup === "presencia"
              ? `
                ${sortTh("friday", "Viernes")}
                ${sortTh("saturday", "Sábado")}
                ${sortTh("sunday", "Domingo")}

                ${sortTh("accommodationConfirm", "Alojamiento")}
                ${sortTh("cabinWaitingList", "Lista espera")}
                ${sortTh("cabin", "Cabaña")}
                ${sortTh("room", "Cuarto")}
                ${sortTh("xtraCabin", "Cabaña extra")}
                ${sortTh("xtraRoom", "Cuarto extra")}
                ${sortTh("rocaAzul", "Roca Azul")}
                ${sortTh("paymentConfirmed", "Pago")}
              `
              : ""}

            ${activeColumnGroup === "petanque"
              ? `
                ${sortTh("petanqueParticipation", "Pétanque")}
                ${sortTh("petanqueOwnBoules", "Boules")}
              `
              : ""}
            ${activeColumnGroup === "playa"
              ? `
                ${sortTh("playa", "Playa")}
              `
              : ""}

          </tr>
        </thead>

        <tbody>
          ${filtered
            .map((guest) => {
              const merged = getMergedGuest(guest);
              const hosting = merged.hosting || {};
              const xtraCabin = hosting.xtraCabin || merged.xtraCabin || "";
              const xtraRoom = hosting.xtraRoom || merged.xtraRoom || "";
              return `
            <tr class="dashboard-guest-row">
              <td>
                <button class="dashboard-link-btn" data-edit-guest="${merged.id}" title="Editar todo (modal)">✏️</button>
                <button class="dashboard-link-btn" data-copy-link="${merged.id}" title="Copiar enlace">🔗</button>
                <button class="dashboard-link-btn" data-preview-link="${merged.id}" title="Vista previa">👁️</button>
                <button class="dashboard-link-btn" data-delete-guest="${merged.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
              </td>
              <td>${identityCell(merged)}</td>
              ${activeColumnGroup === "identity"
                ? `
                  <td>${sendCell(merged)}</td>
                  <td>
                    <input type="checkbox" class="dashboard-invite-sent" data-invite-sent="${merged.id}"
                      ${merged.invitationSent ? "checked" : ""} title="Invitación enviada" />
                  </td>
                  <td>${invitationGroupCell(merged)}</td>
                  <td>${groupCell(merged)}</td>
                  <td>${langCell(merged)}</td>

                  <td>${genderCell(merged)}</td>
                  <td>${ageCell(merged)}</td>
                  <td>${messageCell(merged)}</td>
                  <td>${travelsByPlaneCell(merged)}</td>
                  <td data-guest-status="${merged.id}"></td>

                `
                : ""}
              ${activeColumnGroup === "presencia"
                ? `
                  <td>${rsvpScaleCell(merged, "friday")}</td>
                  <td>${rsvpScaleCell(merged, "saturday")}</td>
                  <td>${rsvpScaleCell(merged, "sunday")}</td>
                  <td>${rsvpBooleanCell(merged, "accommodationConfirm")}</td>
                  <td>${rsvpBooleanCell(merged, "cabinWaitingList")}</td>
                  <td>${cabinCell(merged, "primary")}</td>
                  <td>${roomCell(merged, "primary")}</td>
                  <td>${cabinCell(merged, "extra")}</td>
                  <td>${roomCell(merged, "extra")}</td>
                  <td>${rsvpScaleQuestionCell(merged, "rocaAzul")}</td>
                  <td>${paymentConfirmedCell(merged)}</td>
                `
                : ""}
              ${activeColumnGroup === "petanque"
                ? `
                  <td>${rsvpBooleanCell(merged, "petanqueParticipation")}</td>
                  <td>${rsvpBooleanCell(merged, "petanqueOwnBoules")}</td>
                `
                : ""}
              ${activeColumnGroup === "playa"
                ? `
                  <td>${rsvpScaleQuestionCell(merged, "playa")}</td>
                `
                : ""}

            </tr>`;
            })
            .join("")}

        </tbody>
      </table>
    </div>
  `;

  // Populate status badges
  filtered.forEach((guest) => {
    const cell = container.querySelector(`[data-guest-status="${guest.id}"]`);
    if (cell) cell.append(guestStatusBadge(guest));
  });

  // ── Column-group filter (show/hide columns by admin use case) ──
  container.querySelectorAll("[data-column-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.columnGroup = btn.dataset.columnGroup;
      renderGuestManager(ctx);
    });
  });

  // ── Filter events ──

  // The search input re-renders the table on every keystroke, which destroys
  // the input and loses focus. We preserve focus + caret position so the user
  // can keep typing without interruption.
  container.querySelector("[data-filter-query]")?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    const caret = e.target.selectionStart;
    renderGuestManager(ctx);
    const next = container.querySelector("[data-filter-query]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });

  // ── Filter dropdown (checkbox group) ──
  // The "Filtros" button toggles a dropdown of identity-attribute checkboxes
  // (Niños, Sin teléfono, Sin correo, Sin foto, ID incompleto). Each checkbox
  // toggles its corresponding filter state and re-renders. The dropdown closes
  // when a checkbox is toggled or when clicking outside.
  const dropdownToggle = container.querySelector("[data-filter-dropdown-toggle]");
  const dropdownMenu = container.querySelector("[data-filter-dropdown-menu]");
  dropdownToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdownMenu.hidden;
    dropdownMenu.hidden = !open;
  });
  document.addEventListener("click", (e) => {
    if (dropdownMenu && !dropdownMenu.hidden && !dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
      dropdownMenu.hidden = true;
    }
  });

  const toggleFilter = (key, value) => {
    state[key] = value;
    renderGuestManager(ctx);
  };

  container.querySelector("[data-filter-age-group]")?.addEventListener("change", (e) => {
    toggleFilter("filterAgeGroup", e.target.checked ? "nino" : "");
  });
  container.querySelector("[data-filter-phone]")?.addEventListener("change", (e) => {
    toggleFilter("filterPhone", e.target.checked ? "without" : "");
  });
  container.querySelector("[data-filter-email]")?.addEventListener("change", (e) => {
    toggleFilter("filterEmail", e.target.checked ? "without" : "");
  });
  container.querySelector("[data-filter-photo]")?.addEventListener("change", (e) => {
    toggleFilter("filterPhoto", e.target.checked ? "without" : "");
  });
  container.querySelector("[data-filter-name]")?.addEventListener("change", (e) => {
    toggleFilter("filterName", e.target.checked ? "incomplete" : "");
  });

  // ── Readiness card rows (click to filter by the missing identity piece) ──
  container.querySelectorAll("[data-readiness-filter]").forEach((row) => {
    row.addEventListener("click", () => {
      const kind = row.dataset.readinessFilter;
      if (kind === "name") {
        state.filterName = state.filterName === "incomplete" ? "" : "incomplete";
      } else if (kind === "photo") {
        state.filterPhoto = state.filterPhoto === "without" ? "" : "without";
      } else if (kind === "contact") {
        state.filterContact = state.filterContact === "without" ? "" : "without";
      }
      renderGuestManager(ctx);
    });
  });


  // ── Add guest (opens the "Agregar invitado" modal) ──
  container.querySelector("[data-add-guest]")?.addEventListener("click", () => {
    openCreateGuestModal();
  });

  // ── Sortable headers ──

  container.querySelectorAll("[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      renderGuestManager(ctx);
    });
  });

  // ── RSVP scale editor (per-day attendance, 0–5): toggle mode ──
  // Clicking the chip hides it and reveals the inline select + ✓/✕ buttons.
  // The ✓ confirm saves the selected level via `saveGuestRsvpAnswer`; the ✕
  // cancel hides the editor and restores the display without saving.
  const setRsvpEditorOpen = (guestId, day, open) => {
    const display = container.querySelector(`[data-rsvp-display="${guestId}"][data-rsvp-day="${day}"]`);
    const editor = container.querySelector(`[data-rsvp-editor="${guestId}"][data-rsvp-day="${day}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-rsvp-select="${guestId}"][data-rsvp-day="${day}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-rsvp-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpEditorOpen(btn.dataset.rsvpDisplay, btn.dataset.rsvpDay, true);
    });
  });

  container.querySelectorAll("[data-rsvp-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.rsvpConfirm;
      const day = btn.dataset.rsvpDay;
      const select = container.querySelector(`[data-rsvp-select="${guestId}"][data-rsvp-day="${day}"]`);
      if (!select) return;
      const level = Number.parseInt(select.value, 10);
      const ok = await saveGuestRsvpAnswer(guestId, day, level);
      if (ok) renderGuestManager(ctx);
      else setRsvpEditorOpen(guestId, day, false);
    });
  });

  container.querySelectorAll("[data-rsvp-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpEditorOpen(btn.dataset.rsvpCancel, btn.dataset.rsvpDay, false);
    });
  });

  // ── Boolean RSVP editor (Sí/No/—): toggle mode ──
  // Used by the yes/no questions (accommodationConfirm, cabinWaitingList,
  // petanqueParticipation, petanqueOwnBoules). The stored value is 1 (Sí),
  // 2 (No), or 0 (—), the same shape `saveRsvpAnswers` writes.
  const setRsvpBooleanEditorOpen = (guestId, questionId, open) => {
    const display = container.querySelector(`[data-rsvp-boolean-display="${guestId}"][data-rsvp-question="${questionId}"]`);
    const editor = container.querySelector(`[data-rsvp-boolean-editor="${guestId}"][data-rsvp-question="${questionId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-rsvp-boolean-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-rsvp-boolean-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpBooleanEditorOpen(btn.dataset.rsvpBooleanDisplay, btn.dataset.rsvpQuestion, true);
    });
  });

  container.querySelectorAll("[data-rsvp-boolean-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.rsvpBooleanConfirm;
      const questionId = btn.dataset.rsvpQuestion;
      const select = container.querySelector(`[data-rsvp-boolean-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (!select) return;
      const level = Number.parseInt(select.value, 10);
      const ok = await saveGuestRsvpAnswer(guestId, questionId, level);
      if (ok) renderGuestManager(ctx);
      else setRsvpBooleanEditorOpen(guestId, questionId, false);
    });
  });

  container.querySelectorAll("[data-rsvp-boolean-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpBooleanEditorOpen(btn.dataset.rsvpBooleanCancel, btn.dataset.rsvpQuestion, false);
    });
  });

  // ── Scale RSVP editor (0–5): toggle mode ──
  // Used by the coast likelihood questions (rocaAzul, playa).
  const setRsvpScaleEditorOpen = (guestId, questionId, open) => {
    const display = container.querySelector(`[data-rsvp-scale-display="${guestId}"][data-rsvp-question="${questionId}"]`);
    const editor = container.querySelector(`[data-rsvp-scale-editor="${guestId}"][data-rsvp-question="${questionId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-rsvp-scale-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-rsvp-scale-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpScaleEditorOpen(btn.dataset.rsvpScaleDisplay, btn.dataset.rsvpQuestion, true);
    });
  });

  container.querySelectorAll("[data-rsvp-scale-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.rsvpScaleConfirm;
      const questionId = btn.dataset.rsvpQuestion;
      const select = container.querySelector(`[data-rsvp-scale-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (!select) return;
      const level = Number.parseInt(select.value, 10);
      const ok = await saveGuestRsvpAnswer(guestId, questionId, level);
      if (ok) renderGuestManager(ctx);
      else setRsvpScaleEditorOpen(guestId, questionId, false);
    });
  });

  container.querySelectorAll("[data-rsvp-scale-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRsvpScaleEditorOpen(btn.dataset.rsvpScaleCancel, btn.dataset.rsvpQuestion, false);
    });
  });

  // ── Payment-confirmed editor (Sí/No/—): toggle mode ──
  const setPaymentEditorOpen = (guestId, open) => {
    const display = container.querySelector(`[data-payment-display="${guestId}"]`);
    const editor = container.querySelector(`[data-payment-editor="${guestId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-payment-select="${guestId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-payment-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPaymentEditorOpen(btn.dataset.paymentDisplay, true);
    });
  });

  container.querySelectorAll("[data-payment-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.paymentConfirm;
      const select = container.querySelector(`[data-payment-select="${guestId}"]`);
      if (!select) return;
      const value = select.value === "1" ? true : select.value === "2" ? false : null;
      const ok = await saveGuestInline(guestId, "paymentConfirmed", value);
      if (ok) renderGuestManager(ctx);
      else setPaymentEditorOpen(guestId, false);
    });
  });

  container.querySelectorAll("[data-payment-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPaymentEditorOpen(btn.dataset.paymentCancel, false);
    });
  });

  // ── Cabin editor (picker): toggle mode ──
  // Clicking the badge hides it and reveals the inline cabin select + ✓/✕.
  // The ✓ confirm saves the cabin (and clears the room) via
  // `saveGuestHosting(guestId, period, cabinUnit, roomId)`; the ✕ cancel hides
  // the editor and restores the display without saving. The select stores the
  // DISPLAY name; we resolve it back to the internal unit code via the
  // `CABIN_NAME_MAP` inverse (the map is 1:1 for the values we write).
  const setCabinEditorOpen = (guestId, period, open) => {
    const display = container.querySelector(`[data-cabin-display="${guestId}"][data-cabin-period="${period}"]`);
    const editor = container.querySelector(`[data-cabin-editor="${guestId}"][data-cabin-period="${period}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-cabin-select="${guestId}"][data-cabin-period="${period}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-cabin-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCabinEditorOpen(btn.dataset.cabinDisplay, btn.dataset.cabinPeriod, true);
    });
  });

  container.querySelectorAll("[data-cabin-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.cabinConfirm;
      const period = btn.dataset.cabinPeriod;
      const select = container.querySelector(`[data-cabin-select="${guestId}"][data-cabin-period="${period}"]`);
      if (!select) return;
      const displayName = select.value;
      // Resolve the display name back to the internal unit code. The map is
      // 1:1 for the values we write (e.g. "CABAÑA 3" → "madera_33").
      const unitCode = Object.keys(CABIN_NAME_MAP).find(
        (k) => CABIN_NAME_MAP[k] === displayName,
      ) || displayName;
      const ok = await saveGuestHosting(guestId, period, unitCode, "");
      if (ok) renderGuestManager(ctx);
      else setCabinEditorOpen(guestId, period, false);
    });
  });

  container.querySelectorAll("[data-cabin-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCabinEditorOpen(btn.dataset.cabinCancel, btn.dataset.cabinPeriod, false);
    });
  });

  // ── Room editor (picker): toggle mode ──
  // Clicking the badge hides it and reveals the inline room select + ✓/✕.
  // The ✓ confirm saves the room (keeping the current cabin) via
  // `saveGuestHosting(guestId, period, cabinUnit, roomId)`; the ✕ cancel hides
  // the editor and restores the display without saving.
  const setRoomEditorOpen = (guestId, period, open) => {
    const display = container.querySelector(`[data-room-display="${guestId}"][data-room-period="${period}"]`);
    const editor = container.querySelector(`[data-room-editor="${guestId}"][data-room-period="${period}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-room-select="${guestId}"][data-room-period="${period}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-room-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRoomEditorOpen(btn.dataset.roomDisplay, btn.dataset.roomPeriod, true);
    });
  });

  container.querySelectorAll("[data-room-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.roomConfirm;
      const period = btn.dataset.roomPeriod;
      const select = container.querySelector(`[data-room-select="${guestId}"][data-room-period="${period}"]`);
      if (!select) return;
      const roomId = select.value;
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const roomKey = isExtra ? "xtraRoom" : "room";
      const guest = getGuest(guestId);
      const hosting = guest?.hosting || {};
      const currentUnit = hosting[cabinKey] || "";
      const ok = await saveGuestHosting(guestId, period, currentUnit, roomId);
      if (ok) renderGuestManager(ctx);
      else setRoomEditorOpen(guestId, period, false);
    });
  });

  container.querySelectorAll("[data-room-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRoomEditorOpen(btn.dataset.roomCancel, btn.dataset.roomPeriod, false);
    });
  });

  // ── Name editor: reveal on click ──
  container.querySelectorAll("[data-name-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.nameDisplay;
      const editor = container.querySelector(`[data-name-editor="${guestId}"]`);
      if (!editor) return;
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        const first = editor.querySelector('[data-name-field="firstName"]');
        if (first) first.focus();
      }
    });
  });

  // ── Name editor: save each field on change ──
  container.querySelectorAll("[data-name-field]").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.guestId;
      const field = input.dataset.nameField;
      const ok = await saveGuestInline(guestId, field, input.value.trim());
      input.style.borderColor = ok ? "#4caf50" : "#a0352c";
      setTimeout(() => (input.style.borderColor = ""), 1000);
    });
  });

  // ── Name editor: done button ──
  container.querySelectorAll("[data-name-done]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.nameDone;
      const editor = container.querySelector(`[data-name-editor="${guestId}"]`);
      const display = container.querySelector(`[data-name-display="${guestId}"]`);
      if (editor) editor.hidden = true;
      if (display) {
        const guest = getGuest(guestId);
        if (guest) display.textContent = guestFullName(guest) || "—";
      }
    });
  });

  // ── Gender editor: toggle mode (display ⇄ editor, never both) ──
  // Clicking the display hides it and reveals the inline select + ✓/✕ buttons.
  // The ✓ confirm saves the selected value; the ✕ cancel hides the editor and
  // restores the display without saving.
  const setGenderEditorOpen = (guestId, open) => {
    const display = container.querySelector(`[data-gender-display="${guestId}"]`);
    const editor = container.querySelector(`[data-gender-editor="${guestId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-gender-select="${guestId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-gender-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setGenderEditorOpen(btn.dataset.genderDisplay, true);
    });
  });

  // ── Gender editor: confirm (✓) saves ──
  container.querySelectorAll("[data-gender-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.genderConfirm;
      const select = container.querySelector(`[data-gender-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "gender", select.value);
      if (ok) renderGuestManager(ctx);
      else setGenderEditorOpen(guestId, false);
    });
  });

  // ── Gender editor: cancel (✕) reverts without saving ──
  container.querySelectorAll("[data-gender-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setGenderEditorOpen(btn.dataset.genderCancel, false);
    });
  });

  // ── Age editor: toggle mode (display ⇄ editor, never both) ──
  const setAgeEditorOpen = (guestId, open) => {
    const display = container.querySelector(`[data-age-display="${guestId}"]`);
    const editor = container.querySelector(`[data-age-editor="${guestId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-age-select="${guestId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-age-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setAgeEditorOpen(btn.dataset.ageDisplay, true);
    });
  });

  // ── Age editor: confirm (✓) saves ──
  container.querySelectorAll("[data-age-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.ageConfirm;
      const select = container.querySelector(`[data-age-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "age", select.value);
      if (ok) renderGuestManager(ctx);
      else setAgeEditorOpen(guestId, false);
    });
  });

  // ── Age editor: cancel (✕) reverts without saving ──
  container.querySelectorAll("[data-age-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setAgeEditorOpen(btn.dataset.ageCancel, false);
    });
  });

  // ── Language editor: toggle mode (display ⇄ editor, never both) ──
  const setLangEditorOpen = (guestId, open) => {
    const display = container.querySelector(`[data-lang-display="${guestId}"]`);
    const editor = container.querySelector(`[data-lang-editor="${guestId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = container.querySelector(`[data-lang-select="${guestId}"]`);
      if (select) select.focus();
    }
  };

  container.querySelectorAll("[data-lang-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLangEditorOpen(btn.dataset.langDisplay, true);
    });
  });

  // ── Language editor: confirm (✓) saves ──
  container.querySelectorAll("[data-lang-confirm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.langConfirm;
      const select = container.querySelector(`[data-lang-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "lang", select.value);
      if (ok) renderGuestManager(ctx);
      else setLangEditorOpen(guestId, false);
    });
  });

  // ── Language editor: cancel (✕) reverts without saving ──
  container.querySelectorAll("[data-lang-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLangEditorOpen(btn.dataset.langCancel, false);
    });
  });

  // ── Travels-by-plane: simple checkbox toggle ──

  // Checking saves `true`, unchecking saves `false`. On failure the checkbox
  // reverts to its previous state.
  container.querySelectorAll("[data-travels-checkbox]").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const guestId = checkbox.dataset.travelsCheckbox;
      const ok = await saveGuestInline(guestId, "travelsByPlane", checkbox.checked);
      if (!ok) checkbox.checked = !checkbox.checked; // revert on failure
    });
  });



  // ── Auth email editor: reveal editor on click ──

  // The auth email (the guest's Firebase Auth login email) is inline-editable.
  // Clicking the display swaps it for a small email input + ✓ save button
  // (view mode → edit mode, never both at once). Saving calls the
  // `updateGuestEmail` Cloud Function (via `saveGuestEmail`), which updates the
  // Firebase Auth user's email AND the guest's `firebaseEmail` field, then
  // refreshes the live auth list so the new email shows immediately.
  const setEmailEditorOpen = (guestId, open) => {
    const display = container.querySelector(`[data-auth-email-display="${guestId}"]`);
    const editor = container.querySelector(`[data-auth-email-editor="${guestId}"]`);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const input = container.querySelector(`[data-auth-email-input="${guestId}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  container.querySelectorAll("[data-auth-email-display]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.authEmailDisplay;
      setEmailEditorOpen(guestId, true);
    });
  });

  // ── Auth email editor: save via ✓ button ──
  container.querySelectorAll("[data-auth-email-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.authEmailSave;
      const input = container.querySelector(`[data-auth-email-input="${guestId}"]`);
      if (!input) return;
      const email = input.value.trim();
      if (!email) return;
      const ok = await saveGuestEmail(guestId, email);
      if (ok) {
        renderGuestManager(ctx);
      } else {
        input.style.borderColor = "#a0352c";
        setTimeout(() => (input.style.borderColor = ""), 1000);
      }
    });
  });

  // ── Auth email editor: save on Enter / blur (change) ──
  container.querySelectorAll("[data-auth-email-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.authEmailInput;
      const email = input.value.trim();
      if (!email) return;
      const ok = await saveGuestEmail(guestId, email);
      if (ok) {
        renderGuestManager(ctx);
      } else {
        input.style.borderColor = "#a0352c";
        setTimeout(() => (input.style.borderColor = ""), 1000);
      }
    });
  });


  // ── Group tag dropdowns (Invitación + GRUPO) ──
  // Each group cell renders a colored badge + a compact <select> dropdown. The
  // dropdown lists every existing group plus a "＋ Nuevo grupo…" option that
  // reveals a small free-text input to create a brand-new group. Selecting an
  // existing group (or clearing) applies the change immediately; choosing
  // "Nuevo grupo…" reveals the input and focuses it.
  //
  // Both the Invitación column (`data-invgroup-*`) and the GRUPO column
  // (`data-group-*`) share the same behavior, so we wire them with a small
  // helper that resolves the right apply function + current value.

  const wireGroupSelect = (selectAttr, newAttr, applyFn, getCurrent) => {
    container.querySelectorAll(`[data-${selectAttr}]`).forEach((select) => {
      select.addEventListener("change", async () => {
        const guestId = select.dataset[selectAttr];
        const newInput = container.querySelector(`[data-${newAttr}="${guestId}"]`);
        if (select.value === "__new__") {
          // Reveal the free-text input to create a brand-new group.
          if (newInput) {
            newInput.hidden = false;
            newInput.focus();
          }
          return;
        }
        const oldName = getCurrent(guestId);
        const newName = select.value.trim();
        if (newName === oldName) return;
        await applyFn(guestId, oldName, newName);
      });
    });

    container.querySelectorAll(`[data-${newAttr}]`).forEach((input) => {
      const commit = async () => {
        const guestId = input.dataset[newAttr];
        const oldName = getCurrent(guestId);
        const newName = input.value.trim();
        if (!newName || newName === oldName) return;
        await applyFn(guestId, oldName, newName);
      };
      input.addEventListener("change", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          input.hidden = true;
          input.value = "";
        }
      });
    });
  };

  // Invitación column.
  wireGroupSelect(
    "invgroup-select",
    "invgroup-new",
    applyInvitationGroupChange,
    (guestId) => getGuest(guestId)?.invitationGroup || "",
  );

  // GRUPO column (internal group / tagGroup).
  wireGroupSelect(
    "group-select",
    "group-new",
    applyGroupChange,
    (guestId) => getGuest(guestId)?.group || "",
  );


  // ── Edit guest (modal) ──

  container.querySelectorAll("[data-edit-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.editGuest;
      const guest = getGuest(guestId);
      if (guest) openGuestEditor(guest);
    });
  });

  // ── Send invite (dedicated "Enviar" column) ──
  // The WhatsApp / Email buttons in the dedicated column open the send modal
  // pre-targeted to that channel. Disabled buttons (no auth / no phone / no
  // real email) are skipped — the modal also enforces the same rules.
  container.querySelectorAll("[data-send-whatsapp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.sendWhatsapp;
      const guest = getGuest(guestId);
      if (guest && guestCanWhatsapp(guest)) openSendInviteModal(guest, "whatsapp");
    });
  });
  container.querySelectorAll("[data-send-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.sendEmail;
      const guest = getGuest(guestId);
      if (guest && guestCanEmail(guest)) openSendInviteModal(guest, "email");
    });
  });

  // ── "Invitación enviada" checkbox: toggle the flag on the guest doc ──
  // The checkbox is a manual toggle so the couple can mark a guest as invited
  // even if they sent the invitation outside the dashboard. It writes the
  // `invitationSent` boolean via the shared inline payload builder.
  container.querySelectorAll("[data-invite-sent]").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const guestId = checkbox.dataset.inviteSent;
      const ok = await saveGuestInline(guestId, "invitationSent", checkbox.checked);
      if (!ok) checkbox.checked = !checkbox.checked; // revert on failure
    });
  });

  // ── Edit photo (avatar badge) → opens the guest editor modal ──
  // The 📷 badge on the avatar corner opens the same editor modal, which
  // already contains the photo upload section (preview + "Subir foto" button).
  container.querySelectorAll("[data-edit-photo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.editPhoto;
      const guest = getGuest(guestId);
      if (guest) openGuestEditor(guest);
    });
  });

  // ── Copy link ──
  container.querySelectorAll("[data-copy-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.copyLink;
      const url = getInviteUrl(guestId);
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });

  // ── Preview link ──
  container.querySelectorAll("[data-preview-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.previewLink;
      const url = getInviteUrl(guestId);
      window.open(url, "_blank");
    });
  });

  // ── Delete guest ──
  container.querySelectorAll("[data-delete-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.deleteGuest;
      const guest = getGuest(guestId);
      if (guest) openDeleteConfirm(guest);
    });
  });
}
