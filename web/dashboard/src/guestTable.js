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
    getUniqueGuestGroups,
    getGroupAttendanceCounts,
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
    openGuestEditor,

    openCreateGuestModal,
    openSendInviteModal,
    openDeleteConfirm,

    applyInvitationGroupChange,
    getInvitationGroupOptions,
    invitationGroupCell,
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
  // Shows the guest's gender as a clickable display. Clicking it enters EDIT
  // mode: the display is hidden and a small inline select (M = Mujer / H =
  // Hombre / —) appears with a ✓ confirm and ✕ cancel button. The display and
  // editor are NEVER both visible at once. Confirm saves via
  // `saveGuestInline("gender", …)`; cancel reverts without saving.
  const GENDER_OPTIONS = [
    { value: "", label: "—" },
    { value: "M", label: "Mujer" },
    { value: "H", label: "Hombre" },
  ];
  const genderCell = (guest) => {
    const gender = guest.identity?.gender || guest.gender || "";
    const options = GENDER_OPTIONS.map(
      (g) => `<option value="${g.value}" ${gender === g.value ? "selected" : ""}>${g.label}</option>`,
    ).join("");
    const displayLabel = GENDER_OPTIONS.find((g) => g.value === gender)?.label || "—";
    return `
      <div class="dashboard-gender-cell" data-gender-cell="${guest.id}">
        <button type="button" class="dashboard-gender-display" data-gender-display="${guest.id}" title="Editar género">
          ${displayLabel}
        </button>
        <span class="dashboard-inline-editor" data-gender-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-gender-select="${guest.id}" title="Elegir género">${options}</select>
          <button type="button" class="dashboard-link-btn" data-gender-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-gender-cancel="${guest.id}" title="Cancelar">✕</button>
        </span>
      </div>`;
  };



  // ── Age cell helper (inline editable, toggle mode) ──
  // Shows the guest's age group as a clickable display. Clicking it enters
  // EDIT mode: the display is hidden and a small inline select (Adulto / Niño
  // / —) appears with a ✓ confirm and ✕ cancel button. The display and editor
  // are NEVER both visible at once. Confirm saves via
  // `saveGuestInline("age", …)`; cancel reverts without saving. Matches the
  // values used by the guest editor modal (Adulto / Niño), NOT a raw number.
  const AGE_OPTIONS = [
    { value: "", label: "—" },
    { value: "Adulto", label: "Adulto" },
    { value: "Niño", label: "Niño" },
  ];
  const ageCell = (guest) => {
    const age = guest.identity?.age ?? guest.age ?? "";
    const options = AGE_OPTIONS.map(
      (a) => `<option value="${a.value}" ${age === a.value ? "selected" : ""}>${a.label}</option>`,
    ).join("");
    const displayLabel = AGE_OPTIONS.find((a) => a.value === age)?.label || "—";
    return `
      <div class="dashboard-age-cell" data-age-cell="${guest.id}">
        <button type="button" class="dashboard-age-display" data-age-display="${guest.id}" title="Editar edad">
          ${displayLabel}
        </button>
        <span class="dashboard-inline-editor" data-age-editor="${guest.id}" hidden>
          <select class="dashboard-inline-select" data-age-select="${guest.id}" title="Elegir edad">${options}</select>
          <button type="button" class="dashboard-link-btn" data-age-confirm="${guest.id}" title="Guardar">✓</button>
          <button type="button" class="dashboard-link-btn" data-age-cancel="${guest.id}" title="Cancelar">✕</button>
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

  // ── Group badge nav bar ──
  // Each chip shows the group name plus an "X/Y" attendance summary where
  // X = guests confirmed for SATURDAY (RSVP level ≥ 4) and Y = group size.

  const groups = getUniqueGuestGroups();
  const groupCounts = getGroupAttendanceCounts();
  const groupNav = `
    <div class="dashboard-group-nav">
      <button type="button" class="dashboard-group-nav-chip ${!state.filterGroup ? "dashboard-group-nav-chip-active" : ""}" data-group-nav="">
        Todos
      </button>
      ${groups
        .map(
          (g) => {
            const c = groupCounts[g] || { confirmedSaturday: 0, size: 0 };
            return `
        <button type="button" class="dashboard-group-nav-chip ${state.filterGroup === g ? "dashboard-group-nav-chip-active" : ""}" data-group-nav="${g}" style="background:${badgeStyle(g)};color:#3a2f1e;" title="${c.confirmedSaturday} de ${c.size} confirmados para el sábado">
          ${g}
          <span class="dashboard-group-nav-count">${c.confirmedSaturday}/${c.size}</span>
        </button>`;
          },
        )
        .join("")}
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
    ${groupNav}
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
            ${sortTh("name", "Identidad")}
            ${activeColumnGroup === "identity"
              ? `
                <th title="Enviar invitación (WhatsApp / email)">Enviar</th>
                <th title="Invitación enviada (marcar manualmente o al enviar)">Enviada</th>
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
                <th>Vie</th>
                <th>Sáb</th>
                <th>Dom</th>
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
            <th>Acciones</th>
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
              <td>${identityCell(merged)}</td>
              ${activeColumnGroup === "identity"
                ? `
                  <td>${sendCell(merged)}</td>
                  <td>
                    <input type="checkbox" class="dashboard-invite-sent" data-invite-sent="${merged.id}"
                      ${merged.invitationSent ? "checked" : ""} title="Invitación enviada" />
                  </td>
                  <td>${invitationGroupCell(merged)}</td>
                  <td>${badgeHtml(merged.group)}</td>
                  <td>${badgeHtml(merged.identity?.lang || merged.lang || "")}</td>
                  <td>${genderCell(merged)}</td>
                  <td>${ageCell(merged)}</td>
                  <td>${messageCell(merged)}</td>
                  <td>${travelsByPlaneCell(merged)}</td>
                  <td data-guest-status="${merged.id}"></td>

                `
                : ""}
              ${activeColumnGroup === "presencia"
                ? `
                  <td>${rsvpLevelChip(merged, "friday")}</td>
                  <td>${rsvpLevelChip(merged, "saturday")}</td>
                  <td>${rsvpLevelChip(merged, "sunday")}</td>
                  <td>${rsvpBooleanChip(merged, "accommodationConfirm")}</td>
                  <td>${rsvpBooleanChip(merged, "cabinWaitingList")}</td>
                  <td>${badgeHtml(merged.cabinLabel || merged.unit || "")}</td>
                  <td>${badgeHtml(guestRoom(merged))}</td>
                  <td>${badgeHtml(xtraCabin)}</td>
                  <td>${badgeHtml(xtraRoom)}</td>
                  <td>${rsvpScaleChip(merged, "rocaAzul")}</td>
                  <td>${paymentConfirmedChip(merged)}</td>
                `
                : ""}
              ${activeColumnGroup === "petanque"
                ? `
                  <td>${rsvpBooleanChip(merged, "petanqueParticipation")}</td>
                  <td>${rsvpBooleanChip(merged, "petanqueOwnBoules")}</td>
                `
                : ""}
              ${activeColumnGroup === "playa"
                ? `
                  <td>${rsvpScaleChip(merged, "playa")}</td>
                `
                : ""}

              <td>
                <button class="dashboard-link-btn" data-edit-guest="${merged.id}" title="Editar todo (modal)">✏️</button>
                <button class="dashboard-link-btn" data-copy-link="${merged.id}" title="Copiar enlace">🔗</button>
                <button class="dashboard-link-btn" data-preview-link="${merged.id}" title="Vista previa">👁️</button>
                <button class="dashboard-link-btn" data-delete-guest="${merged.id}" title="Eliminar" style="color:#a0352c;">🗑️</button>
              </td>
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

  // ── Group nav filter ──
  container.querySelectorAll("[data-group-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filterGroup = btn.dataset.groupNav;
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

  // ── RSVP dropdown: save the selected level (0–5) on change ──
  container.querySelectorAll("[data-rsvp-chip]").forEach((chip) => {
    chip.addEventListener("change", async () => {
      const guestId = chip.dataset.rsvpChip;
      const day = chip.dataset.rsvpDay;
      const level = Number.parseInt(chip.value, 10);
      const ok = await saveGuestRsvpAnswer(guestId, day, level);
      if (ok) renderGuestManager(ctx);
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


  // ── Invitation group editor: reveal on click ──

  container.querySelectorAll("[data-invgroup-display]").forEach((btn) => {

    btn.addEventListener("click", () => {
      const guestId = btn.dataset.invgroupDisplay;
      const editor = container.querySelector(`[data-invgroup-editor="${guestId}"]`);
      if (!editor) return;
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        const rename = editor.querySelector(`[data-invgroup-rename="${guestId}"]`);
        if (rename) rename.focus();
      }
    });
  });

  // ── Invitation group: rename (free text) ──
  container.querySelectorAll("[data-invgroup-rename]").forEach((input) => {
    input.addEventListener("change", async () => {
      const guestId = input.dataset.invgroupRename;
      const oldName = getGuest(guestId)?.invitationGroup || "";
      const newName = input.value.trim();
      if (!newName || newName === oldName) return;
      await applyInvitationGroupChange(guestId, oldName, newName);
    });
  });

  // ── Invitation group: pick another existing group ──
  container.querySelectorAll("[data-invgroup-select]").forEach((select) => {
    select.addEventListener("change", async () => {
      const guestId = select.dataset.invgroupSelect;
      const oldName = getGuest(guestId)?.invitationGroup || "";
      const newName = select.value.trim();
      if (!newName || newName === oldName) return;
      await applyInvitationGroupChange(guestId, oldName, newName);
    });
  });

  // ── Invitation group: done button ──
  container.querySelectorAll("[data-invgroup-done]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.invgroupDone;
      const editor = container.querySelector(`[data-invgroup-editor="${guestId}"]`);
      const display = container.querySelector(`[data-invgroup-display="${guestId}"]`);
      if (editor) editor.hidden = true;
      if (display) {
        const guest = getGuest(guestId);
        if (guest) display.textContent = guest.invitationGroup || "—";
      }
    });
  });

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
