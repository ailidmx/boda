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
    guestSortValue,
    GUEST_SORT_COLUMNS,
    saveGuestInline,
    saveGuestRsvpAnswer,
    openGuestEditor,
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
    const authHtml = hasAuth && authEmail
      ? `<span class="dashboard-auth-email" title="Cuenta de Firebase Auth">${authEmail}</span>`
      : "";
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

  container.innerHTML = `
    ${groupNav}
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
      <div class="dashboard-filter-count">
        <strong>${filtered.length}</strong> de <strong>${getActiveGuests().length}</strong> invitados
      </div>
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
            <th title="Enviar invitación (WhatsApp / email)">Enviar</th>
            <th title="Invitación enviada (marcar manualmente o al enviar)">Enviada</th>
            ${sortTh("invitationGroup", "Invitación")}

            ${sortTh("group", "Grupo")}
            ${sortTh("lang", "Idioma")}


            ${sortTh("cabin", "Cabaña")}

            ${sortTh("room", "Cuarto")}
            ${sortTh("xtraCabin", "Cabaña extra")}
            ${sortTh("xtraRoom", "Cuarto extra")}
            <th>Vie</th>
            <th>Sáb</th>
            <th>Dom</th>
            ${sortTh("status", "Estado")}
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
              <td>${sendCell(merged)}</td>
              <td>
                <input type="checkbox" class="dashboard-invite-sent" data-invite-sent="${merged.id}"
                  ${merged.invitationSent ? "checked" : ""} title="Invitación enviada" />
              </td>
              <td>${invitationGroupCell(merged)}</td>

              <td>${badgeHtml(merged.group)}</td>
              <td>${badgeHtml(merged.identity?.lang || merged.lang || "")}</td>



              <td>${badgeHtml(merged.cabinLabel || merged.unit || "")}</td>
              <td>${badgeHtml(guestRoom(merged))}</td>
              <td>${badgeHtml(xtraCabin)}</td>
              <td>${badgeHtml(xtraRoom)}</td>
              <td>${rsvpLevelChip(merged, "friday")}</td>
              <td>${rsvpLevelChip(merged, "saturday")}</td>
              <td>${rsvpLevelChip(merged, "sunday")}</td>
              <td data-guest-status="${merged.id}"></td>
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

  // ── Group nav filter ──
  container.querySelectorAll("[data-group-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filterGroup = btn.dataset.groupNav;
      renderGuestManager(ctx);
    });
  });

  // ── Filter events ──
  container.querySelector("[data-filter-query]")?.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    renderGuestManager(ctx);
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
