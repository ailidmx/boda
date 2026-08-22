// ── Guest Manager (INVITADOS) — AG Grid Community pilot ────────────────
//
// The INVITADOS table is now rendered by AG Grid Community (vanilla JS) via the
// shared `createAppDataGrid` factory. AG Grid owns the grid mechanics:
// virtualization, pinned columns (Identidad + Acciones), native sorting (via our
// business comparators), native column filters (via valueGetters) and column
// resizing. The dashboard's own toolbar (column-group nav, readiness card,
// search + attribute filters, RSVP legend, "+ Agregar invitado") stays ABOVE the
// grid and keeps driving the same `state.*` filters.
//
// Inline editing is business behavior and stays as the pre-existing toggle-mode
// custom cell renderers (gender/age/lang/travel, RSVP day/boolean/scale, payment,
// cabin/room, name + auth email, and the group dropdowns). All persistence flows
// through the injected save handlers → `guestRepository.updateGuest` (setDoc
// merge). Renderers never touch Firestore.
//
// Event wiring is delegated ONCE on the stable grid container (keyed by
// `data-*` attributes + `closest()`), so it survives AG Grid's row
// virtualization (cells are created/destroyed as the grid scrolls).

import { createAppDataGrid } from "./data-grid/AppDataGrid.js";
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

// Column use-case groups shown as chips in the guests section HEADING. Mirrors
// the pre-migration header group nav; the active chip reveals that column set.
const COLUMN_GROUPS = [
  { id: "identity", label: "Identidad" },
  { id: "presencia", label: "Presencia · Alojamiento" },
  { id: "petanque", label: "Pétanque" },
  { id: "playa", label: "Playa" },
];

