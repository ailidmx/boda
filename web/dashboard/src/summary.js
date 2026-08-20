// ── Dashboard summary cards ────────────────────────────────────────────
//
// Renders the top summary cards from the LIVE `guests` collection:
//   - a full-width "Invitaciones enviadas" card (sent / total + percentage),
//   - the attendance cards (Viernes / Sábado / Domingo) each with the confirmed
//     count, a small segmented bar showing the RSVP scale distribution (0–5),
//     and a clickable stacked-avatar strip that opens a full-screen modal
//     listing the confirmed guests grouped by group tag.
//
// This is a pure presentation module — it renders DOM but never touches
// Firestore directly. The live-derived helpers are injected so this module
// stays decoupled from the dashboard's mutable state and live listeners.
//
// The legacy "Alojamiento / Viajes / Petanca" cards were removed: they read
// from the dead `rsvp_submissions` / `petanque_participation` collections that
// the app no longer writes (answers now live on the `guests` doc), so they
// always showed 0.

// ── Helpers ────────────────────────────────────────────────────────────

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// The RSVP scale levels, in display order. Level 0 = no answer.
const LEVELS = [0, 1, 2, 3, 4, 5];

// CSS class suffix per level so the segmented bar reads intuitively. Each level
// gets its OWN distinct color so the admin can tell at a glance whether a guest
// answered 0, 1, 2, 3, 4 or 5 — not just "none / partial / confirmed".
//   gray = 0 (no answer), amber ramp = 1–3 (partial), green ramp = 4–5 (confirmed).
function levelClass(level) {
  return `lvl${level}`;
}


// Build the small segmented distribution bar for one attendance day. Each
// segment's width is proportional to its share of the total guests; a tooltip
// shows "Nivel X: N invitados". Segments with 0 guests are skipped.
function distributionBar(distribution, total) {
  const bar = make("div", "dashboard-dist-bar");
  bar.setAttribute("role", "img");
  bar.setAttribute(
    "aria-label",
    `Distribución de niveles: ${LEVELS.map((l) => `${l}: ${distribution[l]}`).join(", ")}`,
  );

  LEVELS.forEach((level) => {
    const count = distribution[level];
    if (!count) return;
    const seg = make("span", `dashboard-dist-seg ${levelClass(level)}`);
    seg.style.width = `${(count / total) * 100}%`;
    seg.title = `Nivel ${level}: ${count} invitado${count === 1 ? "" : "s"}`;
    bar.append(seg);
  });
  return bar;
}

// Small legend row under the bar: one dot + count per level that has guests.
function distributionLegend(distribution) {
  const legend = make("div", "dashboard-dist-legend");
  LEVELS.forEach((level) => {
    const count = distribution[level];
    if (!count) return;
    const item = make("span", "dashboard-dist-legend-item");
    item.append(
      make("i", `dashboard-dist-dot ${levelClass(level)}`),
      make("span", "", `${level} · ${count}`),
    );
    legend.append(item);
  });
  return legend;
}

// The full-width "Invitaciones enviadas" card with a progress bar + percentage.
function invitationsCard({ total, sent, pct }) {
  const article = make("article", "dashboard-summary-card dashboard-summary-card--invitations");
  const head = make("div", "dashboard-inv-head");
  head.append(
    make("span", "", "Invitaciones enviadas"),
    make("strong", "", `${sent} / ${total}`),
  );

  const progress = make("div", "dashboard-inv-progress");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", String(total));
  progress.setAttribute("aria-valuenow", String(sent));
  const fill = make("span", "dashboard-inv-progress-fill");
  fill.style.width = `${pct}%`;
  progress.append(fill);

  const meta = make("div", "dashboard-inv-meta");
  meta.append(
    make("small", "", `${sent} de ${total} invitados ya recibieron su invitación`),
    make("strong", "dashboard-inv-pct", `${pct}%`),
  );

  article.append(head, progress, meta);
  return article;
}

// ── Stacked avatars + full-screen confirmed-guests modal ───────────────

// A single avatar circle: photo when available, initials fallback otherwise.
function avatarEl(guest) {
  const el = make("span", "dashboard-avatar");
  el.title = guest.name;
  if (guest.avatar) {
    const img = make("img", "dashboard-avatar-img");
    img.src = guest.avatar;
    img.alt = guest.name;
    el.append(img);
  } else {
    el.textContent = guest.initials || "?";
  }
  return el;
}

// The clickable stacked-avatar strip. Shows up to MAX_VISIBLE avatars
// overlapping; any overflow collapses into a "+N" badge. Clicking opens the
// full-screen modal with the whole confirmed list grouped by group tag.
const MAX_VISIBLE = 8;

function stackedAvatars(guests, label) {
  const wrap = make("button", "dashboard-avatars", "");
  wrap.type = "button";
  wrap.setAttribute("aria-label", `Ver ${guests.length} confirmados de ${label}`);
  wrap.title = `Ver ${guests.length} confirmados de ${label}`;

  const visible = guests.slice(0, MAX_VISIBLE);
  visible.forEach((g) => wrap.append(avatarEl(g)));

  const overflow = guests.length - visible.length;
  if (overflow > 0) {
    const badge = make("span", "dashboard-avatars-more", `+${overflow}`);
    wrap.append(badge);
  }

  wrap.addEventListener("click", () => openConfirmedModal(guests, label));
  return wrap;
}

