/**
 * cabinsPanel.js — the "Asignación de cabañas" panel renderer for the dashboard.
 *
 * This is a PRESENTATION module: it renders the cabin-assignment cards into the
 * `[data-cabin-assignments]` container and wires ALL the panel interactions
 * (period tabs, nav badges, copy-link, photo carousel, drag-and-drop, remove,
 * and "+ Agregar" modal). It contains NO Firestore access and NO business
 * rules — every data source and write is passed in as a dependency (the same
 * pattern as `guestTable.js` / `groupsPanel.js`).
 *
 * The panel mirrors the invitation front-end: it reads the LIVE Firestore
 * `guests` collection as the single source of truth. Each guest's cabin lives
 * on its `hosting` map (`hosting.cabin` for the primary period,
 * `hosting.xtraCabin` for the coast escape), which the normalizer maps to the
 * flat `cabin` / `xtraCabin` fields. Writes go through the injected
 * `updateGuest` repository function with a payload built by the shared
 * `buildDashboardGuestHostingPayload` builder.
 */

// The two cabin periods. The primary period is the main weekend (Viernes →
// Domingo); the extra period is the coast escape (Domingo → Martes).
const CABIN_PERIODS = [
  { id: "primary", label: "Viernes → Domingo", sub: "Cabañas principales" },
  { id: "extra", label: "Domingo → Martes", sub: "Cabañas extra (costa)" },
];

// The active period is module-scoped so the period tabs can switch it and
// re-render without the dashboard needing to track it.
let activePeriod = "primary";

// Multi-select cabin filter. When non-empty, only the cabins whose unit is in
// this set are shown. Clicking a nav badge toggles membership; an empty set
// shows ALL cabins. This lets the admin focus on one cabin or a few at a time.
let selectedCabins = new Set();

/**
 * Determine whether a guest's cabin assignment contradicts their RSVP answer
 * for the ACTIVE period, and return a human-readable warning (or "" when the
 * assignment is consistent).
 *
 * Primary period (Viernes → Domingo): a guest with a cabin (`hosting.cabin`)
 * who answered `accommodationConfirm` = NO (2) is wrongly assigned; a guest who
 * answered YES (1) but has no cabin is missing one.
 *
 * Extra period (Domingo → Martes): a guest with an extra cabin
 * (`hosting.xtraCabin`) whose `rocaAzul` level is below the confirmed threshold
 * is wrongly assigned; a guest whose `rocaAzul` level is at/above the threshold
 * but has no extra cabin is missing one.
 *
 * @param {Object} guest — a normalized/merged guest.
 * @param {Object} answers — the guest's LIVE `rsvp.answers` map.
 * @param {string} period — "primary" or "extra".
 * @param {number} BOOLEAN_YES — the "yes" value for boolean answers (1).
 * @param {number} BOOLEAN_NO — the "no" value for boolean answers (2).
 * @param {number} RSVP_CONFIRMED_MIN_LEVEL — the scale level that counts as confirmed (4).
 * @returns {{ kind: string, message: string }|null} the mismatch, or null.
 */
function getCabinMismatch(guest, answers, period, BOOLEAN_YES, BOOLEAN_NO, RSVP_CONFIRMED_MIN_LEVEL) {
  const hasCabin = Boolean(guest.cabin || guest.xtraCabin);
  if (period === "extra") {
    const level = Number(answers.rocaAzul) || 0;
    const accepted = level >= RSVP_CONFIRMED_MIN_LEVEL;
    if (hasCabin && !accepted) {
      return {
        kind: "wrong",
        message: `Dijo que NO se queda en Roca Azul (nivel ${level}) pero tiene cabaña extra.`,
      };
    }
    if (!hasCabin && accepted) {
      return {
        kind: "missing",
        message: `Confirmó quedarse en Roca Azul (nivel ${level}) pero no tiene cabaña extra.`,
      };
    }
    return null;
  }

  // Primary period.
  const confirm = Number(answers.accommodationConfirm);
  if (hasCabin && confirm === BOOLEAN_NO) {
    return {
      kind: "wrong",
      message: "Dijo que NO se aloja en el fin de semana pero tiene cabaña asignada.",
    };
  }
  if (!hasCabin && confirm === BOOLEAN_YES) {
    return {
      kind: "missing",
      message: "Confirmó alojamiento en el fin de semana pero no tiene cabaña asignada.",
    };
  }
  return null;
}