export function renderGuestManager(ctx) {
  const {
    container,
    state,
    getActiveGuests,
    getGuest,
    getFilteredGuests,
    getMergedGuest,
    guestStatusBadge,
    rsvpBooleanValue,
    rsvpScaleValue,
    guestSortValue,
    saveGuestInline,
    saveGuestEmail,
    saveGuestRsvpAnswer,
    saveGuestHosting,
    getCabinNames,
    getCabinDisplayName,
    getCabinUnitCode,
    getRoomsByCabin,
    openGuestEditor,
    openCreateGuestModal,
    openSendInviteModal,
    openDeleteConfirm,
    applyInvitationGroupChange,
    invitationGroupCell,
    applyGroupChange,
    groupCell,
    guestAvatarUrl,
    guestInitials,
    guestFullName,
    guestIdentity,
    getInviteUrl,
    DEFAULT_AUTH_EMAIL_DOMAIN,
    guestCanWhatsapp,
    guestCanEmail,
    guestHasAuth,
    guestSendEmail,
    computeReadiness,
  } = ctx;

  // ── Rows (filtered by the toolbar's `state.*` filters, then merged) ──
  const filtered = getFilteredGuests();
  const rows = filtered.map((guest) => getMergedGuest(guest));

  // ── Phone formatting: international flag + masked display ──
  const COUNTRY_FLAGS = {
    "52": "🇲🇽", "1": "🇺🇸", "33": "🇫🇷", "34": "🇪🇸", "49": "🇩🇪",
    "44": "🇬🇧", "381": "🇷🇸", "39": "🇮🇹", "351": "🇵🇹", "31": "🇳🇱",
    "32": "🇧🇪", "41": "🇨🇭", "43": "🇦🇹", "48": "🇵🇱", "55": "🇧🇷",
    "54": "🇦🇷", "56": "🇨🇱", "57": "🇨🇴", "58": "🇻🇪", "51": "🇵🇪",
    "593": "🇪🇨", "502": "🇬🇹", "506": "🇨🇷", "507": "🇵🇦", "53": "🇨🇺",
    "1-809": "🇩🇴",
  };
  const formatPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return null;
    const codes = Object.keys(COUNTRY_FLAGS).sort((a, b) => b.length - a.length);
    const countryCode = codes.find((c) => digits.startsWith(c.replace(/\D/g, ""))) || "";
    const flag = COUNTRY_FLAGS[countryCode] || "🌐";
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

  // ── Cell HTML generators (unchanged product UI) ──────────────────────
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

  const identityCell = (guest) => {
    const url = guestAvatarUrl(guest);
    const initials = guestInitials(guest);
    const hasAuth = Boolean(state.authUsers[guest.id]);
    const authEmail = state.authUsers[guest.id]?.email || "";

    const img = url
      ? `<img class="dashboard-avatar" src="${url}" alt="${guestFullName(guest)}" loading="lazy" />`
      : `<span class="dashboard-avatar dashboard-avatar-initials">${initials}</span>`;

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
          <div class="dashboard-identity-meta">${authHtml}</div>
          <div class="dashboard-identity-meta">
            <code title="${guest.id}">${guest.id}</code>
          </div>
        </div>
      </div>`;
  };

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

  const GENDER_OPTIONS = [
    { value: "", label: "—", emoji: "" },
    { value: "M", label: "Mujer", emoji: "👩🏽" },
    { value: "H", label: "Hombre", emoji: "👨🏽" },
  ];
  const genderCell = (guest) => {
    const gender = guest.identity?.gender || guest.gender || "";
    const options = GENDER_OPTIONS.map(
      (g) => `<option value="${g.value}" ${gender === g.value ? "selected" : ""}>${g.emoji ? `${g.emoji} ` : ""}${g.label}</option>`,
    ).join("");
    const opt = GENDER_OPTIONS.find((g) => g.value === gender);
    const displayEmoji = opt?.emoji || "";
    return `
      <div class="dashboard-gender-cell" data-gender-cell="${guest.id}">
        <button type="button" class="dashboard-gender-display ${gender ? "" : "is-empty"}" data-gender-display="${guest.id}" title="Editar género">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : "—"}
        </button>
        <span class="dashboard-inline-editor" data-gender-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-gender-select="${guest.id}" title="Elegir género">${options}</select>
          <button type="button" class="dashboard-link-btn" data-gender-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-gender-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  const AGE_OPTIONS = [
    { value: "", label: "—", emoji: "" },
    { value: "Adulto", label: "Adulto", emoji: "🧑🏽" },
    { value: "Niño", label: "Niño", emoji: "🧒🏽" },
  ];
  const ageEmoji = (age, gender) => {
    if (age === "Adulto") {
      if (gender === "M") return "👵🏽";
      if (gender === "H") return "👴🏽";
      return "🧑🏽";
    }
    if (age === "Niño") {
      if (gender === "M") return "👧🏽";
      if (gender === "H") return "👦🏽";
      return "🧒🏽";
    }
    return "";
  };
  const ageCell = (guest) => {
    const age = guest.identity?.age ?? guest.age ?? "";
    const gender = guest.identity?.gender || guest.gender || "";
    const options = AGE_OPTIONS.map(
      (a) => `<option value="${a.value}" ${age === a.value ? "selected" : ""}>${a.emoji ? `${a.emoji} ` : ""}${a.label}</option>`,
    ).join("");
    const displayEmoji = ageEmoji(age, gender);
    return `
      <div class="dashboard-age-cell" data-age-cell="${guest.id}">
        <button type="button" class="dashboard-age-display ${age ? "" : "is-empty"}" data-age-display="${guest.id}" title="Editar edad">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : "—"}
        </button>
        <span class="dashboard-inline-editor" data-age-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-age-select="${guest.id}" title="Elegir edad">${options}</select>
          <button type="button" class="dashboard-link-btn" data-age-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-age-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

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
    const displayEmoji = opt?.emoji || "";
    return `
      <div class="dashboard-lang-cell" data-lang-cell="${guest.id}">
        <button type="button" class="dashboard-lang-display ${lang ? "" : "is-empty"}" data-lang-display="${guest.id}" title="Editar idioma">
          ${displayEmoji ? `<span class="dashboard-emoji">${displayEmoji}</span>` : "—"}
        </button>
        <span class="dashboard-inline-editor" data-lang-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-lang-select="${guest.id}" title="Elegir idioma">${options}</select>
          <button type="button" class="dashboard-link-btn" data-lang-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-lang-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

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

  const cabinCell = (guest, period) => {
    const isExtra = period === "extra";
    const cabinKey = isExtra ? "xtraCabin" : "cabin";
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

  const messageCell = (guest) => {
    const msg = guest.message || guest.identity?.message || "";
    const escAttr = (s) =>
      String(s).replace(/[&<>"]/g, (ch) => {
        if (ch === "&") return "&amp;";
        if (ch === "<") return "&lt;";
        if (ch === ">") return "&gt;";
        return "&quot;";
      });
    const truncated = msg.length > 24 ? `${msg.slice(0, 24)}…` : msg;
    return `
      <div class="dashboard-message-cell" data-message-cell="${guest.id}">
        <button type="button" class="dashboard-message-display ${msg ? "" : "is-empty"}" data-message-display="${guest.id}" title="${escAttr(msg)}">${msg ? escAttr(truncated) : "—"}</button>
        <span class="dashboard-message-editor" data-message-editor="${guest.id}" hidden>
          <input class="dashboard-inline-input" type="text" value="${escAttr(msg)}" data-message-input="${guest.id}" placeholder="Mensaje…" />
          <button type="button" class="dashboard-link-btn" data-message-save="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-message-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };

  const actionsCell = (guest) => `
    <div class="dashboard-actions-cell">
      <button class="dashboard-link-btn" data-edit-guest="${guest.id}" title="Editar todo (modal)">✏️</button>
      <button class="dashboard-link-btn" data-copy-link="${guest.id}" title="Copiar enlace">🔗</button>
      <button class="dashboard-link-btn" data-preview-link="${guest.id}" title="Vista previa">👁️</button>
      <button class="dashboard-link-btn" data-delete-guest="${guest.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
    </div>`;

  const statusCell = (guest) => guestStatusBadge(guest).outerHTML;

  const inviteSentCell = (guest) => `
    <input type="checkbox" class="dashboard-invite-sent" data-invite-sent="${guest.id}"
      ${guest.invitationSent ? "checked" : ""} title="Invitación enviada" />`;

  // ── Comparator helper (preserves the legacy sort semantics) ──
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // Build a column def: custom renderer + business comparator/valueGetter.
  const col = (id, header, renderer, key, opts = {}) => ({
    headerName: header,
    colId: id,
    pinned: opts.pinned,
    lockPinned: opts.lockPinned,
    width: opts.width ?? 130,
    minWidth: opts.minWidth ?? 80,
    cellRenderer: renderer ? dataHtmlRenderer(renderer) : undefined,
    comparator: key ? (vA, vB, nA, nB) => compare(guestSortValue(nA.data, key), guestSortValue(nB.data, key)) : undefined,
    valueGetter: key ? (p) => guestSortValue(p.data, key) : undefined,
    sortable: Boolean(key),
    filter: opts.filter ?? Boolean(key),
    suppressHeaderMenuButton: false,
    cellClass: opts.cellClass ?? "dashboard-grid-cell",
  });

  const activeColumnGroup = COLUMN_GROUPS.some((g) => g.id === state.columnGroup)
    ? state.columnGroup
    : "identity";

  const columnDefs = [
    col("actions", "Acciones", actionsCell, "actions", { pinned: "left", width: 150, minWidth: 130, filter: false }),
    col("identity", "Identidad", identityCell, "name", { pinned: "left", lockPinned: true, width: 320, minWidth: 260, filter: false }),
    ...(activeColumnGroup === "identity"
      ? [
          col("send", "Enviar", sendCell, "send", { width: 110, filter: false }),
          col("invitationSent", "Enviada", inviteSentCell, "invitationSent", { width: 110, filter: false }),
          col("invitation", "Invitación", (g) => invitationGroupCell(g), "invitationGroup", { width: 170 }),
          col("group", "Grupo", (g) => groupCell(g), "group", { width: 170 }),
          col("lang", "Idioma", langCell, "lang", { width: 110 }),
          col("gender", "Género", genderCell, "gender", { width: 110 }),
          col("age", "Edad", ageCell, "age", { width: 110 }),
          col("message", "Mensaje", messageCell, "message", { width: 150 }),
          col("travelsByPlane", "Avión", travelsByPlaneCell, "travelsByPlane", { width: 110, filter: false }),
          col("status", "Estado", statusCell, "status", { width: 130 }),
        ]
      : []),
    ...(activeColumnGroup === "presencia"
      ? [
          col("friday", "Viernes", (g) => rsvpScaleCell(g, "friday"), "friday", { width: 110 }),
          col("saturday", "Sábado", (g) => rsvpScaleCell(g, "saturday"), "saturday", { width: 110 }),
          col("sunday", "Domingo", (g) => rsvpScaleCell(g, "sunday"), "sunday", { width: 110 }),
          col("accommodationConfirm", "Alojamiento", (g) => rsvpBooleanCell(g, "accommodationConfirm"), "accommodationConfirm", { width: 130 }),
          col("cabinWaitingList", "Lista espera", (g) => rsvpBooleanCell(g, "cabinWaitingList"), "cabinWaitingList", { width: 130 }),
          col("cabin", "Cabaña", (g) => cabinCell(g, "primary"), "cabin", { width: 140 }),
          col("room", "Cuarto", (g) => roomCell(g, "primary"), "room", { width: 140 }),
          col("xtraCabin", "Cabaña extra", (g) => cabinCell(g, "extra"), "xtraCabin", { width: 140 }),
          col("xtraRoom", "Cuarto extra", (g) => roomCell(g, "extra"), "xtraRoom", { width: 140 }),
          col("rocaAzul", "Roca Azul", (g) => rsvpScaleQuestionCell(g, "rocaAzul"), "rocaAzul", { width: 120 }),
          col("paymentConfirmed", "Pago", paymentConfirmedCell, "paymentConfirmed", { width: 110 }),
        ]
      : []),
    ...(activeColumnGroup === "petanque"
      ? [
          col("petanqueParticipation", "Pétanque", (g) => rsvpBooleanCell(g, "petanqueParticipation"), "petanqueParticipation", { width: 130 }),
          col("petanqueOwnBoules", "Boules", (g) => rsvpBooleanCell(g, "petanqueOwnBoules"), "petanqueOwnBoules", { width: 130 }),
        ]
      : []),
    ...(activeColumnGroup === "playa"
      ? [
          col("playa", "Playa", (g) => rsvpScaleQuestionCell(g, "playa"), "playa", { width: 120 }),
        ]
      : []),
  ];

  // ── Stable DOM structure (toolbar + grid element persist across renders) ──
  if (!container.dataset.gridReady) {
    container.innerHTML = `
      <div data-guest-toolbar></div>
      <div data-guest-grid></div>
    `;
    container.dataset.gridReady = "1";
  }
  const toolbarEl = container.querySelector("[data-guest-toolbar]");
  const gridEl = container.querySelector("[data-guest-grid]");

  // ── Column-group nav (rendered into the guests section HEADING so it sits
  // inline with the "Invitados" title on desktop) ──
  renderColumnGroupNav(activeColumnGroup, ctx);

  // ── Toolbar rendering ──

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
        <button type="button" class="dashboard-readiness-row ${state.filterSent === "sent" ? "is-active" : ""}" data-readiness-filter="sent" title="Filtrar por invitación ya enviada">
          <span>Enviado</span>
          <span class="dashboard-readiness-count">${state.filterSent === "sent" ? "✓" : ""}</span>
        </button>
      </div>
    </div>
  `;

  const filterCount =
    (state.filterAgeGroup ? 1 : 0) +
    (state.filterPhone ? 1 : 0) +
    (state.filterEmail ? 1 : 0) +
    (state.filterPhoto ? 1 : 0) +
    (state.filterName ? 1 : 0) +
    (state.filterSent ? 1 : 0);

  toolbarEl.innerHTML = `
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
            <label class="dashboard-checkbox-cell" title="Mostrar solo invitados con invitación ya enviada">
              <input type="checkbox" data-filter-sent ${state.filterSent === "sent" ? "checked" : ""} />
              <span>Enviado</span>
            </label>
          </div>
        </div>
      </div>

      <div class="dashboard-filter-count">
        <strong>${rows.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
      <button class="dashboard-button" type="button" data-add-guest title="Agregar un nuevo invitado">+ Agregar invitado</button>
    </div>

    <div class="dashboard-rsvp-legend" title="Escala de asistencia por día">
      <span class="dashboard-rsvp-legend-title">Asistencia (Vie / Sáb / Dom):</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-empty">—</span> 0 · sin respuesta</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-partial">1–3</span> 1–3 · parcial</span>
      <span class="dashboard-rsvp-legend-item"><span class="dashboard-rsvp-chip dashboard-rsvp-chip-confirmed">4–5</span> 4–5 · confirmado</span>
    </div>
  `;

  // ── Create / update the grid (reuse on re-render to preserve state) ──
  let grid = container._guestGrid;
  if (!grid) {
    grid = createAppDataGrid({
      container: gridEl,
      columnDefs,
      rowData: rows,
      getRowId: (p) => p.data.id,
    });
    container._guestGrid = grid;
  } else {
    grid.setColumnDefs(columnDefs);
    grid.setRowData(rows);
  }

  // ── Toolbar event wiring (re-wired on each render) ──
  wireToolbar(toolbarEl, container, ctx);

  // ── Grid event wiring (delegated, wired once) ──
  if (!container.dataset.gridWired) {
    container.dataset.gridWired = "1";
    wireGridEvents(gridEl, ctx);
  }
}

// ───────────────────────────────────────────────────────────────────────

// Render the column-group chips into the guests section heading and wire them.
// The heading lives OUTSIDE the guest-manager container (it shares the flex
// line with the "Invitados" title on desktop and is sticky below the main nav),
// so we target it via `[data-column-group-nav]` rather than the toolbar.
function renderColumnGroupNav(activeColumnGroup, ctx) {
  const nav = document.querySelector("[data-column-group-nav]");
  if (!nav) return;
  nav.title = "Mostrar columnas por caso de uso";
  nav.innerHTML = COLUMN_GROUPS.map(
    (g) => `
    <button type="button" class="dashboard-column-group-chip ${activeColumnGroup === g.id ? "dashboard-column-group-chip-active" : ""}" data-column-group="${g.id}">
      ${g.label}
    </button>`,
  ).join("");
  nav.querySelectorAll("[data-column-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ctx.state.columnGroup = btn.dataset.columnGroup;
      ctx.renderGuestManager ? ctx.renderGuestManager() : renderGuestManager(ctx);
    });
  });
}