// Group the confirmed guests by group tag, ordered by group size descending
// (largest group first), then A→Z within each group.
function groupConfirmedGuests(guests) {
  const byGroup = new Map();
  guests.forEach((g) => {
    const key = g.group || "Sin grupo";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(g);
  });

  return [...byGroup.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([group, members]) => ({
      group,
      members: members.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// Full-screen modal listing the confirmed guests for one day, grouped by group
// tag (largest group first), A→Z within each group. Each group is a collapsible
// <details> block, collapsed by default. Closes on ✕, on the backdrop, or on
// Escape. While open, background scrolling is locked (the modal scrolls
// independently).
function openConfirmedModal(guests, label) {
  const overlay = make("div", "dashboard-modal-overlay dashboard-confirmed-overlay");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Confirmados de ${label}`);

  const modal = make("div", "dashboard-confirmed-modal");
  const head = make("div", "dashboard-confirmed-head");
  head.append(
    make("h3", "", `Confirmados · ${label}`),
    make("span", "dashboard-confirmed-count", `${guests.length} invitados`),
    (() => {
      const close = make("button", "dashboard-modal-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "Cerrar");
      close.addEventListener("click", closeModal);
      return close;
    })(),
  );

  const body = make("div", "dashboard-confirmed-body");
  const groups = groupConfirmedGuests(guests);
  if (groups.length === 0) {
    body.append(make("p", "dashboard-confirmed-empty", "Aún no hay confirmados para este día."));
  } else {
    groups.forEach(({ group, members }) => {
      // Collapsible group block. No `open` attribute → collapsed by default.
      const details = make("details", "dashboard-confirmed-group");
      const summary = make("summary", "dashboard-confirmed-group-head");
      summary.append(
        make("strong", "", group),
        make("span", "", `${members.length} invitado${members.length === 1 ? "" : "s"}`),
      );
      const list = make("ul", "dashboard-confirmed-list");
      members.forEach((g) => {
        const li = make("li", "dashboard-confirmed-item");
        // Level badge shows exactly how strongly this guest confirmed (4 or 5).
        const level = make("span", `dashboard-confirmed-level ${levelClass(g.level)}`, String(g.level));
        level.title = `Nivel ${g.level} de asistencia`;
        li.append(avatarEl(g), make("span", "", g.name), level);
        list.append(li);
      });

      details.append(summary, list);
      body.append(details);
    });
  }

  modal.append(head, body);
  overlay.append(modal);
  document.body.appendChild(overlay);

  // Lock background scrolling while the modal is open; restore on close.
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function closeModal() {
    document.body.style.overflow = previousOverflow;
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", onKey);

  // Focus the close button for keyboard users.
  const closeBtn = modal.querySelector(".dashboard-modal-close");
  if (closeBtn) closeBtn.focus();
}


// A single attendance day card: confirmed count + distribution bar + legend +
// clickable stacked avatars.
function dayCard(label, confirmed, distribution, total, confirmedGuests) {
  const article = make("article", "dashboard-summary-card");
  article.append(
    make("span", "", label),
    make("strong", "", String(confirmed)),
    make("small", "", "Confirmados (nivel ≥ 4)"),
    stackedAvatars(confirmedGuests, label),
    distributionBar(distribution, total),
    distributionLegend(distribution),
  );
  return article;
}

/**
 * Re-render the summary cards from the live `guests` collection.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 * @param {() => {friday: number, saturday: number, sunday: number}} ctx.computeDayConfirmations
 *   Live-derived helper that aggregates `rsvp.answers` scale levels (≥ 4 = confirmed).
 * @param {() => {total: number, sent: number, pct: number}} ctx.computeInvitationStats
 *   Live-derived helper that counts invitations sent vs total guests.
 * @param {() => {friday: number[], saturday: number[], sunday: number[]}} ctx.computeDayDistributions
 *   Live-derived helper returning per-day arrays of 6 counts indexed by level (0–5).
 * @param {() => {friday: object[], saturday: object[], sunday: object[]}} ctx.computeDayConfirmedGuests
 *   Live-derived helper returning per-day arrays of confirmed guest summaries
 *   `{ id, name, group, avatar, initials }`.
 */
export function renderSummary(ctx) {
  const {
    computeDayConfirmations,
    computeInvitationStats,
    computeDayDistributions,
    computeDayConfirmedGuests,
  } = ctx;
  const summary = document.querySelector("[data-dashboard-summary]");
  if (!summary) return;

  const dayCounts = computeDayConfirmations();
  const invitationStats = computeInvitationStats();
  const distributions = computeDayDistributions();
  const confirmedByDay = computeDayConfirmedGuests();
  const total = invitationStats.total;

  summary.replaceChildren(
    invitationsCard(invitationStats),
    dayCard("Viernes", dayCounts.friday, distributions.friday, total, confirmedByDay.friday),
    dayCard("Sábado", dayCounts.saturday, distributions.saturday, total, confirmedByDay.saturday),
    dayCard("Domingo", dayCounts.sunday, distributions.sunday, total, confirmedByDay.sunday),
  );
}