/**
 * Render the cabin-assignment panel into the `[data-cabin-assignments]` container.

 * @param {Object} deps
 * @param {HTMLElement} deps.container — the `[data-cabin-assignments]` element.
 * @param {() => Object[]} deps.getActiveGuests — returns the normalized live guest cache.
 * @param {(guestId: string) => Object|undefined} deps.getGuest — returns a normalized guest by id.
 * @param {(guest: Object) => Object} deps.getMergedGuest — merges a guest with its live record.
 * @param {(guestId: string) => Object} deps.getLiveHosting — reads the LIVE `hosting` map by id.
 * @param {(unit: string) => string} deps.getCabinDisplayName — friendly cabin name from a unit code.
 * @param {(cabinName: string) => Object[]} deps.getRoomsByCabin — room inventory for a cabin.
 * @param {(roomId: string, guests: Object[]) => Object|null} deps.getRoomOccupancy — occupancy for a room.
 * @param {(room: Object, lang: string) => string} deps.getRoomDescription — room description text.
 * @param {(displayName: string) => string[]} deps.getCabinPhotos — cabin showcase photo ids.
 * @param {(displayName: string) => Object|null} deps.getCabinByDisplayName — full cabin object (incl. pricing fields) by display name.
 * @param {() => string[]} deps.getAllCabinNames — all cabin display names from the `cabins` collection.
 * @param {(publicId: string) => string} deps.cabinPhotoUrl — Cloudinary URL for a cabin photo.
 * @param {(guest: Object) => string} deps.guestAvatarUrl — Cloudinary URL for a guest avatar.
 * @param {(guest: Object) => string} deps.guestFullName — full display name for a guest.
 * @param {(guestId: string) => string} deps.getInviteUrl — builds the invite URL for a guest.
 * @param {(guest: Object) => Object} deps.getRsvpAnswers — returns the LIVE `rsvp.answers` map for a guest.
 * @param {number} deps.BOOLEAN_YES — the "yes" value for boolean RSVP answers (1).
 * @param {number} deps.BOOLEAN_NO — the "no" value for boolean RSVP answers (2).
 * @param {number} deps.RSVP_CONFIRMED_MIN_LEVEL — the scale level (0–5) that counts as "confirmed" (4).
 * @param {(guest: Object) => string} deps.paymentConfirmedIcon — renders the "Pago" money-icon badge (💰/🚫/💸) for a guest.
 * @param {(params: Object) => Object} deps.buildHostingPayload — builds the `guests` write payload.
 * @param {(guestId: string, payload: Object) => Promise<void>} deps.updateGuest — repository write.
 * @param {() => string} deps.getCurrentUserId — returns the admin's uid (or "dashboard").
 * @param {*} deps.serverTimestamp — a Firestore serverTimestamp() sentinel.
 * @param {(event: string, data?: Object) => void} deps.traceFirebase — analytics trace helper.
 * @param {(message: string, type?: string) => void} deps.showToast — toast notification helper.
 */