function wireToolbar(toolbarEl, container, ctx) {
  const { state } = ctx;

  const query = toolbarEl.querySelector("[data-filter-query]");
  query?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    const caret = e.target.selectionStart;
    renderGuestManager(ctx);
    const next = container.querySelector("[data-filter-query]");
    if (next) {
      next.focus();
      next.setSelectionRange(caret, caret);
    }
  });

  const dropdownToggle = toolbarEl.querySelector("[data-filter-dropdown-toggle]");
  const dropdownMenu = toolbarEl.querySelector("[data-filter-dropdown-menu]");
  dropdownToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.hidden = !dropdownMenu.hidden;
  });
  if (dropdownMenu && !toolbarEl.dataset.docBound) {
    toolbarEl.dataset.docBound = "1";
    document.addEventListener("click", (e) => {
      if (!dropdownMenu.hidden && !dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
        dropdownMenu.hidden = true;
      }
    });
  }

  const toggleFilter = (key, value) => {
    state[key] = value;
    renderGuestManager(ctx);
  };
  toolbarEl.querySelector("[data-filter-age-group]")?.addEventListener("change", (e) => {
    toggleFilter("filterAgeGroup", e.target.checked ? "nino" : "");
  });
  toolbarEl.querySelector("[data-filter-phone]")?.addEventListener("change", (e) => {
    toggleFilter("filterPhone", e.target.checked ? "without" : "");
  });
  toolbarEl.querySelector("[data-filter-email]")?.addEventListener("change", (e) => {
    toggleFilter("filterEmail", e.target.checked ? "without" : "");
  });
  toolbarEl.querySelector("[data-filter-photo]")?.addEventListener("change", (e) => {
    toggleFilter("filterPhoto", e.target.checked ? "without" : "");
  });
  toolbarEl.querySelector("[data-filter-name]")?.addEventListener("change", (e) => {
    toggleFilter("filterName", e.target.checked ? "incomplete" : "");
  });
  toolbarEl.querySelector("[data-filter-sent]")?.addEventListener("change", (e) => {
    toggleFilter("filterSent", e.target.checked ? "sent" : "");
  });

  toolbarEl.querySelectorAll("[data-readiness-filter]").forEach((row) => {
    row.addEventListener("click", () => {
      const kind = row.dataset.readinessFilter;
      if (kind === "name") {
        state.filterName = state.filterName === "incomplete" ? "" : "incomplete";
      } else if (kind === "photo") {
        state.filterPhoto = state.filterPhoto === "without" ? "" : "without";
      } else if (kind === "contact") {
        state.filterContact = state.filterContact === "without" ? "" : "without";
      } else if (kind === "sent") {
        state.filterSent = state.filterSent === "sent" ? "" : "sent";
      }
      renderGuestManager(ctx);
    });
  });

  toolbarEl.querySelector("[data-add-guest]")?.addEventListener("click", () => {
    ctx.openCreateGuestModal();
  });
}

