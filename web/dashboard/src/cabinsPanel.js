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
 * @param {(publicId: string) => string} deps.cabinPhotoUrl — Cloudinary URL for a cabin photo.
 * @param {(guest: Object) => string} deps.guestAvatarUrl — Cloudinary URL for a guest avatar.
 * @param {(guest: Object) => string} deps.guestFullName — full display name for a guest.
 * @param {(guestId: string) => string} deps.getInviteUrl — builds the invite URL for a guest.
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
  cabinPhotoUrl,
  guestAvatarUrl,
  guestFullName,
  getInviteUrl,
  buildHostingPayload,
  updateGuest,
  getCurrentUserId,
  serverTimestamp,
  traceFirebase,
  showToast,
}) {
  if (!container) return;

  const period = activePeriod;

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
    const cabinGuest = guests[0];
    // The live-normalized guest has no `cabinLabel` (that's a static-registry
    // field), so fall back to the friendly display name from the unit code.
    const label = cabinGuest?.cabinLabel || getCabinDisplayName(unit);
    const displayName = getCabinDisplayName(unit);

    const rooms = getRoomsByCabin(displayName);
    const calculated = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    const actual = guests.length;
    return { unit, label, displayName, rooms, guests, actual, calculated };
  });

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
  const navBadges = cabinStats
    .map(
      (c) => `
      <button type="button" class="dashboard-cabin-nav-btn" data-cabin-nav="${c.unit}" title="Ir a ${c.label}">
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
  const cards = cabinStats
    .map((c) => {
      const occupancy = c.guests[0]?.occupancy || "";
      const payment = c.guests[0]?.payment || "";

      // Showcase photos for this cabin (from the Firestore `cabins`
      // collection, matched by display name). Rendered as a one-photo-per-slide
      // carousel at the top of the card.
      const photoIds = getCabinPhotos(c.displayName);
      const photoUrls = photoIds.map((id) => cabinPhotoUrl(id)).filter(Boolean);
      const photoCarousel = photoUrls.length
        ? `
          <div class="dashboard-cabin-carousel" data-cabin-carousel>
            <div class="dashboard-cabin-carousel-track" data-carousel-track>
              ${photoUrls
                .map(
                  (url, i) => `
                  <div class="dashboard-cabin-carousel-slide${i === 0 ? " is-active" : ""}" data-carousel-slide>
                    <img src="${url}" alt="${c.label} — foto ${i + 1}" loading="lazy" />
                  </div>`,
                )
                .join("")}
            </div>
            ${photoUrls.length > 1 ? `
              <button type="button" class="dashboard-cabin-carousel-arrow is-prev" data-carousel-prev aria-label="Foto anterior">‹</button>
              <button type="button" class="dashboard-cabin-carousel-arrow is-next" data-carousel-next aria-label="Foto siguiente">›</button>
              <div class="dashboard-cabin-carousel-dots" data-carousel-dots>
                ${photoUrls.map((_, i) => `<button type="button" class="dashboard-cabin-carousel-dot${i === 0 ? " is-active" : ""}" data-carousel-dot="${i}" aria-label="Foto ${i + 1}"></button>`).join("")}
              </div>
            ` : ""}
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
                          return `
                      <li class="dashboard-cabin-guest" draggable="true" data-guest-id="${g.id}">
                        ${avatarHtml}
                        <span>${guestFullName(g)}</span>
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

      return `
        <div class="dashboard-cabin-card" id="cabin-${c.unit}" data-cabin-card="${c.unit}">
          <div class="dashboard-cabin-heading">
            <strong>${c.label}</strong>
            <span class="dashboard-cabin-meta">${occupancy === "privada" ? "Privada" : "Compartida"} · ${payment === "pagada" ? "Pagada" : "Por pagar"} · ${c.actual}/${c.calculated}</span>
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
      renderCabinAssignments({
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
        cabinPhotoUrl,
        guestAvatarUrl,
        guestFullName,
        getInviteUrl,
        buildHostingPayload,
        updateGuest,
        getCurrentUserId,
        serverTimestamp,
        traceFirebase,
        showToast,
      });
    });
  });

  // ── Nav badge click → scroll to the cabin card ──
  container.querySelectorAll("[data-cabin-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.cabinNav;
      const card = container.querySelector(`[data-cabin-card="${unit}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // ── Cabin photo carousel navigation ──
  // Each cabin card with photos gets a one-photo-per-slide carousel. The
  // prev/next arrows and the dots update the active slide. Only one slide is
  // visible at a time (see .dashboard-cabin-carousel-slide in _cabins.scss).
  container.querySelectorAll("[data-cabin-carousel]").forEach((carousel) => {
    const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
    const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
    if (slides.length === 0) return;

    const showSlide = (index) => {
      const next = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === next));
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === next));
    };

    carousel.querySelector("[data-carousel-prev]")?.addEventListener("click", () => {
      const current = slides.findIndex((s) => s.classList.contains("is-active"));
      showSlide(current - 1);
    });
    carousel.querySelector("[data-carousel-next]")?.addEventListener("click", () => {
      const current = slides.findIndex((s) => s.classList.contains("is-active"));
      showSlide(current + 1);
    });
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => showSlide(i));
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
        renderCabinAssignments({
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
          cabinPhotoUrl,
          guestAvatarUrl,
          guestFullName,
          getInviteUrl,
          buildHostingPayload,
          updateGuest,
          getCurrentUserId,
          serverTimestamp,
          traceFirebase,
          showToast,
        });
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
        renderCabinAssignments({
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
          cabinPhotoUrl,
          guestAvatarUrl,
          guestFullName,
          getInviteUrl,
          buildHostingPayload,
          updateGuest,
          getCurrentUserId,
          serverTimestamp,
          traceFirebase,
          showToast,
        });
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
              : `<ul class="dashboard-cabin-add-list">
                  ${unassigned
                    .map((g) => {
                      const avatarUrl = guestAvatarUrl(g);
                      const avatarHtml = avatarUrl
                        ? `<img class="dashboard-avatar dashboard-avatar-sm" src="${avatarUrl}" alt="" loading="lazy" />`
                        : '<span class="dashboard-avatar dashboard-avatar-sm dashboard-avatar-fallback" aria-hidden="true">👤</span>';
                      return `
                        <li>
                          <button type="button" class="dashboard-cabin-add-option" data-pick-guest="${g.id}">
                            ${avatarHtml}
                            <span>${guestFullName(g)}</span>
                            <code class="dashboard-cabin-code">${g.id}</code>
                          </button>
                        </li>`;
                    })
                    .join("")}
                </ul>`}
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

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
            renderCabinAssignments({
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
              cabinPhotoUrl,
              guestAvatarUrl,
              guestFullName,
              getInviteUrl,
              buildHostingPayload,
              updateGuest,
              getCurrentUserId,
              serverTimestamp,
              traceFirebase,
              showToast,
            });
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