export function renderCabinAssignments({
  container,
  getActiveGuests,
  getGuest,
  getMergedGuest,
  getLiveHosting,
  getCabinDisplayName,
  getRoomsByCabin,
  getRoomOccupancy,
  getRoomDescription,
  getCabinPhotos,
  getCabinByDisplayName,
  getAllCabinNames,
  cabinPhotoUrl,
  guestAvatarUrl,
  guestFullName,
  getInviteUrl,
  getRsvpAnswers,
  BOOLEAN_YES,
  BOOLEAN_NO,
  RSVP_CONFIRMED_MIN_LEVEL,
  paymentConfirmedIcon,
  buildHostingPayload,
  updateGuest,
  getCurrentUserId,
  serverTimestamp,
  traceFirebase,
  showToast,
}) {

  if (!container) return;

  // Capture the full dependency set so every internal re-render (period tab,
  // nav filter, drag-and-drop, remove, add) passes the SAME deps — including
  // the RSVP-answer helpers used by the lodging-status badge. Without this,
  // a re-render would drop `getRsvpAnswers`/`BOOLEAN_YES`/`BOOLEAN_NO`/
  // `RSVP_CONFIRMED_MIN_LEVEL` and crash when rendering the status badge.
  const deps = {
    container,
    getActiveGuests,
    getGuest,
    getMergedGuest,
    getLiveHosting,
    getCabinDisplayName,
    getRoomsByCabin,
    getRoomOccupancy,
    getRoomDescription,
    getCabinPhotos,
    getCabinByDisplayName,
    getAllCabinNames,
    cabinPhotoUrl,
    guestAvatarUrl,
    guestFullName,
    getInviteUrl,
    getRsvpAnswers,
    BOOLEAN_YES,
    BOOLEAN_NO,
    RSVP_CONFIRMED_MIN_LEVEL,
    paymentConfirmedIcon,
    buildHostingPayload,
    updateGuest,
    getCurrentUserId,
    serverTimestamp,
    traceFirebase,
    showToast,
  };

  const period = activePeriod;


  // ── Lodging-plan status for the add-guest modal ──
  // Each guest in the "+ Agregar" modal shows a small badge indicating whether
  // they've accepted the lodging plan for the ACTIVE period. The field differs
  // per period (the couple's warning):
  //   - Primary period (Viernes → Domingo): `accommodationConfirm` — a boolean
  //     answer (1 = yes, 2 = no).
  //   - Extra period (Domingo → Martes): `rocaAzul` — a 0–5 scale answer,
  //     where a level ≥ RSVP_CONFIRMED_MIN_LEVEL (4) counts as "accepted".
  // Returns `{ kind, icon, title }` where kind is "yes" | "no" | "unknown".
  const getLodgingStatus = (guest, p) => {
    const answers = getRsvpAnswers(guest) || {};
    if (p === "extra") {
      const level = Number(answers.rocaAzul) || 0;
      if (level >= RSVP_CONFIRMED_MIN_LEVEL) {
        return { kind: "yes", icon: "✓", title: "Confirmó quedarse en Roca Azul" };
      }
      if (level > 0) {
        return { kind: "no", icon: "✕", title: `No confirmó Roca Azul (nivel ${level})` };
      }
      return { kind: "unknown", icon: "?", title: "Sin respuesta de Roca Azul" };
    }
    // Primary period.
    const confirm = Number(answers.accommodationConfirm);
    if (confirm === BOOLEAN_YES) {
      return { kind: "yes", icon: "✓", title: "Confirmó alojamiento en el fin de semana" };
    }
    if (confirm === BOOLEAN_NO) {
      return { kind: "no", icon: "✕", title: "Dijo que NO se aloja en el fin de semana" };
    }
    return { kind: "unknown", icon: "?", title: "Sin respuesta de alojamiento" };
  };

  // ── Friday / Saturday / Sunday colored presence scale ──
  // Renders the guest's attendance level for each day as three small read-only
  // chips (V / S / D) using the SAME color language as the INVITADOS table:
  // gray = no answer (0), amber = partial (1–3), green = confirmed (4–5). This
  // lets the admin see at a glance how each guest answered the presence scale
  // right inside the cabin cards and the "+ Agregar" modal.
  const RSVP_DAYS = [
    { key: "friday", label: "V", full: "Viernes" },
    { key: "saturday", label: "S", full: "Sábado" },
    { key: "sunday", label: "D", full: "Domingo" },
  ];
  const presenceScaleHtml = (guest) => {
    const answers = getRsvpAnswers(guest) || {};
    return `
      <span class="dashboard-cabin-presence" title="Asistencia: Viernes · Sábado · Domingo (0 = sin respuesta, 4–5 = confirmado)">
        ${RSVP_DAYS.map(({ key, label, full }) => {
          const level = Number(answers[key]) || 0;
          const cls =
            level >= RSVP_CONFIRMED_MIN_LEVEL
              ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
              : level > 0
                ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
                : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
          return `<span class="${cls} dashboard-cabin-presence-day" title="${full}: ${level === 0 ? "sin respuesta" : `nivel ${level}`}">${label}</span>`;
        }).join("")}
      </span>`;
  };


  // The cabins panel mirrors the invitation front-end: it reads the LIVE

  // Firestore `guests` collection as the single source of truth. There is NO
  // static registry anymore — `getActiveGuests()` returns the normalized live
  // cache (populated by `setLiveGuests` from the `onSnapshot` listener).
  const allGuests = getActiveGuests();

  // Resolve the cabin/room fields for the active period. The dashboard's OWN
  // normalizer (`normalizeGuest` in web/dashboard/src/guests.js) exposes the
  // primary cabin as BOTH `unit` and `cabin` (from `hosting.cabin`) and the
  // coast cabin as `xtraCabin` (from `hosting.xtraCabin`). We read the SAME
  // flat field the invitation front-end uses (`cabin` / `xtraCabin`) so the
  // dashboard and the invitation agree on assignments.
  const cabinField = period === "extra" ? "xtraCabin" : "cabin";
  const roomField = period === "extra" ? "xtraRoom" : "room";

  // Group guests by the active period's cabin. Only guests with a cabin in
  // this period are included.
  const byCabin = new Map();
  for (const g of allGuests) {
    const unit = g[cabinField];
    if (!unit) continue;
    if (!byCabin.has(unit)) byCabin.set(unit, []);
    byCabin.get(unit).push(g);
  }

  const cabins = [...byCabin.keys()].sort();


  // Build a per-cabin summary: label, actual occupancy (guests assigned) and
  // calculated occupancy (sum of room capacities from the room inventory).
  const cabinStats = cabins.map((unit) => {
    const guests = byCabin.get(unit);
    // The label must reflect the ACTIVE period.s unit code. The guest.s
    // `cabinLabel` field is a PRIMARY-period concept (it holds the guest.s
    // main-weekend cabin), so it is WRONG for the extra (coast) period.
    // Always derive the label from the active period.s unit via
    // getCabinDisplayName(unit) so both periods show the correct cabin name.
    const label = getCabinDisplayName(unit);
    const displayName = getCabinDisplayName(unit);

    const rooms = getRoomsByCabin(displayName);
    const calculated = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    const actual = guests.length;
    return { unit, label, displayName, rooms, guests, actual, calculated };
  });

  // ── Unassigned cabins from the `cabins` collection ──
  // Some cabins may not be rented at all in the active period (no guest has
  // them in `hosting.cabin` / `hosting.xtraCabin`). We still want to show them
  // so the admin can OPEN them for rental: they appear at the END of the list
  // with 0/CAPACITY and a light (dimmed) look, are still clickable, show an
  // empty guest list, and their "+ Agregar" button works to assign guests.
  // We match by display name so a cabin already assigned in this period is not
  // duplicated.
  const assignedNames = new Set(cabinStats.map((c) => c.displayName.toLocaleUpperCase()));
  const allCabinNames = getAllCabinNames();
  for (const name of allCabinNames) {
    if (assignedNames.has(name.toLocaleUpperCase())) continue;
    const displayName = getCabinDisplayName(name);
    const rooms = getRoomsByCabin(displayName);
    const calculated = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    cabinStats.push({
      unit: name,
      label: displayName,
      displayName,
      rooms,
      guests: [],
      actual: 0,
      calculated,
      isUnassigned: true,
    });
  }

  const totalActual = cabinStats.reduce((sum, c) => sum + c.actual, 0);
  const totalCalculated = cabinStats.reduce((sum, c) => sum + c.calculated, 0);

  // ── Period tabs ──
  const periodTabs = `
    <div class="dashboard-cabin-period-tabs" data-cabin-period-tabs>
      ${CABIN_PERIODS.map(
        (p) => `
        <button type="button" class="dashboard-cabin-period-tab${p.id === period ? " is-active" : ""}" data-cabin-period="${p.id}">
          <span class="dashboard-cabin-period-label">${p.label}</span>
          <span class="dashboard-cabin-period-sub">${p.sub}</span>
        </button>`,
      ).join("")}
    </div>
  `;

  // ── Nav badge bar: one button per cabin showing actual/calculated ──
  // Each badge doubles as a multi-select FILTER: clicking toggles that cabin's
  // visibility. An active badge (is-active) means the cabin is selected; when
  // nothing is selected, all cabins are shown. Clicking a selected badge again
  // deselects it.
  const navBadges = cabinStats
    .map(
      (c) => `
      <button type="button" class="dashboard-cabin-nav-btn${selectedCabins.has(c.unit) ? " is-active" : ""}${c.isUnassigned ? " is-unassigned" : ""}" data-cabin-nav="${c.unit}" title="Filtrar: ${c.label}">
        <span class="dashboard-cabin-nav-label">${c.label}</span>
        <span class="dashboard-cabin-nav-occ">${c.actual}/${c.calculated}</span>
      </button>`,
    )
    .join("");

  // ── Full-width summary card ──
  const summaryCard = `
    <div class="dashboard-cabin-summary">
      <div class="dashboard-cabin-summary-stat">
        <span>Invitados alojados</span>
        <strong>${totalActual}</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Capacidad total</span>
        <strong>${totalCalculated}</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Ocupación</span>
        <strong>${totalCalculated ? Math.round((totalActual / totalCalculated) * 100) : 0}%</strong>
      </div>
      <div class="dashboard-cabin-summary-stat">
        <span>Cabañas</span>
        <strong>${cabins.length}</strong>
      </div>
    </div>
  `;

  // ── Cabin cards, each grouping guests by ROOM ──
  // When the multi-select filter is active (selectedCabins non-empty), only
  // the selected cabins are rendered. An empty selection shows all cabins.
  const visibleStats = selectedCabins.size
    ? cabinStats.filter((c) => selectedCabins.has(c.unit))
    : cabinStats;

  // Format a number as MXN currency (e.g. "$1,250").
  const formatMXN = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "";
    return "$" + Math.round(v).toLocaleString("es-MX");
  };

  const cards = visibleStats
    .map((c) => {
      const occupancy = c.guests[0]?.occupancy || "";
      const payment = c.guests[0]?.payment || "";

      // Full cabin object (incl. pricing fields) for this card. Used to show
      // the global 2-night price and the per-person price in the header, and
      // to compute each guest's share in the rows below.
      //
      // The per-person price is computed DYNAMICALLY from the actual occupancy
      // (totalPrice2Nights / min(actualGuests, capacity)), mirroring the
      // invitation front-end (`cabinPerPersonPrice` in Accommodation.jsx /
      // PaymentSummary.jsx / StayPlanCard.jsx). We do NOT read the stored
      // `pricePerPerson2Nights` field: that is a static snapshot (typically
      // computed for 2 occupants) and would be wrong for a cabin that is fully
      // occupied — e.g. a 4-person cabin at 5310 with 4 guests should show
      // 5310/4 = 1327.5/person, not 5310/2 = 2655/person.
      const cabinInfo = getCabinByDisplayName(c.displayName) || {};
      const totalPrice = formatMXN(cabinInfo.totalPrice2Nights);
      const capacity = cabinInfo.capacity || 1;
      const divisor = Math.min(c.actual, capacity);
      const perPersonPrice = formatMXN(
        divisor > 0 ? cabinInfo.totalPrice2Nights / divisor : 0,
      );
      const priceStat = totalPrice
        ? `<span class="dashboard-cabin-stat"><b>PRECIO</b> ${totalPrice}${perPersonPrice ? ` · ${perPersonPrice}/p` : ""}</span>`
        : "";


      // Showcase photos for this cabin (from the Firestore `cabins`
      // collection, matched by display name). Rendered as a short 4:3 ratio
      // gallery strip at the top of the card — several photos visible in a
      // horizontal scroll, mirroring the invitation's accommodation photo
      // carousel. Each photo is a <button> that opens the shared lightbox at
      // that index (same full-screen modal gallery as the invitation).
      const photoIds = getCabinPhotos(c.displayName);
      const photoUrls = photoIds.map((id) => cabinPhotoUrl(id)).filter(Boolean);
      const photoCarousel = photoUrls.length
        ? `
          <div class="dashboard-cabin-carousel" data-cabin-carousel aria-label="${c.label}">
            ${photoUrls
              .map(
                (url, i) => `
                <button
                  type="button"
                  class="dashboard-cabin-photo"
                  data-cabin-photo="${i}"
                  aria-label="${c.label} — ver en grande"
                >
                  <img src="${url}" alt="${c.label} — foto ${i + 1}" loading="lazy" decoding="async" />
                  <span class="dashboard-cabin-photo-count">
                    ${String(i + 1).padStart(2, "0")} / ${String(photoUrls.length).padStart(2, "0")}
                  </span>
                </button>`,
              )
              .join("")}
          </div>`
        : "";


      // Group the cabin's guests by room id, preserving the room inventory
      // order so empty rooms still show up. We pass the cabin's MERGED guests
      // (c.guests) so `getRoomOccupancy` sees the resolved `room` field
      // (hosting.room ?? guest.room) — raw live guests store their room on
      // `hosting.room`, not `room`, so passing the raw list would miss them.
      const roomBlocks = c.rooms
        .map((room) => {
          // Match guests to this room by the ACTIVE period's room field
          // (`room` for the primary period, `xtraRoom` for the coast period).
          // We filter directly on the normalized guest's field rather than
          // `getRoomOccupancy`, which reads the PRIMARY `room` field and would
          // therefore miss the coast-period (xtraRoom) assignments entirely.
          const roomGuests = c.guests.filter((g) => g[roomField] === room.id);
          const capacity = room.capacity || 0;
          const roomLabel = room.name || room.id;
          const roomDesc = getRoomDescription(room, "es");
          const roomMeta = `${roomGuests.length}/${capacity}`;
          const full = roomGuests.length >= capacity;

          return `
            <div class="dashboard-cabin-room" data-room-id="${room.id}" data-cabin-unit="${c.unit}">
              <div class="dashboard-cabin-room-heading">
                <strong>${roomLabel}</strong>
                <span class="dashboard-cabin-room-meta${full ? " is-full" : ""}">${roomMeta}</span>
              </div>
              ${roomDesc ? `<p class="dashboard-cabin-room-desc">${roomDesc}</p>` : ""}
              <ul class="dashboard-cabin-guests">
                ${roomGuests.length
                  ? roomGuests
                      .map(
                        (g) => {
                          const avatarUrl = guestAvatarUrl(g);
                          const avatarHtml = avatarUrl
                            ? `<img class="dashboard-avatar dashboard-avatar-sm" src="${avatarUrl}" alt="" loading="lazy" />`
                            : '<span class="dashboard-avatar dashboard-avatar-sm dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                          const status = getLodgingStatus(g, period);
                          // Per-person price for this guest's stay (from the
                          // cabin's pricing fields). Shown as a small muted
                          // amount next to the name.
                          const guestPrice = perPersonPrice
                            ? `<span class="dashboard-cabin-guest-price" title="Precio por persona (2 noches)">${perPersonPrice}</span>`
                            : "";
                          // "Paid by the couple" flag for the ACTIVE period.
                          // Primary: `hosting.isCabinPaidByNovios`; extra:
                          // `hosting.isXtraCabinPaidByNovios`. When true, the
                          // couple covers this guest's stay.
                          const hosting = g.hosting || {};
                          const paidByNovios = period === "extra"
                            ? hosting.isXtraCabinPaidByNovios ?? g.isXtraCabinPaidByNovios
                            : hosting.isCabinPaidByNovios ?? g.isCabinPaidByNovios;
                          const paidBadge = paidByNovios
                            ? '<span class="dashboard-cabin-paid-novios" title="Lo pagan los novios">💝</span>'
                            : "";
                          return `
                      <li class="dashboard-cabin-guest" draggable="true" data-guest-id="${g.id}">
                        ${avatarHtml}
                        <span>${guestFullName(g)}</span>
                        ${guestPrice}
                        ${presenceScaleHtml(g)}
                        <span class="dashboard-cabin-add-status is-${status.kind}" title="${status.title}" aria-label="${status.title}">${status.icon}</span>
                        ${paidBadge}
                        ${paymentConfirmedIcon(g)}
                        <button class="dashboard-link-btn" data-copy-guest="${g.id}" title="Copiar enlace">🔗</button>
                        <button class="dashboard-link-btn dashboard-cabin-remove" data-remove-guest="${g.id}" title="Quitar de esta cabaña">✕</button>
                      </li>`;

                        },
                      )
                      .join("")
                  : '<li class="dashboard-cabin-empty">—</li>'}

              </ul>
            </div>`;
        })
        .join("");

      // Occupation percentage for the header stat (guests / capacity).
      const occupationPct = c.calculated ? Math.round((c.actual / c.calculated) * 100) : 0;

      return `
        <div class="dashboard-cabin-card${c.isUnassigned ? " is-unassigned" : ""}" id="cabin-${c.unit}" data-cabin-card="${c.unit}">
          <div class="dashboard-cabin-heading">
            <div class="dashboard-cabin-heading-main">
              <strong>${c.label}</strong>
              <span class="dashboard-cabin-meta">${occupancy === "privada" ? "Privada" : "Compartida"} · ${payment === "pagada" ? "Pagada" : "Por pagar"}</span>
            </div>
            <div class="dashboard-cabin-heading-stats">
              <span class="dashboard-cabin-stat"><b>ROOM</b> ${c.rooms.length}</span>
              <span class="dashboard-cabin-stat"><b>CAPACITY</b> ${c.calculated}</span>
              <span class="dashboard-cabin-stat"><b>OCCUPANCY</b> ${c.actual}</span>
              <span class="dashboard-cabin-stat"><b>OCCUPATION</b> ${occupationPct}%</span>
              ${priceStat}
            </div>
            <button type="button" class="dashboard-cabin-add-btn" data-add-guest="${c.unit}" title="Agregar invitado a ${c.label}">+ Agregar</button>
          </div>
          ${photoCarousel}
          ${roomBlocks}
        </div>`;

    })
    .join("");

  container.innerHTML = `
    ${periodTabs}
    <div class="dashboard-cabin-nav" data-cabin-nav-bar>
      ${navBadges}
    </div>
    ${summaryCard}
    <div class="dashboard-cabin-grid">
      ${cards}
    </div>
  `;

  // ── Period tab click → re-render with the selected period ──
  container.querySelectorAll("[data-cabin-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activePeriod = btn.dataset.cabinPeriod;
      renderCabinAssignments(deps);
    });

  });

  // ── Nav badge click → toggle the multi-select cabin filter ──
  // Clicking a badge toggles that cabin in `selectedCabins` and re-renders.
  // With nothing selected, all cabins are shown; selecting one or more shows
  // only those. Clicking a selected badge again deselects it.
  container.querySelectorAll("[data-cabin-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.cabinNav;
      if (selectedCabins.has(unit)) selectedCabins.delete(unit);
      else selectedCabins.add(unit);
      renderCabinAssignments(deps);
    });
  });


  // ── Copy guest link buttons ──
  container.querySelectorAll("[data-copy-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.copyGuest;
      const url = getInviteUrl(guestId);
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });

  // ── Cabin photo gallery → lightbox ──
  // Each cabin card's photo strip is a short 4:3 gallery. Clicking any photo
  // opens a full-screen lightbox (the SAME modal gallery as the invitation's
  // LightboxCarousel): opaque overlay, swipeable, prev/next arrows, dots and a
  // counter, Escape to close, body scroll lock. The lightbox is built in
  // vanilla JS because the dashboard is not a React app.
  container.querySelectorAll("[data-cabin-photo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carousel = btn.closest("[data-cabin-carousel]");
      if (!carousel) return;
      const photos = [...carousel.querySelectorAll("[data-cabin-photo]")];
      const urls = photos.map((p) => p.querySelector("img")?.getAttribute("src")).filter(Boolean);
      const startIndex = Number(btn.dataset.cabinPhoto) || 0;
      openCabinLightbox(urls, startIndex);
    });
  });


  // ── Drag-and-drop reassignment ──

  // Each guest row is draggable; each room block is a drop target. Dropping a
  // guest onto a room persists the new cabin/room (or xtraCabin/xtraRoom for
  // the coast period) to the guest's `hosting` map in Firestore, then
  // re-renders so occupancy counts update.
  let draggedGuestId = null;

  container.querySelectorAll("[data-guest-id]").forEach((li) => {
    li.addEventListener("dragstart", (e) => {
      draggedGuestId = li.dataset.guestId;
      li.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggedGuestId);
    });
    li.addEventListener("dragend", () => {
      draggedGuestId = null;
      li.classList.remove("is-dragging");
      container.querySelectorAll(".dashboard-cabin-room").forEach((r) => r.classList.remove("is-drop-target"));
    });
  });

  container.querySelectorAll(".dashboard-cabin-room").forEach((roomEl) => {
    roomEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      roomEl.classList.add("is-drop-target");
    });
    roomEl.addEventListener("dragleave", () => {
      roomEl.classList.remove("is-drop-target");
    });
    roomEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      roomEl.classList.remove("is-drop-target");
      const guestId = draggedGuestId || e.dataTransfer.getData("text/plain");
      if (!guestId) return;

      const targetRoomId = roomEl.dataset.roomId;
      const targetUnit = roomEl.dataset.cabinUnit;
      if (!targetRoomId || !targetUnit) return;

      const guest = getGuest(guestId);

      // Resolve the hosting fields for the active period.
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const roomKey = isExtra ? "xtraRoom" : "room";

      // Build the new hosting map from the LIVE hosting (getLiveHosting) so we
      // preserve the other period's fields and the payment flags. The static
      // registry has no `hosting` data, so reading it there would wipe the
      // live assignment. Live-only guests (getGuest() === undefined) are fine.
      const currentHosting = getLiveHosting(guestId);
      const hosting = {
        ...currentHosting,
        [cabinKey]: targetUnit,
        [roomKey]: targetRoomId,
      };

      traceFirebase("cabin.assign.start", { guestId, cabinKey, targetUnit, roomKey, targetRoomId, currentHosting, nextHosting: hosting });

      const payload = buildHostingPayload({
        guestId,
        hosting,
        editorGuestId: getCurrentUserId(),
        timestamp: serverTimestamp(),
      });

      try {
        await updateGuest(guestId, payload);
        traceFirebase("cabin.assign.ok", { guestId, cabinKey, targetUnit, roomKey, targetRoomId, hosting });
        // Update the in-memory guest so the re-render reflects the change
        // immediately (the live onSnapshot listener will also refresh it).
        if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
        renderCabinAssignments(deps);
      } catch (err) {
        console.error("Failed to reassign guest", err);

        traceFirebase("cabin.assign.error", { guestId, code: err?.code, message: err?.message });
        showToast("No se pudo reasignar. Revisa permisos.", "error");
      }
    });
  });

  // ── Remove guest from its assignment ──
  // Clears the active period's cabin+room (or xtraCabin+xtraRoom for the
  // coast period) from the guest's `hosting` map, preserving the other
  // period's fields and the payment flags.
  //
  // NOTE: We read the CURRENT hosting from the LIVE Firestore record
  // (getLiveHosting), NOT the static registry (getGuest). The static
  // web/shared/guests.js snapshot has no `hosting` data, so reading it there
  // would build an empty hosting map and wipe the live assignment. Also, some
  // guests only exist in Firestore (added via "+ Agregar"), so getGuest()
  // returns undefined for them — we must NOT bail out on that.
  container.querySelectorAll("[data-remove-guest]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const guestId = btn.dataset.removeGuest;
      const guest = getGuest(guestId);

      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "cabin";
      const roomKey = isExtra ? "xtraRoom" : "room";

      // Start from the LIVE hosting so we preserve the other period's fields
      // and the payment flags, then clear only the active period's keys by
      // setting them to null (keeping the keys present so the field exists).
      const currentHosting = getLiveHosting(guestId);
      const hosting = { ...currentHosting };
      hosting[cabinKey] = null;
      hosting[roomKey] = null;

      traceFirebase("cabin.remove.start", { guestId, cabinKey, roomKey, currentHosting, nextHosting: hosting });

      const payload = buildHostingPayload({
        guestId,
        hosting,
        editorGuestId: getCurrentUserId(),
        timestamp: serverTimestamp(),
      });

      try {
        await updateGuest(guestId, payload);
        traceFirebase("cabin.remove.ok", { guestId, cabinKey, roomKey, hosting });
        // Update the in-memory guest so the re-render reflects the change
        // immediately (the live onSnapshot listener will also refresh it).
        if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
        renderCabinAssignments(deps);
        showToast("Invitado quitado de la cabaña.", "success");

      } catch (err) {
        console.error("Failed to remove guest from cabin", err);
        traceFirebase("cabin.remove.error", { guestId, code: err?.code, message: err?.message });
        showToast("No se pudo quitar al invitado. Revisa permisos.", "error");
      }
    });
  });

  // ── Add guest to a cabin (modal picker) ──
  // Each cabin card has a "+ Agregar" button. Clicking it opens a modal that
  // lists every guest WITHOUT a cabin in the active period (unassigned),
  // sorted A→Z by name with their avatar, so the admin can pick one to assign
  // to this cabin. The guest is assigned to the cabin's first room.
  container.querySelectorAll("[data-add-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetUnit = btn.dataset.addGuest;
      const isExtra = period === "extra";
      const cabinKey = isExtra ? "xtraCabin" : "unit";

      // Guests with no cabin in this period (unassigned), sorted A→Z by name.
      const unassigned = allGuests
        .map((g) => getMergedGuest(g))
        .filter((g) => !g[cabinKey])
        .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b)));

      const overlay = document.createElement("div");
      overlay.className = "dashboard-modal-overlay";
      overlay.innerHTML = `
        <div class="dashboard-modal dashboard-cabin-add-modal">
          <div class="dashboard-modal-heading">
            <h3>Agregar invitado</h3>
            <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
          </div>
          <div class="dashboard-modal-body">
            <p class="dashboard-cabin-add-hint">
              Invitados sin cabaña en este periodo (${unassigned.length}).
            </p>
            ${unassigned.length === 0
              ? '<p class="dashboard-cabin-empty">No hay invitados sin asignar en este periodo.</p>'
              : `
                <label class="dashboard-cabin-add-search">
                  <span class="dashboard-cabin-add-search-label">Buscar por nombre</span>
                  <input
                    type="search"
                    class="dashboard-cabin-add-search-input"
                    data-cabin-add-search
                    placeholder="Escribe un nombre…"
                    autocomplete="off"
                  />
                </label>
                <ul class="dashboard-cabin-add-list" data-cabin-add-list>
                  ${unassigned
                    .map((g) => {
                      const avatarUrl = guestAvatarUrl(g);
                      const avatarHtml = avatarUrl
                        ? `<img class="dashboard-avatar dashboard-avatar-sm" src="${avatarUrl}" alt="" loading="lazy" />`
                        : '<span class="dashboard-avatar dashboard-avatar-sm dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                      const status = getLodgingStatus(g, period);
                      return `
                        <li data-cabin-add-item="${g.id}">
                          <button type="button" class="dashboard-cabin-add-option" data-pick-guest="${g.id}">
                            ${avatarHtml}
                            <span>${guestFullName(g)}</span>
                            ${presenceScaleHtml(g)}
                            <code class="dashboard-cabin-code">${g.id}</code>
                            <span class="dashboard-cabin-add-status is-${status.kind}" title="${status.title}" aria-label="${status.title}">${status.icon}</span>
                          </button>

                        </li>`;
                    })
                    .join("")}
                </ul>`}

          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // ── Name filter: hide guest rows that don't match the typed query ──
      // The search input filters the unassigned guest list by name (case- and
      // accent-insensitive) as the admin types. Rows that don't match are
      // hidden; the hint count updates to reflect the filtered total.
      const searchInput = overlay.querySelector("[data-cabin-add-search]");
      const listEl = overlay.querySelector("[data-cabin-add-list]");
      const hintEl = overlay.querySelector(".dashboard-cabin-add-hint");
      if (searchInput && listEl) {
        const normalize = (s) =>
          (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        searchInput.addEventListener("input", () => {
          const q = normalize(searchInput.value.trim());
          let visible = 0;
          listEl.querySelectorAll("[data-cabin-add-item]").forEach((li) => {
            const name = normalize(li.querySelector("span")?.textContent || "");
            const match = !q || name.includes(q);
            li.style.display = match ? "" : "none";
            if (match) visible += 1;
          });
          if (hintEl) {
            hintEl.textContent = q
              ? `Invitados sin cabaña en este periodo (${visible} de ${unassigned.length}).`
              : `Invitados sin cabaña en este periodo (${unassigned.length}).`;
          }
        });
      }


      overlay.querySelectorAll("[data-modal-close]").forEach((closeBtn) => {
        closeBtn.addEventListener("click", () => overlay.remove());
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });

      // Assign the picked guest to this cabin's first room.
      overlay.querySelectorAll("[data-pick-guest]").forEach((pickBtn) => {
        pickBtn.addEventListener("click", async () => {
          const guestId = pickBtn.dataset.pickGuest;
          const guest = getGuest(guestId);

          const displayName = getCabinDisplayName(targetUnit);
          const rooms = getRoomsByCabin(displayName);
          const targetRoomId = rooms[0]?.id || "";

          const hostingCabinKey = isExtra ? "xtraCabin" : "cabin";
          const hostingRoomKey = isExtra ? "xtraRoom" : "room";
          // Build from the LIVE hosting (getLiveHosting) so we preserve the
          // other period's fields and the payment flags. The static registry
          // has no `hosting` data, so reading it there would wipe the live
          // assignment. Live-only guests (getGuest() === undefined) are fine.
          const currentHosting = getLiveHosting(guestId);
          const hosting = {
            ...currentHosting,
            [hostingCabinKey]: targetUnit,
            [hostingRoomKey]: targetRoomId,
          };

          traceFirebase("cabin.add.start", { guestId, cabinKey: hostingCabinKey, targetUnit, roomKey: hostingRoomKey, targetRoomId, currentHosting, nextHosting: hosting });

          const payload = buildHostingPayload({
            guestId,
            hosting,
            editorGuestId: getCurrentUserId(),
            timestamp: serverTimestamp(),
          });

          try {
            await updateGuest(guestId, payload);
            traceFirebase("cabin.add.ok", { guestId, cabinKey: hostingCabinKey, targetUnit, roomKey: hostingRoomKey, targetRoomId, hosting });
            if (guest) guest.hosting = { ...(guest.hosting || {}), ...hosting };
            overlay.remove();
            renderCabinAssignments(deps);

          } catch (err) {
            console.error("Failed to add guest to cabin", err);
            traceFirebase("cabin.add.error", { guestId, code: err?.code, message: err?.message });
            showToast("No se pudo agregar al invitado. Revisa permisos.", "error");
          }
        });
      });
    });
  });
}

/**
 * Open a full-screen lightbox gallery for a set of cabin photos.
 *
 * This mirrors the invitation's `LightboxCarousel` (web/invitation/src/
 * components/LightboxCarousel.jsx) so the dashboard and the invitation share
 * the same modal-gallery experience: an opaque full-viewport overlay, a large
 * image with a counter, prev/next arrows, dots, swipe support, Escape to close
 * and body scroll lock. It is implemented in vanilla JS because the dashboard
 * is not a React app.
 *
 * @param {string[]} urls — the photo URLs to browse.
 * @param {number} startIndex — which photo to open on (default 0).
 */
function openCabinLightbox(urls, startIndex = 0) {
  if (!urls || urls.length === 0) return;

  const count = urls.length;
  let index = ((startIndex % count) + count) % count;
  let direction = "next";
  let touchStartX = null;

  const overlay = document.createElement("div");
  overlay.className = "dashboard-cabin-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Galería de cabaña");

  const render = () => {
    const current = urls[index];
    overlay.innerHTML = `
      <button type="button" class="dashboard-cabin-lightbox-close" data-lb-close aria-label="Cerrar">✕</button>
      <button type="button" class="dashboard-cabin-lightbox-arrow is-prev" data-lb-prev aria-label="Anterior">‹</button>
      <figure class="dashboard-cabin-lightbox-stage is-${direction}">
        <img src="${current}" alt="Foto ${index + 1} de ${count}" decoding="async" />
        <figcaption>${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}</figcaption>
      </figure>
      <button type="button" class="dashboard-cabin-lightbox-arrow is-next" data-lb-next aria-label="Siguiente">›</button>
      <div class="dashboard-cabin-lightbox-dots">
        ${urls
          .map(
            (_, i) =>
              `<button type="button" class="dashboard-cabin-lightbox-dot${i === index ? " is-active" : ""}" data-lb-dot="${i}" aria-label="Foto ${i + 1}"></button>`,
          )
          .join("")}
      </div>
    `;

    overlay.querySelector("[data-lb-close]").addEventListener("click", close);
    overlay.querySelector("[data-lb-prev]").addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(index - 1);
    });
    overlay.querySelector("[data-lb-next]").addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(index + 1);
    });
    overlay.querySelectorAll("[data-lb-dot]").forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(Number(dot.dataset.lbDot));
      });
    });
  };

  const goTo = (next) => {
    const target = ((next % count) + count) % count;
    direction = target > index ? "next" : "prev";
    index = target;
    render();
  };

  const close = () => {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
    overlay.remove();
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") goTo(index + 1);
    if (e.key === "ArrowLeft") goTo(index - 1);
  };

  // Close on backdrop click (but not when clicking the image/controls).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Swipe support: left → next, right → previous.
  overlay.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });
  overlay.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) goTo(index + 1);
    else goTo(index - 1);
  });

  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  render();
}