// Read a `data-*` attribute by its suffix (avoids the dataset camelCase trap
// for multi-word attribute names like `data-invgroup-select`).
function attr(el, suffix) {
  return el ? el.getAttribute(`data-${suffix}`) : null;
}

function wireGridEvents(gridEl, ctx) {
  const {
    getGuest, saveGuestInline, saveGuestEmail, saveGuestRsvpAnswer, saveGuestHosting,
    getRoomsByCabin, getCabinUnitCode, getCabinDisplayName,
    openGuestEditor, openSendInviteModal, openDeleteConfirm, getInviteUrl,
    guestCanWhatsapp, guestCanEmail, guestFullName,
    applyInvitationGroupChange, applyGroupChange,
  } = ctx;

  // Toggle a display/editor pair that live inside the same cell.
  const toggle = (el, displaySel, editorSel, open) => {
    const cell = el.closest(".ag-cell") || gridEl;
    const display = cell.querySelector(displaySel);
    const editor = cell.querySelector(editorSel);
    if (display) display.hidden = open;
    if (editor) editor.hidden = !open;
    if (open) {
      const select = editor?.querySelector("select");
      if (select) select.focus();
    }
  };

  const rerender = () => renderGuestManager(ctx);

  // Group editor (Invitación + GRUPO) shared logic.
  const groupConfirm = (selectAttr, newAttr, applyFn, getCurrent) => {
    return (btn) => {
      const cell = btn.closest(".dashboard-group-cell");
      if (!cell) return;
      const select = cell.querySelector(`[data-${selectAttr}]`);
      const newInput = cell.querySelector(`[data-${newAttr}]`);
      if (select.value === "__new__") {
        if (newInput) {
          newInput.hidden = false;
          newInput.focus();
        }
        return;
      }
      const guestId = attr(select, selectAttr);
      const oldName = getCurrent(guestId);
      const newName = select.value.trim();
      if (newName === oldName) {
        closeGroup(cell, selectAttr, newAttr);
        return;
      }
      applyFn(guestId, oldName, newName).then(() => closeGroup(cell, selectAttr, newAttr));
    };
  };
  const closeGroup = (cell, selectAttr, newAttr) => {
    const badge = cell.querySelector(`[data-${selectAttr.replace("-select", "-badge")}]`) || cell.querySelector("button.dashboard-group-badge");
    const editor = cell.querySelector(`[data-${selectAttr}-editor]`);
    if (badge) badge.hidden = false;
    if (editor) {
      editor.hidden = true;
      const newInput = editor.querySelector(`[data-${newAttr}]`);
      if (newInput) {
        newInput.hidden = true;
        newInput.value = "";
      }
    }
  };
  const commitGroup = (selectAttr, newAttr, applyFn, getCurrent) => {
    return (input) => {
      const cell = input.closest(".dashboard-group-cell");
      const guestId = attr(input, newAttr);
      const oldName = getCurrent(guestId);
      const newName = input.value.trim();
      if (!newName || newName === oldName) return;
      applyFn(guestId, oldName, newName).then(() => {
        if (cell) closeGroup(cell, selectAttr, newAttr);
      });
    };
  };

  gridEl.addEventListener("click", async (e) => {
    const target = e.target.closest("button, a");

    if (target?.dataset.editGuest) {
      const g = getGuest(target.dataset.editGuest);
      if (g) openGuestEditor(g);
    } else if (target?.dataset.copyLink) {
      navigator.clipboard.writeText(getInviteUrl(target.dataset.copyLink)).then(() => {
        target.textContent = "✅";
        setTimeout(() => (target.textContent = "🔗"), 1500);
      });
    } else if (target?.dataset.previewLink) {
      window.open(getInviteUrl(target.dataset.previewLink), "_blank");
    } else if (target?.dataset.deleteGuest) {
      const g = getGuest(target.dataset.deleteGuest);
      if (g) openDeleteConfirm(g);
    } else if (target?.dataset.editPhoto) {
      const g = getGuest(target.dataset.editPhoto);
      if (g) openGuestEditor(g);
    } else if (target?.dataset.sendWhatsapp) {
      const g = getGuest(target.dataset.sendWhatsapp);
      if (g && guestCanWhatsapp(g)) openSendInviteModal(g, "whatsapp");
    } else if (target?.dataset.sendEmail) {
      const g = getGuest(target.dataset.sendEmail);
      if (g && guestCanEmail(g)) openSendInviteModal(g, "email");
    } else if (target?.dataset.columnGroup) {
      ctx.state.columnGroup = target.dataset.columnGroup;
      rerender();
    } else if (target?.dataset.rsvpDisplay) {
      toggle(target, `[data-rsvp-display="${target.dataset.rsvpDisplay}"][data-rsvp-day="${target.dataset.rsvpDay}"]`,
        `[data-rsvp-editor="${target.dataset.rsvpDisplay}"][data-rsvp-day="${target.dataset.rsvpDay}"]`, true);
    } else if (target?.dataset.rsvpConfirm) {
      const guestId = target.dataset.rsvpConfirm;
      const day = target.dataset.rsvpDay;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-rsvp-select="${guestId}"][data-rsvp-day="${day}"]`);
      if (!select) return;
      const ok = await saveGuestRsvpAnswer(guestId, day, Number.parseInt(select.value, 10));
      if (ok) rerender();
    } else if (target?.dataset.rsvpCancel) {
      toggle(target, `[data-rsvp-display="${target.dataset.rsvpCancel}"][data-rsvp-day="${target.dataset.rsvpDay}"]`,
        `[data-rsvp-editor="${target.dataset.rsvpCancel}"][data-rsvp-day="${target.dataset.rsvpDay}"]`, false);
    } else if (target?.dataset.rsvpBooleanDisplay) {
      toggle(target, `[data-rsvp-boolean-display="${target.dataset.rsvpBooleanDisplay}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`,
        `[data-rsvp-boolean-editor="${target.dataset.rsvpBooleanDisplay}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`, true);
    } else if (target?.dataset.rsvpBooleanConfirm) {
      const guestId = target.dataset.rsvpBooleanConfirm;
      const questionId = target.dataset.rsvpQuestion;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-rsvp-boolean-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (!select) return;
      const ok = await saveGuestRsvpAnswer(guestId, questionId, Number.parseInt(select.value, 10));
      if (ok) rerender();
    } else if (target?.dataset.rsvpBooleanCancel) {
      toggle(target, `[data-rsvp-boolean-display="${target.dataset.rsvpBooleanCancel}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`,
        `[data-rsvp-boolean-editor="${target.dataset.rsvpBooleanCancel}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`, false);
    } else if (target?.dataset.rsvpScaleDisplay) {
      toggle(target, `[data-rsvp-scale-display="${target.dataset.rsvpScaleDisplay}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`,
        `[data-rsvp-scale-editor="${target.dataset.rsvpScaleDisplay}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`, true);
    } else if (target?.dataset.rsvpScaleConfirm) {
      const guestId = target.dataset.rsvpScaleConfirm;
      const questionId = target.dataset.rsvpQuestion;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-rsvp-scale-select="${guestId}"][data-rsvp-question="${questionId}"]`);
      if (!select) return;
      const ok = await saveGuestRsvpAnswer(guestId, questionId, Number.parseInt(select.value, 10));
      if (ok) rerender();
    } else if (target?.dataset.rsvpScaleCancel) {
      toggle(target, `[data-rsvp-scale-display="${target.dataset.rsvpScaleCancel}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`,
        `[data-rsvp-scale-editor="${target.dataset.rsvpScaleCancel}"][data-rsvp-question="${target.dataset.rsvpQuestion}"]`, false);
    } else if (target?.dataset.paymentDisplay) {
      toggle(target, `[data-payment-display="${target.dataset.paymentDisplay}"]`, `[data-payment-editor="${target.dataset.paymentDisplay}"]`, true);
    } else if (target?.dataset.paymentConfirm) {
      const guestId = target.dataset.paymentConfirm;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-payment-select="${guestId}"]`);
      if (!select) return;
      const value = select.value === "1" ? true : select.value === "2" ? false : null;
      const ok = await saveGuestInline(guestId, "paymentConfirmed", value);
      if (ok) rerender();
    } else if (target?.dataset.paymentCancel) {
      toggle(target, `[data-payment-display="${target.dataset.paymentCancel}"]`, `[data-payment-editor="${target.dataset.paymentCancel}"]`, false);
    } else if (target?.dataset.cabinDisplay) {
      toggle(target, `[data-cabin-display="${target.dataset.cabinDisplay}"][data-cabin-period="${target.dataset.cabinPeriod}"]`,
        `[data-cabin-editor="${target.dataset.cabinDisplay}"][data-cabin-period="${target.dataset.cabinPeriod}"]`, true);
    } else if (target?.dataset.cabinConfirm) {
      const guestId = target.dataset.cabinConfirm;
      const period = target.dataset.cabinPeriod;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-cabin-select="${guestId}"][data-cabin-period="${period}"]`);
      if (!select) return;
      const unitCode = getCabinUnitCode(select.value);
      const ok = await saveGuestHosting(guestId, period, unitCode, "");
      if (ok) rerender();
    } else if (target?.dataset.cabinCancel) {
      toggle(target, `[data-cabin-display="${target.dataset.cabinCancel}"][data-cabin-period="${target.dataset.cabinPeriod}"]`,
        `[data-cabin-editor="${target.dataset.cabinCancel}"][data-cabin-period="${target.dataset.cabinPeriod}"]`, false);
    } else if (target?.dataset.roomDisplay) {
      toggle(target, `[data-room-display="${target.dataset.roomDisplay}"][data-room-period="${target.dataset.roomPeriod}"]`,
        `[data-room-editor="${target.dataset.roomDisplay}"][data-room-period="${target.dataset.roomPeriod}"]`, true);
    } else if (target?.dataset.roomConfirm) {
      const guestId = target.dataset.roomConfirm;
      const period = target.dataset.roomPeriod;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-room-select="${guestId}"][data-room-period="${period}"]`);
      if (!select) return;
      const roomId = select.value;
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const guest = getGuest(guestId);
      const currentUnit = guest?.hosting?.[cabinKey] || "";
      const ok = await saveGuestHosting(guestId, period, currentUnit, roomId);
      if (ok) rerender();
    } else if (target?.dataset.roomCancel) {
      toggle(target, `[data-room-display="${target.dataset.roomCancel}"][data-room-period="${target.dataset.roomPeriod}"]`,
        `[data-room-editor="${target.dataset.roomCancel}"][data-room-period="${target.dataset.roomPeriod}"]`, false);
    } else if (target?.dataset.nameDisplay) {
      const cell = target.closest(".ag-cell");
      const editor = cell?.querySelector(`[data-name-editor="${target.dataset.nameDisplay}"]`);
      if (editor) {
        editor.hidden = !editor.hidden;
        if (!editor.hidden) editor.querySelector('[data-name-field="firstName"]')?.focus();
      }
    } else if (target?.dataset.nameDone) {
      const cell = target.closest(".ag-cell");
      const editor = cell?.querySelector(`[data-name-editor="${target.dataset.nameDone}"]`);
      const display = cell?.querySelector(`[data-name-display="${target.dataset.nameDone}"]`);
      if (editor) editor.hidden = true;
      if (display) {
        const g = getGuest(target.dataset.nameDone);
        if (g) display.textContent = guestFullName(g) || "—";
      }
    } else if (target?.dataset.messageDisplay) {
      toggle(target, `[data-message-display="${target.dataset.messageDisplay}"]`, `[data-message-editor="${target.dataset.messageDisplay}"]`, true);
      target.closest(".ag-cell")?.querySelector(`[data-message-input="${target.dataset.messageDisplay}"]`)?.focus();
    } else if (target?.dataset.messageSave) {
      const guestId = target.dataset.messageSave;
      const input = target.closest(".ag-cell")?.querySelector(`[data-message-input="${guestId}"]`);
      if (!input) return;
      const ok = await saveGuestInline(guestId, "message", input.value.trim());
      if (ok) rerender();
    } else if (target?.dataset.messageCancel) {
      toggle(target, `[data-message-display="${target.dataset.messageCancel}"]`, `[data-message-editor="${target.dataset.messageCancel}"]`, false);
    } else if (target?.dataset.genderDisplay) {
      toggle(target, `[data-gender-display="${target.dataset.genderDisplay}"]`, `[data-gender-editor="${target.dataset.genderDisplay}"]`, true);
    } else if (target?.dataset.genderConfirm) {
      const guestId = target.dataset.genderConfirm;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-gender-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "gender", select.value);
      if (ok) rerender();
    } else if (target?.dataset.genderCancel) {
      toggle(target, `[data-gender-display="${target.dataset.genderCancel}"]`, `[data-gender-editor="${target.dataset.genderCancel}"]`, false);
    } else if (target?.dataset.ageDisplay) {
      toggle(target, `[data-age-display="${target.dataset.ageDisplay}"]`, `[data-age-editor="${target.dataset.ageDisplay}"]`, true);
    } else if (target?.dataset.ageConfirm) {
      const guestId = target.dataset.ageConfirm;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-age-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "age", select.value);
      if (ok) rerender();
    } else if (target?.dataset.ageCancel) {
      toggle(target, `[data-age-display="${target.dataset.ageCancel}"]`, `[data-age-editor="${target.dataset.ageCancel}"]`, false);
    } else if (target?.dataset.langDisplay) {
      toggle(target, `[data-lang-display="${target.dataset.langDisplay}"]`, `[data-lang-editor="${target.dataset.langDisplay}"]`, true);
    } else if (target?.dataset.langConfirm) {
      const guestId = target.dataset.langConfirm;
      const cell = target.closest(".ag-cell");
      const select = cell?.querySelector(`[data-lang-select="${guestId}"]`);
      if (!select) return;
      const ok = await saveGuestInline(guestId, "lang", select.value);
      if (ok) rerender();
    } else if (target?.dataset.langCancel) {
      toggle(target, `[data-lang-display="${target.dataset.langCancel}"]`, `[data-lang-editor="${target.dataset.langCancel}"]`, false);
    } else if (target?.dataset.authEmailDisplay) {
      const cell = target.closest(".ag-cell");
      const display = cell?.querySelector(`[data-auth-email-display="${target.dataset.authEmailDisplay}"]`);
      const editor = cell?.querySelector(`[data-auth-email-editor="${target.dataset.authEmailDisplay}"]`);
      if (display) display.hidden = true;
      if (editor) {
        editor.hidden = false;
        const input = editor.querySelector("input");
        if (input) {
          input.focus();
          input.select();
        }
      }
    } else if (target?.dataset.authEmailSave) {
      const guestId = target.dataset.authEmailSave;
      const cell = target.closest(".ag-cell");
      const input = cell?.querySelector(`[data-auth-email-input="${guestId}"]`);
      if (!input || !input.value.trim()) return;
      const ok = await saveGuestEmail(guestId, input.value.trim());
      if (ok) rerender();
      else flashError(input);
    } else if (target?.dataset.invgroupBadge) {
      const cell = target.closest(".dashboard-group-cell");
      openGroup(cell, "invgroup-badge", "invgroup-select");
    } else if (target?.dataset.invgroupSelectConfirm) {
      await groupConfirm("invgroup-select", "invgroup-new", applyInvitationGroupChange, (id) => getGuest(id)?.invitationGroup || "")(target);
    } else if (target?.dataset.invgroupSelectCancel) {
      closeGroup(target.closest(".dashboard-group-cell"), "invgroup-select", "invgroup-new");
    } else if (target?.dataset.groupBadge) {
      const cell = target.closest(".dashboard-group-cell");
      openGroup(cell, "group-badge", "group-select");
    } else if (target?.dataset.groupSelectConfirm) {
      await groupConfirm("group-select", "group-new", applyGroupChange, (id) => getGuest(id)?.group || "")(target);
    } else if (target?.dataset.groupSelectCancel) {
      closeGroup(target.closest(".dashboard-group-cell"), "group-select", "group-new");
    }
  });

  // Open a group cell's editor (badge → select).
  const openGroup = (cell, badgeAttr, selectAttr) => {
    if (!cell) return;
    const badge = cell.querySelector(`[data-${badgeAttr}]`);
    const editor = cell.querySelector(`[data-${selectAttr}-editor]`);
    if (badge) badge.hidden = true;
    if (editor) {
      editor.hidden = false;
      editor.querySelector("select")?.focus();
    }
  };

  function flashError(input) {
    input.style.borderColor = "#a0352c";
    setTimeout(() => (input.style.borderColor = ""), 1000);
  }

  // Change handlers (checkboxes + per-field text inputs).
  gridEl.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.matches("[data-travels-checkbox]")) {
      const ok = await saveGuestInline(t.dataset.travelsCheckbox, "travelsByPlane", t.checked);
      if (!ok) t.checked = !t.checked;
    } else if (t.matches("[data-invite-sent]")) {
      const ok = await saveGuestInline(t.dataset.inviteSent, "invitationSent", t.checked);
      if (!ok) t.checked = !t.checked;
    } else if (t.matches("[data-auth-email-input]")) {
      const email = t.value.trim();
      if (!email) return;
      const ok = await saveGuestEmail(t.dataset.authEmailInput, email);
      if (ok) rerender();
      else flashError(t);
    } else if (t.matches("[data-name-field]")) {
      const ok = await saveGuestInline(t.dataset.guestId, t.dataset.nameField, t.value.trim());
      t.style.borderColor = ok ? "#4caf50" : "#a0352c";
      setTimeout(() => (t.style.borderColor = ""), 1000);
    } else if (t.matches("[data-invgroup-new]")) {
      await commitGroup("invgroup-select", "invgroup-new", applyInvitationGroupChange, (id) => getGuest(id)?.invitationGroup || "")(t);
    } else if (t.matches("[data-group-new]")) {
      await commitGroup("group-select", "group-new", applyGroupChange, (id) => getGuest(id)?.group || "")(t);
    }
  });

  // Enter/Escape handling for the free-text "new group" inputs.
  gridEl.addEventListener("keydown", async (e) => {
    const t = e.target;
    if (t.matches("[data-message-input]")) {
      if (e.key === "Enter") {
        e.preventDefault();
        const ok = await saveGuestInline(t.dataset.messageInput, "message", t.value.trim());
        if (ok) rerender();
      } else if (e.key === "Escape") {
        toggle(t, `[data-message-display="${t.dataset.messageInput}"]`, `[data-message-editor="${t.dataset.messageInput}"]`, false);
      }
      return;
    }
    if (!t.matches("[data-invgroup-new], [data-group-new]")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      t.dispatchEvent(new Event("change"));
    } else if (e.key === "Escape") {
      const cell = t.closest(".dashboard-group-cell");
      if (t.matches("[data-invgroup-new]")) closeGroup(cell, "invgroup-select", "invgroup-new");
      else closeGroup(cell, "group-select", "group-new");
    }
  });
}